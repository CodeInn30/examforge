"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { AccessControl } from "@/components/admin/AccessControl";
import { ArrowLeft } from "lucide-react";

export default function AccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [isPublished, setIsPublished] = useState(false);
  const [examTitle, setExamTitle] = useState("");

  useEffect(() => {
    apiFetch(`/api/admin/exams/${id}`)
      .then((r) => r.json())
      .then(({ exam }) => {
        setIsPublished(exam.isPublished);
        setExamTitle(exam.title);
      });
  }, [id]);

  return (
    <div className="flex flex-col flex-1 p-6 gap-6">
      {/* Back + header */}
      <div>
        <Link
          href={`/admin/dashboard/exams/${id}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="size-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Access Control</h1>
        {examTitle && (
          <p className="text-sm text-muted-foreground mt-1">{examTitle}</p>
        )}
      </div>

      <div className="max-w-2xl">
        <AccessControl examId={id} isPublished={isPublished} />
      </div>
    </div>
  );
}
