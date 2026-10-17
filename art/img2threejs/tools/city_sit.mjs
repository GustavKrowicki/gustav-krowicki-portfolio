// Walk the avatar to a beat with a seat (lib/city/interiorBeats.ts) in the running city and screenshot the sit moment:
// seated (before the screens open), screens open, after "Stand up", and after a move key from a second sit.
// Usage: LAB_PORT=3109 node art/img2threejs/tools/city_sit.mjs <outDir> '<config json>'
// CITY_BASE=<url> runs it on a deployed preview; CITY_AVATAR='' uses the default (GIF) avatar.
// config: { viewport: [w, h], mobile: false, zoom: 8, start: [x, y], path: [[x, y], ...] (the last = the stand tile) }
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, cfgJson] = process.argv;
const cfg = JSON.parse(cfgJson);
const [vw, vh] = cfg.viewport ?? [1440, 900];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: cfg.mobile ? 2 : 1, isMobile: !!cfg.mobile, hasTouch: !!cfg.mobile });
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CONNECTION_REFUSED')) console.log('console:', m.text().slice(0, 200)); });
await page.goto(`${process.env.CITY_BASE ?? `http://localhost:${process.env.LAB_PORT ?? 3100}`}/city?${process.env.CITY_AVATAR ?? 'avatar=3d&'}e2e=1`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); window.__CITY_E2E__.startAdventure(); await new Promise((r) => setTimeout(r, 1500)); });
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
await page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, cfg.start);
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
for (const [x, y] of cfg.path) await walk(x, y);
await frame(cfg.zoom ?? 8);
// seated, before the screens open (the overlay waits 0.7 s after the sit)
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().seated, null, { timeout: 15000 });
await page.waitForTimeout(300);   // the 160 ms cross-fade to the seated sprite
await page.screenshot({ path: `${out}/1-seated.png` });
await page.waitForSelector('[data-testid="screens-overlay"]', { timeout: 5000 });
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/2-screens.png` });
await page.click('[data-testid="screens-overlay-close"]');
await page.waitForTimeout(700);
const s1 = await page.evaluate(() => ({ seated: !!window.__CITY_E2E__.getScene().seated, overlay: !!document.querySelector('[data-testid="screens-overlay"]'), card: !!document.querySelector('[data-testid="peek-card"]') }));
console.log('after stand up', JSON.stringify(s1));
await page.screenshot({ path: `${out}/3-stood-up.png` });
// leave and come back: it sits again; then a move key stands it up and closes the screens
const [sx, sy] = cfg.path[cfg.path.length - 1];
await walk(sx - 1, sy); await walk(sx, sy); await frame(cfg.zoom ?? 8);
await page.waitForSelector('[data-testid="screens-overlay"]', { timeout: 8000 });
await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(250); await page.keyboard.up('ArrowLeft');
await page.waitForTimeout(900);
const s2 = await page.evaluate(() => ({ seated: !!window.__CITY_E2E__.getScene().seated, overlay: !!document.querySelector('[data-testid="screens-overlay"]'), pos: window.__CITY_E2E__.getScene().playerController.getPosition() }));
console.log('after move key', JSON.stringify(s2));
await page.screenshot({ path: `${out}/4-moved.png` });
await browser.close();
