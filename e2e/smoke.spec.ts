import { expect, test } from "@playwright/test";

test("the portfolio loads at the root with the city", async ({ page }) => {
  await page.goto("/?e2e=1");
  await expect(page.getByTestId("city-root")).toBeVisible();
  await expect(page.getByTestId("city-canvas")).toBeVisible();
});

test("the old /new and /city addresses redirect to the root and keep the query", async ({ page }) => {
  await page.goto("/new?s=work");
  await expect(page).toHaveURL(/\/\?s=work$/);
  await page.goto("/city?utm_source=resume");
  await expect(page).toHaveURL(/\/\?utm_source=resume$/);
  await expect(page.getByTestId("city-root")).toBeVisible();
});
