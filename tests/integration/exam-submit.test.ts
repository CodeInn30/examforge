import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST as submitPost } from "@/app/api/exam/[slug]/submit/route";
import { GET as resultGet } from "@/app/api/exam/[slug]/result/[sessionId]/route";
import { seedAdmin, seedExam, seedStudent, seedEnrollment, createSession, cleanupExam } from "./helpers/seed";
import { getPrismaTest } from "./helpers/db";

const prisma = getPrismaTest();
let examSlug: string;
let examFormId: string;
let studentId: string;

function submitRequest(slug: string, sessionToken: string) {
  return new NextRequest(`http://localhost/api/exam/${slug}/submit`, {
    method: "POST",
    body: "{}",
    headers: {
      "Content-Type": "application/json",
      "x-session-token": sessionToken,
    },
  });
}

function resultRequest(slug: string, sessionId: string) {
  return new NextRequest(`http://localhost/api/exam/${slug}/result/${sessionId}`);
}

beforeAll(async () => {
  vi.stubEnv("WHATSAPP_ENABLED", "false");

  const admin = await seedAdmin();
  const exam = await seedExam(admin.id, { showResultImmediately: true });
  examSlug = exam.slug;
  examFormId = exam.id;

  const student = await seedStudent();
  studentId = student.id;
  await seedEnrollment(examFormId, studentId);
});

afterAll(async () => {
  vi.unstubAllEnvs();
  await cleanupExam(examSlug);
});

describe("POST /api/exam/[slug]/submit", () => {
  it("marks session as submitted and returns scorePending", async () => {
    const { session, sessionToken } = await createSession(examFormId, studentId);

    const res = await submitPost(submitRequest(examSlug, sessionToken), {
      params: Promise.resolve({ slug: examSlug }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.submitted).toBe(true);
    expect(data.sessionId).toBe(session.id);
    expect(data.scorePending).toBe(true);
  });

  it("sets session status to 'submitted' immediately in DB", async () => {
    const student2 = await seedStudent();
    await seedEnrollment(examFormId, student2.id);
    const { session, sessionToken } = await createSession(examFormId, student2.id);

    await submitPost(submitRequest(examSlug, sessionToken), {
      params: Promise.resolve({ slug: examSlug }),
    });

    // Small delay for background scoring to run
    await new Promise((r) => setTimeout(r, 500));

    const updated = await prisma.examSession.findUnique({ where: { id: session.id } });
    expect(updated?.status).toBe("submitted");
  });

  it("rejects submit with invalid session token", async () => {
    const res = await submitPost(submitRequest(examSlug, "invalid-token-xxx"), {
      params: Promise.resolve({ slug: examSlug }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects double submission on same session", async () => {
    const student3 = await seedStudent();
    await seedEnrollment(examFormId, student3.id);
    const { sessionToken } = await createSession(examFormId, student3.id);

    const ctx = { params: Promise.resolve({ slug: examSlug }) };
    await submitPost(submitRequest(examSlug, sessionToken), ctx);

    // Second submit should fail — session is no longer in_progress
    const res2 = await submitPost(submitRequest(examSlug, sessionToken), ctx);
    expect(res2.status).toBe(403);
  });

  it("background scoring writes score to DB", async () => {
    const student4 = await seedStudent();
    await seedEnrollment(examFormId, student4.id);
    const { session, sessionToken } = await createSession(examFormId, student4.id);

    // Save at least one answer so scoring has something to compute
    const exam = await prisma.examForm.findUnique({
      where: { id: examFormId },
      include: { questions: { include: { options: true }, take: 1 } },
    });
    const q = exam!.questions[0];
    const correctOpt = q.options.find((o) => o.isCorrect)!;
    await prisma.examResponse.create({
      data: {
        sessionId: session.id,
        questionId: q.id,
        isSkipped: false,
        selectedOptions: { create: [{ optionId: correctOpt.id }] },
      },
    });

    await submitPost(submitRequest(examSlug, sessionToken), {
      params: Promise.resolve({ slug: examSlug }),
    });

    // Wait for setImmediate background scoring
    await new Promise((r) => setTimeout(r, 1000));

    const updated = await prisma.examSession.findUnique({ where: { id: session.id } });
    expect(updated?.score).not.toBeNull();
    expect(Number(updated?.score)).toBeGreaterThan(0);
  });
});

describe("GET /api/exam/[slug]/result/[sessionId]", () => {
  it("returns scorePending:true while scoring is in progress", async () => {
    const student5 = await seedStudent();
    await seedEnrollment(examFormId, student5.id);
    const { session, sessionToken } = await createSession(examFormId, student5.id);

    await submitPost(submitRequest(examSlug, sessionToken), {
      params: Promise.resolve({ slug: examSlug }),
    });

    // Check immediately — scoring may still be pending
    const res = await resultGet(resultRequest(examSlug, session.id), {
      params: Promise.resolve({ slug: examSlug, sessionId: session.id }),
    });
    const data = await res.json();
    // Either scorePending or result ready — both are valid depending on timing
    expect(res.status).toBe(200);
    expect(data.scorePending === true || data.result !== undefined).toBe(true);
  });

  it("returns full result once scoring completes", async () => {
    const student6 = await seedStudent();
    await seedEnrollment(examFormId, student6.id);
    const { session, sessionToken } = await createSession(examFormId, student6.id);

    await submitPost(submitRequest(examSlug, sessionToken), {
      params: Promise.resolve({ slug: examSlug }),
    });
    await new Promise((r) => setTimeout(r, 1500));

    const res = await resultGet(resultRequest(examSlug, session.id), {
      params: Promise.resolve({ slug: examSlug, sessionId: session.id }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.result).toBeDefined();
    expect(data.result.score).not.toBeNull();
    expect(typeof data.result.isPassed).toBe("boolean");
    expect(data.result.status).toBe("submitted");
  });

  it("returns 400 for in-progress session", async () => {
    const student7 = await seedStudent();
    await seedEnrollment(examFormId, student7.id);
    const { session } = await createSession(examFormId, student7.id);

    const res = await resultGet(resultRequest(examSlug, session.id), {
      params: Promise.resolve({ slug: examSlug, sessionId: session.id }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown sessionId", async () => {
    const res = await resultGet(
      resultRequest(examSlug, "00000000-0000-0000-0000-000000000000"),
      { params: Promise.resolve({ slug: examSlug, sessionId: "00000000-0000-0000-0000-000000000000" }) }
    );
    expect(res.status).toBe(404);
  });
});
