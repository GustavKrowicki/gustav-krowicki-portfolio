// Render the avatar's sprite frames from the entrance lab's sprite view (converter light, pitch 30, rest-bound
// framing) for the four GIF directions, at 4x supersampling of the final sheet resolution.
//   node render_sheets.mjs <outDir>
// Scale: the final sheet is 4x world pixels (0.9 wu = 4 * 0.9 * 26.94 = 97 px tall); rendered here at 4x that
// (supersampled), pack_sheets.py downsamples. Yaw per GIF direction = how gustavwalk<dir>.gif faces on the 2:1
// grid (types.ts GUSTAV_DIRECTION_TO_COMPASS): east faces screen down-left, north down-right, south up-left,
// west up-right.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const LAB = process.env.LAB ?? 'http://localhost:3102';
const [, , outDir] = process.argv;
mkdirSync(outDir, { recursive: true });

export const YAW = { east: 45, north: -45, south: 135, west: -135 };
const SUPER = 4;
const S = 2048;
// px per normalised unit = S*zoom/5; normalised units per wu = 3/0.9; vertical px per wu = cos30 * that.
const TARGET_PX_PER_WU_UP = 4 * 26.94 * SUPER;
const ZOOM = (TARGET_PX_PER_WU_UP * 5) / (Math.cos(Math.PI / 6) * (3 / 0.9) * S);
const VOFF = 0.25;
const CLIPS = { 'walk-in-place': { frames: 8, duration: 1.0 }, idle: { frames: 4, duration: 3.0 } };

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
await page.goto(`${LAB}/tools/sprite-converter/entrance-lab?model=avatar`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__labReady === true, null, { timeout: 180000 });
const meta = { supersample: SUPER, size: S, zoom: ZOOM, voff: VOFF, origin: [S / 2, S * (1 - VOFF)], yaw: YAW, clips: CLIPS, frames: [] };
for (const [dir, yaw] of Object.entries(YAW)) {
  for (const [clip, { frames, duration }] of Object.entries(CLIPS)) {
    for (let i = 0; i < frames; i++) {
      const t = (duration * i) / frames;
      const url = await page.evaluate((o) => window.__render(o), {
        view: 'sprite', pitch: 30, yaw, rig: 'converter', size: S, zoom: ZOOM, voff: VOFF, clip, t,
      });
      const name = `${clip}-${dir}-${i}`;
      writeFileSync(`${outDir}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
      meta.frames.push({ name, dir, clip, i, t });
    }
  }
}
writeFileSync(`${outDir}/frames.json`, JSON.stringify(meta, null, 1));
await browser.close();
console.log('frames', meta.frames.length, 'zoom', ZOOM.toFixed(4));
