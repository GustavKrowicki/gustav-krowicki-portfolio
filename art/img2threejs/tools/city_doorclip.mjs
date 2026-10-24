// Walk up to the LEGO HQ door, in, and out again; screenshot the door region for a short clip. Usage: node city_doorclip.mjs <outDir>
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(`http://localhost:${process.env.LAB_PORT ?? 3103}/city?avatar=3d&e2e=1`, { waitUntil: 'load' });
await p.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await p.evaluate(async () => { const a = window.__CITY_E2E__; a.startAdventure(); await new Promise((r) => setTimeout(r, 1500)); });
await p.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
await p.evaluate(() => {
  const s = window.__CITY_E2E__.getScene(); const pc = s.playerController; pc.spawn(34, 47, pc.characterType);
  const cam = s.cameras.main; s.recordManualCameraInteraction(); cam.setZoom(5);
  const p = s.gridToScreen(34.5, 45);
  cam.scrollX = Math.round(p.x - cam.width / 2); cam.scrollY = Math.round(p.y - 10 - cam.height / 2);
  s.baseScrollX = cam.scrollX; s.baseScrollY = cam.scrollY; s.zoomLevel = 5; s.zoomHandledInternally = true; s.events.emit('zoomChanged', 5);
  s.cameraFollowPlayer = false;
});
let n = 0;
const shoot = async (k) => { for (let i = 0; i < k; i++) { await p.evaluate(() => window.__CITY_E2E__.closeEncounter()); await p.screenshot({ path: `${out}/f${String(n++).padStart(3, '0')}.png`, clip: { x: 470, y: 200, width: 500, height: 420 } }); await p.waitForTimeout(80); } };
await shoot(4);
console.log("in", await p.evaluate(() => { const s = window.__CITY_E2E__.getScene(); return s.playerController.walkToBuilding(34, 43); }));
await shoot(28);
console.log("out", await p.evaluate(() => { const s = window.__CITY_E2E__.getScene(); return s.playerController.walkToBuilding(34, 47); }));
await shoot(30);
await b.close();
