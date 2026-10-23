// render-many.cjs <list.json>: rasterise many SVGs in one browser, each with a transparent background.
// list.json: [[svgPath, pngPath, width, height], ...]. CHROMIUM_PATH picks the browser (cloud sessions).
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH });
  const p = await b.newPage();
  for (const [svgPath, out, w, h] of jobs) {
    await p.setViewportSize({ width: Number(w), height: Number(h) });
    await p.setContent(`<html><body style="margin:0;background:transparent">${fs.readFileSync(svgPath, 'utf8')}</body></html>`);
    await p.screenshot({ path: out, omitBackground: true });
  }
  await b.close();
})();
