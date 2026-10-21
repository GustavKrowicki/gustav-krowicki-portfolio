// render.cjs <svg> <png> <width> <height> : rasterise an SVG with Chromium (free, local)
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [svgPath, out, w, h] = process.argv.slice(2);
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: Number(w), height: Number(h) } });
  await p.setContent(`<html><body style="margin:0;background:#e9e4da">${fs.readFileSync(svgPath, 'utf8')}</body></html>`);
  await p.screenshot({ path: out, omitBackground: false });
  await b.close();
})();
