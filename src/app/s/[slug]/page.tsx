import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { BrandMark } from "@/components/filmia/brand-mark";
import { ShareExperience } from "@/components/filmia/share-experience";
import { accessCookieName, verifyAccessToken } from "@/lib/filmia/access";
import { getVaultStorage } from "@/lib/filmia/storage";

export default async function SharePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const storage = getVaultStorage();
  const metadata = await storage.getVaultMetadata(slug);

  if (!metadata) {
    notFound();
  }

  const cookieStore = await cookies();
  const access = verifyAccessToken(
    cookieStore.get(accessCookieName(slug))?.value,
    slug,
  );
  const acceptance = access?.acceptanceId
    ? await storage.getAcceptance(slug, access.acceptanceId)
    : null;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-6 lg:px-10">
      <header className="py-4">
        <BrandMark />
      </header>
      <div className="pb-20 pt-6">
        <ShareExperience
          metadata={metadata}
          initialAcceptance={acceptance}
          initialAccessGranted={Boolean(access)}
        />
      </div>
    </main>
  );
}
