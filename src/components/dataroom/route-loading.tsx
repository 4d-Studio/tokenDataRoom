import { Skeleton } from "@/components/ui/skeleton";

/** Login card only — page already renders header + frame */
export function LoginFlowSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-none">
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-3 h-7 w-4/5 max-w-sm" />
      <Skeleton className="mt-2 h-16 w-full" />
      <Skeleton className="mt-6 h-4 w-24" />
      <Skeleton className="mt-2 h-11 w-full rounded-xl" />
    </div>
  );
}

/** Onboarding form — workspace name + company */
export function WorkspaceOnboardingSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-none">
      <Skeleton className="h-3 w-36" />
      <Skeleton className="mt-3 h-7 w-3/4 max-w-sm" />
      <Skeleton className="mt-4 h-11 w-full rounded-xl" />
      <Skeleton className="mt-3 h-11 w-full rounded-xl" />
      <Skeleton className="mt-6 h-11 w-full rounded-xl" />
    </div>
  );
}

/** Login / onboarding column */
export function AuthPageSkeleton() {
  return (
    <div className="page-shell flex min-h-svh flex-col">
      <div className="mx-auto flex w-full max-w-[30rem] flex-1 flex-col justify-center gap-4 py-6 sm:py-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="rounded-[var(--radius)] border border-border bg-card p-6 shadow-none">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-4/5 max-w-sm" />
          <Skeleton className="mt-2 h-16 w-full" />
          <Skeleton className="mt-6 h-4 w-24" />
          <Skeleton className="mt-2 h-11 w-full rounded-xl" />
          <Skeleton className="mt-4 h-11 w-full rounded-xl" />
        </div>
        <Skeleton className="mx-auto h-10 w-full max-w-[26rem]" />
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <aside className="flex w-[16.25rem] shrink-0 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="space-y-3 px-3 py-4">
        <Skeleton className="h-9 w-9 rounded-full" />
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-[85%]" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mx-3 border-t border-sidebar-border" />
      <div className="flex flex-1 flex-col gap-2 px-2 py-3">
        <Skeleton className="h-3 w-24 px-2" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded-md" />
        ))}
      </div>
      <div className="mt-auto space-y-2 border-t border-sidebar-border px-3 py-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    </aside>
  );
}

type ChromeVariant = "workspace" | "form" | "settings";

function MainSkeleton({ variant }: { variant: ChromeVariant }) {
  if (variant === "form") {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-8 w-2/3 max-w-md" />
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-11 w-36 rounded-xl" />
      </div>
    );
  }
  if (variant === "settings") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-[var(--radius)] border border-border bg-card p-5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-4 h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-2 h-9 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-52 w-full rounded-xl" />
    </div>
  );
}

/** Matches AuthenticatedShell chrome while RSC + heavy bundles load */
export function AuthenticatedChromeSkeleton({ variant = "workspace" }: { variant?: ChromeVariant }) {
  return (
    <div className="flex min-h-svh w-full bg-[var(--color-background)]">
      <SidebarSkeleton />
      <div className="flex min-w-0 flex-1 flex-col bg-transparent">
        <div className="flex h-12 shrink-0 items-center justify-end border-b border-border px-4">
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
        <div className="page-shell flex min-h-0 flex-1 flex-col py-5">
          <MainSkeleton variant={variant} />
        </div>
      </div>
    </div>
  );
}

export function CreateVaultFormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-10 w-full max-w-lg rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="flex gap-2">
        <Skeleton className="h-11 w-28 rounded-xl" />
        <Skeleton className="h-11 w-32 rounded-xl" />
      </div>
    </div>
  );
}

export function NdaTemplateEditorSkeleton() {
  return (
    <div className="rounded-[var(--radius)] border border-border bg-card">
      <div className="border-b border-border p-4">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="mt-2 h-3 w-full max-w-md" />
      </div>
      <div className="p-4">
        <Skeleton className="h-[min(18rem,40vh)] w-full rounded-xl" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>
    </div>
  );
}

/** Generic marketing / static pages */
export function PageShellSkeleton() {
  return (
    <div className="page-shell min-h-svh">
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-10 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="h-9 w-16" />
        </div>
      </div>
      <Skeleton className="mt-8 h-10 w-3/4 max-w-xl" />
      <Skeleton className="mt-4 h-24 w-full max-w-2xl" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    </div>
  );
}

export function ShareExperienceSkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20 p-6 sm:p-8">
        <div className="mx-auto flex max-w-md flex-col items-center gap-3">
          <Skeleton className="size-16 rounded-2xl sm:size-[4.5rem]" />
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-full max-w-sm" />
          <Skeleton className="h-4 w-full max-w-xs" />
          <Skeleton className="mt-2 h-10 w-full max-w-lg" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-muted/30 p-4">
        <Skeleton className="size-10 shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48 max-w-full" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
        <Skeleton className="h-7 w-24 rounded-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-xl sm:h-56" />
    </div>
  );
}

/** Room table placeholder on workspace home */
export function RoomsListSkeleton() {
  return (
    <div className="flex flex-col gap-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
    </div>
  );
}

/** Inline placeholder while `VaultOwnerPanel` chunk loads */
export function VaultOwnerPanelSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>
      <Skeleton className="h-[min(14rem,36vh)] w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

/** Owner manage page (`/m/...`) — wide shell, not authenticated sidebar */
export function OwnerPageSkeleton() {
  return (
    <main className="page-shell max-w-[78rem] min-h-svh">
      <header className="page-header">
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-4 w-52" />
      </header>
      <div className="page-hero space-y-4 pt-2">
        <Skeleton className="h-9 w-2/3 max-w-lg" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-[min(16rem,40vh)] w-full rounded-xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </main>
  );
}
