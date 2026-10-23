// The looks for the load intro (POR-40 brief, "draw one look"): each is a fragment shader body that defines
// vec4 intro(vec2 px) on top of lib/intro/glsl.ts. The lab (/tools/intro-lab) edits these live; the site plays the
// one Gustav picks. Captions are drafts for him to rewrite (POR-41 owns the words).
export type IntroCamera = "fly" | "close" | "fit";

export interface IntroPreset {
  id: string;
  name: string;
  blurb: string;
  // fly: from the whole city down to the avatar as the load completes; close: on the avatar from the start
  camera: IntroCamera;
  line?: string;
  glsl: string;
}

const blueprint = /* glsl */ `// Blueprint: the grid draws itself outward from the avatar, lot outlines next, and each lot fills with a block
// as its building's turn comes. The load is the progress bar, in the city's own geometry.
vec4 intro(vec2 px) {
  vec2 w = toWorld(px);
  vec2 g = toGrid(w);
  float p = u_progress;
  float d = gridDist(g) / MAX_DIST;
  float front = p * 1.2;
  float drawn = 1.0 - smoothstep(front - 0.06, front + 0.02, d);
  float wave = exp(-abs(front - d) * 14.0);
  vec4 l = lotAt(g);
  vec3 c = GROUND;
  c = mix(c, LINE, line(tileEdgePx(g), 1.0) * 0.28 * drawn);
  c = mix(c, LINE, line(lotEdgePx(g), 1.6) * step(4.0, lotClass(l)) * drawn);
  float showBelow = p * 1.06 - 0.06;
  vec2 gh;
  vec4 hit = castBlocks(w, 1.0, showBelow, gh);
  if (hit.x > 0.0) c = blockColor(hit);
  c += LINE * wave * 0.22 * (1.0 - u_reduced);
  return vec4(c, 1.0 - u_reveal);
}
`;

const fog = /* glsl */ `// Fog lifts: the avatar alone in fog of war, which thins outward as the city loads.
vec4 intro(vec2 px) {
  vec2 g = toGrid(toWorld(px));
  vec3 city = blockCity(px, 1.0, 1.0);
  float t = u_reduced > 0.5 ? 0.0 : u_time;
  float n = fbm(g * 0.35 + vec2(t * 0.06, -t * 0.04));
  float radius = 1.5 + easeOut(u_progress) * MAX_DIST * 1.1;
  float d = gridDist(g) + (n - 0.5) * 6.0;
  float fogged = smoothstep(radius - 3.0, radius + 4.0, d);
  vec3 fogColor = mix(vec3(0.70, 0.73, 0.76), vec3(0.86, 0.88, 0.90), n);
  vec3 c = mix(city, fogColor, fogged * 0.97);
  c = mix(c, LINE, spawnMark(px, 9.0 / max(u_pixel, 0.5)) * 0.8);
  return vec4(c, 1.0 - u_reveal);
}
`;

const dawn = /* glsl */ `// Dawn at your hour: the block city goes from night to the visitor's own light (or into the evening after dark).
float dayLevel(float h) { return smoothstep(5.5, 8.0, h) * (1.0 - smoothstep(17.5, 20.5, h)); }
vec4 intro(vec2 px) {
  vec3 city = blockCity(px, 1.0, 1.0);
  float target = dayLevel(u_hour);
  float from = target < 0.5 ? 1.0 : 0.0;
  float light = mix(from, target, easeInOut(u_progress));
  vec3 night = city * vec3(0.20, 0.24, 0.40) + vec3(0.02, 0.03, 0.08);
  vec3 c = mix(night, city, light);
  float warm = (1.0 - light) * light * 4.0;
  c += vec3(0.35, 0.18, 0.05) * warm * 0.45;
  vec2 g = toGrid(toWorld(px));
  vec4 l = lotAt(g);
  float lamp = step(0.92, hash12(floor(g) + 7.0)) * step(abs(lotClass(l) - 2.0), 0.1);
  float dot = 1.0 - smoothstep(0.08, 0.16, length(fract(g) - 0.5));
  c += vec3(1.0, 0.80, 0.50) * lamp * dot * (1.0 - light) * 0.9;
  return vec4(c, 1.0 - u_reveal);
}
`;

const dither = /* glsl */ `// Dither reveal: the block city dithers in from the avatar outward, and the real city dithers through the same way.
vec4 intro(vec2 px) {
  vec2 g = toGrid(toWorld(px));
  float d = gridDist(g) / MAX_DIST;
  float th = bayer4(px);
  float p = easeOut(u_progress);
  float appear = step(th, clamp((p * 1.3 - d) * 2.5, 0.0, 1.0));
  vec3 c = mix(GROUND, blockCity(px, 1.0, 1.0), appear);
  float gone = step(th, clamp((u_reveal * 1.3 - d) * 2.5, 0.0, 1.0));
  return vec4(c, 1.0 - gone);
}
`;

const tycoon = /* glsl */ `// Tycoon placement: roads first, then every building drops onto its lot in order, with a small pop.
vec4 intro(vec2 px) {
  vec2 w = toWorld(px);
  vec2 g = toGrid(w);
  float p = u_progress;
  float roads = clamp(p / 0.3, 0.0, 1.0) * 1.05;
  float showBelow = clamp((p - 0.3) / 0.7, 0.0, 1.0) * 1.04;
  vec2 gh;
  vec4 hit = castBlocks(w, 1.0, showBelow, gh);
  vec3 c;
  if (hit.x > 0.0) {
    c = blockColor(hit);
  } else {
    vec4 l = lotAt(g);
    float cls = lotClass(l);
    float here = step(lotDist(l), roads);
    c = mix(GROUND, cls >= 4.0 ? GRASS * 0.85 : groundColor(cls), here);
    c = mix(c, c * 0.85, line(tileEdgePx(g), 1.0) * 0.3 * here);
  }
  return vec4(c, 1.0 - u_reveal);
}
`;

const train = /* glsl */ `// Arriving by train: the city streaks past the window, slows, and stops where the avatar gets off.
vec4 intro(vec2 px) {
  float p = easeInOut(u_progress);
  float speed = 1.0 - p;
  float shift = speed * u_resolution.x * 0.9;
  vec3 city = blockCity(px - vec2(shift, 0.0), 1.0, 1.0);
  float t = u_reduced > 0.5 ? 0.0 : u_time;
  float streak = vnoise(vec2(px.x * 0.02 + t * 40.0 * speed, px.y * 0.6));
  streak = smoothstep(0.55, 0.9, streak) * speed;
  vec3 c = mix(city, LINE, streak * 0.6);
  vec2 uv = px / u_resolution;
  float frame = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x) * smoothstep(0.0, 0.08, uv.y) * smoothstep(1.0, 0.92, uv.y);
  c = mix(vec3(0.08, 0.07, 0.07), c, mix(1.0, frame, 0.7 * (1.0 - u_reveal)));
  return vec4(c, 1.0 - u_reveal);
}
`;

const clouds = /* glsl */ `// Cloud shadows: a bare plot, shadows drifting over it; what they have passed is left behind as city.
vec4 intro(vec2 px) {
  vec2 g = toGrid(toWorld(px));
  float t = u_reduced > 0.5 ? 0.0 : u_time;
  vec2 wind = vec2(t * 0.9, t * 0.35);
  float cloud = fbm(g * 0.12 + wind * 0.08);
  float shadow = smoothstep(0.5, 0.75, cloud);
  vec4 l = lotAt(g);
  float order = max(lotOrder(l), lotDist(l) * 0.8);
  float seen = step(order + (hash12(floor(g)) - 0.5) * 0.1, u_progress * 1.1);
  vec3 plot = mix(GROUND, GRASS * 0.95, 0.6);
  vec3 city = blockCity(px, 1.0, u_progress * 1.1);
  vec3 c = mix(plot, city, seen);
  float onPlot = lotClass(l) > 0.0 ? 1.0 : 0.0;
  c *= 1.0 - shadow * 0.35 * onPlot;
  return vec4(c, 1.0 - u_reveal);
}
`;

const radar = /* glsl */ `// Radar ping: rings sweep out from the avatar and leave bands of city behind; there are things to find out there.
vec4 intro(vec2 px) {
  vec2 g = toGrid(toWorld(px));
  float d = gridDist(g);
  float reach = 1.0 + easeOut(u_progress) * MAX_DIST * 1.05;
  float t = u_reduced > 0.5 ? 0.35 : u_time;
  float period = 1.4;
  float ph = fract(t / period);
  float ring = ph * reach;
  float glow = exp(-abs(d - ring) * 1.2) * (1.0 - ph);
  vec3 city = blockCity(px, 1.0, 1.0);
  float inside = 1.0 - smoothstep(reach - 1.0, reach + 0.5, d);
  vec3 dark = GROUND * 0.9;
  vec3 c = mix(dark, city, inside);
  c = mix(c, dark + LINE * 0.25, (1.0 - inside) * line(tileEdgePx(g), 1.0) * 0.5);
  vec3 ping = vec3(0.95, 0.90, 0.70);
  c += ping * glow * 0.6;
  c += ping * exp(-abs(d - reach) * 2.0) * 0.5;
  c = mix(c, LINE, spawnMark(px, 9.0 / max(u_pixel, 0.5)) * 0.8);
  return vec4(c, 1.0 - u_reveal);
}
`;

export const INTRO_PRESETS: IntroPreset[] = [
  { id: "blueprint", name: "Blueprint", blurb: "The grid draws itself, lots fill as their buildings arrive.", camera: "fly", line: "Laying out the city", glsl: blueprint },
  { id: "fog", name: "Fog lifts", blurb: "The avatar alone in fog of war; it thins outward as the city loads.", camera: "fly", line: "The buildings are the places I have worked and studied.", glsl: fog },
  { id: "dawn", name: "Dawn at your hour", blurb: "Night to the visitor's own light, lamps switching off.", camera: "fly", glsl: dawn },
  { id: "dither", name: "Dither reveal", blurb: "A Bayer dissolve from the avatar outward, and the same for the hand-over.", camera: "fly", glsl: dither },
  { id: "tycoon", name: "Tycoon placement", blurb: "Roads first, then every building drops onto its lot with a pop.", camera: "fly", glsl: tycoon },
  { id: "train", name: "Arriving by train", blurb: "The city streaks past the window, slows, and stops.", camera: "close", line: "Next stop: Gustav's city", glsl: train },
  { id: "clouds", name: "Cloud shadows", blurb: "Shadows drift over a bare plot and leave buildings behind.", camera: "fly", glsl: clouds },
  { id: "radar", name: "Radar ping", blurb: "Rings sweep out from the avatar and leave bands of city.", camera: "fly", line: "There are things to find.", glsl: radar },
];

export const DEFAULT_PRESET_ID = "blueprint";

export function presetById(id: string | null | undefined): IntroPreset {
  return INTRO_PRESETS.find((p) => p.id === id) ?? INTRO_PRESETS[0];
}
