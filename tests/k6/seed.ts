/**
 * Run before k6:
 *   npx tsx tests/k6/seed.ts
 *
 * Creates a published exam with 50 questions in the DB,
 * ready for the load test. Safe to run multiple times (idempotent).
 */

import { PrismaClient } from "../../lib/generated/prisma";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashSync } from "bcryptjs";
import crypto from "crypto";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const EXAM_SLUG = process.env.EXAM_SLUG ?? "load-test-exam";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe@123";
const QUESTION_COUNT = 50;

async function main() {
  console.log(`Seeding load-test exam: slug="${EXAM_SLUG}"`);

  // Ensure admin exists and is active
  let admin = await prisma.admin.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    admin = await prisma.admin.create({
      data: {
        name: "Load Test Admin",
        email: ADMIN_EMAIL,
        passwordHash: hashSync(ADMIN_PASSWORD, 10),
        role: "super_admin",
        isActive: true,
        isEmailVerified: true,
      },
    });
    console.log(`  Created admin: ${admin.email}`);
  } else {
    console.log(`  Admin already exists: ${admin.email}`);
  }

  // Delete existing exam with same slug (clean slate, in dependency order)
  const existing = await prisma.examForm.findUnique({ where: { slug: EXAM_SLUG } });
  if (existing) {
    const sessions = await prisma.examSession.findMany({ where: { examFormId: existing.id }, select: { id: true } });
    const sessionIds = sessions.map((s) => s.id);
    if (sessionIds.length > 0) {
      await prisma.examResponse.deleteMany({ where: { sessionId: { in: sessionIds } } });
      await prisma.examSession.deleteMany({ where: { id: { in: sessionIds } } });
    }
    await prisma.examEnrollment.deleteMany({ where: { examFormId: existing.id } });
    await prisma.examForm.delete({ where: { slug: EXAM_SLUG } });
    console.log(`  Deleted existing exam: ${EXAM_SLUG}`);
  }

  // Create exam
  const exam = await prisma.examForm.create({
    data: {
      adminId: admin.id,
      title: "Load Test Exam",
      slug: EXAM_SLUG,
      status: "published",
      isPublished: true,
      showResultImmediately: true,
      allowReviewAnswers: false,
      timeLimitMinutes: 90,
      passingScorePercent: 40,
      accessRule: {
        create: { accessType: "public_link" },
      },
      questions: {
        create: Array.from({ length: QUESTION_COUNT }, (_, i) => {
          const correctIdx = i % 4; // rotate which option is correct
          return {
            questionText: `Question ${i + 1}: What is the correct answer to this sample question?`,
            questionType: "single_choice",
            marks: 2,
            orderIndex: i,
            options: {
              create: [0, 1, 2, 3].map((j) => ({
                optionText: `Option ${String.fromCharCode(65 + j)} for Q${i + 1}`,
                isCorrect: j === correctIdx,
                orderIndex: j,
              })),
            },
          };
        }),
      },
    },
    include: { questions: { include: { options: true } } },
  });

  console.log(`  Created exam: "${exam.title}" (${exam.questions.length} questions)`);
  console.log(`  Exam slug: ${exam.slug}`);
  console.log(`\nReady. Run k6 with: EXAM_SLUG=${EXAM_SLUG}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
