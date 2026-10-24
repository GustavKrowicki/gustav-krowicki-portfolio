// Detail pass of the Valtech office interior (2026-10-16): the textures the img2threejs factory cannot carry (it builds
// flat colours only). Applied to the generated model by part id, after the factory, so a spec rebuild keeps them:
//   side-N-*brick*  pale yellow brick, running bond, true course height (75 mm = 0.0375 wu)
//   int-floor, open-floor-lunch  polished concrete: warm beige with soft mottling
//   int-room-01-number  the huge white "01" on meeting room 01's glass (a transparent decal)
//   side-N-lunch-quiz-board  the Friday quiz in chalk (heading, questions, a tally)
//   *-screen-<n>-display  a downscaled case image (public/game/pogicity/Building/landmark/valtech-office-screen-<n>.png)
//   *-planter-leaf-*, *-planter-crown-*  a low-poly sphere (8 x 5) instead of the factory's 16 x 12: flat leaves at
//   sprite size do not need more, and the plant drops from about 4,400 to about 1,000 triangles
//   sign-hq  the name on the building (POR-54, 2026-10-23): the logo as big white 3D letters on the top louvre floor of the
//   street side, headquarters style. The building names itself, so the city needs no floating badge. The faces are unlit
//   (selfLit), so the night window pass draws them as they are: lit letters
// The case images load asynchronously; the entrance lab waits for __labPending to reach 0 before it renders.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

const SCREENS: Record<string, string> = {
  'int-desk-screen-1-display': '/game/pogicity/Building/landmark/valtech-office-screen-1.png',
  'int-desk-screen-2-display': '/game/pogicity/Building/landmark/valtech-office-screen-2.png',
  'int-room-screen-display': '/game/pogicity/Building/landmark/valtech-office-screen-3.png',
};

// One brick texture tile: 2 bricks x 4 courses (0.238 x 0.15 wu); mortar lighter than the brick, as in the reference
const BRICK_TILE_WU = { w: 0.238, h: 0.15 };

type LabGlobal = typeof globalThis & { __labPending?: number };

function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

let brickCanvas: HTMLCanvasElement | null = null;
function brickImage(): HTMLCanvasElement {
  if (brickCanvas) return brickCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#f4ead2';                       // mortar
  g.fillRect(0, 0, c.width, c.height);
  const rand = seeded(7);
  const courseH = c.height / 4, brickW = c.width / 2, joint = 4;
  for (let row = 0; row < 4; row++) {
    const shift = row % 2 ? brickW / 2 : 0;
    for (let i = -1; i < 3; i++) {
      const x = i * brickW + shift;
      const v = rand();
      // sandy yellow, each brick a little lighter or darker
      const r = 246 + Math.round((v - 0.5) * 14), gg = 216 + Math.round((v - 0.5) * 16), b = 156 + Math.round((v - 0.5) * 14);
      g.fillStyle = `rgb(${r}, ${gg}, ${b})`;
      g.fillRect(x + joint / 2, row * courseH + joint / 2, brickW - joint, courseH - joint);
    }
  }
  brickCanvas = c;
  return c;
}

let numberCanvas: HTMLCanvasElement | null = null;
function numberImage(): HTMLCanvasElement {
  if (numberCanvas) return numberCanvas;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 264;   // the decal is 0.72 x 0.74 wu
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.font = '600 236px "Helvetica Neue", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.fillText('01', 128, 232);
  numberCanvas = c;
  return c;
}

let quizCanvas: HTMLCanvasElement | null = null;
function quizImage(): HTMLCanvasElement {
  if (quizCanvas) return quizCanvas;
  const c = document.createElement('canvas');
  c.width = 312;
  c.height = 208;   // the board is 0.78 x 0.52 wu
  const g = c.getContext('2d')!;
  g.fillStyle = '#2b2f2d';
  g.fillRect(0, 0, c.width, c.height);
  // few, big chalk marks: the board is about 100 x 65 px at Detail zoom, so only large letters read
  g.fillStyle = 'rgba(242, 240, 230, 0.95)';
  g.strokeStyle = 'rgba(242, 240, 230, 0.9)';
  g.font = '800 58px "Chalkboard SE", "Comic Sans MS", "Marker Felt", sans-serif';
  g.fillText('FRIDAY', 18, 70);
  g.fillText('QUIZ', 18, 136);
  g.lineWidth = 6;
  g.beginPath(); g.moveTo(18, 154); g.lineTo(178, 150); g.stroke();
  g.font = '700 30px "Chalkboard SE", "Comic Sans MS", "Marker Felt", sans-serif';
  g.fillText('16:00', 18, 192);
  // a big tally of points on the right: two teams
  g.lineWidth = 6;
  for (let row = 0; row < 2; row++) {
    const y0 = 70 + row * 70, n = row ? 3 : 5;
    for (let k = 0; k < n; k++) {
      const x = 214 + (k % 5) * 16;
      if (k === 4) { g.beginPath(); g.moveTo(206, y0 + 34); g.lineTo(286, y0 + 4); g.stroke(); continue; }
      g.beginPath(); g.moveTo(x, y0); g.lineTo(x + 2, y0 + 40); g.stroke();
    }
  }
  quizCanvas = c;
  return c;
}

let concreteCanvas: HTMLCanvasElement | null = null;
function concreteImage(): HTMLCanvasElement {
  if (concreteCanvas) return concreteCanvas;
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#c3ad8a';
  g.fillRect(0, 0, 256, 256);
  const rand = seeded(11);
  // soft cloudy mottling (wrapped so the tile repeats without a seam), then a few faint trowel arcs
  for (let i = 0; i < 70; i++) {
    const x = rand() * 256, y = rand() * 256, r = 14 + rand() * 40, light = rand() > 0.5;
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      const grad = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      grad.addColorStop(0, light ? 'rgba(232, 222, 200, 0.16)' : 'rgba(150, 134, 108, 0.12)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      g.fillStyle = grad;
      g.fillRect(x + dx - r, y + dy - r, 2 * r, 2 * r);
    }
  }
  g.strokeStyle = 'rgba(236, 228, 210, 0.10)';
  g.lineWidth = 1.5;
  for (let i = 0; i < 6; i++) {
    g.beginPath();
    g.arc(rand() * 256, rand() * 256, 30 + rand() * 50, rand() * 6, rand() * 6 + 1.2);
    g.stroke();
  }
  concreteCanvas = c;
  return c;
}

// A clone of the mesh's material showing the texture: colour white and the texture as both map and emissive map, so it
// keeps the factory's lighting response (its flat parts glow their own colour at the same emissive intensity)
function textured(mesh: THREE.Mesh, texture: THREE.Texture): void {
  const base = mesh.material as THREE.MeshStandardMaterial;
  const m = base.clone();
  m.color.set(0xffffff);
  m.map = texture;
  m.emissive.set(0xffffff);
  m.emissiveMap = texture;
  m.needsUpdate = true;
  mesh.material = m;
}

function canvasTexture(image: HTMLCanvasElement, repeatX: number, repeatY: number): THREE.Texture {
  const t = new THREE.CanvasTexture(image);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  return t;
}

function screenTexture(url: string, mesh: THREE.Mesh): void {
  const lab = globalThis as LabGlobal;
  lab.__labPending = (lab.__labPending ?? 0) + 1;
  const done = () => { lab.__labPending = Math.max(0, (lab.__labPending ?? 1) - 1); };
  // the material is set now (callers may cache it); the image fills the texture when it arrives
  const t = new THREE.TextureLoader().load(url, done, undefined, done);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  // unlit: a screen is its own light; a little under full white so the white pages do not clip
  mesh.material = new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(0.9, 0.9, 0.9) });
}

// A low-poly sphere fitted to the bounds of the factory's geometry (ellipsoids carry their size in the geometry)
function lowPolyEllipsoid(mesh: THREE.Mesh): void {
  const old = mesh.geometry;
  old.computeBoundingBox();
  const size = old.boundingBox!.getSize(new THREE.Vector3());
  const centre = old.boundingBox!.getCenter(new THREE.Vector3());
  const g = new THREE.SphereGeometry(0.5, 8, 5);
  g.scale(size.x, size.y, size.z);
  g.translate(centre.x, centre.y, centre.z);
  mesh.geometry = g;
  old.dispose();
}

// The name on the building (POR-54, 2026-10-23), headquarters style: the logo as big white 3D letters on the top
// louvre floor of the street side, standing a little off the slats, like a company HQ. The letters are the city badge's
// svg (its ink paths) extruded; the faces are unlit (selfLit), so the night window pass draws them as lit letters.
const HQ = { height: 0.72, depth: 0.08, standoff: 0.05, x: 0.2, y: 4.54 };
const LOGO_SVG = '/game/pogicity/Building/logos/valtech-office.svg';

function addHqLetters(model: THREE.Object3D, meshes: Record<string, THREE.Mesh>): void {
  // the first slat of the top louvre band of the south face: the letters stand off its front
  const slat = meshes['louvre-S-3-slat-1'];
  if (!slat) return;
  model.updateMatrixWorld(true);
  slat.geometry.computeBoundingBox();
  const front = slat.geometry.boundingBox!.clone().applyMatrix4(slat.matrixWorld).max.z;
  // read synchronously, so the letters are in the model when the entrance lab records its meshes
  const xhr = new XMLHttpRequest();
  xhr.open('GET', LOGO_SVG, false);
  xhr.send();
  const shapes: THREE.Shape[] = [];
  for (const path of new SVGLoader().parse(xhr.responseText).paths) {
    const fill = path.userData?.style?.fill;
    if (!fill || fill === 'none' || /^(white|#fff|#ffffff)$/i.test(fill)) continue;   // the svg's white square
    shapes.push(...SVGLoader.createShapes(path));
  }
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 6 });
  geo.computeBoundingBox();
  const b = geo.boundingBox!;
  const s = HQ.height / (b.max.y - b.min.y);
  geo.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -1);
  geo.scale(s, -s, HQ.depth);   // svg y points down; the flip turns the faces inside out, so both materials are double sided
  const letters = new THREE.Mesh(geo, [
    new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.95, 0.95), side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#cfd1d4', roughness: 0.5, side: THREE.DoubleSide }),
  ]);
  letters.castShadow = letters.receiveShadow = true;
  letters.userData.sculptComponent = { id: 'sign-hq-face' };
  letters.userData.selfLit = true;
  const group = new THREE.Group();
  group.name = 'sign-hq';
  group.position.set(HQ.x, HQ.y, front + HQ.depth + HQ.standoff);
  group.add(letters);
  model.add(group);   // model space (the model sits at the origin when it is detailed)
  const nodes: Record<string, THREE.Object3D> | undefined = model.userData.sculptRuntime?.nodes;
  if (nodes) nodes['sign-hq'] = group;
}

export function applyValtechOfficeDetail(model: THREE.Object3D): void {
  if (typeof document === 'undefined') return;
  const meshes: Record<string, THREE.Mesh> = model.userData.sculptRuntime?.meshes ?? {};
  addHqLetters(model, meshes);
  for (const [id, mesh] of Object.entries(meshes)) {
    const s = mesh.scale;   // the factory scales unit primitives to the part's size (wu)
    if (/^side-[NWE]-.*brick/.test(id)) textured(mesh, canvasTexture(brickImage(), s.x / BRICK_TILE_WU.w, s.y / BRICK_TILE_WU.h));
    else if (id === 'int-floor' || id === 'open-floor-lunch') textured(mesh, canvasTexture(concreteImage(), s.x / 2, s.z / 2));
    else if (SCREENS[id]) screenTexture(SCREENS[id], mesh);
    else if (id === 'int-room-01-number') {
      const t = new THREE.CanvasTexture(numberImage());
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      mesh.material = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, color: new THREE.Color(0.97, 0.97, 0.97) });
    }
    else if (/-(planter|trough)-(leaf|crown)-/.test(id)) lowPolyEllipsoid(mesh);
    else if (id === 'side-N-lunch-quiz-board') textured(mesh, canvasTexture(quizImage(), 1, 1));
  }
}
