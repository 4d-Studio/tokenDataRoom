const { execSync } = require("node:child_process");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const { test, expect } = require("@playwright/test");

const PLAYWRIGHT_DEFAULT_SECRET = "playwright-e2e-secret-32chars-min!!";

function resolveE2ESecret() {
  const fromEnv = process.env.TKN_APP_SECRET?.trim();
  if (fromEnv) return fromEnv;
  try {
    const envPath = join(process.cwd(), ".env.local");
    if (!existsSync(envPath)) return PLAYWRIGHT_DEFAULT_SECRET;
    for (const line of require("node:fs").readFileSync(envPath, "utf8").split("\n")) {
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

const E2E_SECRET = resolveE2ESecret();
const e2eDir = __dirname;

const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
const port = isCi ? "3001" : process.env.SIGNING_E2E_PORT || "3000";

/** Set in beforeAll when the API cannot see seeded metadata (common if dev uses Vercel Blob / S3). */
let skipBrowserReason = null;

test.beforeAll(async ({ request }) => {
  execSync("node seed-signing-room.mjs", {
    cwd: e2eDir,
    env: {
      ...process.env,
      TKN_APP_SECRET: E2E_SECRET,
      SIGNING_E2E_PORT: port,
    },
    stdio: "inherit",
  });

  const pageUrl = readFileSync(join(e2eDir, ".sign-url"), "utf8").trim();
  const token = new URL(pageUrl).searchParams.get("token");
  const boot = await request.get(
    `http://127.0.0.1:${port}/api/vaults/fm-e2e000000010/signing/22222222-2222-2222-2222-222222222222?token=${encodeURIComponent(token ?? "")}`,
  );
  if (!boot.ok()) {
    const body = await boot.text();
    skipBrowserReason =
      `Signing bootstrap returned HTTP ${boot.status()}: ${body.slice(0, 200)}. ` +
      `The seed writes under .dataroom/; if Next is configured for Vercel Blob or S3, ` +
      `it will not see that vault. Use local vault storage for this smoke test, or run \`pnpm test\` ` +
      `for API integration coverage.`;
    console.warn(`[e2e] ${skipBrowserReason}`);
  }
});

test.describe("Document signing (browser smoke)", () => {
  test("loads signing page and completes single-signer workflow", async ({ page }) => {
    test.skip(!!skipBrowserReason, skipBrowserReason ?? "");

    const url = readFileSync(join(e2eDir, ".sign-url"), "utf8").trim();
    await page.goto(url);

    await expect(page.getByRole("heading", { name: /sign document/i })).toBeVisible({
      timeout: 30_000,
    });

    await page.getByPlaceholder("Jane Doe").fill("Pat E2E Signer");
    await page.getByRole("button", { name: /sign and continue/i }).click();

    await expect(page.getByRole("heading", { name: /signing complete/i })).toBeVisible({
      timeout: 20_000,
    });
  });
});
