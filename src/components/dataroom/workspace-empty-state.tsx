import Link from "next/link";
import { LayoutPanelTop, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";

export function WorkspaceEmptyState() {
  return (
    <div
      className="mx-auto w-full max-w-[26rem] rounded-2xl border border-[var(--tkn-panel-border)] bg-card px-8 py-14 text-center sm:px-14 sm:py-16"
      data-testid="workspace-empty-state"
    >
      <div className="mx-auto mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--tkn-empty-icon-border)] bg-[linear-gradient(135deg,var(--tkn-empty-icon-from)_0%,#ffffff_100%)]">
        <LayoutPanelTop
          className="h-5 w-5 text-[var(--color-accent)]"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      <h1 className="text-xl font-bold tracking-[-0.03em] text-foreground">
        No data rooms yet
      </h1>

      <p className="mx-auto mt-2.5 max-w-[20rem] text-[0.9rem] leading-relaxed text-[var(--tkn-text-support)]">
        Create a room, upload documents, and share a secure link with recipients.
      </p>

      <div className="mt-7">
        <Button
          asChild
          size="lg"
          className="h-11 rounded-xl px-7 text-[0.9rem] font-semibold transition-[transform,box-shadow] hover:-translate-y-px"
        >
          <Link href="/new">
            <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden data-icon="inline-start" />
            Create room
          </Link>
        </Button>
      </div>
    </div>
  );
}
