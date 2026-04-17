"use client"

import { usePathname } from "next/navigation"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { FileSpreadsheet, Settings, LayoutDashboard, ChevronRight, PlusCircle, ClipboardList, ShieldCheck, HelpCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import Link from "next/link"

interface Crumb {
  label: string
  href?: string
  Icon?: LucideIcon
}

function buildBreadcrumbs(pathname: string): Crumb[] {
  // /admin/dashboard/exams
  if (/^\/admin\/dashboard\/exams$/.test(pathname)) {
    return [{ label: "Exams", Icon: FileSpreadsheet }]
  }
  // /admin/dashboard/exams/new
  if (/^\/admin\/dashboard\/exams\/new$/.test(pathname)) {
    return [
      { label: "Exams", href: "/admin/dashboard/exams", Icon: FileSpreadsheet },
      { label: "New Exam", Icon: PlusCircle },
    ]
  }
  // /admin/dashboard/exams/[id]/questions
  if (/^\/admin\/dashboard\/exams\/[^/]+\/questions$/.test(pathname)) {
    const id = pathname.split("/")[4]
    return [
      { label: "Exams", href: "/admin/dashboard/exams", Icon: FileSpreadsheet },
      { label: "Detail", href: `/admin/dashboard/exams/${id}` },
      { label: "Questions", Icon: HelpCircle },
    ]
  }
  // /admin/dashboard/exams/[id]/results
  if (/^\/admin\/dashboard\/exams\/[^/]+\/results$/.test(pathname)) {
    const id = pathname.split("/")[4]
    return [
      { label: "Exams", href: "/admin/dashboard/exams", Icon: FileSpreadsheet },
      { label: "Detail", href: `/admin/dashboard/exams/${id}` },
      { label: "Submissions", Icon: ClipboardList },
    ]
  }
  // /admin/dashboard/exams/[id]/access
  if (/^\/admin\/dashboard\/exams\/[^/]+\/access$/.test(pathname)) {
    const id = pathname.split("/")[4]
    return [
      { label: "Exams", href: "/admin/dashboard/exams", Icon: FileSpreadsheet },
      { label: "Detail", href: `/admin/dashboard/exams/${id}` },
      { label: "Access Control", Icon: ShieldCheck },
    ]
  }
  // /admin/dashboard/exams/[id]
  if (/^\/admin\/dashboard\/exams\/[^/]+$/.test(pathname)) {
    return [
      { label: "Exams", href: "/admin/dashboard/exams", Icon: FileSpreadsheet },
      { label: "Detail" },
    ]
  }
  // /admin/dashboard/settings
  if (/^\/admin\/dashboard\/settings/.test(pathname)) {
    return [{ label: "Settings", Icon: Settings }]
  }
  return [{ label: "Dashboard", Icon: LayoutDashboard }]
}

export function SiteHeader() {
  const pathname = usePathname()
  const crumbs = buildBreadcrumbs(pathname)

  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center gap-2 border-b border-border/60 bg-background/90 backdrop-blur-md px-4 lg:px-6 transition-[width,height] ease-linear">
      <SidebarTrigger className="size-7 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors" />
      <Separator orientation="vertical" className="mx-0.5 data-[orientation=vertical]:h-4 bg-border/60" />

      <nav className="flex items-center gap-1 text-sm min-w-0">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          const Icon = crumb.Icon

          return (
            <div key={i} className="flex items-center gap-1 min-w-0">
              {i > 0 && (
                <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
              )}
              {crumb.href && !isLast ? (
                <Link
                  href={crumb.href}
                  className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors truncate"
                >
                  {i === 0 && Icon && <Icon className="size-3.5 shrink-0" />}
                  <span>{crumb.label}</span>
                </Link>
              ) : (
                <span className={`flex items-center gap-1.5 truncate ${isLast ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                  {i === 0 && Icon && <Icon className="size-3.5 shrink-0" />}
                  {crumb.label}
                </span>
              )}
            </div>
          )
        })}
      </nav>
    </header>
  )
}
