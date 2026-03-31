"use client";

import Link from "next/link";

export function CookieNotice() {
  return (
    <div className="mx-auto flex w-full max-w-[30rem] flex-col gap-4 pb-6 sm:pb-10">
      <p className="text-center text-xs text-[var(--odr-text-fine)]">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-foreground">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-foreground">
          Privacy Policy
        </Link>
        . We use only functional cookies to keep you logged in.
      </p>
    </div>
  );
}
