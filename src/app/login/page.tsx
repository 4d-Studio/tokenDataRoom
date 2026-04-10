import type { Metadata } from "next";
import nextDynamic from "next/dynamic";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandMark } from "@/components/dataroom/brand-mark";
import { CookieNotice } from "@/components/dataroom/cookie-notice";
import { LoginFlowSkeleton } from "@/components/dataroom/route-loading";
import { ProductAuthFrame } from "@/components/dataroom/product-ui";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Token with a one-time email code. No password to remember.",
  robots: { index: false, follow: true },
};

const LoginFlow = nextDynamic(
  () => import("@/components/auth/login-flow").then((m) => m.LoginFlow),
  { loading: () => <LoginFlowSkeleton /> },
);

export default async function LoginPage() {
  const user = await getCurrentUser();
  const workspace = await getCurrentWorkspace();

  if (user && workspace) {
    redirect("/workspace");
  }

  if (user && !workspace) {
    redirect("/onboarding");
  }

  return (
    <main className="page-shell flex min-h-svh flex-col">
      <ProductAuthFrame>
        <header className="flex items-center justify-between gap-3">
          <BrandMark />
          <Button asChild variant="ghost" size="sm">
            <Link href="/">Back home</Link>
          </Button>
        </header>
        <LoginFlow />
      </ProductAuthFrame>
      <CookieNotice />
    </main>
  );
}
