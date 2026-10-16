// Screenshot the running city with the opt-in 3D avatar (?avatar=3d): start adventure mode, find the player by its
// gold pointer, wheel-zoom in on it, capture idle and walking frames.
//   node city_avatar_shot.mjs <outDir> [wheelSteps] [buildingId]
import { chromium } from 'playwright';

const [, , outDir, stepsArg = '6', building = 'valtech-office'] = process.argv;
const LAB = process.env.LAB ?? 'http://localhost:3102';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

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
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      if (px[i] > 240 && px[i + 1] > 200 && px[i + 1] < 225 && px[i + 2] < 30) {
        const k = i / 4; sx += k % c.width; sy += Math.floor(k / c.width); n++;
      }
    }
    return n ? { x: sx / n, y: sy / n + 30, n } : null; // the player stands ~30 screen px below its arrow
  }, b64);
}

await page.goto(`${LAB}/city?e2e=1&avatar=3d`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__CITY_E2E__ !== 'undefined', null, { timeout: 180000 });
await page.waitForTimeout(1500);
await page.evaluate(() => window.__CITY_E2E__.startAdventure());
await page.waitForTimeout(3000);
for (let i = 0; i < Number(stepsArg); i++) {
  const p = await findPointer();
  if (!p) break;
  await page.mouse.move(p.x, p.y);
  await page.mouse.wheel(0, -240);
  await page.waitForTimeout(500);
}
await page.waitForTimeout(800);
await page.screenshot({ path: `${outDir}/city-idle.png` });
const walking = await page.evaluate((b) => window.__CITY_E2E__.walkToBuilding(b), building);
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${outDir}/city-walk-${i}.png` });
}
console.log('walking', walking, 'errors', errors.slice(0, 3));
await browser.close();
