// Render entrance-lab shots straight to files (window.__render; no receiver on 8765 needed).
// Usage: LAB_PORT=3104 node art/img2threejs/tools/lab_render.mjs <model> <outDir> <name>='<options json>' [...]
// e.g. node lab_render.mjs hqAvatar renders p1-sprite-south='{"view":"sprite","yaw":45,"zoom":0.9,"voff":0.2,"pitch":30,"size":768,"rig":"converter"}'
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [, , model, out, ...shots] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1400 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/tools/sprite-converter/entrance-lab?model=${model}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof window.__render === 'function', null, { timeout: 120000 });
await page.waitForTimeout(800);
// textures that load after the model (lib/city/models/valtechOfficeDetail.ts: the case images on the screens)
await page.waitForFunction(() => !(globalThis.__labPending > 0), null, { timeout: 30000 });
for (const s of shots) {
  const i = s.indexOf('=');
  const name = s.slice(0, i), o = JSON.parse(s.slice(i + 1));
  const url = await page.evaluate((o) => window.__render(o), o);
  writeFileSync(`${out}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
  console.log('saved', name);
}
if (process.env.LAB_STATS) console.log('stats', JSON.stringify(await page.evaluate(() => window.__stats?.())));
await browser.close();
