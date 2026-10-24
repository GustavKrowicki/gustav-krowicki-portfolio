// Headless captures of the avatar in the entrance lab (window.__render / window.__avatarHarness), via Playwright.
//   node capture.mjs shots <outDir> <prefix> <json list of [name, options]> [query]
//   node capture.mjs harness <outDir>          rig-gate measurements (freeze, post-bind, clips, G1-G7 inputs)
//   node capture.mjs sweep <outDir> <binding>  G10 skin-integrity sweep frames (magenta background)
// LAB defaults to http://localhost:3102 (override with LAB=...).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const LAB = process.env.LAB ?? 'http://localhost:3102';
const [, , mode, outDir, ...rest] = process.argv;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function open(query) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${LAB}/tools/sprite-converter/entrance-lab?${query}`, { waitUntil: 'domcontentloaded' });
  try {
    await page.waitForFunction(() => window.__labReady === true, null, { timeout: 180000 });
  } catch (e) {
    console.error('lab not ready', errors.join('\n'));
    throw e;
  }
  return { page, errors };
}

async function save(page, name, options) {
  const url = await page.evaluate((o) => window.__render(o), options);
  writeFileSync(`${outDir}/${name}.png`, Buffer.from(url.split(',')[1], 'base64'));
}

if (mode === 'shots') {
  const [prefix, list, query = 'model=avatar'] = rest;
  const { page, errors } = await open(query);
  for (const [name, options] of JSON.parse(list)) await save(page, `${prefix}${name}`, options);
  if (errors.length) console.error('page errors:', errors.slice(0, 5).join('\n'));
} else if (mode === 'harness') {
  const prepared = await open('model=avatar&stage=prepared');
  writeFileSync(`${outDir}/meshes.json`, JSON.stringify(await prepared.page.evaluate(() => window.__avatarHarness.meshBuffers())));
  await prepared.page.close();
  const { page, errors } = await open('model=avatar&stage=bound&binding=transfer');
  const h = (fn, ...args) => page.evaluate(([f, a]) => window.__avatarHarness[f](...a), [fn, args]);
  writeFileSync(`${outDir}/meshes-after.json`, JSON.stringify(await h('meshBuffers')));
  writeFileSync(`${outDir}/sampled-clips.json`, JSON.stringify(await h('sampleClips', 25), null, 1));
  const out = {
    bindingSamples: await h('bindingSamples', 7),
    deformation: await h('deformation'),
    bindRestore: await h('bindRestore'),
    meshVisibility: await h('meshVisibility'),
    chainAnchors: await h('chainAnchors'),
    stats: await h('stats'),
  };
  writeFileSync(`${outDir}/harness.json`, JSON.stringify(out, null, 1));
  writeFileSync(`${outDir}/binding.json`, JSON.stringify(await h('binding')));
  if (errors.length) console.error('page errors:', errors.slice(0, 5).join('\n'));
  console.log(JSON.stringify(out.stats));
} else if (mode === 'parts') {
  const { page } = await open('model=avatar&stage=bound');
  writeFileSync(`${outDir}/parts.json`, JSON.stringify(await page.evaluate(() => window.__parts()), null, 1));
  console.log('parts written');
} else if (mode === 'hair') {
  const { page } = await open('model=avatar&stage=bound');
  writeFileSync(`${outDir}/hair-geometry.json`, JSON.stringify(await page.evaluate(() => window.__avatarHarness.hairGeometry())));
  console.log('hair geometry written');
} else if (mode === 'sweep') {
  const [binding] = rest;
  const { page } = await open(`model=avatar&stage=bound&binding=${binding}`);
  const clips = { idle: 3.0, walk: 1.0, 'walk-in-place': 1.0 };
  const frames = [];
  for (const [clip, duration] of Object.entries(clips)) {
    for (let i = 0; i < 4; i++) {
      const t = Math.round(((i + 0.5) * duration / 4) * 1000) / 1000;
      for (const side of [90, 270]) {
        for (const offset of [-25, 25]) {
          const name = `${binding}-${clip}-t${i}-s${side}-a${offset}`;
          await save(page, name, { view: 'reference', elev: 10, rig: 'lookdev', bg: 'ff00ff', clip, t, spin: side + offset, follow: true });
          frames.push({ name, clip, t, side, azimuthOffset: offset });
        }
      }
    }
  }
  writeFileSync(`${outDir}/${binding}-frames.json`, JSON.stringify({ clips: Object.keys(clips), times: 4, sides: 2, azimuths: 2, frames }, null, 1));
  console.log(binding, frames.length, 'frames');
}
await browser.close();
