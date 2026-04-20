import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/exam/[slug]/register/route";
import { seedAdmin, seedExam, cleanupExam } from "./helpers/seed";
import { getPrismaTest } from "./helpers/db";

const prisma = getPrismaTest();
let examSlug: string;

function makeRequest(slug: string, body: object) {
  return new NextRequest(`http://localhost/api/exam/${slug}/register`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  email: "register-test@example.local",
  name: "Test Student",
  mobileNumber: "+919876543210",
  whatsappNumber: "+919876543210",
};

beforeAll(async () => {
  const admin = await seedAdmin();
  const exam = await seedExam(admin.id);
  examSlug = exam.slug;
});

afterAll(async () => {
  await cleanupExam(examSlug);
});

describe("POST /api/exam/[slug]/register", () => {
  it("registers a new student and returns examPassword", async () => {
    const res = await POST(makeRequest(examSlug, validBody), {
      params: Promise.resolve({ slug: examSlug }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.registered).toBe(true);
    expect(data.examPassword).toBeTruthy();
    expect(data.enrollmentId).toBeTruthy();
  });

  it("is idempotent — second registration resets password", async () => {
    const body = { ...validBody, email: "idempotent@example.local" };
    const res1 = await POST(makeRequest(examSlug, body), {
      params: Promise.resolve({ slug: examSlug }),
    });
    const res2 = await POST(makeRequest(examSlug, body), {
      params: Promise.resolve({ slug: examSlug }),
    });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    const d1 = await res1.json();
    const d2 = await res2.json();
    // Same enrollmentId, new password
    expect(d1.enrollmentId).toBe(d2.enrollmentId);
    expect(d1.examPassword).not.toBe(d2.examPassword);
  });

  it("returns 404 for unknown exam slug", async () => {
    const res = await POST(makeRequest("non-existent-slug", validBody), {
      params: Promise.resolve({ slug: "non-existent-slug" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid email", async () => {
    const res = await POST(
      makeRequest(examSlug, { ...validBody, email: "not-an-email" }),
      { params: Promise.resolve({ slug: examSlug }) }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing name", async () => {
    const res = await POST(
      makeRequest(examSlug, { ...validBody, name: "" }),
      { params: Promise.resolve({ slug: examSlug }) }
    );
    expect(res.status).toBe(400);
  });

  it("creates student record in DB", async () => {
    const email = "db-check@example.local";
    await POST(makeRequest(examSlug, { ...validBody, email }), {
      params: Promise.resolve({ slug: examSlug }),
    });

    const student = await prisma.student.findUnique({ where: { email } });
    expect(student).not.toBeNull();
    expect(student?.name).toBe("Test Student");
  });
});
