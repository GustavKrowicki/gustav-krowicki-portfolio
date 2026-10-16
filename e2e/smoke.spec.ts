import { expect, test } from "@playwright/test";

test("city page loads and mounts phaser shell", async ({ page }) => {
  await page.goto("/city?e2e=1");
  await expect(page.getByTestId("city-root")).toBeVisible();
  await expect(page.getByTestId("city-canvas")).toBeVisible();
  await expect(page.getByTestId("city-welcome-overlay")).toBeVisible();
});
