import Link from "next/link";
import { redirect } from "next/navigation";

import { CookieNotice } from "@/components/dataroom/cookie-notice";
import { LoginFlow } from "@/components/auth/login-flow";
import { BrandMark } from "@/components/dataroom/brand-mark";
import { ProductAuthFrame } from "@/components/dataroom/product-ui";
import { Button } from "@/components/ui/button";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/dataroom/auth";

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
    <main className="page-shell flex min-h-svh">
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
