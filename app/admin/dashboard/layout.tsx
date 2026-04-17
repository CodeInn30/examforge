import { AuthProvider } from "@/components/admin/AuthProvider"
import { AppSidebar } from "@/components/app-sidebar"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={0}>
        <SidebarProvider
          style={
            {
              "--sidebar-width": "15rem",
              "--header-height": "3rem",
            } as React.CSSProperties
          }
        >
          <AppSidebar />
          <SidebarInset className="min-h-svh">
            <SiteHeader />
            {children}
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AuthProvider>
  )
}
