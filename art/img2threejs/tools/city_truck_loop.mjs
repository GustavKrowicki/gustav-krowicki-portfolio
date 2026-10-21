// Play the food truck loop (Eat / Book at a trailer's hatch, lib/city/interiorBeats.ts choices) in the running city, time it
// and screenshot each step: the hatch card, Eat -> seated at the table with its card, then Book -> the inquiry card.
// Usage: LAB_PORT=3112 node art/img2threejs/tools/city_truck_loop.mjs <outDir> '<config json>'
// config: { viewport: [w, h], mobile: false, zoom: 4, start: [x, y], path: [[x, y], ...] (the last = the hatch tile) }
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, cfgJson] = process.argv;
const cfg = JSON.parse(cfgJson);
const [vw, vh] = cfg.viewport ?? [1440, 900];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: cfg.mobile ? 2 : 1, isMobile: !!cfg.mobile, hasTouch: !!cfg.mobile });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION_REFUSED')) console.log('console:', m.text().slice(0, 200)); });
await page.goto(`${process.env.CITY_BASE ?? `http://localhost:${process.env.LAB_PORT ?? 3100}`}${process.env.CITY_PATH ?? '/city'}?${process.env.CITY_AVATAR ?? 'avatar=3d&'}e2e=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); window.__CITY_E2E__.startAdventure(); await new Promise((r) => setTimeout(r, 1500)); });
const walkBtn = page.getByRole('button', { name: /^walk$/i });
if (await walkBtn.count()) await walkBtn.click();
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
const spawn = () => page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, cfg.start);
const walk = (x, y) => page.evaluate(async ([x, y]) => {
  const api = window.__CITY_E2E__; const pc = api.getScene().playerController;
  pc.walkToBuilding(x, y);
  for (let i = 0; i < 200 && api.getPlayerState() === 'autoWalking'; i++) await new Promise((r) => setTimeout(r, 100));
}, [x, y]);
const frame = (z) => page.evaluate((z) => {
  const s = window.__CITY_E2E__.getScene(); const cam = s.cameras.main; const p = s.playerController.getPosition();
  s.recordManualCameraInteraction(); cam.setZoom(z);
  cam.scrollX = Math.round(p.worldX - cam.width / 2); cam.scrollY = Math.round(p.worldY - 30 - cam.height / 2);
  s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = z; s.zoomHandledInternally = true; s.events.emit('zoomChanged', z);
}, z);
const card = () => page.evaluate(() => document.querySelector('[data-testid="peek-card"]')?.innerText.replace(/\s+/g, ' ').trim() ?? null);

// Eat
await spawn();
const t0 = Date.now();
for (const [x, y] of cfg.path) await walk(x, y);
await frame(cfg.zoom ?? 4);
await page.waitForSelector('[data-testid="peek-choice-eat"]', { timeout: 8000 });
const tCard = Date.now();
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/1-hatch.png` });
console.log('hatch card', JSON.stringify(await card()));
await page.click('[data-testid="peek-choice-eat"]');
const tEat = Date.now();
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().seated, null, { timeout: 15000 });
const tSeated = Date.now();
await frame(cfg.zoom ?? 4);
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/2-seated.png` });
console.log('seated card', JSON.stringify(await card()));
console.log(`timing eat: walk to hatch ${tCard - t0} ms (scripted walk), Eat -> seated ${tSeated - tEat} ms`);

// Book: step off and back onto the hatch tile, then Book
const [hx, hy] = cfg.path[cfg.path.length - 1];
await walk(hx + 1, hy); await walk(hx, hy); await frame(cfg.zoom ?? 4);
await page.waitForSelector('[data-testid="peek-choice-book"]', { timeout: 8000 });
await page.click('[data-testid="peek-choice-book"]');
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/3-booked.png` });
console.log('booked card', JSON.stringify(await card()));
// walking on closes it
await walk(hx + 1, hy); await page.waitForTimeout(400);
console.log('after walking on', JSON.stringify(await card()));
await browser.close();
