const { execSync } = require("node:child_process");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");

const { test, expect } = require("@playwright/test");

const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);
const port = isCi ? "3001" : process.env.SIGNING_E2E_PORT || "3000";

let skipReason = null;

test.beforeAll(async ({ request }) => {
  execSync("node seed-contributor-manage.mjs", {
    cwd: __dirname,
    env: { ...process.env, SIGNING_E2E_PORT: port },
    stdio: "inherit",
  });
  const probe = await request.get(`http://127.0.0.1:${port}/api/vaults/${"fm-e2e000000020"}/payload`);
  if (!probe.ok()) {
    const body = await probe.text();
    skipReason =
      `Vault metadata not readable (HTTP ${probe.status}): ${body.slice(0, 160)}. ` +
      `Run with local .dataroom storage (see playwright.config.ts webServer env).`;
    console.warn(`[e2e] ${skipReason}`);
  }
});

test.describe("Team uploaders (manage page)", () => {
  test("owner can save contributor email list", async ({ page }) => {
    test.skip(!!skipReason, skipReason ?? "");

    const urlPath = join(__dirname, ".contrib-manage-url");
    if (!existsSync(urlPath)) {
      test.skip(true, "Missing e2e/.contrib-manage-url");
    }
    const manageUrl = readFileSync(urlPath, "utf8").trim();
    const base = new URL(manageUrl);
    const slug = base.pathname.split("/").filter(Boolean)[1];
    const key = base.searchParams.get("key") ?? "";
    const accessUrl = `${base.origin}/m/${slug}/access?key=${encodeURIComponent(key)}`;
    await page.goto(accessUrl);

    const field = page.locator("#contributor-recipient-emails");
    await expect(field).toBeVisible({ timeout: 30_000 });
    await field.fill("uploader@e2e.test\nviewer@e2e.test");
    await page.getByRole("button", { name: /Save team uploaders/i }).click();

    await expect(page.getByText(/Saved team upload permissions/i)).toBeVisible({
      timeout: 15_000,
    });
  });
});
