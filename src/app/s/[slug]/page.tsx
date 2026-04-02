import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { ShareExperience } from "@/components/dataroom/share-experience";
import { accessCookieName, verifyAccessToken } from "@/lib/dataroom/access";
import { getWorkspaceById } from "@/lib/dataroom/auth-store";
import { buildDefaultNdaText } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import {
  verifyWorkspaceNdaToken,
  workspaceNdaCookieName,
} from "@/lib/dataroom/workspace-nda-access";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
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
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) notFound();

  const cookieStore = await cookies();
  const access = verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
  );
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

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-4 sm:px-6">
      <header className="page-header">
        <BrandMark logoUrl={workspace?.logoUrl} />
        <ProductBreadcrumb
          items={[{ label: "Data room" }, { label: metadata.title }]}
        />
      </header>

      <div className="pb-14 pt-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {metadata.title}
          </h1>
        </div>

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
        />
      </div>
    </main>
  );
}
