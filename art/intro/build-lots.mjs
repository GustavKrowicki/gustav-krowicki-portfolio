// Builds lib/intro/lots.json: the city grid as a tiny data set the load intro's shader can draw before any
// building image has arrived (components/city/IntroOverlay.tsx, lib/intro/lots.ts).
//
//   node art/intro/build-lots.mjs
//
// Per tile: class (grass, paved, snow, building, prop), the building's placement order counted outward from the
// avatar's spawn tile, the building's height in tenths of a world unit (from its south sprite's pixel height), and
// the tile's distance from the spawn. Run it again after Save City in /city/editor or a new building sprite.
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const ROOT = new URL("../../", import.meta.url).pathname;
const TILE_WIDTH = 44, TILE_HEIGHT = 22;
const PX_PER_WU_UP = (TILE_WIDTH / Math.SQRT2) * Math.cos(Math.asin(TILE_HEIGHT / TILE_WIDTH));
const SPAWN = [15, 30];

// The building registry is TypeScript: bundle it once for node
const out = join(mkdtempSync(join(tmpdir(), "lots-")), "buildings.mjs");
await build({ entryPoints: [join(ROOT, "lib/city/buildings.ts")], bundle: true, format: "esm", platform: "node", outfile: out, logLevel: "silent" });
const { BUILDINGS } = await import(out);

const grid = JSON.parse(readFileSync(join(ROOT, "lib/city/cityGrid.json"), "utf8"));
const H = grid.length, W = grid[0].length;

// The opaque part of each sprite (PIL alpha bounds), since the PNGs carry empty space above the roof
function opaqueHeights(paths) {
  try {
    const script = `
import json, sys
from PIL import Image
out = {}
for p in json.load(sys.stdin):
    try:
        im = Image.open(p).convert("RGBA")
        box = im.getchannel("A").getbbox()
        out[p] = (box[3] - box[1]) if box else im.height
    except Exception:
        pass
print(json.dumps(out))`;
    const text = execFileSync("python3", ["-I", "-c", script], { input: JSON.stringify(paths), encoding: "utf8" });
    return JSON.parse(text);
  } catch (e) {
    console.warn("python3 + PIL not available, using full PNG heights:", String(e.message).split("\n")[0]);
    return {};
  }
}
function pngSize(path) {
  const buf = readFileSync(join(ROOT, "public", path));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

const CLASS = { grass: 1, paved: 2, snow: 3, building: 4, prop: 5 };
const cls = new Array(W * H).fill(0);
const order = new Array(W * H).fill(0);
const height = new Array(W * H).fill(0);
const dist = new Array(W * H).fill(0);

const origins = [];
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const c = grid[y][x];
  const i = y * W + x;
  const d = Math.hypot(x + 0.5 - (SPAWN[0] + 0.5), y + 0.5 - (SPAWN[1] + 0.5));
  dist[i] = d;
  if (c.type === "grass") cls[i] = CLASS.grass;
  else if (c.type === "snow") cls[i] = CLASS.snow;
  else if (c.type === "tile" || c.type === "road" || c.type === "asphalt") cls[i] = CLASS.paved;
  else if (c.type === "building") {
    const def = BUILDINGS[c.buildingId];
    const prop = !def || def.category === "props";
    cls[i] = prop ? CLASS.prop : CLASS.building;
    if (c.isOrigin && def) origins.push({ x, y, def, orientation: c.buildingOrientation, d });
  }
}

// Placement order: outward from the spawn, so every reveal starts at the avatar
origins.sort((a, b) => a.d - b.d);
const dirOf = { down: "south", up: "north", right: "east", left: "west" };
const spriteOf = (o) => (o.orientation && o.def.sprites[dirOf[o.orientation]]) || o.def.sprites.south;
const opaque = opaqueHeights([...new Set(origins.map((o) => join(ROOT, "public", spriteOf(o))))]);
origins.forEach((o, n) => {
  const fp = (o.def.footprintByOrientation && o.orientation && o.def.footprintByOrientation[dirOf[o.orientation]]) || o.def.footprint;
  const spritePath = spriteOf(o);
  let hWu = 1;
  try {
    const h = opaque[join(ROOT, "public", spritePath)] ?? pngSize(spritePath).h;
    const scale = o.def.spriteScale ?? 1;
    const diamond = (fp.width + fp.height) * (TILE_HEIGHT / 2);
    hWu = Math.max(0.3, (h * scale - diamond) / PX_PER_WU_UP);
  } catch { /* missing sprite: keep 1 wu */ }
  if (o.def.category === "props") hWu = Math.min(hWu, 1.6);
  const tenths = Math.min(255, Math.round(Math.min(hWu, 6) * 10));
  for (let dy = 0; dy < fp.height; dy++) for (let dx = 0; dx < fp.width; dx++) {
    const i = (o.y + dy) * W + (o.x + dx);
    if (i < 0 || i >= W * H) continue;
    order[i] = n + 1;
    height[i] = tenths;
  }
});

const maxDist = Math.max(...dist);
const data = {
  width: W, height: H, spawn: SPAWN, buildings: origins.length, maxDist: Number(maxDist.toFixed(3)),
  cls, order, heights: height, dist: dist.map((d) => Math.round((d / maxDist) * 255)),
};
writeFileSync(join(ROOT, "lib/intro/lots.json"), JSON.stringify(data));
console.log(`lots.json: ${W}x${H}, ${origins.length} buildings, max distance ${maxDist.toFixed(1)} tiles`);
