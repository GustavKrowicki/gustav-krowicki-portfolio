// Phone screenshot of the running city with the avatar standing on one tile (?e2e=1 test API): 390 x 844 at DPR 3,
// camera centred on the avatar at Street zoom (2), and a 2x close-up (zoom 4) centred on the gate of $GATE_BUILDING
// (default valtech-office: the south-east tile of its footprint).
// Usage: LAB_PORT=3113 node art/img2threejs/tools/city_phone_shot.mjs <outDir> <prefix> [gridX] [gridY]
// CITY_QUERY adds URL flags (default night=0). MOCK_RUNNER=x0,x1,y0,y1 draws a mock runner (grid units, brick red) on the
// ground before the shots: a look-only mock-up of a ground cue outside a building's footprint. WALK_IN=1 shows the
// building's hover state (MainScene.showWalkIn) before the shots. SWAP_VIEW=north draws $GATE_BUILDING with its north
// sprite in place (same footprint as south), to see that side in the city.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , out, prefix, gx = '13', gy = '29'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/city?e2e=1&${process.env.CITY_QUERY ?? 'night=0'}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await page.evaluate(async () => { await new Promise((r) => setTimeout(r, 1500)); window.__CITY_E2E__.startAdventure(); await new Promise((r) => setTimeout(r, 1500)); });
await page.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
await page.evaluate(([x, y]) => { const pc = window.__CITY_E2E__.getScene().playerController; pc.spawn(x, y, pc.characterType); }, [Number(gx), Number(gy)]);
if (process.env.MOCK_RUNNER) {
  await page.evaluate((r) => {
    const [x0, x1, y0, y1] = r.split(',').map(Number); const s = window.__CITY_E2E__.getScene();
    const pts = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]].map(([x, y]) => s.gridToScreen(x, y));
    const g = s.add.graphics(); g.fillStyle(0x9a4a36, 1); g.fillPoints(pts.map((p) => ({ x: p.x, y: p.y })), true);
    g.lineStyle(1, 0x7a3a2b, 1); g.strokePoints(pts.map((p) => ({ x: p.x, y: p.y })), true); const d = s.gridToScreen(Math.ceil(x1), Math.ceil(y1)); g.setDepth(d.y * 10000 + d.x + 0.02);   // above the ground tiles it covers (depth = y * 10000 + x)
  }, process.env.MOCK_RUNNER);
}
if (process.env.SWAP_VIEW) {
  await page.evaluate(([id, view]) => {
    const s = window.__CITY_E2E__.getScene();
    for (const sp of s.buildingSprites.values()) if (sp.texture?.key === `${id}_south`) sp.setTexture(`${id}_${view}`);
  }, [process.env.GATE_BUILDING ?? 'valtech-office', process.env.SWAP_VIEW]);
}
if (process.env.WALK_IN === '1') {
  await page.evaluate((id) => {
    const s = window.__CITY_E2E__.getScene();
    const key = [...s.interiorPlots.keys()].find((k) => { const p = s.interiorPlots.get(k); return s.grid[p.originY]?.[p.originX]?.buildingId === id; });
    if (key) s.showWalkIn(key);
  }, process.env.GATE_BUILDING ?? 'valtech-office');
}
for (const [name, z] of [['street', 2], ['closeup', 4]]) {
  const r = await page.evaluate(async ([z, gate]) => {
    const api = window.__CITY_E2E__; const s = api.getScene(); const pc = s.playerController; const cam = s.cameras.main;
    await new Promise((r) => setTimeout(r, 900));
    s.recordManualCameraInteraction();
    cam.setZoom(z);
    let p = pc.getPosition();
    if (z > 2) {
      const cells = s.grid.flat().filter((c) => c.buildingId === gate);
      const sp = s.gridToScreen(Math.max(...cells.map((c) => c.x)), Math.max(...cells.map((c) => c.y)));
      p = { worldX: sp.x, worldY: sp.y };
    }
    cam.scrollX = Math.round(p.worldX - cam.width / 2); cam.scrollY = Math.round(p.worldY - 40 - cam.height / 2);
    s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = z;
    s.zoomHandledInternally = true; s.events.emit('zoomChanged', z);
    api.closeEncounter?.();
    await new Promise((r) => setTimeout(r, 800));
    return { pos: pc.getPosition(), cam: [cam.width, cam.height, cam.zoom] };
  }, [z, process.env.GATE_BUILDING ?? 'valtech-office']);
  console.log(name, JSON.stringify(r));
  await page.screenshot({ path: `${out}/${prefix}-${name}.png` });
}
await browser.close();
