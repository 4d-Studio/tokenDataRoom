import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";
import { CreateVaultForm } from "@/components/dataroom/create-vault-form";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity, getWorkspaceRooms } from "@/lib/dataroom/auth";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";
import { getStorageMode } from "@/lib/dataroom/storage";

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
