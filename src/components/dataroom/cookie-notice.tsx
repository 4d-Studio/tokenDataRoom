"use client";

import Link from "next/link";

export function CookieNotice() {
  return (
    <div className="mx-auto mt-2 w-full max-w-[30rem] shrink-0 px-1 pb-6 pt-2 sm:mt-4 sm:pb-10">
      <p className="text-balance text-center text-xs leading-relaxed text-[var(--tkn-text-fine)]">
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
