// Surface pass for the LEGO HQ at avatar scale (art/img2threejs/lego-hq-avatar): world-scale textures drawn in code,
// so the code-built campus gets the same surface richness as the Krea-made city buildings (siding lines, wear, colour
// noise, soft shading) without leaving the img2threejs pipeline (no images, no downloaded art).
//
// The generated factory maps every box face 0..1 in UV space, so one texture would stretch differently on a 0.5 wu
// window and a 5 wu wall. Here UVs are rebuilt from world positions (1 texture tile = 1 wu, box-projected by the face
// normal) and each material gets a painter that draws one 1 x 1 wu tile. Vertex colours add contact darkening at the
// foot of every wall and under the roof edge, like the baked light in the Krea textures.
import * as THREE from 'three';

const TILE = 128; // texels per wu (the 2x sprites show ~62 px per wu)

type Painter = (g: CanvasRenderingContext2D, rnd: () => number) => void;

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function speckle(g: CanvasRenderingContext2D, rnd: () => number, n: number, colors: string[], size: [number, number]): void {
  for (let i = 0; i < n; i += 1) {
    g.fillStyle = colors[Math.floor(rnd() * colors.length)];
    const w = size[0] + rnd() * (size[1] - size[0]);
    g.fillRect(rnd() * TILE, rnd() * TILE, w, w);
  }
}

const PAINTERS: Record<string, Painter> = {
  // light facade: two panels per wu (the window bay), thin seams, a darker storey band, fine grain
  facade: (g, rnd) => {
    g.fillStyle = '#e4e1da'; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 900, ['#dcd9d2', '#ebe8e1', '#d6d3cb'], [1, 2]);
    g.fillStyle = 'rgba(90, 86, 80, 0.35)';
    for (const x of [0, TILE / 2]) g.fillRect(x, 0, 1, TILE);
    g.fillStyle = 'rgba(90, 86, 80, 0.22)';
    for (const y of [TILE * 0.25, TILE * 0.75]) g.fillRect(0, y, TILE, 1);
    g.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < 6; i += 1) g.fillRect(rnd() * TILE, 0, 1 + rnd() * 2, TILE); // faint streaks
  },
  // brick: 0.12 wu courses, staggered, mortar lines, colour per brick
  brick: (g, rnd) => {
    g.fillStyle = '#6d3a2c'; g.fillRect(0, 0, TILE, TILE);
    const ch = TILE / 8, cw = TILE / 4;
    for (let r = 0; r < 8; r += 1) {
      for (let c = -1; c < 5; c += 1) {
        const x = c * cw + (r % 2 ? cw / 2 : 0);
        const tone = 0.85 + rnd() * 0.3;
        g.fillStyle = `rgb(${Math.round(138 * tone)}, ${Math.round(75 * tone)}, ${Math.round(58 * tone)})`;
        g.fillRect(x + 1, r * ch + 1, cw - 2, ch - 2);
      }
    }
    speckle(g, rnd, 300, ['rgba(40,20,15,0.25)', 'rgba(255,220,200,0.12)'], [1, 2]);
  },
  // green roof: sedum patches in several greens with darker clumps and a few flowers
  'roof-green': (g, rnd) => {
    g.fillStyle = '#76ba40'; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 240, ['#6aa83a', '#82c64a', '#5f9c33', '#8ccc55'], [4, 10]);
    speckle(g, rnd, 600, ['#5a9530', '#93d05c', '#6db23c'], [1, 3]);
    speckle(g, rnd, 25, ['#d9c84a', '#c9a0c0', '#e8e2b0'], [1, 2]);
  },
  // parapet: dark metal capping with a lighter top edge and joints
  parapet: (g, rnd) => {
    g.fillStyle = '#3a3d3f'; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 300, ['#34373a', '#43474a'], [1, 2]);
    g.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < TILE; x += TILE / 2) g.fillRect(x, 0, 1, TILE);
  },
  // window glass: dark with a diagonal sky reflection and a light frame line
  window: (g, rnd) => {
    const grad = g.createLinearGradient(0, 0, TILE, TILE);
    grad.addColorStop(0, '#3b5260'); grad.addColorStop(0.45, '#2a3a44'); grad.addColorStop(0.55, '#46606e'); grad.addColorStop(1, '#25333b');
    g.fillStyle = grad; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 80, ['rgba(255,255,255,0.05)'], [2, 6]);
  },
  // yellow frame panels: painted metal with seams and slight tone change
  yellow: (g, rnd) => {
    g.fillStyle = '#efc300'; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 400, ['#e6bb00', '#f6cc12', '#e0b300'], [1, 3]);
    g.fillStyle = 'rgba(120, 90, 0, 0.35)';
    for (const x of [0, TILE / 2]) g.fillRect(x, 0, 1, TILE);
    g.fillRect(0, TILE / 2, TILE, 1);
  },
  // courtyard floor in the light wells: grass with paths
  court: (g, rnd) => {
    g.fillStyle = '#5aa83a'; g.fillRect(0, 0, TILE, TILE);
    speckle(g, rnd, 300, ['#4e9a32', '#66b444', '#4a8f2e'], [2, 6]);
    g.fillStyle = '#cfc8b4'; g.fillRect(TILE * 0.45, 0, TILE * 0.1, TILE);
  },
  // wood panels between windows: vertical boards
  'panel-wood': (g, rnd) => {
    g.fillStyle = '#c4964f'; g.fillRect(0, 0, TILE, TILE);
    for (let x = 0; x < TILE; x += TILE / 12) {
      g.fillStyle = `rgba(90, 55, 20, ${0.15 + rnd() * 0.2})`;
      g.fillRect(x, 0, 1, TILE);
    }
    speckle(g, rnd, 200, ['rgba(80,50,20,0.2)', 'rgba(255,230,180,0.15)'], [1, 2]);
  },
};

const textures = new Map<string, THREE.CanvasTexture>();

function textureFor(name: string): THREE.CanvasTexture | null {
  const painter = PAINTERS[name];
  if (!painter || typeof document === 'undefined') return null;
  const hit = textures.get(name);
  if (hit) return hit;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = TILE;
  const g = canvas.getContext('2d');
  if (!g) return null;
  painter(g, rng(name.split('').reduce((a, c) => a * 31 + c.charCodeAt(0), 7)));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  textures.set(name, texture);
  return texture;
}

// Box-projected world UVs (1 unit = 1 wu) and contact-darkening vertex colours, written into a cloned geometry.
function worldSurface(mesh: THREE.Mesh, baseY: number): void {
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
  for (let i = 0; i < position.count; i += 1) {
    world.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
    n.fromBufferAttribute(normal, i).applyMatrix3(normalMatrix).normalize();
    const y = world.y - baseY;
    if (Math.abs(n.y) > 0.6) { uv[i * 2] = world.x; uv[i * 2 + 1] = world.z; }
    else if (Math.abs(n.x) > Math.abs(n.z)) { uv[i * 2] = world.z; uv[i * 2 + 1] = y; }
    else { uv[i * 2] = world.x; uv[i * 2 + 1] = y; }
    // darker at the foot of walls (first 0.5 wu) and slightly on downward faces
    const foot = Math.abs(n.y) > 0.6 ? 1 : 0.78 + 0.22 * Math.min(1, Math.max(0, y / 0.5));
    const shade = n.y < -0.6 ? 0.7 : foot;
    colors.set([shade, shade, shade], i * 3);
  }
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  mesh.geometry = geometry;
}

/** Material ids that get a painter; others keep their flat colour (and still get the contact darkening). */
export const SURFACE_MATERIALS = Object.keys(PAINTERS);

/**
 * Apply the surface pass to the meshes whose component id passes `select`.
 * The model must be built at its rest transform (before the lab or the game moves or scales it).
 */
export function applyLEGOHQSurfaces(model: THREE.Object3D, select: (componentId: string, materialId: string) => boolean): number {
  model.updateMatrixWorld(true);
  const baseY = new THREE.Box3().setFromObject(model).min.y;
  const cache = new Map<THREE.Material, THREE.Material>();
  let count = 0;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    const component = mesh.userData.sculptComponent as { id?: string; material?: string } | undefined;
    if (!component?.id || !component.material || !select(component.id, component.material)) return;
    worldSurface(mesh, baseY);
    const source = mesh.material as THREE.MeshPhysicalMaterial;
    let material = cache.get(source);
    if (!material) {
      const clone = source.clone();
      const map = textureFor(component.material);
      if (map) {
        clone.map = map;
        clone.color.set(0xffffff);
        clone.emissiveMap = map;
        clone.emissive.set(0xffffff);
      }
      clone.vertexColors = true;
      clone.needsUpdate = true;
      material = clone;
      cache.set(source, clone);
    }
    mesh.material = material;
    count += 1;
  });
  return count;
}

// The north wing (board plan: x 4..12.6, y 0..3 tiles, with the yellow bar): model coordinates on the 14 x 9 plot.
export function inNorthWing(model: THREE.Object3D, componentId: string): boolean {
  const node = (model.userData.sculptRuntime?.nodes ?? {})[componentId] as THREE.Object3D | undefined;
  if (!node) return false;
  const box = new THREE.Box3().setFromObject(node);
  const c = box.getCenter(new THREE.Vector3());
  return c.x > 4 - 7 - 0.1 && c.x < 12.7 - 7 && c.z > -4.6 && c.z < 3.05 - 4.5;
}
