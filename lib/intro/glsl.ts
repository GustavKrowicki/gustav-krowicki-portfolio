// GLSL shared by every intro look (lib/intro/presets.ts): uniforms, the city's isometric projection, the lot data
// texture (lib/intro/lots.ts), a few noise helpers and the "block city": the real grid drawn as flat-shaded blocks
// before a single building image has arrived. A preset only writes `vec4 intro(vec2 px)`.
import { GRID_ORIGIN } from "./camera";
import { LOTS } from "./lots";

export const PRELUDE = /* glsl */ `#extension GL_OES_standard_derivatives : enable
precision highp float;

uniform vec2 u_resolution;   // canvas pixels
uniform float u_time;        // seconds since the intro started
uniform float u_progress;    // 0..1, how much of the city has loaded
uniform float u_reveal;      // 0..1, the hand-over to the real city once it is ready (the overlay then disappears)
uniform float u_hour;        // the visitor's hour, 0..24, with minutes as a fraction
uniform float u_reduced;     // 1 when the visitor prefers reduced motion
uniform float u_seed;        // per-visit random, 0..1
uniform float u_pixel;       // CSS pixels per canvas pixel (the overlay renders chunky on purpose)
uniform vec3 u_w2s;          // world px = canvas px * x + yz (y down from the top edge)
uniform vec2 u_pointer;      // canvas px of the pointer, (-1,-1) when none
uniform sampler2D u_lots;    // one texel per tile, see lib/intro/lots.ts
uniform vec4 u_stage;        // where the city's canvas sits in this canvas (x, y, w, h): outside it the city shows its ground colour

const float TW = 44.0;                 // tile width in world px (lib/city/units.ts)
const float TH = 22.0;                 // tile height
const float KUP = 26.94;               // world px per world unit of height
const vec2 GRID = vec2(${LOTS.width}.0, ${LOTS.height}.0);
const vec2 GRID_ORIGIN = vec2(${GRID_ORIGIN.x.toFixed(1)}, ${GRID_ORIGIN.y.toFixed(1)});
const vec2 SPAWN = vec2(${LOTS.spawn[0]}.5, ${LOTS.spawn[1]}.5);
const float MAX_DIST = ${LOTS.maxDist.toFixed(3)};

// ---- the city's own colours (pogicity art and the ground colour the shell paints while loading)
const vec3 GROUND = vec3(0.451, 0.392, 0.373);   // #73645F
const vec3 GRASS = vec3(0.416, 0.541, 0.302);
const vec3 PAVED = vec3(0.604, 0.580, 0.549);
const vec3 SNOW = vec3(0.914, 0.933, 0.949);
const vec3 TOP = vec3(0.890, 0.827, 0.694);
const vec3 LEFT = vec3(0.769, 0.659, 0.471);
const vec3 RIGHT = vec3(0.576, 0.455, 0.310);
const vec3 LINE = vec3(0.957, 0.918, 0.839);

// ---- projection
vec2 toWorld(vec2 px) { return px * u_w2s.x + u_w2s.yz; }
vec2 toGrid(vec2 world) {
  vec2 p = world - GRID_ORIGIN;
  return vec2((p.x / (TW * 0.5) + p.y / (TH * 0.5)) * 0.5, (p.y / (TH * 0.5) - p.x / (TW * 0.5)) * 0.5);
}
vec2 gridToWorld(vec2 g) { return GRID_ORIGIN + vec2((g.x - g.y) * (TW * 0.5), (g.x + g.y) * (TH * 0.5)); }
float pxPerWorld() { return 1.0 / u_w2s.x; }
vec2 worldToPx(vec2 w) { return (w - u_w2s.yz) / u_w2s.x; }
// a small ring where the avatar will stand (the spawn tile), in canvas px
float spawnMark(vec2 px, float radiusPx) {
  vec2 s = worldToPx(GRID_ORIGIN + vec2((SPAWN.x - SPAWN.y) * (TW * 0.5), (SPAWN.x + SPAWN.y) * (TH * 0.5)));
  float d = length((px - s) * vec2(1.0, 2.0));   // an ellipse, flat like a tile
  return 1.0 - smoothstep(radiusPx * 0.6, radiusPx, abs(d - radiusPx));
}

// ---- lots
vec4 lotAt(vec2 g) {
  if (g.x < 0.0 || g.y < 0.0 || g.x >= GRID.x || g.y >= GRID.y) return vec4(0.0);
  return texture2D(u_lots, (floor(g) + 0.5) / GRID);
}
float lotClass(vec4 l) { return floor(l.r * 255.0 / 40.0 + 0.5); }   // 0 none 1 grass 2 paved 3 snow 4 building 5 prop
float lotOrder(vec4 l) { return l.g; }                              // 0..1 outward from the spawn, 0 = none
float lotHeight(vec4 l) { return l.b * 255.0 / 10.0; }              // world units
float lotDist(vec4 l) { return l.a; }                               // 0..1 of MAX_DIST
float gridDist(vec2 g) { return length(g - SPAWN); }                 // tiles from the spawn

// ---- noise
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return v; }
float bayer4(vec2 p) {
  vec2 q = mod(floor(p), 4.0);
  float i = q.x + q.y * 4.0;
  float v = 0.0;
  if (i == 0.0) v = 0.0; else if (i == 1.0) v = 8.0; else if (i == 2.0) v = 2.0; else if (i == 3.0) v = 10.0;
  else if (i == 4.0) v = 12.0; else if (i == 5.0) v = 4.0; else if (i == 6.0) v = 14.0; else if (i == 7.0) v = 6.0;
  else if (i == 8.0) v = 3.0; else if (i == 9.0) v = 11.0; else if (i == 10.0) v = 1.0; else if (i == 11.0) v = 9.0;
  else if (i == 12.0) v = 15.0; else if (i == 13.0) v = 7.0; else if (i == 14.0) v = 13.0; else v = 5.0;
  return (v + 0.5) / 16.0;
}
float easeOut(float t) { t = clamp(t, 0.0, 1.0); return 1.0 - pow(1.0 - t, 3.0); }
float easeInOut(float t) { t = clamp(t, 0.0, 1.0); return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0; }

// ---- lines on the ground plane, in canvas pixels
float tileEdgePx(vec2 g) {
  vec2 f = fract(g); vec2 d = min(f, 1.0 - f); vec2 w = max(fwidth(g), vec2(1e-5));
  return min(d.x / w.x, d.y / w.y);
}
// distance (px) to the nearest edge of this tile across which the building changes
float lotEdgePx(vec2 g) {
  vec4 here = lotAt(g); vec2 f = fract(g); vec2 w = max(fwidth(g), vec2(1e-5));
  float best = 1e5;
  float ox = f.x < 0.5 ? -1.0 : 1.0; float oy = f.y < 0.5 ? -1.0 : 1.0;
  if (lotOrder(lotAt(g + vec2(ox, 0.0))) != lotOrder(here)) best = min(best, min(f.x, 1.0 - f.x) / w.x);
  if (lotOrder(lotAt(g + vec2(0.0, oy))) != lotOrder(here)) best = min(best, min(f.y, 1.0 - f.y) / w.y);
  return best;
}
float line(float distPx, float widthPx) { return 1.0 - smoothstep(widthPx * 0.5, widthPx * 0.5 + 0.8, distPx); }

// ---- the block city. Walks the view ray from above the tallest block down to the ground, one tile at a time.
// In grid space the ray is the diagonal g(z) = g0 + z * C * (1, 1): higher is nearer the viewer. Each tile the ray
// crosses is checked once, so edges are exact. Returns (face, z, order, class): face 0 ground, 1 roof, 2 left wall
// (the +y side), 3 right wall (the +x side). gOut: the ground tile under the hit. hScale scales every height,
// showBelow hides blocks whose placement order is above it.
bool blockShown(vec4 l, float hScale, float showBelow) { return lotClass(l) >= 4.0 && lotOrder(l) <= showBelow; }
// a block just placed rises out of the ground with a small overshoot (none with reduced motion)
const float GROW_WINDOW = 0.035;
float blockGrow(vec4 l, float showBelow) {
  if (u_reduced > 0.5 || showBelow >= 1.0) return 1.0;
  float t = clamp((showBelow - lotOrder(l)) / GROW_WINDOW, 0.0, 1.0);
  return easeOut(t) + 0.22 * sin(t * 3.14159) * (1.0 - t);
}
float blockTop(vec4 l, float hScale, float showBelow) { return lotHeight(l) * hScale * blockGrow(l, showBelow); }
const float RAY_C = KUP / TH;   // grid units per world unit of height along the ray
vec4 castBlocks(vec2 world, float hScale, float showBelow, out vec2 gOut) {
  float zmax = 6.0 * hScale + 0.01;
  vec2 g0 = toGrid(world);
  float z = zmax;
  float entered = 0.0;   // 2: came in through a +y boundary, 3: through a +x boundary
  for (int i = 0; i < 26; i++) {
    vec2 g = g0 + z * RAY_C;
    vec2 f = fract(g);
    float stepX = f.x / RAY_C;
    float stepY = f.y / RAY_C;
    float zLo = z - min(stepX, stepY);
    vec4 l = lotAt(g);
    if (blockShown(l, hScale, showBelow)) {
      float h = blockTop(l, hScale, showBelow);
      if (h >= z && entered > 0.0) { gOut = g; return vec4(entered, z, lotOrder(l), lotClass(l)); }
      if (h > zLo && h < z) { gOut = g0 + h * RAY_C; return vec4(1.0, h, lotOrder(l), lotClass(l)); }
    }
    if (zLo <= 0.0) break;
    entered = stepX < stepY ? 3.0 : 2.0;
    z = zLo - 0.0005;
  }
  gOut = g0;
  vec4 l = lotAt(g0);
  return vec4(0.0, 0.0, lotOrder(l), lotClass(l));
}
vec3 groundColor(float cls) {
  if (cls == 1.0) return GRASS;
  if (cls == 2.0) return PAVED;
  if (cls == 3.0) return SNOW;
  if (cls == 0.0) return GROUND;
  return mix(GRASS, PAVED, 0.5);   // under a block (flat lots)
}
vec3 blockColor(vec4 hit) {
  float tone = 0.92 + 0.16 * hash12(vec2(hit.z * 97.0, 3.0));   // a little variation per building
  if (hit.x == 1.0) return TOP * tone;
  if (hit.x == 2.0) return LEFT * tone;
  if (hit.x == 3.0) return RIGHT * tone;
  return groundColor(hit.a);
}
// the whole block city at this pixel, opaque
vec3 blockCity(vec2 px, float hScale, float showBelow) {
  vec2 g; vec4 hit = castBlocks(toWorld(px), hScale, showBelow, g);
  vec3 c = blockColor(hit);
  if (hit.x == 0.0) c = mix(c, c * 0.8, line(tileEdgePx(g), 1.0) * 0.35);   // faint tile seams on the ground
  return c;
}
`;

export const EPILOGUE = /* glsl */ `
void main() {
  vec2 px = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);
  vec4 c = intro(px);
  // the letterbox beside a FIT canvas (desktop) stays the ground colour, as it does once the city is up
  if (px.x < u_stage.x || px.y < u_stage.y || px.x > u_stage.x + u_stage.z || px.y > u_stage.y + u_stage.w) c.a = 0.0;
  gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), clamp(c.a, 0.0, 1.0));
}
`;

export const PRELUDE_LINES = PRELUDE.split("\n").length;
