import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { VaultOwnerPanel } from "@/components/dataroom/vault-owner-panel";
import { getBaseUrlFromHeaders } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { slug } = await params;
  const { key } = await searchParams;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata || !key || key !== metadata.ownerKey) {
    notFound();
  }

  const events = await storage.getEvents(slug);
  const acceptances = await storage.getAcceptances(slug);
  const headerMap = await headers();
  const baseUrl = getBaseUrlFromHeaders(headerMap);
  const shareUrl = `${baseUrl}/s/${slug}`;
  const manageUrl = `${baseUrl}/m/${slug}?key=${metadata.ownerKey}`;
  const signedNdaBaseUrl = `${baseUrl}/api/vaults/${slug}/signed-nda?key=${metadata.ownerKey}`;

  return (
    <main className="page-shell max-w-[78rem]">
      <header className="page-header">
        <BrandMark />
        <ProductBreadcrumb
          items={[{ label: "Owner controls" }, { label: metadata.title }]}
        />
      </header>
      <div className="page-hero pt-2">
        <VaultOwnerPanel
          initialAcceptances={acceptances}
          initialMetadata={metadata}
          initialEvents={events}
          ownerKey={metadata.ownerKey}
          shareUrl={shareUrl}
          manageUrl={manageUrl}
          signedNdaBaseUrl={signedNdaBaseUrl}
        />
      </div>
    </main>
  );
}
