// Renders the real city once, through the real scene, and writes what the load intro draws before the city's own
// images have arrived (lib/intro/glsl.ts, "the real city"):
//   public/intro/city.webp        the city by day at zoom 1, cropped to the plot, lossy and small. The city is pixel
//                                 art drawn at whole-number zooms, so these are the pixels the visitor sees after the load
//   public/intro/city-exact.webp  the same, lossless; the intro swaps it in when it arrives
//   public/intro/city-ids.png     which building drew each pixel (its placement order from lib/intro/lots.json),
//                                 so a look can place buildings one at a time, pixel exact
//   lib/intro/snapshot.json       the crop in canvas pixels, the grid hash (the lab warns when the grid has moved on)
//
//   node art/intro/snapshot.mjs [baseUrl]      default http://127.0.0.1:3000 (a running `next dev` or `cf:dev`)
//   Run `node art/intro/build-lots.mjs` first when the grid changed. INTRO_CHROMIUM=/path/to/chrome picks a browser.
import { chromium } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const base = process.argv[2] ?? "http://127.0.0.1:3000";
const lots = JSON.parse(readFileSync(join(ROOT, "lib/intro/lots.json"), "utf8"));
// the same hash lib/intro/snapshot.ts computes in the browser, so the lab can tell a stale snapshot
const fnv1a = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); };
const gridHash = fnv1a(JSON.stringify(JSON.parse(readFileSync(join(ROOT, "lib/city/cityGrid.json"), "utf8"))));

const browser = await chromium.launch({
  executablePath: process.env.INTRO_CHROMIUM || undefined,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
page.on("pageerror", (e) => console.log("page error:", e.message));
await page.goto(`${base}/?e2e=1&hour=13&intro=0`, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => performance.getEntriesByName("city-ready").length > 0 && window.__CITY_E2E__?.getCameraState?.() !== null, null, { timeout: 180_000 });
// let the landing (close-up, glide, walk ring) run out, then take the avatar and every hint away
await page.waitForTimeout(3500);
// The camera must sit at zoom 1, scroll (0, 0): then a canvas pixel is a world pixel, and the intro can place the
// image where the city draws. The landing leaves a follow on the avatar and a pan or zoom still easing; both would
// move the camera back onto the avatar within the next second, and the snapshot would land 330 px off (it once did).
const parkCamera = () => page.evaluate(() => {
  const api = window.__CITY_E2E__;
  api.stopAdventure();
  const scene = api.getScene();
  const camera = scene.cameras.main;
  scene.tweens.killAll();
  camera.stopFollow();
  camera.panEffect.reset();
  camera.zoomEffect.reset();
  scene.walkHintPill?.destroy();
  scene.walkHintPill = null;
  scene.walkHover?.setVisible(false);
  scene.touchMarksGfx?.setVisible(false);
  scene.statsText?.setVisible(false);
  camera.setZoom(1);
  camera.setScroll(0, 0);
  // MainScene.updateCamera writes its own base scroll back every frame; it must say (0, 0) too
  scene.baseScrollX = 0;
  scene.baseScrollY = 0;
  scene.zoomLevel = 1;
});
const cameraAt = () => page.evaluate(() => {
  const camera = window.__CITY_E2E__.getScene().cameras.main;
  return { scrollX: camera.scrollX, scrollY: camera.scrollY, zoom: camera.zoom, following: Boolean(camera._follow) };
});
await parkCamera();
await page.waitForTimeout(1200);
let cam = await cameraAt();
if (cam.scrollX !== 0 || cam.scrollY !== 0 || cam.zoom !== 1) {
  console.log(`camera moved after parking (${JSON.stringify(cam)}), parking it again`);
  await parkCamera();
  await page.waitForTimeout(1200);
  cam = await cameraAt();
}
await page.evaluate(() => window.__CITY_E2E__.pauseGame());
await page.waitForTimeout(300);
cam = await cameraAt();
if (cam.scrollX !== 0 || cam.scrollY !== 0 || cam.zoom !== 1) {
  await browser.close();
  throw new Error(`camera not at zoom 1, scroll (0, 0) before the snapshot: ${JSON.stringify(cam)}`);
}
console.log(`camera parked: ${JSON.stringify(cam)}`);

const snap = () => page.evaluate(() => new Promise((resolve) => {
  const scene = window.__CITY_E2E__.getScene();
  scene.sys.game.renderer.snapshot((img) => resolve(img.src), "image/png");
}));
const colorUrl = await snap();

// The id pass: every tile and building sprite filled with a flat colour that names it; everything else hidden
const stats = await page.evaluate(({ order, cls, W }) => {
  const scene = window.__CITY_E2E__.getScene();
  const FILL = 1; // Phaser.TintModes.FILL
  const color = (rank, c) => ((rank >> 8) << 16) | ((rank & 255) << 8) | (c * 40);
  const marked = new Map();
  scene.tileSprites.forEach((img, key) => {
    const [x, y] = key.split(",").map(Number);
    const c = cls[y * W + x];
    marked.set(img, color(0, c >= 4 ? 2 : c || 1));
  });
  scene.entrancePavings.forEach((img) => marked.set(img, color(0, 2)));
  scene.buildingSprites.forEach((img, key) => {
    const m = /^building_(\d+),(\d+)/.exec(key);
    if (!m) return;
    const i = Number(m[2]) * W + Number(m[1]);
    marked.set(img, color(order[i], cls[i] || 4));
  });
  let hidden = 0;
  for (const obj of scene.children.list) {
    if (marked.has(obj)) continue;
    if (obj.visible) { obj.setVisible(false); hidden++; }
  }
  marked.forEach((c, img) => { img.setTint(c); img.setTintMode(FILL); });
  return { marked: marked.size, hidden };
}, { order: lots.order, cls: lots.cls, W: lots.width });
await page.waitForTimeout(300);
const idUrl = await snap();
await browser.close();
console.log(`sprites marked ${stats.marked}, other objects hidden ${stats.hidden}`);

const work = join(tmpdir(), `intro-snapshot-${process.pid}`);
mkdirSync(work, { recursive: true });
writeFileSync(join(work, "color.png"), Buffer.from(colorUrl.split(",")[1], "base64"));
writeFileSync(join(work, "ids.png"), Buffer.from(idUrl.split(",")[1], "base64"));

// Crop to the plot, decode the ids, write the files small (art/intro/snapshot-pack.py)
const meta = execFileSync("python3", ["-I", join(ROOT, "art/intro/snapshot-pack.py"), work, ROOT, gridHash], { encoding: "utf8" });
console.log(meta.trim());
