import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductBreadcrumb } from "@/components/dataroom/product-ui";
import { VaultOwnerPanelSkeleton } from "@/components/dataroom/route-loading";
import { loadManageRoomForOwner } from "@/app/m/resolve-manage-slug";
import { getBaseUrlFromHeaders } from "@/lib/dataroom/helpers";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { getVanitySlugForRoom } from "@/lib/dataroom/vanity-slugs";

const VaultOwnerPanel = dynamic(
  () =>
    import("@/components/dataroom/vault-owner-panel").then((m) => m.VaultOwnerPanel),
  { loading: () => <VaultOwnerPanelSkeleton /> },
);

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const { key } = await searchParams;
  const loaded = await loadManageRoomForOwner(rawSlug, key);
  if (!loaded) {
    return { title: "Links & access", robots: { index: false, follow: false } };
  }
  return {
    title: `Links & access · ${loaded.metadata.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function ManageRoomAccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { slug: rawSlug } = await params;
  const { key } = await searchParams;
  const loaded = await loadManageRoomForOwner(rawSlug, key);
  if (!loaded) notFound();

  const { slug, metadata } = loaded;
  const storage = getVaultStorage();
  const events = await storage.getEvents(slug);
  const acceptances = await storage.getAcceptances(slug);
  const headerMap = await headers();
  const baseUrl = getBaseUrlFromHeaders(headerMap);
  const vanitySlug = await getVanitySlugForRoom(slug);
  const shareSlug = vanitySlug ?? slug;
  const shareUrl = `${baseUrl}/s/${shareSlug}`;
  const manageUrl = `${baseUrl}/m/${slug}?key=${metadata.ownerKey}`;
  const linksAccessHref = `/m/${slug}/access?key=${encodeURIComponent(metadata.ownerKey)}`;
  const signedNdaBaseUrl = `${baseUrl}/api/vaults/${slug}/signed-nda?key=${metadata.ownerKey}`;

  return (
    <main className="page-shell max-w-none lg:px-8 xl:px-12 2xl:px-16">
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
            items={[
              { label: "Manage room", href: manageUrl },
              { label: "Links & access" },
            ]}
          />
        </div>
      </header>
      <div className="page-hero pt-2">
        <div className="mb-5 border-b border-border pb-4">
          <h1 className="text-[1.05rem] font-semibold tracking-[-0.02em] text-foreground">
            Links & access
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            Share URL, custom link, people and invites, revoke and delete — for{" "}
            <span className="font-medium text-foreground">{metadata.title}</span>.
          </p>
        </div>
        <VaultOwnerPanel
          variant="links-access"
          initialAcceptances={acceptances}
          initialMetadata={metadata}
          initialEvents={events}
          ownerKey={metadata.ownerKey}
          shareUrl={shareUrl}
          manageUrl={manageUrl}
          linksAccessHref={linksAccessHref}
          signedNdaBaseUrl={signedNdaBaseUrl}
          initialVanitySlug={vanitySlug}
        />
      </div>
    </main>
  );
}
