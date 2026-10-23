// Detail pass of the Valtech office interior (2026-10-16): the textures the img2threejs factory cannot carry (it builds
// flat colours only). Applied to the generated model by part id, after the factory, so a spec rebuild keeps them:
//   side-N-*brick*  pale yellow brick, running bond, true course height (75 mm = 0.0375 wu)
//   int-floor, open-floor-lunch  polished concrete: warm beige with soft mottling
//   int-room-01-number  the huge white "01" on meeting room 01's glass (a transparent decal)
//   side-N-lunch-quiz-board  the Friday quiz in chalk (heading, questions, a tally)
//   *-screen-<n>-display  a downscaled case image (public/game/pogicity/Building/landmark/valtech-office-screen-<n>.png)
//   *-planter-leaf-*, *-planter-crown-*  a low-poly sphere (8 x 5) instead of the factory's 16 x 12: flat leaves at
//   sprite size do not need more, and the plant drops from about 4,400 to about 1,000 triangles
//   sign-roof  a rooftop sign on the south parapet (POR-54, 2026-10-23): the Valtech logo in white on a dark board, standing
//   in front of the glass top floor. The building names itself, so the city needs no floating badge. The face is unlit
//   (selfLit), so the night window pass draws it as it is: a lit box sign
// The case images load asynchronously; the entrance lab waits for __labPending to reach 0 before it renders.
import * as THREE from 'three';

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

// The rooftop sign: 2.4 x 0.56 wu, its face 0.94 of that; the logo is the city badge's file, trimmed to its ink and drawn white
const SIGN = { w: 2.4, h: 0.56, d: 0.06, x: 0.3, face: 0.94 };
const SIGN_BOARD = '#22262b';

function signFaceTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = Math.round((1024 * SIGN.h) / SIGN.w);
  const g = c.getContext('2d')!;
  g.fillStyle = SIGN_BOARD;
  g.fillRect(0, 0, c.width, c.height);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  const lab = globalThis as LabGlobal;
  lab.__labPending = (lab.__labPending ?? 0) + 1;
  const done = () => { lab.__labPending = Math.max(0, (lab.__labPending ?? 1) - 1); };
  const img = new Image();
  img.onload = () => {
    // the svg is square with the wordmark in the middle: draw it big, find the ink, then draw only the ink, white
    const src = document.createElement('canvas');
    src.width = src.height = 1024;
    const sg = src.getContext('2d', { willReadFrequently: true })!;
    sg.drawImage(img, 0, 0, 1024, 1024);
    const { data } = sg.getImageData(0, 0, 1024, 1024);
    let x0 = 1024, y0 = 1024, x1 = -1, y1 = -1;
    for (let y = 0; y < 1024; y++) {
      for (let x = 0; x < 1024; x++) {
        const i = (y * 1024 + x) * 4;
        if (data[i + 3] < 128 || data[i] > 128) continue;   // dark, opaque pixels are the ink
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
    if (x1 > x0) {
      const ink = document.createElement('canvas');
      ink.width = x1 - x0 + 1;
      ink.height = y1 - y0 + 1;
      const ig = ink.getContext('2d')!;
      ig.drawImage(src, x0, y0, ink.width, ink.height, 0, 0, ink.width, ink.height);
      // keep the ink's shape, paint it white: the darker a pixel, the more opaque (the svg's white background turns clear)
      const id = ig.getImageData(0, 0, ink.width, ink.height);
      for (let i = 0; i < id.data.length; i += 4) {
        const dark = 255 - Math.min(id.data[i], id.data[i + 1], id.data[i + 2]);
        id.data[i] = id.data[i + 1] = id.data[i + 2] = 255;
        id.data[i + 3] = Math.round((dark * id.data[i + 3]) / 255);
      }
      ig.putImageData(id, 0, 0);
      const h = c.height * 0.66, w = (ink.width / ink.height) * h;
      const scale = Math.min(1, (c.width * 0.86) / w);
      g.drawImage(ink, (c.width - w * scale) / 2, (c.height - h * scale) / 2, w * scale, h * scale);
      t.needsUpdate = true;
    }
    done();
  };
  img.onerror = done;
  img.src = '/game/pogicity/Building/logos/valtech-office.svg';
  return t;
}

function addRoofSign(model: THREE.Object3D, meshes: Record<string, THREE.Mesh>): void {
  const parapet = meshes['parapet-S'];
  const parent = parapet?.parent;
  if (!parapet || !parent) return;
  // parapet-S is a box scaled to its size: its top and front face give the sign's foot and plane
  const top = parapet.position.y + parapet.scale.y / 2;
  const front = parapet.position.z + parapet.scale.z / 2;
  const group = new THREE.Group();
  group.name = 'sign-roof';
  group.position.set(SIGN.x, top + SIGN.h / 2, front - SIGN.d / 2);
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(SIGN.w, SIGN.h, SIGN.d),
    new THREE.MeshStandardMaterial({ color: SIGN_BOARD, roughness: 0.8, metalness: 0.1 }),
  );
  board.userData.sculptComponent = { id: 'sign-roof-board' };
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(SIGN.w * SIGN.face, SIGN.h * 0.84),
    new THREE.MeshBasicMaterial({ map: signFaceTexture(), color: new THREE.Color(0.94, 0.94, 0.94) }),
  );
  face.position.z = SIGN.d / 2 + 0.002;
  face.userData.sculptComponent = { id: 'sign-roof-face' };
  face.userData.selfLit = true;
  group.add(board, face);
  parent.add(group);
  const nodes: Record<string, THREE.Object3D> | undefined = model.userData.sculptRuntime?.nodes;
  if (nodes) nodes['sign-roof'] = group;
}

export function applyValtechOfficeDetail(model: THREE.Object3D): void {
  if (typeof document === 'undefined') return;
  const meshes: Record<string, THREE.Mesh> = model.userData.sculptRuntime?.meshes ?? {};
  addRoofSign(model, meshes);
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
