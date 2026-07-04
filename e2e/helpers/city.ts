import { expect, Page } from "@playwright/test";

type CityE2EApi = {
  dismissWelcome: () => void;
  focusBuilding: (buildingId: string) => boolean;
  startAdventure: () => boolean;
  walkToBuilding: (buildingId: string) => Promise<boolean>;
  openEncounter: (stopId: string) => boolean;
  closeEncounter: () => void;
  getPlayerState: () => string | null;
  getCurrentEncounterId: () => string | null;
  getVisitedBuildings: () => string[];
  setVisitedBuildings: (buildingIds: string[]) => void;
  stopAdventure: () => void;
  pauseGame: () => boolean;
  resumeGame: () => boolean;
};

declare global {
  interface Window {
    __CITY_E2E__?: CityE2EApi;
  }
}

async function waitForCityHarness(page: Page) {
  await expect(page.getByTestId("city-root")).toBeVisible();
  await expect(page.getByTestId("city-canvas")).toBeVisible();
  await expect(page.locator('[data-testid="city-canvas"] canvas')).toHaveCount(1);
  await page.waitForFunction(() => typeof window.__CITY_E2E__ !== "undefined");
}

async function callCityHook<T>(
  page: Page,
  method: keyof CityE2EApi,
  ...args: unknown[]
): Promise<T> {
  return page.evaluate(({ method, args }) => {
    const api = window.__CITY_E2E__;
    if (!api) {
      throw new Error("City E2E API not available");
    }

    const fn = api[method] as (...fnArgs: unknown[]) => T;
    return fn(...args);
  }, { method, args });
}

export async function gotoCityE2E(page: Page) {
  await page.goto("/city?e2e=1");
  await waitForCityHarness(page);
}

export async function dismissWelcome(page: Page) {
  await waitForCityHarness(page);
  await callCityHook(page, "dismissWelcome");
  await expect(page.getByTestId("city-welcome-overlay")).toBeHidden();
}

export async function startAdventure(page: Page) {
  await waitForCityHarness(page);
  await callCityHook(page, "startAdventure");
  await expect(page.getByTestId("city-adventure-hud")).toBeVisible();
  await expect.poll(() => getPlayerState(page)).toBeTruthy();
}

export async function openEncounter(page: Page, stopId: string) {
  await waitForCityHarness(page);
  const opened = await callCityHook<boolean>(page, "openEncounter", stopId);
  expect(opened).toBe(true);
  await expect(page.getByTestId("city-rpg-dialog")).toBeVisible();
}

export async function focusBuilding(page: Page, buildingId: string) {
  await waitForCityHarness(page);
  const focused = await callCityHook<boolean>(page, "focusBuilding", buildingId);
  expect(focused).toBe(true);
}

export async function walkToBuilding(page: Page, buildingId: string) {
  await waitForCityHarness(page);
  const walking = await callCityHook<boolean>(page, "walkToBuilding", buildingId);
  expect(walking).toBe(true);
}

export async function getPlayerState(page: Page) {
  await waitForCityHarness(page);
  return callCityHook<string | null>(page, "getPlayerState");
}

export async function getCurrentEncounterId(page: Page) {
  await waitForCityHarness(page);
  return callCityHook<string | null>(page, "getCurrentEncounterId");
}

export async function getVisitedBuildings(page: Page) {
  await waitForCityHarness(page);
  return callCityHook<string[]>(page, "getVisitedBuildings");
}

export async function setVisitedBuildings(page: Page, buildingIds: string[]) {
  await waitForCityHarness(page);
  await callCityHook(page, "setVisitedBuildings", buildingIds);
}

export async function pauseGame(page: Page) {
  await waitForCityHarness(page);
  // Poll: the game instance can be transiently unavailable (e.g. remount).
  await expect
    .poll(() => callCityHook<boolean>(page, "pauseGame"), { timeout: 10000 })
    .toBe(true);
}

// Wait until the canvas stops changing (textures loaded, camera settled).
// Don't use waitForLoadState("networkidle") for this: PostHog recording
// flushes and dev-overlay polling keep the network busy forever.
export async function waitForCanvasStable(page: Page) {
  const canvas = page.locator('[data-testid="city-canvas"] canvas');
  let prev = await canvas.screenshot();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const cur = await canvas.screenshot();
    if (cur.equals(prev)) return;
    prev = cur;
  }
  throw new Error("Canvas never stabilized — something is still animating");
}
