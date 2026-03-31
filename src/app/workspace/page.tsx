import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { CalendarPlus, LayoutPanelTop, Zap } from "lucide-react";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";
import { WorkspaceEmptyState } from "@/components/dataroom/workspace-empty-state";
import {
  ProductPageIntro,
  ProductSectionBody,
  ProductSectionCard,
  ProductSectionHeader,
  ProductMetric,
} from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity, getWorkspaceRooms } from "@/lib/dataroom/auth";
import { formatDateTime } from "@/lib/dataroom/helpers";
import { Button } from "@/components/ui/button";
import { RoomsList } from "@/components/dataroom/rooms-list";

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  const rooms = await getWorkspaceRooms();

  const totalRooms = rooms.length;
  const activeRooms = rooms.filter((r) => r.status === "active").length;

  // Rooms created in the last 7 days
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const roomsThisWeek = rooms.filter((r) => new Date(r.createdAt) >= oneWeekAgo).length;

  const activityRows = await getWorkspaceActivity();

  const headersList = await headers();
  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("host") ?? "localhost:3000";
  const baseUrl = `${protocol}://${host}`;

  return (
    <AuthenticatedShell
      current="workspace"
      userEmail={user.email}
      workspaceName={workspace.name}
      workspaceCompany={workspace.companyName}
      workspaceLogoUrl={workspace.logoUrl}
      activityEvents={activityRows}
    >
      {rooms.length === 0 ? (
        <div className="flex flex-1 flex-col justify-center py-10 sm:py-16">
          <WorkspaceEmptyState />
        </div>
      ) : (
        <>
          <ProductPageIntro
            eyebrow="Workspace"
            title="Data rooms"
            description="Share sensitive documents with legal protection, NDA gating, and a clear audit trail."
            action={
              <Button asChild size="sm">
                <Link href="/new">Create room</Link>
              </Button>
            }
          />

          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ProductMetric
              icon={<LayoutPanelTop className="h-5 w-5" />}
              value={totalRooms}
              label="Total data rooms"
              subtext="Including drafts and inactive."
            />
            <ProductMetric
              icon={<Zap className="h-5 w-5" />}
              value={activeRooms}
              label="Active & shareable"
              subtext="Recipients can open with the shared link."
            />
            <ProductMetric
              icon={<CalendarPlus className="h-5 w-5" />}
              value={roomsThisWeek}
              label="New rooms (7 days)"
              subtext="How many data rooms you created this week."
            />
          </div>

          <ProductSectionCard>
            <ProductSectionHeader
              title="Your data rooms"
              description="Open the recipient link to preview what they see. Owner controls (revoke, activity) stay on the private management URL for each room."
            />

            <ProductSectionBody className="py-0.5">
              <RoomsList
                rooms={rooms.map((room) => ({
                  ...room,
                  createdAtFormatted: formatDateTime(room.createdAt),
                }))}
                baseUrl={baseUrl}
              />
            </ProductSectionBody>
          </ProductSectionCard>
        </>
      )}
    </AuthenticatedShell>
  );
}
