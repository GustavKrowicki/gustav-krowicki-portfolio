// Review shots of the harbour library in the running city (?e2e=1 test API), desktop 1440 x 900:
//   street: Street zoom 2, centred on the avatar standing on the plaza by the south stair
//   wide:   zoom 1, centred between the stadium and the library
// Usage: LAB_PORT=3115 node art/img2threejs/harbour-library/city_shots.mjs <outDir> <prefix> [gridX] [gridY]
// CITY_QUERY adds URL flags (default night=0).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, prefix, gx = '22.6', gy = '16.3'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/city?e2e=1&${process.env.CITY_QUERY ?? 'night=0'}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); window.__CITY_E2E__.startAdventure(); await new Promise((r) => setTimeout(r, 1500)); });
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
await page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, [Number(gx), Number(gy)]);
for (const [name, z, at] of [['street', 2, null], ['wide', 1, [21, 7]]]) {
  const r = await page.evaluate(async ([z, at]) => {
    const api = window.__CITY_E2E__; const s = api.getScene(); const pc = s.playerController; const cam = s.cameras.main;
    await new Promise((r) => setTimeout(r, 900));
    s.recordManualCameraInteraction();
    cam.setZoom(z);
    let p = pc.getPosition();
    if (at) { const sp = s.gridToScreen(at[0], at[1]); p = { worldX: sp.x, worldY: sp.y }; }
    cam.scrollX = Math.round(p.worldX - cam.width / 2); cam.scrollY = Math.round(p.worldY - 60 - cam.height / 2);
    s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = z;
    s.zoomHandledInternally = true; s.events.emit('zoomChanged', z);
    api.closeEncounter?.();
    await new Promise((r) => setTimeout(r, 800));
    return { pos: pc.getPosition(), cam: [cam.width, cam.height, cam.zoom] };
  }, [z, at]);
  console.log(name, JSON.stringify(r));
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
}
await browser.close();
