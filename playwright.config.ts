import { defineConfig, devices } from "@playwright/test";

const port = 3000;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
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
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
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
