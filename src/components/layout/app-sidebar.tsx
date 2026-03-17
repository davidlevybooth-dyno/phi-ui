"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, MessageSquare, Settings, History } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { DynoLogo } from "@/components/shared/dyno-logo";
import { FEATURES } from "@/lib/config/features";

const allNavItems = [
  { href: "/dashboard/datasets", label: "Dashboard", icon: LayoutDashboard, flag: true },
  { href: "/dashboard/agent", label: "Agent", icon: MessageSquare, flag: FEATURES.dashboardAgent },
  { href: "/dashboard/chats", label: "Chats", icon: History, flag: FEATURES.dashboardAgent },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, flag: true },
];

const navItems = allNavItems.filter((item) => item.flag);

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
    </Sidebar>
  );
}
