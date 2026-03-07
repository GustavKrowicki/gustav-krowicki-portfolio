import { expect, test } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /hello,\s*i am gustav/i })
  ).toBeVisible();
});

test("about page renders", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});

test("lego work page renders", async ({ page }) => {
  await page.goto("/work/lego");
  await expect(
    page.getByRole("heading", {
      name: /designing for autonomy in a supervised system/i,
    })
  ).toBeVisible();
});

test("city page loads and mounts phaser shell", async ({ page }) => {
  await page.goto("/city?e2e=1");
  await expect(page.getByTestId("city-root")).toBeVisible();
  await expect(page.getByTestId("city-canvas")).toBeVisible();
  await expect(page.getByTestId("city-welcome-overlay")).toBeVisible();
});
