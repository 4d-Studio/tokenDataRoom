import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";
import { CreateVaultFormSkeleton } from "@/components/dataroom/route-loading";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity, getWorkspaceRooms } from "@/lib/dataroom/auth";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";

export const metadata: Metadata = {
  title: "New room",
  description: "Set up a Token room with NDA and password, then add documents from owner controls.",
};

const CreateVaultForm = dynamic(
  () =>
    import("@/components/dataroom/create-vault-form").then((m) => m.CreateVaultForm),
  { loading: () => <CreateVaultFormSkeleton /> },
);

export default async function NewVaultPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  const activityEvents = await getWorkspaceActivity();
  const rooms = await getWorkspaceRooms();

  return (
    <AuthenticatedShell
      current="new"
      userEmail={user.email}
      userPlan={user.plan}
      workspaceName={workspace.name}
      workspaceCompany={workspace.companyName}
      workspaceLogoUrl={workspace.logoUrl}
      activityEvents={activityEvents}
    >
      <header className="page-header pb-2">
        <ProductBreadcrumb
          items={[
            { href: "/workspace", label: "Rooms" },
            { label: "New room" },
          ]}
        />
      </header>

      <div className="page-grid">
        <CreateVaultForm
          userPlan={user.plan}
          currentRoomCount={rooms.length}
          defaultNdaText={workspace.ndaTemplate || buildDefaultNdaText(workspace.companyName)}
          defaultSenderCompany={workspace.companyName}
          defaultSenderName=""
        />
      </div>
    </AuthenticatedShell>
  );
}
