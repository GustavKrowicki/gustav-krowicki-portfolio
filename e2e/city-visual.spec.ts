import { expect, test } from "@playwright/test";
import {
  gotoCityE2E,
  openBuildingModal,
  openEncounter,
  startAdventure,
} from "./helpers/city";

test.describe("city visual regression", () => {
  test("welcome overlay snapshot", async ({ page }) => {
    await gotoCityE2E(page);
    await expect(page.getByTestId("city-welcome-overlay")).toHaveScreenshot(
      "city-welcome-overlay.png"
    );
  });

  test("building modal snapshot", async ({ page }) => {
    await gotoCityE2E(page);
    await openBuildingModal(page, "sdu-kolding");

    await expect(page.getByTestId("city-building-modal")).toHaveScreenshot(
      "city-building-modal.png"
    );
  });

  test("rpg dialog snapshot", async ({ page }) => {
    await gotoCityE2E(page);
    await openEncounter(page, "lego");

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
    await startAdventure(page, "banana");
    await openEncounter(page, "lego");

    await expect(page.getByTestId("city-adventure-hud")).toHaveScreenshot(
      "city-adventure-hud-mobile.png"
    );
    await expect(page.getByTestId("city-joystick")).toHaveScreenshot(
      "city-joystick-mobile.png"
    );
  });
});
