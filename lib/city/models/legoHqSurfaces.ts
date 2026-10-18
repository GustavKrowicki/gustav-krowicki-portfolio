// Surface pass for the LEGO HQ at avatar scale (art/img2threejs/lego-hq-avatar): world-scale textures drawn in code,
// so the code-built campus gets the surface richness of the Krea-made city buildings (siding lines, wear, colour noise,
// dark corners) without leaving the img2threejs pipeline (no images, no downloaded art).
//
// The generated factory maps every box face 0..1 in UV space, so one texture would stretch differently on a 0.5 wu
// window and a 5 wu wall. Here UVs are rebuilt from world positions (box-projected by the face normal). Each material
// has a painter for one 1 x 1 wu cell; the cells are laid out 4 x 4 on one canvas and a grime layer (blotches, streaks,
// fine noise) is painted over the whole 4 x 4 wu so the wear does not repeat every tile. Vertex colours darken the foot
// of every wall and downward faces, like the baked light in the Krea textures. Gustav chose "rougher" (2026-10-16).
import * as THREE from 'three';

const CELL = 96;          // texels per wu (the 2x sprites show ~62 px per wu)
const SPAN = 4;           // wu per texture repeat
const SIZE = CELL * SPAN;
const ROUGH = 1.0;        // wear strength (0 = clean, 1 = the agreed "rougher")

type Rnd = () => number;
type Painter = (g: CanvasRenderingContext2D, rnd: Rnd, base: string) => void;

function rng(seed: number): Rnd {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shadeHex(hex: string, f: number): string {
  const v = Number.parseInt(hex.slice(1), 16);
  const c = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((x) => Math.max(0, Math.min(255, Math.round(x * f))));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

function speckle(g: CanvasRenderingContext2D, rnd: Rnd, n: number, colors: string[], size: [number, number], w = CELL, h = CELL): void {
  for (let i = 0; i < n; i += 1) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const s = size[0] + rnd() * (size[1] - size[0]);
    g.fillRect(rnd() * w, rnd() * h, s, s);
  }
}

function lines(g: CanvasRenderingContext2D, color: string, every: number, vertical: boolean, width = 1): void {
  g.fillStyle = color;
  for (let p = 0; p < CELL; p += every) {
    if (vertical) g.fillRect(p, 0, width, CELL);
    else g.fillRect(0, p, CELL, width);
  }
}

// One 1 x 1 wu cell per material. `base` is the material's own colour (for the generic painter).
const PAINTERS: Record<string, Painter> = {
  facade: (g, rnd) => {
    g.fillStyle = '#e2ded6'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 700, ['#d8d4cb', '#eae6de', '#cfcbc2'], [1, 2]);
    lines(g, 'rgba(80, 76, 70, 0.4)', CELL / 2, true);
    g.fillStyle = 'rgba(80, 76, 70, 0.28)';
    for (const y of [CELL * 0.25, CELL * 0.75]) g.fillRect(0, y, CELL, 1);
  },
  'facade-perf': (g, rnd) => {
    g.fillStyle = '#ecebe6'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 500, ['#e2e1dc', '#f4f3ee'], [1, 2]);
    lines(g, 'rgba(90, 90, 86, 0.3)', CELL / 3, true);
    g.fillStyle = 'rgba(60, 62, 64, 0.35)';
    for (let x = 6; x < CELL; x += 12) for (let y = 6; y < CELL; y += 12) g.fillRect(x + ((y / 12) % 2) * 6, y, 2, 2);
  },
  brick: (g, rnd) => {
    g.fillStyle = '#5f3226'; g.fillRect(0, 0, CELL, CELL);
    const ch = CELL / 8, cw = CELL / 4;
    for (let r = 0; r < 8; r += 1) {
      for (let c = -1; c < 5; c += 1) {
        const x = c * cw + (r % 2 ? cw / 2 : 0);
        const tone = 0.78 + rnd() * 0.4;
        g.fillStyle = `rgb(${Math.round(140 * tone)}, ${Math.round(74 * tone)}, ${Math.round(56 * tone)})`;
        g.fillRect(x + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }
    speckle(g, rnd, 260, ['rgba(30,15,10,0.3)', 'rgba(255,220,200,0.12)'], [1, 2]);
  },
  'roof-green': (g, rnd) => {
    g.fillStyle = '#72b43e'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 160, ['#62a236', '#80c249', '#579530', '#8ccc55', '#9a9a3a'], [4, 11]);
    speckle(g, rnd, 520, ['#538e2c', '#93d05c', '#6aad3a', '#a3a246'], [1, 3]);
    speckle(g, rnd, 18, ['#d9c84a', '#c9a0c0', '#e8e2b0'], [1, 2]);
  },
  court: (g, rnd) => {
    g.fillStyle = '#58a339'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 260, ['#4b9431', '#66b444', '#448a2c'], [2, 6]);
  },
  grass: (g, rnd) => {
    g.fillStyle = '#6aad45'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 260, ['#5f9f3d', '#76b94f', '#5a963a', '#80c057'], [2, 7]);
    speckle(g, rnd, 400, ['#4f8b33', '#86c65e'], [1, 2]);
  },
  parapet: (g, rnd) => {
    g.fillStyle = '#383b3d'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 260, ['#303336', '#45494c'], [1, 2]);
    lines(g, 'rgba(255,255,255,0.12)', CELL / 2, true);
  },
  'parapet-light': (g, rnd) => {
    g.fillStyle = '#d6d2ca'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 300, ['#cbc7bf', '#e0dcd4'], [1, 2]);
  },
  window: (g, rnd) => {
    const grad = g.createLinearGradient(0, 0, CELL, CELL);
    grad.addColorStop(0, '#3d5462'); grad.addColorStop(0.45, '#28383f'); grad.addColorStop(0.55, '#4a6472'); grad.addColorStop(1, '#232f36');
    g.fillStyle = grad; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 60, ['rgba(255,255,255,0.06)'], [2, 6]);
  },
  'glass-atrium': (g, rnd) => {
    const grad = g.createLinearGradient(0, CELL, CELL, 0);
    grad.addColorStop(0, '#93b5c3'); grad.addColorStop(0.5, '#b4d2dd'); grad.addColorStop(1, '#8aaebd');
    g.fillStyle = grad; g.fillRect(0, 0, CELL, CELL);
    lines(g, 'rgba(235, 238, 236, 0.85)', CELL / 2, true, 2);
    g.fillStyle = 'rgba(235, 238, 236, 0.7)'; g.fillRect(0, CELL * 0.6, CELL, 2);
    speckle(g, rnd, 40, ['rgba(255,255,255,0.12)'], [3, 8]);
  },
  'glass-round': (g, rnd) => {
    g.fillStyle = '#2b363c'; g.fillRect(0, 0, CELL, CELL);
    lines(g, 'rgba(160, 170, 172, 0.45)', CELL / 4, true);
    const grad = g.createLinearGradient(0, 0, 0, CELL);
    grad.addColorStop(0, 'rgba(120,150,165,0.25)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 40, ['rgba(255,255,255,0.06)'], [2, 5]);
  },
  'glass-dark': (g, rnd) => {
    g.fillStyle = '#34454e'; g.fillRect(0, 0, CELL, CELL);
    lines(g, 'rgba(170, 176, 178, 0.45)', CELL / 3, true);
    speckle(g, rnd, 40, ['rgba(255,255,255,0.07)'], [2, 5]);
  },
  yellow: (g, rnd) => {
    g.fillStyle = '#ecc000'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 380, ['#e2b600', '#f6cc12', '#d9ab00'], [1, 3]);
    lines(g, 'rgba(110, 82, 0, 0.4)', CELL / 2, true);
    g.fillStyle = 'rgba(110, 82, 0, 0.3)'; g.fillRect(0, CELL / 2, CELL, 1);
  },
  terracotta: (g, rnd) => {
    g.fillStyle = '#a95737'; g.fillRect(0, 0, CELL, CELL);
    for (let x = 0; x < CELL; x += CELL / 8) {
      g.fillStyle = `rgba(60, 25, 12, ${0.25 + rnd() * 0.2})`; g.fillRect(x, 0, 1, CELL);
      g.fillStyle = `rgba(255, 200, 170, ${0.08 + rnd() * 0.08})`; g.fillRect(x + 1, 0, 1, CELL);
    }
    speckle(g, rnd, 300, ['rgba(70,30,15,0.2)', 'rgba(220,140,100,0.15)'], [1, 3]);
  },
  'roof-terrace': (g, rnd) => {
    g.fillStyle = '#e6e3dc'; g.fillRect(0, 0, CELL, CELL);
    for (let x = 0; x < CELL; x += CELL / 2) for (let y = 0; y < CELL; y += CELL / 2) {
      g.fillStyle = shadeHex('#e6e3dc', 0.95 + rnd() * 0.08); g.fillRect(x + 1, y + 1, CELL / 2 - 2, CELL / 2 - 2);
    }
    speckle(g, rnd, 300, ['rgba(80,75,65,0.12)'], [1, 2]);
  },
  'panel-wood': (g, rnd) => {
    g.fillStyle = '#c4964f'; g.fillRect(0, 0, CELL, CELL);
    for (let x = 0; x < CELL; x += CELL / 12) {
      g.fillStyle = `rgba(90, 55, 20, ${0.15 + rnd() * 0.25})`; g.fillRect(x, 0, 1, CELL);
    }
    speckle(g, rnd, 200, ['rgba(80,50,20,0.25)', 'rgba(255,230,180,0.15)'], [1, 2]);
  },
  'check-light': (g, rnd) => {
    g.fillStyle = '#e2dfd8'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 400, ['#d6d3cb', '#ecE9e2', '#cfccc4'], [1, 3]);
    lines(g, 'rgba(90,88,82,0.35)', CELL / 5, true); lines(g, 'rgba(90,88,82,0.35)', CELL / 5, false);
  },
  'check-dark': (g, rnd) => {
    g.fillStyle = '#8f8d88'; g.fillRect(0, 0, CELL, CELL);
    speckle(g, rnd, 400, ['#85837e', '#9a9893', '#7c7a75'], [1, 3]);
    lines(g, 'rgba(50,48,45,0.35)', CELL / 5, true); lines(g, 'rgba(50,48,45,0.35)', CELL / 5, false);
  },
};

// Plastic toys, screens, notes and the like stay clean; everything else is architecture and gets worn
const CLEAN = /^(mf-|npc-|laptop-|bubble-|screen-test$|chair-|note-|marker-|box-|label-|tag-|slot-|shelf-|brick-(red|blue|green)$|logo-red$|screen$|glass-door$|dome$|whiteboard$|map$|rug$|tree$|trunk$)/;

function genericPainter(g: CanvasRenderingContext2D, rnd: Rnd, base: string): void {
  g.fillStyle = base; g.fillRect(0, 0, CELL, CELL);
  speckle(g, rnd, 600, [shadeHex(base, 0.93), shadeHex(base, 1.05), shadeHex(base, 0.88)], [1, 3]);
}

function grime(g: CanvasRenderingContext2D, rnd: Rnd, walls: boolean): void {
  // soft blotches of dirt and sun-bleach across the whole 4 x 4 wu
  for (let i = 0; i < 26 * ROUGH; i += 1) {
    const x = rnd() * SIZE, y = rnd() * SIZE, r = CELL * (0.3 + rnd() * 1.1);
    const dark = rnd() < 0.65;
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, dark ? `rgba(40, 34, 26, ${0.1 * ROUGH})` : `rgba(255, 252, 240, ${0.08 * ROUGH})`);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fine noise
  speckle(g, rnd, 5000 * ROUGH, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.06)'], [1, 1], SIZE, SIZE);
  if (!walls) return;
  // rain streaks running down from the top of each cell
  for (let i = 0; i < 40 * ROUGH; i += 1) {
    const x = rnd() * SIZE, y = Math.floor(rnd() * SPAN) * CELL, h = CELL * (0.2 + rnd() * 0.6);
    const grad = g.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, `rgba(45, 40, 32, ${0.16 * ROUGH})`); grad.addColorStop(1, 'rgba(45,40,32,0)');
    g.fillStyle = grad; g.fillRect(x, y, 1 + rnd() * 2, h);
  }
}

const textures = new Map<string, THREE.CanvasTexture>();

function textureFor(name: string, base: string, horizontal: boolean): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${name}|${horizontal ? 'h' : 'v'}`;
  const hit = textures.get(key);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const g = canvas.getContext('2d');
  if (!g) return null;
  const seed = name.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7);
  const rnd = rng(seed);
  const painter = PAINTERS[name] ?? genericPainter;
  for (let i = 0; i < SPAN; i += 1) {
    for (let j = 0; j < SPAN; j += 1) {
      g.save(); g.translate(i * CELL, j * CELL);
      g.beginPath(); g.rect(0, 0, CELL, CELL); g.clip();
      painter(g, rnd, base);
      g.restore();
    }
  }
  grime(g, rng(seed + 99), !horizontal);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textures.set(key, texture);
  return texture;
}

// Box-projected world UVs (1 unit = 1 / SPAN repeats per wu) and contact-darkening vertex colours, in a cloned geometry.
function worldSurface(mesh: THREE.Mesh, baseY: number): boolean {
  mesh.updateWorldMatrix(true, false);
  const geometry = mesh.geometry.clone();
  const position = geometry.getAttribute('position');
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute('normal');
  const world = new THREE.Vector3();
  const n = new THREE.Vector3();
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const uv = new Float32Array(position.count * 2);
  const colors = new Float32Array(position.count * 3);
  let up = 0;
  for (let i = 0; i < position.count; i += 1) {
    world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
    const y = world.y - baseY;
    if (Math.abs(n.y) > 0.6) { uv[i * 2] = world.x / SPAN; uv[i * 2 + 1] = world.z / SPAN; up += 1; }
    else if (Math.abs(n.x) > Math.abs(n.z)) { uv[i * 2] = world.z / SPAN; uv[i * 2 + 1] = y / SPAN; }
    else { uv[i * 2] = world.x / SPAN; uv[i * 2 + 1] = y / SPAN; }
    const foot = Math.abs(n.y) > 0.6 ? 1 : 0.66 + 0.34 * Math.min(1, Math.max(0, y / 0.6));
    const shade = n.y < -0.6 ? 0.55 : foot;
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.geometry = geometry;
  return up > position.count / 2;
}

/**
 * Apply the surface pass to the meshes whose component id passes `select` (default: the whole model).
 * The model must be at its rest transform (before the lab or the game moves or scales it).
 */
export function applyLEGOHQSurfaces(model: THREE.Object3D, select: (componentId: string, materialId: string) => boolean = () => true): number {
  model.updateMatrixWorld(true);
  const baseY = new THREE.Box3().setFromObject(model).min.y;
  const cache = new Map<string, THREE.Material>();
  let count = 0;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const component = mesh.userData.sculptComponent as { id?: string; material?: string } | undefined;
    if (!component?.id || !component.material || !select(component.id, component.material)) return;
    const clean = CLEAN.test(component.material);
    const horizontal = worldSurface(mesh, baseY);
    const source = mesh.material as THREE.MeshPhysicalMaterial;
    const key = `${source.uuid}|${horizontal}|${clean}`;
    let material = cache.get(key);
    if (!material) {
      const clone = source.clone();
      const map = clean ? null : textureFor(component.material, `#${source.color.getHexString()}`, horizontal);
      if (map) {
        clone.map = map;
        clone.color.set(0xffffff);
        clone.emissiveMap = map;
        clone.emissive.set(0xffffff);
      }
      clone.vertexColors = true;
      clone.needsUpdate = true;
      material = clone;
      cache.set(key, clone);
    }
    mesh.material = material;
    count += 1;
  });
  return count;
}
