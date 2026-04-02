import Link from "next/link";
import { Plus, Shield, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Empty workspace — visual match to canvas/filmia-workspace-empty-state.html
 * (centered elevated card, warm icon tile, primary CTA + trust line).
 */
export function WorkspaceEmptyState() {
  return (
    <div
      className="tkn-elevated-panel mx-auto w-full max-w-[32.5rem] rounded-2xl border border-[var(--tkn-panel-border)] bg-card px-8 py-14 text-center sm:px-16 sm:py-16"
      data-testid="workspace-empty-state"
    >
      <div className="mx-auto mb-7 flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-[1.25rem] border border-[var(--tkn-empty-icon-border)] bg-[linear-gradient(135deg,var(--tkn-empty-icon-from)_0%,#ffffff_100%)]">
        <ShieldCheck
          className="h-8 w-8 text-[var(--color-accent)]"
          strokeWidth={1.5}
          aria-hidden
        />
      </div>

      <h1 className="text-2xl font-bold tracking-[-0.03em] text-foreground">
        Welcome to your workspace
      </h1>

      <p className="mx-auto mt-3 max-w-[23rem] text-[15px] leading-[1.6] text-[var(--tkn-text-support)]">
        A secure space to share sensitive documents with legal protection.
      </p>

      <div className="mt-8">
        <Button
          asChild
          size="lg"
          className="h-12 rounded-[0.625rem] px-7 text-[0.94rem] font-semibold shadow-[0_2px_8px_rgba(243,91,45,0.25)] transition-[transform,box-shadow] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(243,91,45,0.3)]"
        >
          <Link href="/new">
            <Plus
              className="h-[1.125rem] w-[1.125rem]"
              strokeWidth={2}
              aria-hidden
              data-icon="inline-start"
            />
            Create room
          </Link>
        </Button>
      </div>

      <p className="tkn-fine mt-4 flex items-center justify-center gap-1.5 leading-normal">
        <Shield className="h-3.5 w-3.5 shrink-0 opacity-80" strokeWidth={2} aria-hidden />
        <span>Free to start. No credit card.</span>
      </p>
    </div>
  );
}
