// Capture a pass through the entrance lab: reference + iso views, 4 sprite directions (+ map-stripped), posted to
// tools/sheet_receiver.py (port 8765). Usage: node art/img2threejs/tools/lab_shoot.mjs <model> <pass> <zoom> <voff> [size]
import { chromium } from 'playwright';
const [, , model, pass, zoom, voff, size = '384'] = process.argv;
const S = { zoom: Number(zoom), voff: Number(voff), pitch: 30, size: Number(size), rig: 'converter' };
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1400 } });
page.on('console', (m) => { if (m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/tools/sprite-converter/entrance-lab?model=${model}`, { waitUntil: 'networkidle', timeout: 300000 });
await page.waitForFunction(() => typeof window.__shoot === 'function', null, { timeout: 300000 });
await page.waitForTimeout(1500);
const shots = [
  [`${pass}-reference`, { view: 'reference', rig: 'lookdev', bg: 'ffffff', tone: 'neutral' }],
  // iso view cropped to the model, matching an AI Studio style reference (white background, 30 deg)
  [`${pass}-iso`, { view: 'iso', fit: true, pitch: 30, yaw: 45, rig: 'lookdev', bg: 'ffffff', tone: 'neutral' }],
];
for (const [d, yaw] of [['south', 45], ['west', 135], ['north', 225], ['east', 315]]) {
  shots.push([`${pass}-sprite-${d}`, { view: 'sprite', yaw, ...S }]);
  shots.push([`${pass}-sprite-${d}-stripped`, { view: 'sprite', yaw, stripped: true, ...S }]);
}
for (const [name, o] of shots) console.log(name, JSON.stringify(await page.evaluate(([n, o]) => window.__shoot(n, o), [name, o])).slice(0, 80));
console.log('stats', JSON.stringify(await page.evaluate(() => window.__stats())));
await browser.close();
