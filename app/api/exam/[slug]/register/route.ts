import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { examRegistrationSchema } from "@/lib/validators/examTakingSchemas";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { cacheWrap } from "@/lib/redis";
import { CacheKeys } from "@/lib/cacheKeys";
import { examInfoWhatsappMessage, queueWhatsapp } from "@/lib/whatsapp";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ slug: string }> };

export async function POST(req: NextRequest, ctx: RouteContext) {
  const { slug } = await ctx.params;
  const ip = getClientIp(req);

  const { success } = await rateLimit(`register:${ip}`, 20, 5 * 60 * 1000);
  if (!success) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: z.infer<typeof examRegistrationSchema>;
  try {
    body = examRegistrationSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json({ error: "Invalid input", details: err }, { status: 400 });
  }

  const email = body.email.toLowerCase();

  // Cache exam + access rule (read-through, 5 min TTL)
  const exam = await cacheWrap(CacheKeys.examBySlug(slug), 300, () =>
    prisma.examForm.findUnique({
      where: { slug },
      include: { accessRule: true },
    })
  );

  if (!exam || !exam.isPublished || exam.status !== "published") {
    return NextResponse.json({ error: "Exam not found or not available" }, { status: 404 });
  }

  if (exam.accessRule?.accessType === "specific_emails") {
    const accessKey = `${CacheKeys.access(exam.id)}:email:${email}`;
    const allowed = await cacheWrap(accessKey, 300, () =>
      prisma.examAllowedEmail.findUnique({
        where: { examFormId_email: { examFormId: exam.id, email } },
      })
    );
    if (!allowed) {
      return NextResponse.json(
        { error: "You are not authorized to register for this exam" },
        { status: 403 }
      );
    }
  }

  const student = await prisma.student.upsert({
    where: { email },
    update: {
      name: body.name,
      mobileNumber: body.mobileNumber,
      whatsappNumber: body.whatsappNumber,
    },
    create: {
      email,
      name: body.name,
      mobileNumber: body.mobileNumber,
      whatsappNumber: body.whatsappNumber,
    },
  });

  const examPassword = crypto.randomBytes(4).toString("hex").toUpperCase();
  const passwordHash = await bcrypt.hash(examPassword, 12);

  const enrollment = await prisma.examEnrollment.upsert({
    where: { examFormId_studentId: { examFormId: exam.id, studentId: student.id } },
    update: {
      mobileNumber: body.mobileNumber,
      whatsappNumber: body.whatsappNumber,
      passwordHash,
      examInfoWhatsappSentAt: null,
    },
    create: {
      examFormId: exam.id,
      studentId: student.id,
      mobileNumber: body.mobileNumber,
      whatsappNumber: body.whatsappNumber,
      passwordHash,
    },
  });

  let whatsappSent = false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.nextUrl.origin;
  const examUrl = `${appUrl}/exam/${exam.slug}`;
  const bodyText = examInfoWhatsappMessage({
    studentName: body.name,
    examTitle: exam.title,
    examUrl,
    examPassword,
    startAt: exam.scheduledStartAt,
    endAt: exam.scheduledEndAt,
    timeLimitMinutes: exam.timeLimitMinutes,
    instructions: exam.instructions,
  });

  whatsappSent = await queueWhatsapp({
    to: body.whatsappNumber,
    contactName: body.name,
    campaignName: process.env.SANDESHAI_EXAM_INFO_CAMPAIGN_NAME ?? "Exam Enrollment",
    body: bodyText,
    templateVariables: [
      body.name,
      exam.title,
      examUrl,
      examPassword,
      exam.scheduledStartAt ? new Date(exam.scheduledStartAt).toLocaleString("en-IN") : "As per schedule",
      exam.scheduledEndAt ? new Date(exam.scheduledEndAt).toLocaleString("en-IN") : "As per schedule",
      exam.timeLimitMinutes ? `${exam.timeLimitMinutes} minutes` : "No time limit",
    ],
    attributes: {
      Source: "ExamForge",
      Exam: exam.title,
      Email: email,
    },
    recipientType: "student",
    recipientId: student.id,
    notificationType: "student_exam_registration",
    relatedExamId: exam.id,
  });

  if (whatsappSent) {
    await prisma.examEnrollment.update({
      where: { id: enrollment.id },
      data: { examInfoWhatsappSentAt: new Date() },
    });
  }

  return NextResponse.json({
    registered: true,
    enrollmentId: enrollment.id,
    studentId: student.id,
    whatsappSent,
  });
}
