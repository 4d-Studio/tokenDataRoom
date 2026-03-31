"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

export const CopyButton = ({
  value,
  label = "Copy link",
  variant = "outline",
  size = "sm",
}: {
  value: string;
  label?: string;
  variant?: "outline" | "ghost";
  size?: "sm" | "icon";
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (size === "icon") {
    return (
      <Button
        type="button"
        onClick={handleCopy}
        variant="ghost"
        size="icon"
        className="h-8 w-8"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" data-icon="inline-end" />
        ) : (
          <Copy className="h-4 w-4" data-icon="inline-end" />
        )}
      </Button>
    );
  }

  return (
    <Button type="button" onClick={handleCopy} variant={variant} size={size}>
      {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
      {label && (copied ? "Copied" : label)}
    </Button>
  );
};
