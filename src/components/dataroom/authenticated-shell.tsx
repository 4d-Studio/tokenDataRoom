"use client";

import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Activity, CreditCard, FilePlus2, LayoutPanelTop, LogOut, Settings } from "lucide-react";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import type { WorkspaceActivityRow } from "@/components/dataroom/workspace-activity-feed";
import { ActivityFeedList } from "@/components/dataroom/workspace-activity-feed";

type AuthenticatedShellProps = {
  children: ReactNode;
  current: "workspace" | "new" | "settings" | "agent";
  userEmail: string;
  workspaceName?: string;
  workspaceCompany?: string;
  workspaceLogoUrl?: string;
  activityEvents?: WorkspaceActivityRow[];
};

const navItems = [
  {
    href: "/workspace",
    label: "Rooms",
    icon: LayoutPanelTop,
    key: "workspace",
  },
  {
    href: "/new",
    label: "Create room",
    icon: FilePlus2,
    key: "new",
  },
  {
    href: "/workspace/settings",
    label: "Settings",
    icon: Settings,
    key: "settings",
  },
  {
    href: "/pricing",
    label: "Upgrade plan",
    icon: CreditCard,
    key: "pricing",
  },
] as const;

export function AuthenticatedShell({
  children,
  current,
  userEmail,
  workspaceName,
  workspaceCompany,
  workspaceLogoUrl,
  activityEvents,
}: AuthenticatedShellProps) {
  return (
    <SidebarProvider
      style={
        {
          /* Canvas blueprint sidebar width */
          "--sidebar-width": "16.25rem",
        } as CSSProperties
      }
    >
      {/* Do not set h-full here — it overrides Sidebar's h-svh and breaks full-height nav. */}
      <Sidebar collapsible="none" className="border-r border-sidebar-border">
        <SidebarHeader className="gap-3 px-3 py-4">
          <Link href="/workspace" className="block">
            <BrandMark logoUrl={workspaceLogoUrl} />
          </Link>
          {workspaceName ? (
            <div className="px-1">
              <div className="label-title">Workspace</div>
              <div className="mt-1.5 text-[0.92rem] font-semibold tracking-[-0.03em] text-sidebar-foreground">
                {workspaceName}
              </div>
              {workspaceCompany ? (
                <div className="mt-1 text-[0.82rem] text-sidebar-foreground/65">{workspaceCompany}</div>
              ) : null}
            </div>
          ) : null}
        </SidebarHeader>

        <SidebarSeparator />

        <SidebarContent className="px-2 py-2 flex-1 min-h-0">
          <SidebarGroup>
            <SidebarGroupLabel>Workspace</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={current === item.key}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarSeparator />

        <SidebarFooter className="mt-auto gap-3 px-3 py-4 pb-6">
          <SidebarGroupLabel className="px-1">Account</SidebarGroupLabel>
          <div className="px-1 text-sm text-muted-foreground">Signed in as</div>
          <div className="px-1 text-sm font-medium text-sidebar-foreground">{userEmail}</div>
          <div className="h-px bg-sidebar-border" />
          <Link
            href="/agent"
            className="rounded-md p-1 -m-1 px-1 text-sm text-muted-foreground transition hover:bg-[var(--sidebar-accent)] hover:text-sidebar-foreground"
          >
            Agent docs
          </Link>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="ghost" className="w-full justify-start text-[color:var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[color:var(--sidebar-foreground)]">
              <LogOut data-icon="inline-start" />
              Logout
            </Button>
          </form>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-transparent shadow-none">
        {activityEvents ? (
          <header className="flex h-12 items-center justify-end border-b border-border px-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Activity
                  {activityEvents.length > 0 && (
                    <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1.5 text-[0.65rem] font-bold text-white">
                      {activityEvents.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Recent activity</SheetTitle>
                  <SheetDescription>
                    Audit trail across your data rooms
                  </SheetDescription>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                  <ActivityFeedList events={activityEvents} />
                </div>
              </SheetContent>
            </Sheet>
          </header>
        ) : null}
        <div className="page-shell flex max-w-[60rem] !min-h-0 min-h-svh flex-col py-5">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
