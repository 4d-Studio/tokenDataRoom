import { redirect } from "next/navigation";

import { WorkspaceOnboarding } from "@/components/auth/workspace-onboarding";
import { BrandMark } from "@/components/filmia/brand-mark";
import { getCurrentUser, getCurrentWorkspace } from "@/lib/filmia/auth";

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
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 lg:px-10">
      <header className="py-4">
        <BrandMark />
      </header>
      <div className="py-16">
        <WorkspaceOnboarding email={user.email} />
      </div>
    </main>
  );
}
