import { expect, test } from "@playwright/test";
import {
  gotoCityE2E,
  openEncounter,
  pauseGame,
  startAdventure,
  waitForCanvasStable,
} from "./helpers/city";

test.describe("city visual regression", () => {
  test("welcome overlay snapshot", async ({ page }) => {
    await gotoCityE2E(page);

    // The overlay screenshot includes transparent margins where the canvas
    // peeks through, so the game must be fully loaded and frozen — and the
    // avatar image decoded — before the shot is deterministic.
    await page.waitForFunction(() => {
      const img = document.querySelector<HTMLImageElement>(
        '[data-testid="city-welcome-overlay"] img'
      );
      return !!img && img.complete && img.naturalWidth > 0;
    });
    await waitForCanvasStable(page);
    await pauseGame(page);

    await expect(page.getByTestId("city-welcome-overlay")).toHaveScreenshot(
      "city-welcome-overlay.png"
    );
  });

  test("rpg dialog snapshot", async ({ page }) => {
    await gotoCityE2E(page);
    await openEncounter(page, "lego");

    // Wait for the typewriter to finish naturally — the Close button only
    // renders once typing is done. Do NOT press Enter to skip: if typing has
    // already finished, Enter closes the dialog instead.
    await expect(
      page
        .getByTestId("city-rpg-dialog-panel")
        .getByRole("button", { name: /close/i })
    ).toBeVisible({ timeout: 20000 });

    // Freeze the game so the canvas visible at the panel edges (and the
    // player, spawned by openEncounter) can't move between attempts.
    await pauseGame(page);

    await expect(page.getByTestId("city-rpg-dialog-panel")).toHaveScreenshot(
      "city-rpg-dialog.png"
    );
  });

  test("mobile adventure controls snapshot", async ({ page }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("mobile"),
      "Adventure controls visual coverage is mobile-only."
    );

    await gotoCityE2E(page);
    await startAdventure(page);
    await openEncounter(page, "lego");

    await expect(page.getByTestId("city-adventure-hud")).toHaveScreenshot(
      "city-adventure-hud-mobile.png"
    );
    await expect(page.getByTestId("city-joystick")).toHaveScreenshot(
      "city-joystick-mobile.png"
    );
  });
});
