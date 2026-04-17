"use client"

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/components/admin/AuthProvider"
import { ChevronsUpDown, LogOut, Settings } from "lucide-react"
import Link from "next/link"

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function NavUser() {
  const { isMobile } = useSidebar()
  const { admin, logout } = useAuth()

  if (!admin) return null

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              tooltip={admin.name}
              className="rounded-xl pr-2 transition-colors
                hover:bg-sidebar-accent/70
                data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <Avatar className="h-7 w-7 rounded-lg shrink-0">
                <AvatarFallback className="rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-[11px] font-bold">
                  {getInitials(admin.name)}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left leading-tight min-w-0">
                <span className="truncate text-sm font-medium">{admin.name}</span>
                <span className="truncate text-[11px] text-sidebar-foreground/50">{admin.email}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-3.5 shrink-0 text-sidebar-foreground/40" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-52 rounded-xl p-1.5 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={6}
          >
            {/* Identity block */}
            <DropdownMenuLabel className="p-0 mb-1">
              <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 bg-muted/50">
                <Avatar className="h-8 w-8 rounded-lg shrink-0">
                  <AvatarFallback className="rounded-lg bg-primary/15 text-primary text-xs font-bold">
                    {getInitials(admin.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left leading-tight min-w-0">
                  <span className="truncate text-sm font-semibold">{admin.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{admin.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem asChild className="gap-2.5 rounded-lg cursor-pointer h-8 text-sm">
              <Link href="/admin/dashboard/settings">
                <Settings className="size-4 text-muted-foreground" />
                Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem
              onClick={logout}
              className="gap-2.5 rounded-lg cursor-pointer h-8 text-sm text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <LogOut className="size-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
