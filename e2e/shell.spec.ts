import { expect, test, type Page } from "@playwright/test";

// The one-page portfolio at /: the panel (rail + content) beside the live city.
// The checks use roles and state, not section text: the sections are placeholders that step 2 replaces.

const canvas = (page: Page) => page.locator('[data-testid="city-canvas"] canvas');

async function canvasSize(page: Page) {
  const box = await canvas(page).boundingBox();
  return { width: box?.width ?? 0, height: box?.height ?? 0 };
}

test("panel and rail sit beside the city", async ({ page }) => {
  await page.goto("/");
  const rail = page.getByRole("navigation", { name: "Portfolio sections" });

  await expect(page.getByTestId("shell-panel")).toBeVisible();
  await expect(rail.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(canvas(page)).toHaveCount(1);

  await rail.getByRole("button", { name: "Work" }).click();
  await expect(rail.getByRole("button", { name: "Work" })).toHaveAttribute("aria-current", "page");
});

test("a case study opens in the panel and Back returns to the list", async ({ page }) => {
  await page.goto("/");
  const panel = page.getByTestId("shell-panel");

  await page.getByRole("navigation", { name: "Portfolio sections" }).getByRole("button", { name: "Work" }).click();
  await panel.getByRole("button", { name: /ML-Assisted Internal Product/ }).click();
  await expect(
    panel.getByRole("heading", { name: /designing for autonomy in a supervised system/i })
  ).toBeVisible();

  // The header shows Back, labelled with the section the case came from
  await panel.getByRole("button", { name: "Back to Work" }).click();
  await expect(panel.getByRole("button", { name: /ML-Assisted Internal Product/ })).toBeVisible();
});

test("closing the panel gives the city more room", async ({ page }, testInfo) => {
  await page.goto("/");
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

test("the URL keeps the open section and case", async ({ page }) => {
  await page.goto("/?s=work&case=lego");
  const panel = page.getByTestId("shell-panel");
  const rail = page.getByRole("navigation", { name: "Portfolio sections" });

  // A shared link opens the case directly, with Back leading to the section in the URL
  await expect(
    panel.getByRole("heading", { name: /designing for autonomy in a supervised system/i })
  ).toBeVisible();
  await expect(panel.getByRole("button", { name: "Back to Work" })).toBeVisible();

  // Each step is a history entry: browser Back closes the case, then returns to Home
  await rail.getByRole("button", { name: "CV" }).click();
  await expect(page).toHaveURL(/\?s=cv$/);
  await page.goBack();
  await expect(page).toHaveURL(/\?s=work&case=lego$/);
  await expect(panel.getByRole("button", { name: "Back to Work" })).toBeVisible();

  await panel.getByRole("button", { name: "Back to Work" }).click();
  await expect(page).toHaveURL(/\?s=work$/);
  await page.reload();
  await expect(rail.getByRole("button", { name: "Work" })).toHaveAttribute("aria-current", "page");
});

test("an unknown section or case in the URL falls back to Home", async ({ page }) => {
  await page.goto("/?s=nope&case=nope");
  const rail = page.getByRole("navigation", { name: "Portfolio sections" });
  await expect(rail.getByRole("button", { name: "Home" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByTestId("shell-panel").getByRole("button", { name: /^Back to/ })).toHaveCount(0);
});

// The live scene through the city's test API (?e2e=1), for the walk-in building opened in place
// (the callbacks run in the page, so each one reads it from window itself)
type SlotScene = { ready?: boolean; openInPlace: (id: string) => boolean; peek: { buildingId: string } | null };
type SlotWindow = { __CITY_E2E__?: { getScene: () => SlotScene | null; pauseGame: () => boolean } };

test("a building's place opens in the panel, and Back goes one step at a time", async ({ page }) => {
  await page.goto("/?e2e=1");
  const panel = page.getByTestId("shell-panel");
  await page.waitForFunction(() => !!(window as unknown as SlotWindow).__CITY_E2E__?.getScene()?.ready);

  // A tap on a walk-in building takes its roof off; its place opens in the panel, with the case's cover. The city
  // pauses after, so a software-rendered WebGL canvas does not slow the clicks below.
  await page.evaluate(() => {
    const city = (window as unknown as SlotWindow).__CITY_E2E__!;
    city.getScene()!.openInPlace("valtech-office");
    city.pauseGame();
  });
  await expect(page.getByTestId("place-section")).toBeVisible();
  await expect(page).toHaveURL(/place=valtech-office/);

  await panel.getByRole("button", { name: "Read the case" }).click();
  await expect(page).toHaveURL(/place=valtech-office&case=valtech/);

  // Back: the case goes back to the place, the place back to Home, and the roof goes back on
  await panel.getByRole("button", { name: "Back to Valtech" }).click();
  await expect(page.getByTestId("place-section")).toBeVisible();
  await panel.getByRole("button", { name: "Back to Home" }).click();
  await expect(page.getByTestId("place-section")).toHaveCount(0);
  await expect(page).not.toHaveURL(/place=/);
  await expect
    .poll(() => page.evaluate(() => (window as unknown as SlotWindow).__CITY_E2E__!.getScene()!.peek?.buildingId ?? null))
    .toBeNull();
});
