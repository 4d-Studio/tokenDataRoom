import { defineConfig, devices } from "@playwright/test";

import { resolveE2ESecret } from "./e2e/e2e-secret";

const E2E_SECRET = resolveE2ESecret();

const isCi = Boolean(process.env.CI || process.env.GITHUB_ACTIONS);

/** Local: use your running `pnpm dev` (`TKN_APP_SECRET` in `.env.local` required for tokens). CI: starts `next dev` on 3001. */
const E2E_PORT = isCi ? "3001" : process.env.SIGNING_E2E_PORT || "3000";
const baseURL = `http://127.0.0.1:${E2E_PORT}`;

/** Use installed Google Chrome locally to avoid downloading Playwright’s browser (~165MB). CI uses bundled Chromium. */
const useChromeChannel = !isCi && !process.env.PLAYWRIGHT_USE_BUNDLED_CHROMIUM;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: isCi,
  retries: isCi ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    ...devices["Desktop Chrome"],
    ...(useChromeChannel ? { channel: "chrome" as const } : {}),
  },
  ...(isCi
    ? {
        webServer: {
          command: `pnpm exec next dev -p ${E2E_PORT}`,
          url: baseURL,
          reuseExistingServer: false,
          timeout: 120_000,
          env: {
            ...process.env,
            TKN_APP_SECRET: E2E_SECRET,
            SIGNING_E2E_PORT: E2E_PORT,
          },
        },
      }
    : {}),
});
