"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Props = {
  videoSrc: string;
  posterSrc: string;
  /** Short description for screen readers */
  ariaLabel: string;
};

/**
 * Landing hero video: autoplay when motion is allowed; static poster otherwise.
 */
export function LandingHeroVideo({ videoSrc, posterSrc, ariaLabel }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const shellClass =
    "relative aspect-video w-full overflow-hidden bg-[var(--color-background-muted)]";

  if (!mounted || reduceMotion) {
    return (
      <div className={shellClass}>
        <Image
          src={posterSrc}
          alt={ariaLabel}
          fill
          className="object-cover"
          sizes="(min-width: 1024px) 50vw, 100vw"
          priority
        />
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <video
        className="absolute inset-0 size-full object-cover"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
        poster={posterSrc}
        aria-label={ariaLabel}
      >
        <source src={videoSrc} type="video/mp4" />
      </video>
    </div>
  );
}
