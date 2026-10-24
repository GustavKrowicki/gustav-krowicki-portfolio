// Walk the avatar into a walk-in building in the running city and screenshot each moment (?e2e=1 test API).
// Usage: LAB_PORT=3104 node art/img2threejs/tools/city_walkin.mjs <outDir> [buildingId] [steps json]
// steps: [[name, gridX, gridY], ...] walked in order; a screenshot after each, camera centred on the building at zoom 2
// (CITY_ZOOM sets the zoom; CITY_FOCUS=player centres the player instead of the building; CITY_QUERY adds URL flags,
// e.g. valtech=5x2).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, buildingId = 'lego-hq', stepsJson] = process.argv;
const steps = stepsJson ? JSON.parse(stepsJson) : [
  ['1-street', 17, 39], ['2-plaza', 12, 39], ['3-inside-lobby', 12, 37], ['4-workshop', 13, 34], ['5-back-out', 17, 39],
];
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
// CITY_PHONE=1: a 390 x 844 phone at DPR 3 instead of the desktop window
const page = await browser.newPage(process.env.CITY_PHONE === '1'
  ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
  : { viewport: { width: 1440, height: 900 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/city?avatar=3d&e2e=1${process.env.CITY_QUERY ? `&${process.env.CITY_QUERY}` : ''}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => {
  const api = window.__CITY_E2E__;
  await new Promise((r) => setTimeout(r, 1500));
  api.startAdventure();
  await new Promise((r) => setTimeout(r, 1500));
});
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
const first = steps[0];
await page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, [first[1], first[2]]);
for (const [name, x, y] of steps) {
  const r = await page.evaluate(async ([x, y, id, z, focus]) => {
    const api = window.__CITY_E2E__; const s = api.getScene(); const pc = s.playerController;
    const p0 = pc.getPosition();
    let ok = true;
    if (p0.gridX !== x || p0.gridY !== y) {
      ok = pc.walkToBuilding(x, y);
      for (let i = 0; i < 200 && api.getPlayerState() === 'autoWalking'; i++) await new Promise((r) => setTimeout(r, 100));
    }
    await new Promise((r) => setTimeout(r, 900));
    // centre the building at zoom 2
    const cell = s.grid.flat().find((c) => c.isOrigin && c.buildingId === id);
    const cam = s.cameras.main;
    s.recordManualCameraInteraction();
    const sp = s.buildingSprites.get(`building_${cell.x},${cell.y}`);
    cam.setZoom(z);
    const p = pc.getPosition();
    const [fx, fy] = focus === 'player' ? [p.worldX, p.worldY - 20] : [sp.x, sp.y - sp.displayHeight * 0.45];
    cam.scrollX = Math.round(fx - cam.width / 2);
    cam.scrollY = Math.round(fy - cam.height / 2);
    s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = z;
    s.zoomHandledInternally = true; s.events.emit('zoomChanged', z);
    api.closeEncounter();
    await new Promise((r) => setTimeout(r, 600));
    return { ok, pos: pc.getPosition(), open: [...s.openBuildings], depth: pc.depthOverride, tex: sp.texture.key };
  }, [x, y, buildingId, Number(process.env.CITY_ZOOM ?? 2), process.env.CITY_FOCUS ?? 'building']);
  console.log(name, JSON.stringify(r));
  await page.screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
