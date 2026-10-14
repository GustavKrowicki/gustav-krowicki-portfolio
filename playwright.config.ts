import { defineConfig, devices } from "@playwright/test";

// E2E_PORT targets a server that is already running, e.g. `npm run cf:dev` (static export, 3100) or `next dev -p 3101`.
// E2E_BASE_URL targets a deployed site instead (a workers.dev preview or production); no local server starts then.
const port = Number(process.env.E2E_PORT ?? 3000);
const remoteBaseURL = process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  // Each test runs the WebGL city; parallel browsers starve each other (measured 2026-10-11: 1 worker 97 s,
  // 2 workers 6.3 min, 4 workers 8-16 min for city + smoke)
  workers: 1,
  timeout: 45_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      animations: "disabled",
      scale: "css",
    },
  },
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["html"], ["list"]] : "list",
  use: {
    baseURL: remoteBaseURL ?? `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: remoteBaseURL
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
  projects: [
    {
      name: "desktop-chrome",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chrome",
        viewport: { width: 1440, height: 1080 },
      },
    },
    {
      name: "mobile-chrome",
      use: {
        ...devices["iPhone 14"],
        browserName: "chromium",
        channel: "chrome",
      },
    },
  ],
});
