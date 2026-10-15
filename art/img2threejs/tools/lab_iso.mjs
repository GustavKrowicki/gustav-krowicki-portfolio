// One lookdev iso capture through the entrance lab, posted to tools/sheet_receiver.py (port 8765).
// Usage: node art/img2threejs/tools/lab_iso.mjs <model> <name> <pitch> <yaw>
import { chromium } from 'playwright';
const [, , model, name, pitch = '30', yaw = '45'] = process.argv;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1400 } });
await page.goto(`http://localhost:3100/tools/sprite-converter/entrance-lab?model=${model}`, { waitUntil: 'networkidle', timeout: 300000 });
await page.waitForFunction(() => typeof window.__shoot === 'function', null, { timeout: 300000 });
await page.waitForTimeout(1500);
const o = { view: 'iso', fit: true, pitch: Number(pitch), yaw: Number(yaw), rig: 'lookdev', bg: 'ffffff', tone: 'neutral' };
console.log(name, JSON.stringify(await page.evaluate(([n, o]) => window.__shoot(n, o), [name, o])).slice(0, 80));
await browser.close();
