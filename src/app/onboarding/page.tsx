import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Create workspace",
  description: "Set up your Token workspace to create secure datarooms.",
};

import { CookieNotice } from "@/components/dataroom/cookie-notice";
import { WorkspaceOnboarding } from "@/components/auth/workspace-onboarding";
import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductAuthFrame } from "@/components/dataroom/product-ui";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

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
