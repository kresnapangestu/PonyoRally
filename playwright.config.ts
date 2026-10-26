import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

/**
 * End-to-end tests against the real static build, on a phone-sized Chromium
 * (the app is mobile-only). Run: npm run test:e2e
 */
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    ...devices["Pixel 7"],
    baseURL: `http://localhost:${PORT}`,
    locale: "id-ID",
    trace: "retain-on-failure",
  },
  webServer: {
    command: `npm run build && node scripts/serve-static.mjs out ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
