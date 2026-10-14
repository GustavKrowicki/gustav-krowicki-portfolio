import { expect, test, type Page } from "@playwright/test";

// The one-page portfolio shell at /new: the panel (rail + content) beside the live city.
// The checks use roles and state, not section text: the sections are placeholders that step 2 replaces.

const canvas = (page: Page) => page.locator('[data-testid="city-canvas"] canvas');

async function canvasSize(page: Page) {
  const box = await canvas(page).boundingBox();
  return { width: box?.width ?? 0, height: box?.height ?? 0 };
}

test("panel and rail sit beside the city", async ({ page }) => {
  await page.goto("/new");
  const rail = page.getByRole("navigation", { name: "Portfolio sections" });

  await expect(page.getByTestId("shell-panel")).toBeVisible();
  await expect(rail.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas(page)).toHaveCount(1);

  await rail.getByRole("button", { name: "Work" }).click();
  await expect(rail.getByRole("button", { name: "Work" })).toHaveAttribute("aria-current", "page");
});

test("closing the panel gives the city more room", async ({ page }, testInfo) => {
  await page.goto("/new");
  // Desktop: the panel is a column left of the city. Phones: a sheet under it.
  const axis = testInfo.project.name.startsWith("mobile") ? "height" : "width";

  await expect.poll(async () => (await canvasSize(page))[axis]).toBeGreaterThan(0);
  const open = (await canvasSize(page))[axis];

  await page.getByRole("button", { name: "Close panel" }).click();
  await expect.poll(async () => (await canvasSize(page))[axis]).toBeGreaterThan(open + 100);

  // Reopening must fit the canvas to the final size, not to a size from the middle of the panel animation.
  await page.getByRole("button", { name: "Home" }).click();
  await expect.poll(async () => (await canvasSize(page))[axis]).toBeLessThan(open + 2);
});
