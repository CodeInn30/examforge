import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ slug: string; sessionId: string }> };

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createSimplePdf(lines: string[]) {
  const content = [
    "BT",
    "/F1 12 Tf",
    "14 TL",
    "50 780 Td",
    ...lines.map((line) => `(${escapePdfText(line)}) Tj T*`),
    "ET",
  ].join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { slug, sessionId } = await ctx.params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Result token required" }, { status: 401 });
  }

  const session = await prisma.examSession.findFirst({
    where: {
      id: sessionId,
      resultShareToken: token,
      examForm: { slug },
    },
    include: {
      student: { select: { name: true, email: true } },
      examForm: { select: { title: true, passingScorePercent: true } },
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Result not found" }, { status: 404 });
  }

  if (session.status === "in_progress") {
    return NextResponse.json({ error: "Exam not yet submitted" }, { status: 400 });
  }

  const percentage = Number(session.percentage ?? 0);
  const score = Number(session.score ?? 0);
  const totalMarks = Number(session.totalMarks ?? 0);
  const submittedAt = session.submittedAt
    ? session.submittedAt.toLocaleString("en-IN")
    : "Not available";

  const pdf = createSimplePdf([
    "Exam Result",
    "",
    `Exam: ${session.examForm.title}`,
    `Student: ${session.student.name ?? session.student.email}`,
    `Email: ${session.student.email}`,
    `Submitted At: ${submittedAt}`,
    "",
    `Score: ${score} / ${totalMarks}`,
    `Percentage: ${percentage.toFixed(1)}%`,
    `Passing Score: ${session.examForm.passingScorePercent}%`,
    `Status: ${session.isPassed ? "PASSED" : "FAILED"}`,
  ]);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${slug}-result.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
