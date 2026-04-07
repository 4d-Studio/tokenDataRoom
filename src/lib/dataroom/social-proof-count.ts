const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** First moment the public count equals {@link SOCIAL_PROOF_BASE_COUNT}. Each week after, ×1.1. */
const SOCIAL_PROOF_ANCHOR_MS = Date.UTC(2026, 3, 1, 0, 0, 0, 0); // 1 Apr 2026 UTC

const SOCIAL_PROOF_BASE_COUNT = 30;
const SOCIAL_PROOF_WEEKLY_GROWTH = 1.1;

/** Stop compounding after this many weeks (then hold steady). Avoids runaway numbers. */
const SOCIAL_PROOF_MAX_COMPOUND_WEEKS = 48;

/** Hard ceiling if you ever raise max weeks. */
const SOCIAL_PROOF_DISPLAY_CAP = 999;

/**
 * Homepage “teams” figure: starts at 30 at the anchor, then grows ~10% per calendar week.
 * Tune {@link SOCIAL_PROOF_ANCHOR_MS} when you reset the story.
 */
export function getSocialProofTeamCount(nowMs: number = Date.now()): number {
  const rawWeeks = Math.floor((nowMs - SOCIAL_PROOF_ANCHOR_MS) / MS_PER_WEEK);
  const weeks = Math.max(0, Math.min(SOCIAL_PROOF_MAX_COMPOUND_WEEKS, rawWeeks));
  const raw = Math.round(SOCIAL_PROOF_BASE_COUNT * SOCIAL_PROOF_WEEKLY_GROWTH ** weeks);
  return Math.min(SOCIAL_PROOF_DISPLAY_CAP, raw);
}
