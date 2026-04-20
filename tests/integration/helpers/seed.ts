import { getPrismaTest } from "./db";
import { hashSync } from "bcryptjs";
import crypto from "crypto";

const prisma = getPrismaTest();

export async function seedAdmin() {
  return prisma.admin.upsert({
    where: { email: "test-admin@examforge.test" },
    update: {},
    create: {
      name: "Test Admin",
      email: "test-admin@examforge.test",
      passwordHash: hashSync("TestPass@123", 10),
      role: "super_admin",
      isActive: true,
      isEmailVerified: true,
    },
  });
}

export async function seedExam(adminId: string, overrides: Record<string, unknown> = {}) {
  const slug = `test-exam-${crypto.randomUUID().slice(0, 8)}`;
  return prisma.examForm.create({
    data: {
      adminId,
      title: "Integration Test Exam",
      slug,
      status: "published",
      isPublished: true,
      showResultImmediately: true,
      timeLimitMinutes: 30,
      passingScorePercent: 40,
      accessRule: { create: { accessType: "public_link" } },
      questions: {
        create: Array.from({ length: 5 }, (_, i) => ({
          questionText: `Test question ${i + 1}`,
          questionType: "single_choice",
          marks: 2,
          orderIndex: i,
          options: {
            create: [
              { optionText: "Option A", isCorrect: true,  orderIndex: 0 },
              { optionText: "Option B", isCorrect: false, orderIndex: 1 },
              { optionText: "Option C", isCorrect: false, orderIndex: 2 },
              { optionText: "Option D", isCorrect: false, orderIndex: 3 },
            ],
          },
        })),
      },
      ...overrides,
    },
    include: { questions: { include: { options: true } } },
  });
}

export async function seedStudent(email?: string) {
  const studentEmail = email ?? `student-${crypto.randomUUID().slice(0, 8)}@test.local`;
  return prisma.student.upsert({
    where: { email: studentEmail },
    update: {},
    create: {
      email: studentEmail,
      name: "Test Student",
      mobileNumber: "+919876543210",
      whatsappNumber: "+919876543210",
    },
  });
}

export async function seedEnrollment(examFormId: string, studentId: string) {
  const { hashSync } = await import("bcryptjs");
  const examPassword = "TEST1234";
  return {
    enrollment: await prisma.examEnrollment.upsert({
      where: { examFormId_studentId: { examFormId, studentId } },
      update: {},
      create: {
        examFormId,
        studentId,
        mobileNumber: "+919876543210",
        whatsappNumber: "+919876543210",
        passwordHash: hashSync(examPassword, 10),
      },
    }),
    examPassword,
  };
}

export async function createSession(examFormId: string, studentId: string) {
  const sessionToken = crypto.randomUUID();
  const session = await prisma.examSession.create({
    data: { examFormId, studentId, sessionToken, status: "in_progress" },
  });
  return { session, sessionToken };
}

/** Clean up all data created for a specific exam (by slug) */
export async function cleanupExam(slug: string) {
  await prisma.examForm.deleteMany({ where: { slug } });
}
