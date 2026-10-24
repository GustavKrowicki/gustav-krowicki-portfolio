// The city bike for the ride (builder-2d/ride.py): bundles entry.ts and renders it in headless Chromium.
//   node_modules/.bin/esbuild art/avatar-builder/builder-2d/bike/entry.ts --bundle --alias:@=. --format=iife \
//     --outfile=<dir>/bundle.js
//   node art/avatar-builder/builder-2d/bike/run.mjs <dir>
// writes <dir>/bike-<yaw>-<i>.png (8x the ride frame) and <dir>/points.json (saddle, pedals, grips in frame px).
// The numbers match ride.py: frame 72 x 88, ground row 72, 59.6 px a wu (the city scale less 14 %, so the doll's legs
// reach the pedals), pitch 30, the four yaws the city faces. CHROMIUM_PATH picks the browser (cloud sessions).
import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
const dir = process.argv[2];
const opts = { FW: 72, FH: 88, GROUND: 72, K: 59.6, SS: 8, yaws: [45, 135, 225, 315], n: 8, pitch: 30 };
const b = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
p.on('pageerror', (e) => console.log('err:', e.message));
await p.setContent('<html><body></body></html>');
await p.addScriptTag({ path: path.join(dir, 'bundle.js') });
const res = await p.evaluate((o) => window.bake(o), opts);
const meta = {};
for (const [yaw, frames] of Object.entries(res)) {
  meta[yaw] = frames.map((f, i) => {
    fs.writeFileSync(`${dir}/bike-${yaw}-${i}.png`, Buffer.from(f.png.split(',')[1], 'base64'));
    const { png, ...rest } = f;
    return rest;
  });
}
fs.writeFileSync(`${dir}/points.json`, JSON.stringify(meta, null, 1));
await b.close();
