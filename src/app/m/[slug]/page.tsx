import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/filmia/brand-mark";
import { VaultOwnerPanel } from "@/components/filmia/vault-owner-panel";
import { getBaseUrlFromHeaders } from "@/lib/filmia/helpers";
import { getVaultStorage } from "@/lib/filmia/storage";

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
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-6 lg:px-10">
      <header className="py-4">
        <BrandMark />
      </header>
      <div className="pb-20 pt-6">
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
