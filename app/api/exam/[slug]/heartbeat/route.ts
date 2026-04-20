import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withExamSession } from "@/lib/withExamSession";
import { invalidateSessionCache } from "@/lib/withExamSession";
import { redis, cacheWrap, cacheSet } from "@/lib/redis";
import { CacheKeys } from "@/lib/cacheKeys";
import { heartbeatSchema } from "@/lib/validators/examTakingSchemas";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

const FLUSH_INTERVAL_MS = 10_000; // flush counters to DB at most once every 10s per session

export function POST(req: NextRequest, ctx: RouteContext) {
  return withExamSession(async (req, { session }) => {
    let body: z.infer<typeof heartbeatSchema>;
    try {
      body = heartbeatSchema.parse(await req.json());
    } catch (err) {
      return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
    }

    // Cached exam time-limit (immutable during exam)
    const exam = await cacheWrap(CacheKeys.examById(session.examFormId), 300, () =>
      prisma.examForm.findUnique({
        where: { id: session.examFormId },
        select: { timeLimitMinutes: true },
      })
    );

    // Check time expiry
    if (exam?.timeLimitMinutes) {
      const elapsed = (Date.now() - session.startedAt.getTime()) / 1000 / 60;
      if (elapsed >= exam.timeLimitMinutes) {
        await prisma.examSession.update({
          where: { id: session.id },
          data: {
            status: "auto_submitted",
            submittedAt: new Date(),
            timeTakenSeconds: exam.timeLimitMinutes * 60,
          },
        });
        await invalidateSessionCache(req.headers.get("x-session-token")!);
        return NextResponse.json({ expired: true, autoSubmitted: true });
      }
    }

    let tabSwitchCount = session.tabSwitchCount;
    let fullscreenExitCount = session.fullscreenExitCount;

    if (redis) {
      // Accumulate counters in Redis — only flush to DB every FLUSH_INTERVAL_MS
      const tabKey = CacheKeys.hbTab(session.id);
      const fsKey = CacheKeys.hbFs(session.id);
      const flushKey = CacheKeys.hbLastFlush(session.id);

      const pipeline = redis.pipeline();
      if (body.event === "tab_switch") pipeline.incr(tabKey);
      if (body.event === "fullscreen_exit") pipeline.incr(fsKey);
      if (body.event === "tab_switch" || body.event === "fullscreen_exit") {
        // Keep counter keys alive for session duration (max 4 hours)
        pipeline.expire(tabKey, 4 * 3600);
        pipeline.expire(fsKey, 4 * 3600);
      }
      pipeline.get(tabKey);
      pipeline.get(fsKey);
      pipeline.get(flushKey);
      const results = await pipeline.exec();

      const resultOffset = body.event === "tab_switch" || body.event === "fullscreen_exit" ? 3 : 0;
      tabSwitchCount = parseInt(String(results?.[resultOffset] ?? "0")) || session.tabSwitchCount;
      fullscreenExitCount = parseInt(String(results?.[resultOffset + 1] ?? "0")) || session.fullscreenExitCount;
      const lastFlush = parseInt(String(results?.[resultOffset + 2] ?? "0")) || 0;

      const shouldFlush = Date.now() - lastFlush >= FLUSH_INTERVAL_MS;
      if (shouldFlush && (body.event === "tab_switch" || body.event === "fullscreen_exit")) {
        await prisma.examSession.update({
          where: { id: session.id },
          data: { tabSwitchCount, fullscreenExitCount },
        });
        await cacheSet(flushKey, String(Date.now()), 4 * 3600);
        await invalidateSessionCache(req.headers.get("x-session-token")!);
      }

      // Renew owner lock on each heartbeat
      await cacheSet(CacheKeys.owner(session.examFormId, session.studentId), session.id, 60);
    } else {
      // No Redis — write counters directly (fallback)
      const updateData: Record<string, unknown> = {};
      if (body.event === "tab_switch") updateData.tabSwitchCount = { increment: 1 };
      if (body.event === "fullscreen_exit") updateData.fullscreenExitCount = { increment: 1 };
      if (Object.keys(updateData).length > 0) {
        const updated = await prisma.examSession.update({
          where: { id: session.id },
          data: updateData,
          select: { tabSwitchCount: true, fullscreenExitCount: true },
        });
        tabSwitchCount = updated.tabSwitchCount;
        fullscreenExitCount = updated.fullscreenExitCount;
      }
    }

    const remainingSeconds = exam?.timeLimitMinutes
      ? Math.max(0, exam.timeLimitMinutes * 60 - (Date.now() - session.startedAt.getTime()) / 1000)
      : null;

    return NextResponse.json({ ok: true, tabSwitchCount, fullscreenExitCount, remainingSeconds });
  })(req, ctx);
}
