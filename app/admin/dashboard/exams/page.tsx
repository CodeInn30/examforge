"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Clock,
  Users,
  FileSpreadsheet,
  BookOpen,
  ChevronRight,
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  slug: string;
  status: string;
  isPublished: boolean;
  timeLimitMinutes: number | null;
  totalMarks: number;
  createdAt: string;
  _count: { questions: number; sessions: number };
}

const statusConfig: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
  published:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  closed:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  archived: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export default function ExamsListPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiFetch("/api/admin/exams")
      .then((r) => r.json())
      .then(({ exams }) => setExams(exams ?? []))
      .catch(() => setError("Failed to load exams"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col flex-1 p-6 gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your examination forms
          </p>
        </div>
        <Link href="/admin/dashboard/exams/new">
          <Button>
            <Plus className="size-4 mr-2" />
            New Exam
          </Button>
        </Link>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-destructive bg-destructive/8 border border-destructive/20 px-3 py-2.5 rounded-lg">
          {error}
        </p>
      )}

      {/* Loading */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : exams.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="rounded-2xl bg-muted p-5">
            <BookOpen className="size-10 text-muted-foreground" />
          </div>
          <div>
            <p className="text-lg font-semibold">No exams yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first exam to get started
            </p>
          </div>
          <Link href="/admin/dashboard/exams/new">
            <Button>
              <Plus className="size-4 mr-2" />
              New Exam
            </Button>
          </Link>
        </div>
      ) : (
        /* Exam list */
        <div className="grid grid-cols-1 gap-3">
          {exams.map((exam) => (
            <Link
              key={exam.id}
              href={`/admin/dashboard/exams/${exam.id}`}
              className="bg-card border rounded-xl p-5 hover:bg-accent/40 transition-colors flex items-center gap-4"
            >
              {/* Icon box */}
              <div className="shrink-0 rounded-lg bg-primary/10 p-2.5">
                <FileSpreadsheet className="size-5 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{exam.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[exam.status] ?? ""}`}
                  >
                    {exam.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground flex-wrap">
                  <span>{exam._count.questions} questions</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" />
                    {exam._count.sessions} submissions
                  </span>
                  {exam.timeLimitMinutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {exam.timeLimitMinutes} min
                    </span>
                  )}
                  <span>{exam.totalMarks} marks</span>
                </div>
              </div>

              {/* Right: date + arrow */}
              <div className="shrink-0 flex items-center gap-2 text-muted-foreground">
                <span className="text-xs hidden sm:block">
                  {new Date(exam.createdAt).toLocaleDateString()}
                </span>
                <ChevronRight className="size-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
