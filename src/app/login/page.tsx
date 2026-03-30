import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginFlow } from "@/components/auth/login-flow";
import { BrandMark } from "@/components/filmia/brand-mark";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/filmia/auth";

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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4">
        <BrandMark />
        <Link href="/" className="text-sm text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]">
          Back home
        </Link>
      </header>
      <div className="py-16">
        <LoginFlow />
      </div>
    </main>
  );
}
