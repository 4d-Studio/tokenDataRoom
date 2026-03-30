import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";

import { BrandMark } from "@/components/filmia/brand-mark";
import { getCurrentUser, getCurrentWorkspace, getWorkspaceRooms } from "@/lib/filmia/auth";
import { formatDateTime } from "@/lib/filmia/helpers";

export default async function WorkspacePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspace = await getCurrentWorkspace();

  if (!workspace) {
    redirect("/onboarding");
  }

  const rooms = await getWorkspaceRooms();

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-6 lg:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 py-4">
        <BrandMark />
        <nav className="flex items-center gap-5 text-sm text-[var(--color-muted)]">
          <Link
            href="/new"
            className="rounded-full bg-[var(--color-accent)] px-4 py-2 font-semibold text-white transition hover:opacity-95"
          >
            Create room
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-2 transition hover:text-[var(--color-foreground)]"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </form>
        </nav>
      </header>

      <section className="flex flex-wrap items-end justify-between gap-6 py-12">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.02em] text-[var(--color-ink)] sm:text-4xl">
            {workspace.name}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--color-muted)]">
            Signed in as {user.email}. Create a room, share one protected document, and
            keep owner access in one place.
          </p>
        </div>
        <Link href="/new" className="hero-cta-primary">
          Create a room
        </Link>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="surface-panel p-6">
          <div className="text-lg font-semibold text-[var(--color-foreground)]">Rooms</div>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
            Recent rooms stay here so you can reopen share links and owner controls
            without losing context.
          </p>
          <div className="mt-6 space-y-3">
            {rooms.length ? (
              rooms.map((room) => (
                <div
                  key={room.id}
                  className="rounded-[1rem] border border-[rgba(16,24,40,0.1)] bg-white p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="text-base font-semibold text-[var(--color-ink)]">
                        {room.title}
                      </div>
                      <div className="mt-1 text-sm text-[var(--color-muted)]">
                        {room.fileName} · Created {formatDateTime(room.createdAt)}
                      </div>
                    </div>
                    <div className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                      {room.status}
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm">
                    <Link
                      href={`/s/${room.slug}`}
                      className="inline-flex items-center gap-1 text-[var(--color-accent)] transition hover:opacity-80"
                    >
                      Open share page
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[1.25rem] border border-dashed border-[rgba(16,24,40,0.16)] bg-[rgba(255,255,255,0.72)] px-5 py-6">
                <div className="text-sm font-semibold text-[var(--color-foreground)]">
                  No rooms yet
                </div>
                <p className="mt-2 max-w-xl text-sm leading-7 text-[var(--color-muted)]">
                  Start with one protected document room, then come back here to manage
                  every link you have already shared.
                </p>
                <Link
                  href="/new"
                  className="mt-4 inline-flex text-sm font-semibold text-[var(--color-accent)] transition hover:opacity-80"
                >
                  Create your first room
                </Link>
              </div>
            )}
          </div>
        </div>

        <aside className="surface-panel p-6">
          <div className="text-sm font-semibold text-[var(--color-foreground)]">
            Workspace settings
          </div>
          <div className="mt-4 space-y-3 text-sm text-[var(--color-muted)]">
            <div>{workspace.companyName}</div>
            <div>{user.email}</div>
            <div>Magic-code login enabled</div>
            <Link
              href="/agent"
              className="inline-flex items-center gap-1 pt-2 text-[var(--color-accent)] transition hover:opacity-80"
            >
              Open agent docs
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </aside>
      </section>
    </main>
  );
}
