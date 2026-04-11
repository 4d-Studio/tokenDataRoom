import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const PLAYWRIGHT_DEFAULT_SECRET = "playwright-e2e-secret-32chars-min!!";

/** Match token minting with whatever `pnpm dev` uses (env or .env.local). */
export function resolveE2ESecret(): string {
  const fromEnv = process.env.TKN_APP_SECRET?.trim();
  if (fromEnv) return fromEnv;
  try {
    const envPath = join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return PLAYWRIGHT_DEFAULT_SECRET;
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const m = trimmed.match(/^TKN_APP_SECRET=(.*)$/);
      if (m) return m[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* ignore */
  }
  return PLAYWRIGHT_DEFAULT_SECRET;
}
