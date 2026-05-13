import { expect, test } from "@playwright/test";
import {
  dismissWelcome,
  focusBuilding,
  getCurrentEncounterId,
  getPlayerState,
  getVisitedBuildings,
  gotoCityE2E,
  openEncounter,
  setVisitedBuildings,
  startAdventure,
  walkToBuilding,
} from "./helpers/city";

test.describe("city flows", () => {
  test("free explore hides the welcome overlay", async ({ page }) => {
    await gotoCityE2E(page);

    await page.getByTestId("city-welcome-free-explore").click();

    await expect(page.getByTestId("city-welcome-overlay")).toBeHidden();
  });

  test("adventure flow via UI shows controls and can exit", async ({ page }, testInfo) => {
    await gotoCityE2E(page);

    await page.getByTestId("city-welcome-adventure").click();
    await page.getByRole("button", { name: /banana/i }).click();

    await expect(page.getByTestId("city-adventure-hud")).toBeVisible();
    if (testInfo.project.name.includes("mobile")) {
      await expect(page.getByTestId("city-joystick")).toBeVisible();
    }

    await page.getByTestId("city-exit-adventure").click();
    await expect(page.getByTestId("city-adventure-hud")).toBeHidden();
  });

  test("encounter dialog can be opened deterministically and dismissed", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await openEncounter(page, "lego");

    await expect(page.getByTestId("city-rpg-dialog")).toContainText("LEGO HQ");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("city-rpg-dialog")).toBeHidden();
  });

  test("mobile adventure never renders a talk button, even after closing the encounter dialog", async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("mobile"),
      "city-talk-button only ever rendered on mobile."
    );

    await gotoCityE2E(page);
    await startAdventure(page);
    await openEncounter(page, "lego");

    await expect(page.getByTestId("city-talk-button")).toHaveCount(0);

    // Dismiss via keyboard so handleDialogClose runs — that path leaves
    // currentEncounter set, which is the state where the Talk button used to appear.
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("city-rpg-dialog")).toBeHidden();

    await expect(page.getByTestId("city-talk-button")).toHaveCount(0);
  });

  test("dismissWelcome helper can move directly into viewer mode", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await dismissWelcome(page);

    await expect(page.getByTestId("city-welcome-overlay")).toBeHidden();
  });

  test("focusBuilding hook can target a building without opening a modal", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await focusBuilding(page, "lego-hq");

    await expect(page.getByTestId("city-welcome-overlay")).toBeHidden();
  });

  test("adventure hooks can expose Phaser player state and encounter identity", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await startAdventure(page);

    await expect
      .poll(() => getPlayerState(page))
      .toBeTruthy();

    await openEncounter(page, "lego");

    await expect
      .poll(() => getCurrentEncounterId(page))
      .toBe("lego");
  });

  test("walkToBuilding hook can be invoked and visited building state can be read", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await startAdventure(page);
    await walkToBuilding(page, "lego-hq");

    await expect
      .poll(() => getPlayerState(page))
      .toBeTruthy();

    await setVisitedBuildings(page, ["lego-hq", "sdu-kolding"]);

    await expect
      .poll(() => getVisitedBuildings(page))
      .toEqual(["lego-hq", "sdu-kolding"]);
  });
});
