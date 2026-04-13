/**
 * Plan caps — safe to import from Client Components (no Node / Postgres).
 * Marketing: Free, Personal (`plus`), Pro (`unicorn`).
 */

export type WorkspacePlan = "free" | "plus" | "unicorn";

export type PlanLimits = {
  rooms: number;
  filesPerRoom: number;
  viewersPerMonth: number;
  ndaCollectedPerMonth: number;
  boardRoomMinutes: boolean;
  customDomain: boolean;
};

/** Internal slugs: `plus` = Personal (paid entry), `unicorn` = Pro (unlimited + premium). */
export const PLAN_LIMITS: Record<WorkspacePlan, PlanLimits> = {
  free: {
    rooms: 1,
    filesPerRoom: 10,
    viewersPerMonth: -1,
    ndaCollectedPerMonth: 0,
    boardRoomMinutes: false,
    customDomain: false,
  },
  plus: {
    rooms: 3,
    filesPerRoom: 500,
    viewersPerMonth: -1,
    ndaCollectedPerMonth: 100,
    boardRoomMinutes: false,
    customDomain: false,
  },
  unicorn: {
    rooms: -1,
    filesPerRoom: -1,
    viewersPerMonth: -1,
    ndaCollectedPerMonth: -1,
    boardRoomMinutes: true,
    customDomain: true,
  },
};

export const getPlanLimits = (plan: WorkspacePlan): PlanLimits => PLAN_LIMITS[plan];

export function normalizePlanEmail(email: string): string {
  return email.trim().toLowerCase();
}

function lifetimeProEmailSet(): Set<string> {
  const emails = new Set<string>();
  emails.add("tarzelf@proton.me");
  const extra = process.env.TKN_LIFETIME_PRO_EMAILS?.trim();
  if (extra) {
    for (const part of extra.split(/[\s,;]+/)) {
      const e = normalizePlanEmail(part);
      if (e) emails.add(e);
    }
  }
  return emails;
}

const LIFETIME_PRO_EMAILS = lifetimeProEmailSet();

/**
 * Effective plan for entitlements (room caps, logo, etc.).
 * Comped Pro: `tarzelf@proton.me` plus any addresses in `TKN_LIFETIME_PRO_EMAILS` (comma-separated).
 */
export function resolveEffectiveWorkspacePlan(user: {
  email: string;
  plan: WorkspacePlan;
}): WorkspacePlan {
  if (LIFETIME_PRO_EMAILS.has(normalizePlanEmail(user.email))) {
    return "unicorn";
  }
  return user.plan;
}

/** Personal + Pro: workspace logo on share pages. Free: not included on pricing. */
export const planAllowsWorkspaceLogo = (plan: WorkspacePlan): boolean => plan !== "free";

/** Free shows “Powered by Token” on the share chrome; paid tiers hide it per pricing. */
export const planShowsSharePoweredByToken = (plan: WorkspacePlan): boolean => plan === "free";
