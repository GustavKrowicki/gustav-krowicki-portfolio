import { expect, test } from "@playwright/test";
import {
  dismissWelcome,
  focusBuilding,
  getCurrentEncounterId,
  getPlayerState,
  getVisitedBuildings,
  gotoCityE2E,
  openBuildingModal,
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

  test("can open a non-project building modal through the city harness", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await openBuildingModal(page, "sdu-kolding");

    await expect(
      page.getByTestId("city-building-modal").getByRole("heading", {
        name: /sdu kolding/i,
      })
    ).toBeVisible();
    await expect(page.getByText(/building notes/i)).toBeVisible();
  });

  test("project building modal CTA navigates to the case study", async ({
    page,
  }) => {
    await gotoCityE2E(page);
    await openBuildingModal(page, "lego-hq");

    await page.getByRole("button", { name: /view case study/i }).click();
    await expect(page).toHaveURL(/\/work\/lego$/);
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

  test("mobile adventure hook exposes talk affordance when an encounter is active", async ({
    page,
  }, testInfo) => {
    test.skip(
      !testInfo.project.name.includes("mobile"),
      "Talk control is only rendered in mobile mode."
    );

    await gotoCityE2E(page);
    await startAdventure(page);
    await openEncounter(page, "lego");

    await expect(page.getByTestId("city-talk-button")).toBeVisible();
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
    await expect(page.getByTestId("city-building-modal")).toBeHidden();
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
