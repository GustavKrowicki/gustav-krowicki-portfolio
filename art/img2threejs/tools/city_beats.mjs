// Walk the avatar through a walk-in building's beats in the running city at a phone viewport, screenshot each beat at
// the given zooms (camera on the player), and check whether the opened interior fits the visible screen without panning.
// Usage: LAB_PORT=3108 node art/img2threejs/tools/city_beats.mjs <outDir> '<config json>'
// config: { query: "valtech=5x2", buildingId, viewport: [390, 844], zooms: [2, 4], start: [x, y],
//           beats: [[name, gridX, gridY], ...], wallWu: 1.4 }
// Prints one JSON line per shot and per fit check. The fit check centres the camera on the interior (footprint diamond
// plus the far walls) and reports whether it lies inside the part of the canvas that is on screen (the canvas is CSS
// scaled to cover the viewport, so its edges can be off screen), and the avatar's on-screen height in CSS px.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, cfgJson] = process.argv;
const cfg = JSON.parse(cfgJson);
const [vw, vh] = cfg.viewport ?? [390, 844];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/city?avatar=3d&e2e=1${cfg.query ? `&${cfg.query}` : ''}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => {
  await new Promise((r) => setTimeout(r, 1500));
  window.__CITY_E2E__.startAdventure();
  await new Promise((r) => setTimeout(r, 1500));
});
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
await page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, cfg.start);

// Camera helpers run in the page: centre on a world point at a zoom, and measure what is on screen
const setCam = (fx, fy, z) => page.evaluate(async ([fx, fy, z]) => {
  const api = window.__CITY_E2E__; const s = api.getScene(); const cam = s.cameras.main;
  s.recordManualCameraInteraction();
  cam.setZoom(z);
  cam.scrollX = Math.round(fx - cam.width / 2);
  cam.scrollY = Math.round(fy - cam.height / 2);
  s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = z;
  s.zoomHandledInternally = true; s.events.emit('zoomChanged', z);
  api.closeEncounter();
  await new Promise((r) => setTimeout(r, 500));
}, [fx, fy, z]);

const measure = (id, wallWu) => page.evaluate(([id, wallWu]) => {
  const s = window.__CITY_E2E__.getScene(); const cam = s.cameras.main; const pc = s.playerController;
  const cell = s.grid.flat().find((c) => c.isOrigin && c.buildingId === id);
  const sp = s.buildingSprites.get(`building_${cell.x},${cell.y}`);
  const rows = s.grid.flat().filter((c) => c.buildingId === id && c.originX === cell.x && c.originY === cell.y);
  const W = Math.max(...rows.map((c) => c.x)) - cell.x + 1, H = Math.max(...rows.map((c) => c.y)) - cell.y + 1;
  // footprint diamond from the sprite's anchor (bottom vertex = the plot's front corner), plus the far walls
  const TW = 44, TH = 22, rise = wallWu * 26.94;
  const bx = sp.x, by = sp.y;
  const box = { x0: bx - W * TW / 2, x1: bx + H * TW / 2, y0: by - (W + H) * TH / 2 - rise, y1: by };
  // the on-screen part of the canvas in world coordinates
  const canvas = s.game.canvas; const rect = canvas.getBoundingClientRect();
  const gx = (px) => (px - rect.left) * (s.scale.width / rect.width), gy = (py) => (py - rect.top) * (s.scale.height / rect.height);
  const a = cam.getWorldPoint(gx(Math.max(0, rect.left)), gy(Math.max(0, rect.top)));
  const b = cam.getWorldPoint(gx(Math.min(innerWidth, rect.right)), gy(Math.min(innerHeight, rect.bottom)));
  const view = { x0: a.x, y0: a.y, x1: b.x, y1: b.y };
  const fits = box.x0 >= view.x0 && box.x1 <= view.x1 && box.y0 >= view.y0 && box.y1 <= view.y1;
  const cssPerWorld = cam.zoom * rect.width / s.scale.width;
  return { W, H, fits, interiorCss: [Math.round((box.x1 - box.x0) * cssPerWorld), Math.round((box.y1 - box.y0) * cssPerWorld)],
    screenCss: [innerWidth, innerHeight], avatarCss: Math.round(0.9 * 26.94 * cssPerWorld), centre: [(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2],
    open: [...s.openBuildings], pos: pc.getPosition() };
}, [id, wallWu]);

for (const [name, x, y] of cfg.beats) {
  const ok = await page.evaluate(async ([x, y]) => {
    const api = window.__CITY_E2E__; const pc = api.getScene().playerController;
    const p0 = pc.getPosition();
    let ok = true;
    if (p0.gridX !== x || p0.gridY !== y) {
      ok = pc.walkToBuilding(x, y);
      for (let i = 0; i < 200 && api.getPlayerState() === 'autoWalking'; i++) await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 900));
    return ok;
  }, [x, y]);
  for (const z of cfg.zooms) {
    const p = await page.evaluate(() => window.__CITY_E2E__.getScene().playerController.getPosition());
    await setCam(p.worldX, p.worldY - 20, z);
    const m = await measure(cfg.buildingId, cfg.wallWu ?? 1.4);
    console.log(JSON.stringify({ shot: `${name}-z${z}`, ok, pos: [m.pos.gridX, m.pos.gridY], open: m.open.length > 0, avatarCss: m.avatarCss }));
    await page.screenshot({ path: `${out}/${name}-z${z}.png` });
  }
}
// Fit: the camera on the whole interior (player still inside on the last beat)
for (const z of cfg.zooms) {
  const m0 = await measure(cfg.buildingId, cfg.wallWu ?? 1.4);
  await setCam(m0.centre[0], m0.centre[1], z);
  const m = await measure(cfg.buildingId, cfg.wallWu ?? 1.4);
  console.log(JSON.stringify({ fit: `z${z}`, fits: m.fits, interiorCss: m.interiorCss, screenCss: m.screenCss, avatarCss: m.avatarCss }));
  await page.screenshot({ path: `${out}/fit-z${z}.png` });
}
await browser.close();
