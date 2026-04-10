import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { CookieNotice } from "@/components/dataroom/cookie-notice";
import { WorkspaceOnboardingSkeleton } from "@/components/dataroom/route-loading";
import { ProductAuthFrame } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

export const metadata: Metadata = {
  title: "Create workspace",
  description: "Set up your Token workspace to create secure datarooms.",
  robots: { index: false, follow: true },
};

const WorkspaceOnboarding = nextDynamic(
  () =>
    import("@/components/auth/workspace-onboarding").then((m) => m.WorkspaceOnboarding),
  { loading: () => <WorkspaceOnboardingSkeleton /> },
);

export default async function OnboardingPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (workspace) {
    redirect("/workspace");
  }

  return (
    <main className="page-shell flex min-h-svh flex-col">
      <ProductAuthFrame>
        <header className="flex items-center gap-3">
          <BrandMark />
        </header>
        <WorkspaceOnboarding email={user.email} />
      </ProductAuthFrame>
      <CookieNotice />
    </main>
  );
}
