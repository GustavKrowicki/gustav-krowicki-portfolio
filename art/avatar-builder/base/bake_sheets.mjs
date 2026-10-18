// Bakes the city sheets for every builder look (AVATAR_BAKED_LOOKS in lib/city/models/avatarPieces.ts)
// from the avatar toon lab, in the shipped avatar sheet format (avatar3d.json + one strip per clip and direction).
//   node art/avatar-builder/base/bake_sheets.mjs http://localhost:3112
// Writes public/game/pogicity/Characters/avatar-builder/<look>/ and thumbs/<option>.png (the builder's tiles).
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const base = process.argv[2] ?? 'http://localhost:3112';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../..');
const out = path.join(root, 'public/game/pogicity/Characters/avatar-builder');

// Same camera yaw per direction as the shipped sheets; the toon view turns the model instead of the camera.
const YAW = { east: 45, north: -45, south: 135, west: -135 };
const CLIPS = [
  { name: 'walk', clip: 'walk-in-place', frames: 8, durationS: 1 },
  { name: 'idle', clip: 'idle', frames: 4, durationS: 3 },
];
// The walk clip's stride is in proportion to the leg: the shipped figure covers 0.36 wu per cycle; this one's
// leg is 0.285 / 0.302 of it. At the city's 1.6 wu/s that sets the walk fps so the feet do not slide.
const STRIDE_WU = 0.36 * (0.285 / 0.302);
const WALK_FPS = (1.6 / STRIDE_WU) * 8;

// Every top x head x legs combination (the option ids of AVATAR_SLOTS), so no saved choice falls back.
const TOPS = ['tee', 'hoodie', 'sweater', 'clubShirt', 'skiShell'];
const HEADS = ['none', 'beanie', 'helmet'];
const LEGS = ['denim', 'cargo', 'skiPants'];
const looks = TOPS.flatMap((t) => HEADS.flatMap((h) => LEGS.map((l) => [t, h, l])));
const PIECE = { hoodie: 'hoodie', sweater: 'sweater', clubShirt: 'clubShirt', beanie: 'beanie', cargo: 'cargo',
  skiShell: 'skiShell', skiPants: 'skiPants', helmet: 'helmet' };

const browser = await chromium.launch({ args: ['--use-angle=metal'] });
const page = await browser.newPage();
await page.goto(`${base}/tools/sprite-converter/avatar-toon`, { waitUntil: 'load', timeout: 180000 });
await page.waitForFunction(() => window.__bakeSheet, null, { timeout: 120000 });
for (const look of process.env.THUMBS_ONLY ? [] : looks) {
  const key = look.join('-');
  const wear = look.map((id) => PIECE[id]).filter(Boolean);
  const dir = path.join(out, key);
  fs.mkdirSync(dir, { recursive: true });
  const manifest = { animations: {} };
  for (const [compass, yaw] of Object.entries(YAW)) {
    for (const c of CLIPS) {
      const r = await page.evaluate((o) => window.__bakeSheet(o), { wear, yawDeg: -yaw, clip: c.clip, frames: c.frames });
      const file = `${c.name}-${compass}.png`;
      fs.writeFileSync(path.join(dir, file), Buffer.from(r.png.split(',')[1], 'base64'));
      Object.assign(manifest, { frameWidth: r.frameWidth, frameHeight: r.frameHeight,
        origin: [0.5, Number(((r.frameHeight - r.footPx) / r.frameHeight).toFixed(5))] });
      manifest.animations[`${c.name}_${compass}`] = {
        file, outlineFile: file, frames: c.frames,
        fps: c.name === 'walk' ? Number(WALK_FPS.toFixed(2)) : Number((c.frames / c.durationS).toFixed(3)),
        repeat: -1, durationS: c.durationS,
      };
    }
  }
  const sorted = { frameWidth: manifest.frameWidth, frameHeight: manifest.frameHeight, origin: manifest.origin,
    displayScale: 0.25,
    note: 'Builder look ' + key + '. Sheets are 2 px per street-zoom px (0.9 wu = 108 px); displayScale 0.25 draws 54 px at Street zoom 2. ' +
      'origin = the ground point under the feet. Baked by art/avatar-builder/base/bake_sheets.mjs from lib/city/models/avatarToon.ts (ortho, pitch 30, 1 px outline). ' +
      'The outline is in the frames, so file and outlineFile are the same sheet.',
    yaw: YAW, animations: manifest.animations };
  fs.writeFileSync(path.join(dir, 'avatar3d.json'), JSON.stringify(sorted, null, 1) + '\n');
  console.log('baked', key);
}
// Tile thumbnails: each option's own GLB pieces, turned a little so the tile reads as 3D (the NODES map
// mirrors `nodes` in AVATAR_SLOTS). 128 px for sharp tiles at 2x and 3x screens.
const NODES = { tee: ['tee'], hoodie: ['hoodie'], sweater: ['sweater'], clubShirt: ['clubShirt'], none: ['hair'],
  beanie: ['beanie'], denim: ['jeans'], cargo: ['cargo'], skiShell: ['skiShell'], helmet: ['helmet'], skiPants: ['skiPants'] };
fs.mkdirSync(path.join(out, 'thumbs'), { recursive: true });
for (const [id, nodes] of Object.entries(NODES)) {
  const png = await page.evaluate((o) => window.__thumb(o), { nodes, yawDeg: -20, size: 128 });
  fs.writeFileSync(path.join(out, 'thumbs', `${id}.png`), Buffer.from(png.split(',')[1], 'base64'));
  console.log('thumb', id);
}
await browser.close();
