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
    rooms: 1,
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

/** Personal + Pro: workspace logo on share pages. Free: not included on pricing. */
export const planAllowsWorkspaceLogo = (plan: WorkspacePlan): boolean => plan !== "free";

/** Free shows “Powered by Token” on the share chrome; paid tiers hide it per pricing. */
export const planShowsSharePoweredByToken = (plan: WorkspacePlan): boolean => plan === "free";
