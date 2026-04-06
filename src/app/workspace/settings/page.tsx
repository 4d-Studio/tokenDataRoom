import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AuthenticatedShell } from "@/components/dataroom/authenticated-shell";
import { DeleteAccountCard } from "@/components/dataroom/delete-account-card";
import { NdaTemplateEditorSkeleton } from "@/components/dataroom/route-loading";
import { SettingsSection } from "@/components/dataroom/settings-section";
import { WorkspaceLogoUploader } from "@/components/dataroom/workspace-logo-uploader";
import { ProductPageIntro } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceActivity, getWorkspaceRooms } from "@/lib/dataroom/auth";
import { roomNavItemsFromRooms } from "@/lib/dataroom/workspace-nav";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";
import { describePlanForWorkspace } from "@/lib/dataroom/plan-descriptions";

export const metadata: Metadata = {
  title: "Settings",
  description: "Workspace branding, NDA template, and account options for Token.",
};

const NdaTemplateEditor = dynamic(
  () =>
    import("@/components/dataroom/nda-template-editor").then((m) => m.NdaTemplateEditor),
  { loading: () => <NdaTemplateEditorSkeleton /> },
);

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
  const rooms = await getWorkspaceRooms();
  const planInfo = describePlanForWorkspace(user.plan);

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
      userPlan={user.plan}
      workspaceName={workspace.name}
      workspaceCompany={workspace.companyName}
      activityEvents={activityEvents}
      roomNavItems={roomNavItemsFromRooms(rooms)}
    >
      <ProductPageIntro
        eyebrow="Settings"
        title="Workspace settings"
        description="Manage your workspace branding, legal template, and account."
      />

      <div className="mt-5 flex flex-col gap-3">
        <SettingsSection
          title="Plan & limits"
          description={`You are on the ${planInfo.label} plan. Paid upgrades are coming soon; limits below match your account today.`}
          preview={
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-[var(--tkn-text-fine)]">
              {planInfo.bullets.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          }
          defaultOpen
        >
          <p className="text-sm leading-relaxed text-[var(--tkn-text-support)]">
            See every tier, file caps, and what ships next on the{" "}
            <Link href="/pricing" className="font-medium text-primary underline-offset-4 hover:underline">
              pricing page
            </Link>
            .
          </p>
        </SettingsSection>

        <SettingsSection
          title="Logo"
          description="Shown on shared room pages (recipient header) when NDA is enabled."
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
