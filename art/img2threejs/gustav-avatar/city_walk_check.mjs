// Walk the ?avatar=3d player in all four directions in the running city and capture zoomed crops around it.
//   node city_walk_check.mjs <outDir> [wheelSteps]
// Finds the player by its gold pointer; writes <dir>-<i>.png crops and console.json (errors/warnings).
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';

const [, , outDir, stepsArg = '7'] = process.argv;
const LAB = process.env.LAB ?? 'http://localhost:3102';
const browser = await chromium.launch({ args: (process.env.GL ?? '--use-angle=swiftshader,--enable-unsafe-swiftshader').split(',') });
// A <768 px viewport puts the city in its mobile adventure camera: Street zoom 2 with lerp follow of the player.
const page = await browser.newPage({ viewport: { width: Number(process.env.VW ?? 760), height: 560 }, deviceScaleFactor: 1 });
const consoleLog = [];
page.on('response', (r) => { if (r.status() >= 400) consoleLog.push({ type: 'http', text: `${r.status()} ${r.url()}` }); });
page.on('pageerror', (e) => consoleLog.push({ type: 'pageerror', text: String(e) }));
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleLog.push({ type: m.type(), text: m.text() }); });

async function findPointer() {
  const b64 = (await page.screenshot()).toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = `data:image/png;base64,${data}`;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const px = ctx.getImageData(0, 0, c.width, c.height).data;
    let sx = 0, sy = 0, n = 0, maxY = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] > 240 && px[i + 1] > 200 && px[i + 1] < 225 && px[i + 2] < 30) {
        const k = i / 4; const y = Math.floor(k / c.width);
        sx += k % c.width; sy += y; n++; maxY = Math.max(maxY, y);
      }
    }
    return n ? { x: sx / n, y: sy / n, tipY: maxY, n } : null;
  }, b64);
}

await page.goto(`${LAB}/city?e2e=1${process.env.NO3D ? '' : '&avatar=3d'}`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__CITY_E2E__ !== 'undefined', null, { timeout: 180000 });
await page.evaluate(() => window.__CITY_E2E__.dismissWelcome());
await page.waitForTimeout(1500);
await page.evaluate(() => window.__CITY_E2E__.startAdventure());
await page.waitForTimeout(3000);
for (let i = 0; i < Number(stepsArg); i++) {
  const p = await findPointer();
  if (!p) break;
  await page.mouse.move(p.x, p.y + 40);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(400);
}
await page.mouse.move(5, 790);
const shots = [];
// Keyboard input does not move the player in this headless harness (the GIF player neither; checked), so walk
// with the e2e auto-walk to buildings in different directions. Full-frame screenshots only (fast); crops are made
// offline around the gold pointer (city_walk_crops.py).
for (const building of (process.env.TARGETS ?? 'lego-hq,aarhus-stadium').split(',')) {
  const ok = await page.evaluate((b) => window.__CITY_E2E__.walkToBuilding(b), building);
  for (let i = 0; i < Number(process.env.SHOTS ?? 24); i++) {
    const path = `${outDir}/${building}-${String(i).padStart(2, '0')}.png`;
    await page.screenshot({ path });
    shots.push({ building, ok, i, path, t: Date.now() });
  }
}
await page.screenshot({ path: `${outDir}/full.png` });
writeFileSync(`${outDir}/console.json`, JSON.stringify(consoleLog, null, 1));
writeFileSync(`${outDir}/shots.json`, JSON.stringify(shots, null, 1));
console.log('shots', shots.length, 'console', consoleLog.length);
await browser.close();
