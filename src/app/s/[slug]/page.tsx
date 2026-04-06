import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { cookies, headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ShareExperienceSkeleton } from "@/components/dataroom/route-loading";

const ShareExperience = nextDynamic(
  () =>
    import("@/components/dataroom/share-experience").then((m) => m.ShareExperience),
  { loading: () => <ShareExperienceSkeleton /> },
);
import { readVaultAccessFromCookies } from "@/lib/dataroom/access";
import { getWorkspaceById } from "@/lib/dataroom/auth-store";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import { resolveVanitySlug } from "@/lib/dataroom/vanity-slugs";
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

  const workspace =
    metadata.workspaceId && metadata.requiresNda
      ? await getWorkspaceById(metadata.workspaceId)
      : null;

  const useWorkspaceNda = Boolean(
    metadata.requiresNda && metadata.workspaceId && workspace,
  );

  const workspaceNdaText = useWorkspaceNda
    ? (workspace!.ndaTemplate || buildDefaultNdaText(workspace!.companyName))
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

  const orgLabel = workspace?.companyName ?? "this organization";
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      {/* Recipient page: minimal chrome — title and context live inside ShareExperience */}
      <header className="mb-8 flex items-center justify-between gap-3 border-b border-border/80 pb-5">
        <BrandMark />
        <span className="hidden text-xs text-muted-foreground sm:inline">Shared room</span>
      </header>

      <div className="pb-16">
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
          workspaceLogoUrl={workspace?.logoUrl}
          workspaceCompanyName={workspace?.companyName}
        />
      </div>
    </main>
  );
}
