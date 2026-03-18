"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, History, Zap } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DynoLogo } from "@/components/shared/dyno-logo";
import { FEATURES } from "@/lib/config/features";
import { useQuota } from "@/hooks/use-quota";

const allNavItems = [
  { href: "/dashboard/datasets", label: "Dashboard", icon: LayoutDashboard, flag: true },
  { href: "/dashboard/agent", label: "Agent", icon: MessageSquare, flag: FEATURES.dashboardAgent },
  { href: "/dashboard/chats", label: "Chats", icon: History, flag: FEATURES.dashboardAgent },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, flag: true },
];

const navItems = allNavItems.filter((item) => item.flag);

function QuotaFooter() {
  const quota = useQuota();

  if (quota.status === "loading" || quota.status === "unavailable") return null;

  const pct = Math.min(100, Math.round((quota.used / quota.max) * 100));
  const low = quota.remaining <= 10;

  return (
    <div className="px-3 py-3 border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
      <div className="flex items-center justify-between mb-1.5">
        <span className="flex items-center gap-1 text-[11px] font-medium text-sidebar-foreground/70">
          <Zap className="size-3" />
          Early access
        </span>
        <span className={`text-[11px] tabular-nums font-medium ${low ? "text-amber-500" : "text-sidebar-foreground/70"}`}>
          {quota.remaining} / {quota.max} left
        </span>
      </div>
      <div className="h-1 w-full rounded-full bg-sidebar-accent overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${low ? "bg-amber-500" : "bg-primary/60"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <DynoLogo className="size-7 shrink-0" />
          <span className="font-semibold text-sm truncate">Dyno Phi</span>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map(({ href, label, icon: Icon }) => {
                const active =
                  href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(href);
                return (
                  <SidebarMenuItem key={href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={label}>
                      <Link href={href}>
                        <Icon className="size-4" />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <QuotaFooter />
      </SidebarFooter>
    </Sidebar>
  );
}
