import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DocumentSigningClient } from "@/components/dataroom/document-signing-client";
import { getVaultStorage } from "@/lib/dataroom/storage";
import { isValidPublicVaultSlug } from "@/lib/dataroom/vault-access";
import { resolveVanitySlug } from "@/lib/dataroom/vanity-slugs";

export const dynamic = "force-dynamic";

async function resolveSlug(urlSlug: string): Promise<string | null> {
  if (isValidPublicVaultSlug(urlSlug)) return urlSlug;
  return resolveVanitySlug(urlSlug);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; requestId: string }>;
}): Promise<Metadata> {
  const { slug: rawSlug } = await params;
  const slug = await resolveSlug(rawSlug);
  if (!slug) {
    return { title: "Sign document", robots: { index: false, follow: false } };
  }
  const storage = getVaultStorage();
  const vault = await storage.getVaultMetadata(slug);
  if (!vault) {
    return { title: "Sign document", robots: { index: false, follow: false } };
  }
  return {
    title: `Sign document · ${vault.title}`,
    robots: { index: false, follow: false },
  };
}

export default async function DocumentSigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; requestId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { slug: rawSlug, requestId } = await params;
  const { token } = await searchParams;
  const slug = await resolveSlug(rawSlug);
  if (!slug) notFound();

  return (
    <DocumentSigningClient
      canonicalSlug={slug}
      requestId={requestId}
      initialToken={typeof token === "string" ? token : ""}
    />
  );
}
