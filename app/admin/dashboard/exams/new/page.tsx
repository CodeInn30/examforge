import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExamForm } from "@/components/admin/ExamForm";

export default function NewExamPage() {
  return (
    <div className="flex flex-col flex-1 p-6 gap-6">
      <div>
        <Link
          href="/admin/dashboard/exams"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Exam</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up your examination details
        </p>
      </div>

      <div className="max-w-2xl">
        <ExamForm mode="create" />
      </div>
    </div>
  );
}
