import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BrandMark } from "@/components/filmia/brand-mark";
import { CreateVaultForm } from "@/components/filmia/create-vault-form";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/filmia/auth";
import { buildDefaultNdaText } from "@/lib/filmia/helpers";
import { getStorageMode } from "@/lib/filmia/storage";

export default async function NewVaultPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4">
        <BrandMark />
        <Link
          href="/workspace"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-muted)] transition hover:text-[var(--color-foreground)]"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to workspace
        </Link>
      </header>
      <div className="pb-20 pt-6">
        <CreateVaultForm
          defaultNdaText={buildDefaultNdaText(workspace.companyName)}
          defaultSenderCompany={workspace.companyName}
          defaultSenderName=""
          storageMode={getStorageMode()}
        />
      </div>
    </main>
  );
}
