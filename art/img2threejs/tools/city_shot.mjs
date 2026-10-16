// Headless screenshot of the city focused on a building, via the e2e harness (?e2e=1).
import { chromium } from 'playwright';
const [, , outDir, ...ids] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto('http://localhost:3101/city?e2e=1', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window.__CITY_E2E__ !== 'undefined', null, { timeout: 120000 });
await page.waitForTimeout(1500);
for (const id of ids) {
  await page.evaluate((b) => window.__CITY_E2E__.focusBuilding(b), id);
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${outDir}/city-${id}.png` });
}
await browser.close();
console.log('ok');
