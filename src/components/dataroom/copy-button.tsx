"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const CopyButton = ({
  value,
  label = "Copy link",
  variant = "outline",
  size = "sm",
  className,
  ariaLabel,
  title,
  disabled,
}: {
  value: string;
  label?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "icon";
  className?: string;
  /** Shown when `size="icon"` (and as fallback accessible name). */
  ariaLabel?: string;
  /** Native tooltip (e.g. full URL). */
  title?: string;
  disabled?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (size === "icon") {
    const iconVariant = variant === "default" ? "default" : variant === "outline" ? "outline" : "ghost";
    return (
      <span className="inline-flex shrink-0">
        <Button
          type="button"
          onClick={handleCopy}
          variant={iconVariant}
          size="icon"
          disabled={disabled}
          className={cn("h-8 w-8", className)}
          aria-label={ariaLabel ?? label}
          title={title ?? label}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-600" data-icon="inline-end" />
          ) : (
            <Copy className="h-4 w-4" data-icon="inline-end" />
          )}
        </Button>
        <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {copied ? "Copied to clipboard" : ""}
        </span>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col gap-0">
      <Button
        type="button"
        onClick={handleCopy}
        variant={variant === "default" ? "default" : variant}
        size={size}
        disabled={disabled}
        className={className}
        aria-label={ariaLabel}
        title={title}
      >
        {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
        {label && (copied ? "Copied" : label)}
      </Button>
      <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </span>
  );
};
