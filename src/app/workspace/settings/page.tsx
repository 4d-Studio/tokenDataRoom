import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";

export const metadata: Metadata = {
  title: "Settings",
  description: "Workspace branding, NDA template, and account options for Token.",
};
import { DeleteAccountCard } from "@/components/dataroom/delete-account-card";
import { NdaTemplateEditor } from "@/components/dataroom/nda-template-editor";
import { SettingsSection } from "@/components/dataroom/settings-section";
import { WorkspaceLogoUploader } from "@/components/dataroom/workspace-logo-uploader";
import { ProductPageIntro } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity } from "@/lib/dataroom/auth";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export default async function WorkspaceSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const workspace = await getCurrentWorkspace();
  if (!workspace) redirect("/onboarding");

  const defaultTemplate = buildDefaultNdaText(workspace.companyName);
  const activityEvents = await getWorkspaceActivity();

  const logoPreview = workspace.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={workspace.logoUrl}
      alt="Workspace logo"
      className="h-8 w-auto rounded object-contain"
    />
  ) : (
    <span className="text-[var(--tkn-text-fine)]">No logo set</span>
  );

  const ndaPreview = workspace.ndaTemplate ? (
    <span className="line-clamp-1">
      {stripHtml(workspace.ndaTemplate).slice(0, 100)}
      {workspace.ndaTemplate.length > 100 ? "…" : ""}
    </span>
  ) : (
    <span className="text-[var(--tkn-text-fine)]">Using default NDA template</span>
  );

  return (
    <AuthenticatedShell
      current="settings"
      userEmail={user.email}
      workspaceName={workspace.name}
      workspaceCompany={workspace.companyName}
      workspaceLogoUrl={workspace.logoUrl}
      activityEvents={activityEvents}
    >
      <ProductPageIntro
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your workspace branding, legal template, and account."
      />

      <div className="mt-5 flex flex-col gap-3">
        <SettingsSection
          title="Logo"
          description="Displayed in your sidebar and on shared room pages."
          preview={logoPreview}
        >
          <WorkspaceLogoUploader
            logoUrl={workspace.logoUrl}
            workspaceName={workspace.name}
            companyName={workspace.companyName}
          />
        </SettingsSection>

        <SettingsSection
          title="NDA template"
          description="The confidentiality agreement recipients sign before accessing your rooms."
          preview={ndaPreview}
        >
          <NdaTemplateEditor
            savedTemplate={workspace.ndaTemplate ?? ""}
            defaultTemplate={defaultTemplate}
            companyName={workspace.companyName}
          />
        </SettingsSection>

        <SettingsSection title="Delete account" description="Permanently remove your account and all associated data.">
          <DeleteAccountCard />
        </SettingsSection>
      </div>
    </AuthenticatedShell>
  );
}
