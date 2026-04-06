import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CalendarPlus, LayoutPanelTop, Zap } from "lucide-react";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";
import { RoomsListSkeleton } from "@/components/dataroom/route-loading";
import { WorkspaceActivityFeed } from "@/components/dataroom/workspace-activity-feed";
import { WorkspaceEmptyState } from "@/components/dataroom/workspace-empty-state";
import {
  ProductSectionBody,
  ProductSectionCard,
  ProductSectionHeader,
  ProductMetric,
} from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity, getWorkspaceRooms } from "@/lib/dataroom/auth";
import { formatDateTime } from "@/lib/dataroom/helpers";
import { roomManageHref, roomNavItemsFromRooms } from "@/lib/dataroom/workspace-nav";

export const metadata: Metadata = {
  title: "Workspace",
  description: "Your Token workspace: datarooms, activity, and quick actions.",
};

const RoomsList = dynamic(
  () => import("@/components/dataroom/rooms-list").then((m) => m.RoomsList),
  { loading: () => <RoomsListSkeleton /> },
);

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  const [rooms, activityRows] = await Promise.all([
    getWorkspaceRooms(workspace),
    getWorkspaceActivity(workspace),
  ]);

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => r.status === "active").length;

  // Rooms created in the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const roomsThisWeek = rooms.filter((r) => new Date(r.createdAt) >= oneWeekAgo).length;


  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host") ?? "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  const roomNavItems = roomNavItemsFromRooms(rooms);

  return (
    <AuthenticatedShell
      current="workspace"
      userEmail={user.email}
      userPlan={user.plan}
      workspaceName={workspace.name}
      workspaceCompany={workspace.companyName}
      activityEvents={activityRows}
      roomNavItems={roomNavItems}
    >
      {rooms.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <WorkspaceEmptyState />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <ProductMetric
              icon={<LayoutPanelTop className="h-5 w-5" />}
              value={totalRooms}
              label="Total rooms"
              subtext="Including drafts."
            />
            <ProductMetric
              icon={<Zap className="h-5 w-5" />}
              value={activeRooms}
              label="Active"
              subtext="Shareable with recipients."
            />
            <ProductMetric
              icon={<CalendarPlus className="h-5 w-5" />}
              value={roomsThisWeek}
              label="New (7 days)"
              subtext="Created this week."
            />
          </div>

          <ProductSectionCard className="mt-8">
            <ProductSectionHeader title="Data rooms" />

            <ProductSectionBody className="py-0.5">
              <RoomsList
                rooms={rooms.map((room) => ({
                  ...room,
                  createdAtFormatted: formatDateTime(room.createdAt),
                  manageHref: roomManageHref(room),
                }))}
                baseUrl={baseUrl}
              />
            </ProductSectionBody>
          </ProductSectionCard>

          <WorkspaceActivityFeed
            events={activityRows}
            hasRooms={rooms.length > 0}
          />
        </>
      )}
    </AuthenticatedShell>
  );
}
