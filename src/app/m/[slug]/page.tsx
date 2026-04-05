import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { VaultOwnerPanelSkeleton } from "@/components/dataroom/route-loading";

const VaultOwnerPanel = dynamic(
  () =>
    import("@/components/dataroom/vault-owner-panel").then((m) => m.VaultOwnerPanel),
  { loading: () => <VaultOwnerPanelSkeleton /> },
);
import { getBaseUrlFromHeaders } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug, verifyOwnerKey } from "@/lib/dataroom/vault-access";

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { key } = await searchParams;
  if (!isValidPublicVaultSlug(slug)) {
    return { title: "Owner controls", robots: { index: false, follow: false } };
  }
  const storage = getVaultStorage();
  const vault = await storage.getVaultMetadata(slug);
  if (!vault || !verifyOwnerKey(key, vault.ownerKey)) {
    return { title: "Owner controls", robots: { index: false, follow: false } };
  }
  return {
    title: `${vault.title} (owner)`,
    robots: { index: false, follow: false },
  };
}

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { slug } = await params;
  const { key } = await searchParams;
  if (!isValidPublicVaultSlug(slug)) {
    notFound();
  }
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata || !verifyOwnerKey(key, metadata.ownerKey)) {
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
      <header className="page-header flex-wrap">
        <BrandMark />
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/workspace"
            className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            All rooms
          </Link>
          <ProductBreadcrumb
            items={[{ label: "Manage room" }, { label: metadata.title }]}
          />
        </div>
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
