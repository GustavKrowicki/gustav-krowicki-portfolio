// Checks the hand-over from the load intro to the live city by pixels, the way the 330 px offset of 2026-10-24 was
// found: the intro's last frame before the fade against the city's first frame under it, at desktop and phone size.
// Good: a mean difference of 6 to 15 of 255 over the centre, with differences only at the figure and the people.
// A wrong image, a wrong crop or a camera that is not on the spawn tile shows as 40 and more.
//
//   node art/intro/handover-check.mjs [baseUrl] [look]   default http://127.0.0.1:3000 (a running `next dev`) and the
//                                                        first-visit look (lib/intro/labState.ts INTRO_DEFAULT)
//   Writes <out>/<size>.jpg (intro frame, city frame, difference, side by side) and prints the hand-over log.
//   INTRO_CHROMIUM=/path/to/chrome picks a browser, HANDOVER_OUT=/dir the output folder (default the OS temp folder),
//   HANDOVER_MAX the limit (default 20). Exit code 1 when a size is over the limit.
//
// Run it after `node art/intro/build-lots.mjs` and `node art/intro/snapshot.mjs`, so after any change to the city.
// The headless clock runs slow, so the timings it prints mean little; the pixels are what counts. The same probe for
// a real browser (a script pasted into Chrome on the live site) is kept outside the repo, next to the intro learnings.
import { chromium, devices } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const base = process.argv[2] ?? "http://127.0.0.1:3000";
const look = process.argv[3];
const out = process.env.HANDOVER_OUT || join(tmpdir(), "intro-handover");
const limit = Number(process.env.HANDOVER_MAX || 20);
mkdirSync(out, { recursive: true });

// Runs before any page script: keeps the intro's frames once the city is ready. The intro draws without
// preserveDrawingBuffer, so a frame can only be read right after its draw, inside the same animation frame.
const CAPTURE = `(() => {
  const frames = []; window.__handoverFrames = frames;
  let lastTs = -1; const px = new Uint8Array(4); const nat = window.requestAnimationFrame.bind(window);
  const ready = () => performance.getEntriesByName("city-ready").length > 0;
  window.requestAnimationFrame = (cb) => nat((ts) => {
    cb(ts);
    try {
      if (ts === lastTs || !ready()) return;
      const canvas = document.querySelector('[data-testid="intro-overlay"] canvas');
      if (!canvas) return;
      const gl = canvas.getContext("webgl");
      gl.readPixels(canvas.width >> 1, canvas.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
      if (px[3] === 0) return;
      lastTs = ts;
      frames.push({ t: performance.now(), url: canvas.toDataURL("image/png"), rect: canvas.getBoundingClientRect().toJSON() });
      while (frames.length > 40) frames.shift();
    } catch (e) { window.__handoverError = String(e); }
  });
})();`;

// In the page after intro-done: the city's first frame from Phaser, the intro's last frame before the fade, the
// difference over a centre crop (the figure and its surroundings), and a side-by-side picture.
const compare = () => (async () => {
  const api = window.__CITY_E2E__;
  const scene = api.getScene();
  const game = scene.sys.game;
  const cityImg = await new Promise((res) => game.renderer.snapshot((img) => res(img), "image/png"));
  const cityRect = game.canvas.getBoundingClientRect();
  const log = window.__introLog ?? [];
  const readyT = log.find((e) => e.what === "city-ready")?.t ?? 0;
  const reveal = log.find((e) => e.what === "intro-reveal");
  const revealT = reveal ? reveal.t : Infinity;
  const frames = window.__handoverFrames ?? [];
  let pick = null;
  for (const f of frames) if (f.t < revealT - 5) pick = f;
  pick ??= frames[0];
  if (!pick) throw new Error(`no intro frame captured (${window.__handoverError ?? "no error"})`);
  const introImg = new Image();
  introImg.src = pick.url;
  await introImg.decode();
  const R = pick.rect;
  const cw = Math.round(R.width), ch = Math.round(R.height);
  const paint = (img, x, y, w, h) => {
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cw, ch); g.drawImage(img, x, y, w, h);
    return [c, g];
  };
  const [A, a] = paint(introImg, 0, 0, cw, ch);
  const [B, b] = paint(cityImg, cityRect.left - R.left, cityRect.top - R.top, cityRect.width, cityRect.height);
  const CW = Math.min(400, cw - 20), CH = Math.min(300, ch - 20);
  const x0 = Math.round(cw / 2 - CW / 2), y0 = Math.round(Math.min(ch - CH / 2, ch / 2 + 20) - CH / 2);
  const ia = a.getImageData(x0, y0, CW, CH), ib = b.getImageData(x0, y0, CW, CH);
  const D = document.createElement("canvas"); D.width = CW; D.height = CH;
  const d = D.getContext("2d"); const id = d.createImageData(CW, CH);
  let sum = 0, over = 0; const n = CW * CH;
  for (let p = 0; p < n; p++) {
    const o = p * 4;
    const dd = (Math.abs(ia.data[o] - ib.data[o]) + Math.abs(ia.data[o + 1] - ib.data[o + 1]) + Math.abs(ia.data[o + 2] - ib.data[o + 2])) / 3;
    sum += dd; if (dd > 40) over++;
    id.data[o] = id.data[o + 1] = id.data[o + 2] = Math.min(255, dd * 3); id.data[o + 3] = 255;
  }
  d.putImageData(id, 0, 0);
  const S = document.createElement("canvas"); S.width = CW * 3 + 20; S.height = CH;
  const s = S.getContext("2d"); s.fillStyle = "#fff"; s.fillRect(0, 0, S.width, S.height);
  s.drawImage(A, x0, y0, CW, CH, 0, 0, CW, CH);
  s.drawImage(B, x0, y0, CW, CH, CW + 10, 0, CW, CH);
  s.drawImage(D, 0, 0, CW, CH, 2 * CW + 20, 0, CW, CH);
  const cam = scene.cameras.main;
  const lines = log
    .filter((e) => /geometry|intro-reveal|intro-frames|hold-start|glide|render#1/.test(e.what))
    .map((e) => `${((e.t - readyT) / 1000).toFixed(2).padStart(6)} s  ${e.what}${e.detail ? "  " + e.detail : ""}`);
  return {
    mean: +(sum / n).toFixed(1), over40: +((over / n) * 100).toFixed(1), frames: frames.length,
    pickT: +((pick.t - readyT) / 1000).toFixed(2), revealT: reveal ? +((revealT - readyT) / 1000).toFixed(2) : null,
    camera: { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom }, crop: [x0, y0, CW, CH],
    jpeg: S.toDataURL("image/jpeg", 0.72), lines, error: window.__handoverError ?? null,
  };
})();

const browser = await chromium.launch({
  executablePath: process.env.INTRO_CHROMIUM || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
let failed = false;
for (const [label, options] of [
  ["desk", { viewport: { width: 1470, height: 833 }, deviceScaleFactor: 1 }],
  ["phone", { ...devices["iPhone 14"], deviceScaleFactor: 1 }],
]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log(`${label}: page error: ${e.message}`));
  await page.addInitScript(CAPTURE);
  const query = new URLSearchParams({ e2e: "1", hour: "13", report: "1" });
  if (look) query.set("intro", look);
  await page.goto(`${base}/new?${query}`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => performance.getEntriesByName("intro-done").length > 0, null, { timeout: 300_000 });
  const r = await page.evaluate(compare);
  const file = join(out, `${label}.jpg`);
  writeFileSync(file, Buffer.from(r.jpeg.split(",")[1], "base64"));
  const verdict = r.mean <= limit ? "ok" : `OVER THE LIMIT of ${limit}`;
  if (r.mean > limit) failed = true;
  console.log(`=== ${label}: mean difference ${r.mean} of 255 (${verdict}), ${r.over40}% of pixels over 40`);
  console.log(`    intro frame ${r.pickT} s after city-ready (${r.frames} kept), reveal at ${r.revealT} s, camera ${JSON.stringify(r.camera)}`);
  console.log(`    ${file}`);
  if (r.error) console.log(`    capture error: ${r.error}`);
  console.log(r.lines.map((l) => `    ${l}`).join("\n"));
  await context.close();
}
await browser.close();
process.exit(failed ? 1 : 0);
