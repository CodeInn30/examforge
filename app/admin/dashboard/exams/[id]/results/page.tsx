"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { SubmissionsTable } from "@/components/admin/SubmissionsTable";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function ResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [sessions, setSessions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [examTitle, setExamTitle] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/admin/exams/${id}`).then((r) => r.json()),
      apiFetch(`/api/admin/exams/${id}/submissions`).then((r) => r.json()),
      apiFetch(`/api/admin/exams/${id}/analytics`).then((r) => r.json()),
    ])
      .then(([{ exam }, { sessions }, { analytics }]) => {
        setExamTitle(exam?.title ?? "");
        setSessions(sessions ?? []);
        setAnalytics(analytics ?? null);
      })
      .finally(() => setLoading(false));
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
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        {examTitle && (
          <p className="text-sm text-muted-foreground mt-1">{examTitle}</p>
        )}
      </div>

      {/* Loading skeleton */}
      {loading ? (
        <div className="bg-card border rounded-xl p-5 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))}
        </div>
      ) : (
        <SubmissionsTable sessions={sessions} analytics={analytics} examId={id} />
      )}
    </div>
  );
}
