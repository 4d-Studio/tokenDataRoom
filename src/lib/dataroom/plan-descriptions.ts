import type { TknUser } from "@/lib/dataroom/auth-store";
import { getPlanLimits } from "@/lib/dataroom/plan-limits";

const planLabel: Record<TknUser["plan"], string> = {
  free: "Free",
  plus: "Personal",
  unicorn: "Pro",
};

/** Human-readable limits for settings / pricing-adjacent UI. */
export function describePlanForWorkspace(plan: TknUser["plan"]): {
  label: string;
  bullets: string[];
} {
  const limits = getPlanLimits(plan);
  const bullets: string[] = [];

  bullets.push(
    limits.rooms < 0
      ? "Unlimited rooms"
      : limits.rooms === 1
        ? "1 room"
        : `${limits.rooms} rooms`,
  );

  if (plan === "free") {
    bullets.push("10 files total on your room");
  } else if (limits.filesPerRoom < 0) {
    bullets.push("Unlimited files per room");
  } else {
    bullets.push(`Up to ${limits.filesPerRoom} files per room`);
  }

  bullets.push(
    limits.customDomain ? "Custom domain for share links" : "Hosted share links (no custom domain)",
  );

  if (limits.boardRoomMinutes) {
    bullets.push("Board minutes in data rooms");
  }

  bullets.push("Optional NDA per room · edit template in Settings");

  return { label: planLabel[plan], bullets };
}
