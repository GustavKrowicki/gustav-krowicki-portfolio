// Share of each story prop that stays visible from the sprite camera with the avatar on its stand tile (entrance lab mask
// renders). Usage: LAB_PORT=3108 node art/img2threejs/tools/prop_visibility.mjs <model> '<shot options json>' '<props json>'
// props: [{ "name": "desk-2", "parts": "int-desk-2|int-chair-2", "stand": [2.0, 1.5] }, ...]; stand in plan tiles.
// Prints one JSON line per prop: solo pixels, visible pixels with the avatar on the stand tile, share.
import { chromium } from 'playwright';
const [, , model, shotJson, propsJson] = process.argv;
const shot = JSON.parse(shotJson), props = JSON.parse(propsJson);
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--use-gl=angle', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1300, height: 1400 } });
await page.goto(`http://localhost:${process.env.LAB_PORT ?? 3100}/tools/sprite-converter/entrance-lab?model=${model}`, { waitUntil: 'load', timeout: 120000 });
await page.waitForFunction(() => typeof window.__render === 'function', null, { timeout: 120000 });
await page.waitForTimeout(800);
// Render one mask shot and count the pixels of mask colour rgb(255, 8, 0) (entry 0) in the page
const count = (o) => page.evaluate(async (o) => {
  const img = new Image();
  img.src = window.__render(o);
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 200 && d[i] >= 252 && Math.abs(d[i + 1] - 8) <= 3 && d[i + 2] <= 3) n++;
  return n;
}, o);
for (const p of props) {
  const masks = [p.parts];
  const solo = await count({ ...shot, masks, only: [p.parts] });
  const seen = await count({ ...shot, masks, avatarAt: p.stand });
  console.log(JSON.stringify({ name: p.name, stand: p.stand, solo, seen, share: solo ? +(seen / solo).toFixed(3) : null }));
}
await browser.close();
