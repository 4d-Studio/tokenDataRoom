import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { ShareExperienceSkeleton } from "@/components/dataroom/route-loading";

const ShareExperience = nextDynamic(
  () =>
    import("@/components/dataroom/share-experience").then((m) => m.ShareExperience),
  { loading: () => <ShareExperienceSkeleton /> },
);
import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getUserById, getWorkspaceById } from "@/lib/dataroom/auth-store";
import {
  planAllowsWorkspaceLogo,
  planShowsSharePoweredByToken,
  type WorkspacePlan,
} from "@/lib/dataroom/plan-limits";
import {
  buildDefaultNdaText,
  formatDateTime,
  getBaseUrlFromHeaders,
} from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import { getVanitySlugForRoom, resolveVanitySlug } from "@/lib/dataroom/vanity-slugs";
import {
  verifyWorkspaceNdaToken,
  workspaceNdaCookieName,
} from "@/lib/dataroom/workspace-nda-access";

export const dynamic = "force-dynamic";

/** Resolve a URL slug to a real fm-* slug (handles vanity links). */
async function resolveSlug(urlSlug: string): Promise<string | null> {
  if (isValidPublicVaultSlug(urlSlug)) return urlSlug;
  return resolveVanitySlug(urlSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = await resolveSlug(rawSlug);
  if (!slug) {
    return { title: "Room", robots: { index: false, follow: false } };
  }
  const storage = getVaultStorage();
  const vault = await storage.getVaultMetadata(slug);
  if (!vault) {
    return { title: "Room", robots: { index: false, follow: false } };
  }
  return {
    title: vault.title,
    description: `Shared dataroom on Token: ${vault.title}.`,
    robots: { index: false, follow: false },
  };
}

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug: rawSlug } = await params;
  const slug = await resolveSlug(rawSlug);
  if (!slug) notFound();

  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) notFound();

  const cookieStore = await cookies();
  const access = readVaultAccessFromCookies(cookieStore, slug);
  const acceptance = access?.acceptanceId
    ? await storage.getAcceptance(slug, access.acceptanceId)
    : null;

  let workspace: Awaited<ReturnType<typeof getWorkspaceById>> = null;
  let workspaceOwnerPlan: WorkspacePlan | null = null;
  if (metadata.workspaceId) {
    workspace = await getWorkspaceById(metadata.workspaceId);
    if (workspace) {
      const owner = await getUserById(workspace.userId);
      workspaceOwnerPlan = owner?.plan ?? "free";
    }
  }

  const workspaceForNda =
    metadata.requiresNda && workspace ? workspace : null;

  const useWorkspaceNda = Boolean(
    metadata.requiresNda && metadata.workspaceId && workspaceForNda,
  );

  const workspaceNdaText = useWorkspaceNda
    ? (workspaceForNda!.ndaTemplate || buildDefaultNdaText(workspaceForNda!.companyName))
    : null;

  const workspaceNdaPayload =
    metadata.workspaceId && metadata.requiresNda
      ? verifyWorkspaceNdaToken(
          cookieStore.get(workspaceNdaCookieName(metadata.workspaceId))?.value,
          metadata.workspaceId,
        )
      : null;

  const needsBootstrapFromWorkspace = Boolean(
    useWorkspaceNda && workspaceNdaPayload && !access,
  );

  const ndaCardTitle = useWorkspaceNda
    ? "Workspace confidentiality agreement"
    : "Non-disclosure agreement";

  const orgLabel = workspaceForNda?.companyName ?? "this organization";
  const ndaCardDescription = useWorkspaceNda ? (
    <>
      One signing covers every room shared by{" "}
      <span className="font-medium text-foreground">{orgLabel}</span>.
    </>
  ) : (
    <>Review and sign before unlocking the document.</>
  );

  const ndaDocumentText = useWorkspaceNda
    ? (workspaceNdaText ?? metadata.ndaText ?? "")
    : (metadata.ndaText ?? "");

  const ndaPostPath = `/api/vaults/${slug}/${useWorkspaceNda ? "workspace-nda" : "access"}`;

  const ndaAcceptSuccessMessage = useWorkspaceNda
    ? "Workspace NDA accepted — it covers every room from this workspace. You can now unlock."
    : "NDA accepted. You can now unlock the document.";

  const headerList = await headers();
  const shareHostLabel =
    headerList.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headerList.get("host") ??
    "";

  /** Preformatted on the server so the client header does not re-run Intl (avoids TZ hydration mismatch). */
  const shareExpiresLabel = formatDateTime(metadata.expiresAt);

  const baseUrl = getBaseUrlFromHeaders(headerList);
  const vanitySlug = await getVanitySlugForRoom(slug);
  const recipientShareUrl = `${baseUrl}/s/${vanitySlug ?? slug}`;

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-8 sm:px-8 sm:py-12">
      <div className="pb-20">
        <ShareExperience
          metadata={metadata}
          initialAcceptance={acceptance}
          initialAccessGranted={Boolean(access)}
          ndaCardTitle={ndaCardTitle}
          ndaCardDescription={ndaCardDescription}
          ndaDocumentText={ndaDocumentText}
          ndaPostPath={ndaPostPath}
          ndaAcceptSuccessMessage={ndaAcceptSuccessMessage}
          needsBootstrapFromWorkspace={needsBootstrapFromWorkspace}
          shareHostLabel={shareHostLabel}
          workspaceLogoUrl={
            workspace && workspaceOwnerPlan && planAllowsWorkspaceLogo(workspaceOwnerPlan)
              ? workspace.logoUrl
              : undefined
          }
          workspaceCompanyName={workspace?.companyName}
          shareExpiresLabel={shareExpiresLabel}
          recipientShareUrl={recipientShareUrl}
          showPoweredByToken={
            workspaceOwnerPlan ? planShowsSharePoweredByToken(workspaceOwnerPlan) : true
          }
        />
      </div>
    </main>
  );
}
