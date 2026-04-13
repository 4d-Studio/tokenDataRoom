/**
 * Build identifier for "new deployment" prompts. Prefer CI git SHA at build time.
 * Set NEXT_PUBLIC_APP_RELEASE in env if your host does not inject a git variable into the Next build.
 */
export function getAppRelease(): string {
  const fromPublic = process.env.NEXT_PUBLIC_APP_RELEASE?.trim();
  if (fromPublic) return fromPublic;
  const fromRailway = process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  if (fromRailway) return fromRailway;
  const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (fromVercel) return fromVercel;
  return "dev";
}
