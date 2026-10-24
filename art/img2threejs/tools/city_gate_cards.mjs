// Check a walk-in building's door cards in the running app: walk in through the main door (enter card), walk back
// out (leave card), press View case study. Screenshots each step.
// Usage: node art/img2threejs/tools/city_gate_cards.mjs <base url> <outDir> [desktop | phone] [path=/new]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const [, , base, out, mode = 'desktop', path = '/new'] = process.argv;
mkdirSync(out, { recursive: true });
const phone = mode === 'phone';
const b = await chromium.launch({ args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: phone ? { width: 390, height: 844 } : { width: 1440, height: 900 }, deviceScaleFactor: phone ? 2 : 1, isMobile: phone, hasTouch: phone });
await p.goto(`${base}${path}?e2e=1&avatar=3d`, { waitUntil: 'load', timeout: 120000 });
await p.waitForFunction(() => { const s = window.__CITY_E2E__?.getScene(); return !!(s && s.isReady && s.grid.length); }, null, { timeout: 120000 });
await p.waitForTimeout(2500);
await p.getByRole('button', { name: /^walk$/i }).click();
await p.waitForFunction(() => !!window.__CITY_E2E__.getScene().playerController?.isReady, null, { timeout: 60000 });
const walk = (x, y) => p.evaluate(async ([x, y]) => {
  const api = window.__CITY_E2E__; const pc = api.getScene().playerController;
  pc.walkToBuilding(x, y);
  for (let i = 0; i < 200 && api.getPlayerState() === 'autoWalking'; i++) await new Promise((r) => setTimeout(r, 100));
}, [x, y]);
const card = () => p.evaluate(() => document.querySelector('[data-testid="peek-card"]')?.innerText.replace(/\n+/g, ' | ') ?? null);
await walk(15, 28);
await walk(15, 26);
await p.waitForTimeout(600);
console.log('inside at the gate:', await card());
await p.screenshot({ path: `${out}/1-enter.png` });
await walk(14, 26); await p.waitForTimeout(1800);
console.log('at the desk:', await card(), 'seated', await p.evaluate(() => !!window.__CITY_E2E__.getScene().seated));
await walk(15, 26); await walk(15, 28);
await p.waitForTimeout(600);
console.log('outside again:', await card());
await p.screenshot({ path: `${out}/2-leave.png` });
const btn = p.getByRole('button', { name: /view case study/i });
if (await btn.count()) {
  await btn.click(); await p.waitForTimeout(2500);
  console.log('after View case study:', p.url(), (await p.locator('body').innerText()).includes('Valtech') ? 'Valtech text on page' : 'no Valtech text');
  await p.screenshot({ path: `${out}/3-case.png` });
} else console.log('no View case study button');
await b.close();
