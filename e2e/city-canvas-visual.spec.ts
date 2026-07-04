import { expect, test } from "@playwright/test";
import {
  dismissWelcome,
  getPlayerState,
  gotoCityE2E,
  pauseGame,
  startAdventure,
  waitForCanvasStable,
} from "./helpers/city";

// Pixel-level regression coverage for the Phaser canvas itself — the DOM
// snapshots in city-visual.spec.ts can't see inside it. The scene is paused
// before each screenshot so nothing can move between runs (ambient cars/NPCs
// are already skipped entirely in e2e mode).
//
// Baselines are WebGL renders and therefore GPU/machine-specific: regenerate
// with `--update-snapshots` when running on new hardware, and revisit this
// approach if these tests ever move to CI.

const CANVAS = '[data-testid="city-canvas"] canvas';

// Small tolerance for raster noise and the player sprite's animation phase.
const SCREENSHOT_OPTIONS = { maxDiffPixelRatio: 0.02 };

test.describe("city canvas visual regression", () => {
  test("initial city view renders", async ({ page }) => {
    await gotoCityE2E(page);
    await dismissWelcome(page);

    await waitForCanvasStable(page);
    await pauseGame(page);

    await expect(page.locator(CANVAS)).toHaveScreenshot(
      "city-canvas-initial.png",
      SCREENSHOT_OPTIONS
    );
  });

  test("adventure mode renders the player", async ({ page }) => {
    await gotoCityE2E(page);
    await startAdventure(page);

    // Spawn walk-in finished (player back to idle). The idle sprite keeps
    // animating, so freeze FIRST, then confirm the frame is stable; the
    // sprite's animation phase at pause time is absorbed by the tolerance.
    await expect.poll(() => getPlayerState(page), { timeout: 15000 }).toBe("idle");
    await pauseGame(page);
    await waitForCanvasStable(page);

    await expect(page.locator(CANVAS)).toHaveScreenshot(
      "city-canvas-adventure.png",
      SCREENSHOT_OPTIONS
    );
  });
});
