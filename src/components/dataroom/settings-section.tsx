"use client";

import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export function SettingsSection({
  title,
  description,
  preview,
  children,
  defaultOpen = false,
}: {
  title: string;
  description?: string;
  preview?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className="group rounded-xl border border-border bg-white" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 p-5 select-none">
        <div className="min-w-0 flex-1">
          <div className="label-title">{title}</div>
          {description && (
            <p className="odr-support mt-0.5">{description}</p>
          )}
          {preview && (
            <div className="mt-2 text-sm text-[var(--odr-text-fine)]">{preview}</div>
          )}
        </div>
        <ChevronDown className="mt-1 size-4 shrink-0 text-[var(--odr-text-fine)] transition-transform duration-200 group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-5 pb-5 pt-4">{children}</div>
    </details>
  );
}
