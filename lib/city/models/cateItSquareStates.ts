import * as THREE from 'three';
import { createBurgerTrailerModel } from './cateItBurger';
import { createPizzaTrailerModel } from './cateItPizza';
import { createStreetFoodTrailerModel } from './cateItAfrican';
import { BENCH_TOP, TABLE_TOP, beerTableSet, box } from './cateItSquareParts';
import { createGustavAvatar, type AvatarRig } from './gustavAvatarRig';
import { poseAvatarSit } from './gustavAvatarSit';

// The food truck square for the city (Linear POR-38): one 8 x 7 walk-in plot with the three trailers around a small plaza
// and four beer tables. Trucks stand square to the grid (a true half circle of 4 x 2 trucks needs 10 x 10): the street food
// and burger trailers along the back (north) with their hatches south, the pizza trailer on the west side with its hatch
// east, so every hatch faces the default camera. Model units are wu, the plot centred on the origin: X east (-4..4),
// +Z south (-3.5..3.5). Plan tile (lx, ly) -> model (lx - 4, ly - 3.5). Walk map and beats: lib/city/buildingInteriors.ts,
// lib/city/interiorBeats.ts.
type Options = Parameters<typeof createBurgerTrailerModel>[0];

export const SQUARE = { w: 8, h: 7 };
export type Truck = 'burger' | 'pizza' | 'african';
/** Each truck's footprint centre (plan tiles) and its turn: 0 = hatch south, 90 = hatch east (tow bar north) */
export const TRUCKS: Record<Truck, { at: [number, number]; yawDeg: number }> = {
  african: { at: [2, 1], yawDeg: 0 },
  burger: { at: [6, 1], yawDeg: 0 },
  pizza: { at: [1, 5], yawDeg: 90 },
};
/** Beer tables (centre, plan tiles, long side along X) and each truck's seat on a north bench (the avatar faces south) */
export const TABLES: [number, number][] = [[4.0, 4.5], [7.0, 4.5], [4.0, 6.5], [7.0, 6.5]];
export const SEATS: Record<Truck, [number, number]> = {
  burger: [4.3, 4.25],
  pizza: [3.7, 4.25],
  african: [7.3, 4.25],
};
const PAD = 0.02;
const plan = (p: [number, number]): [number, number] => [p[0] - SQUARE.w / 2, p[1] - SQUARE.h / 2];

const CREATE: Record<Truck, (options: Options) => THREE.Group> = {
  burger: createBurgerTrailerModel,
  pizza: createPizzaTrailerModel,
  african: createStreetFoodTrailerModel,
};

/** What the roof signs show: the Cate it logo on all three, each truck's food in neon letters, or blank boards */
export type Signs = 'logo' | 'food' | 'blank';
const FOOD_SIGN: Record<Truck, { text: string; color: string }> = {
  burger: { text: 'BURGER', color: '#ff5a6e' },
  pizza: { text: 'PIZZA', color: '#ffd166' },
  african: { text: 'STREET FOOD', color: '#ff9a3c' },
};

/** The face of a truck's roof sign, in the trailer's own frame (the board: x -1.2..1.2, top 1.82..2.2, front at z -0.13) */
function signFace(truck: Truck, signs: Signs): THREE.Mesh | null {
  if (signs === 'blank') return null;
  const material = new THREE.MeshBasicMaterial({ transparent: true });
  if (signs === 'logo') {
    const g = globalThis as { __labPending?: number };
    g.__labPending = (g.__labPending ?? 0) + 1;
    material.map = new THREE.TextureLoader().load('/game/pogicity/Building/logos/cate-it-sign.png', () => {
      g.__labPending = (g.__labPending ?? 1) - 1;
      material.needsUpdate = true;
    });
  } else {
    const { text, color } = FOOD_SIGN[truck];
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 155;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.font = `900 ${text.length > 8 ? 96 : 112}px "Arial Black", Arial, sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.shadowColor = color; ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.fillText(text, 512, 82);
      ctx.shadowBlur = 0; ctx.fillStyle = '#fff4ec'; ctx.globalAlpha = 0.55;
      ctx.fillText(text, 512, 82);   // a pale core, like a lit tube
    }
    material.map = new THREE.CanvasTexture(c);
  }
  material.map!.colorSpace = THREE.SRGBColorSpace;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(2.36, 0.36), material);
  face.position.set(0, 2.01, -0.126);
  face.name = 'sign-face';
  return face;
}

/** `t` (0..1) is the phase of the guests' ambient loop (export_square.sh renders the frames); 0 is the still sprite.
 *  `signs`: what the roof signs show. */
export function createCateItSquareModel(options: Options = {}, t = 0, signs: Signs = 'food'): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Food truck square';
  // No pad of its own: the city draws its paving under the plot, so the ground stays transparent and only catches the
  // shadows of the trucks, tables and guests (Gustav, 2026-10-21: the square's floor differed from the rest of the plaza)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(SQUARE.w, SQUARE.h), new THREE.ShadowMaterial({ opacity: 0.3 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.001;
  ground.receiveShadow = true;
  ground.name = 'shadow-catcher';
  group.add(ground);
  for (const [truck, { at, yawDeg }] of Object.entries(TRUCKS) as [Truck, (typeof TRUCKS)[Truck]][]) {
    const model = CREATE[truck](options);
    const [x, z] = plan(at);
    model.position.set(x, 0, z);
    model.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    model.name = `${truck}-trailer`;
    model.traverse((o) => { if (o.name === 'Ground pad') o.visible = false; });   // the trailer's own 4 x 2 pad
    const face = signFace(truck, signs);
    if (face) model.add(face);
    group.add(model);
  }
  for (const t of TABLES) {
    const [x, z] = plan(t);
    group.add(beerTableSet(x, z, options));
  }
  GUESTS.forEach((guest, k) => group.add(createGuest(guest, options, t + k / GUESTS.length)));
  group.add(createBanner(options));
  return group;
}

/** The Cate it banner on two tall poles across the square's south-east corner (Gustav, 2026-10-21: food names on the
 *  trucks, Cate it on a banner in the corner, big). It runs diagonally from `from` to `to` (plan tiles), so it faces the
 *  default camera square on. High on purpose: from the city camera a thing at height h shows over the ground about
 *  1.2 h tiles further back, and at 3 wu it lands above the tables and between the back hatches, hiding no seat. */
export const BANNER = { from: [6.2, 7.0] as [number, number], to: [8.0, 5.2] as [number, number], bottom: 3.1, top: 3.7 };

function createBanner(options: Options): THREE.Group {
  const g = new THREE.Group();
  g.name = 'banner';
  const [x0, z0] = plan(BANNER.from), [x1, z1] = plan(BANNER.to);
  const length = Math.hypot(x1 - x0, z1 - z0);
  const h = BANNER.top - BANNER.bottom;
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  g.rotation.y = Math.atan2(z0 - z1, x1 - x0);   // local +X along the banner, local +Z (its face) toward the camera
  for (const dx of [-length / 2 + 0.05, length / 2 - 0.05]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.045, BANNER.top + 0.12, 8),
      new THREE.MeshStandardMaterial({ color: '#4b4f54', roughness: 0.6, emissive: '#4b4f54', emissiveIntensity: 0.25 }),
    );
    pole.position.set(dx, (BANNER.top + 0.12) / 2, -0.03);
    pole.castShadow = options?.castShadow ?? true;
    g.add(pole);
  }
  g.add(box(length - 0.04, h, 0.025, '#22272a', 0, BANNER.bottom + h / 2, 0, options ?? {}));
  const pending = globalThis as { __labPending?: number };
  pending.__labPending = (pending.__labPending ?? 0) + 1;
  const material = new THREE.MeshBasicMaterial({ transparent: true });
  material.map = new THREE.TextureLoader().load('/game/pogicity/Building/logos/cate-it-sign.png', () => {
    pending.__labPending = (pending.__labPending ?? 1) - 1;
    material.needsUpdate = true;
  });
  material.map.colorSpace = THREE.SRGBColorSpace;
  const w = Math.min(length - 0.12, (h - 0.06) * 512 / 77);   // the logo strip keeps its own proportions
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, w * 77 / 512), material);
  face.position.set(0, BANNER.bottom + h / 2, 0.014);
  g.add(face);
  return g;
}

/** Guests at the tables, baked into the square's sprite: seat (plan tiles), facing (0 = south, 180 = north), their food,
 *  and clothes. They keep clear of the three seats the visitor's avatar uses (SEATS). */
type Guest = { at: [number, number]; yawDeg: number; meal: Truck; move: 'bite' | 'look' | 'chat'; skin: string; hair: string; jacket: string; tee: string; jeans: string };
export const GUESTS: Guest[] = [
  { at: [6.7, 4.25], yawDeg: 0, meal: 'pizza', move: 'bite', skin: '#c58c69', hair: '#2b211b', jacket: '#3f6b5a', tee: '#e9e4d8', jeans: '#3a3f4a' },
  { at: [4.0, 4.75], yawDeg: 180, meal: 'african', move: 'look', skin: '#7a4e35', hair: '#1c1714', jacket: '#c9852f', tee: '#f1ece2', jeans: '#2f3440' },
  { at: [3.7, 6.25], yawDeg: 0, meal: 'burger', move: 'chat', skin: '#e6b79a', hair: '#b07a3e', jacket: '#7b3b4a', tee: '#e9e4d8', jeans: '#4a5568' },
  { at: [4.3, 6.25], yawDeg: 0, meal: 'african', move: 'bite', skin: '#5e3b28', hair: '#151110', jacket: '#2f4c6e', tee: '#d9c9a8', jeans: '#2b2f36' },
  { at: [7.0, 6.75], yawDeg: 180, meal: 'burger', move: 'look', skin: '#d9a07c', hair: '#5a3b26', jacket: '#8c8f3a', tee: '#efe9dd', jeans: '#3b4252' },
];

const GUEST_COLOURS: Record<string, keyof Guest> = {
  skin: 'skin', hair: 'hair', 'hair-light': 'hair', jacket: 'jacket', 'jacket-shade': 'jacket', tee: 'tee', jeans: 'jeans',
};

/** One seated guest: the city avatar's model in other clothes, no glasses or laptop, with a meal in front. `u` is the
 *  guest's own phase in the loop: a bite (right hand up to the mouth), a look around, or a lean in to chat. */
function createGuest(guest: Guest, options: Options, u = 0): THREE.Group {
  const g = new THREE.Group();
  g.name = 'guest';
  const person = createGustavAvatar({ laptop: false, castShadow: options?.castShadow ?? true });
  const shade = (hex: string, f: number) => new THREE.Color(hex).multiplyScalar(f);
  person.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const id = (mesh.userData.sculptComponent as { material?: string } | undefined)?.material;
    if (id === 'glasses-frame') { mesh.visible = false; return; }
    const key = id ? GUEST_COLOURS[id] : undefined;
    if (!key) return;
    const m = (mesh.material as THREE.MeshStandardMaterial).clone();
    m.color = shade(guest[key] as string, id!.endsWith('-shade') ? 0.8 : id === 'hair-light' ? 1.2 : 1);
    if (m.emissive) m.emissive.copy(m.color);
    mesh.material = m;
  });
  const [x, z] = plan(guest.at);
  person.position.set(x, 0.02, z);
  person.rotation.y = THREE.MathUtils.degToRad(guest.yawDeg);
  const rig = person.userData.avatar as AvatarRig;
  poseAvatarSit(rig, 0.02 + BENCH_TOP);
  const w = Math.sin(2 * Math.PI * u);
  if (guest.move === 'bite') {
    const a = Math.max(0, w) ** 2;
    rig.bones['upper-arm-r']?.rotateX(-0.55 * a);
    rig.bones['forearm-r']?.rotateX(-1.1 * a);
    rig.bones.head?.rotateX(0.15 * a);
  } else if (guest.move === 'look') {
    rig.bones.head?.rotateY(0.5 * w);
  } else {
    rig.bones.chest?.rotateX(0.12 * Math.max(0, w));
    rig.bones.head?.rotateZ(0.12 * w);
  }
  person.updateMatrixWorld(true);
  const meal = createSquareMeal(guest.meal, options);
  meal.position.set(x, 0, z + (guest.yawDeg === 180 ? -0.22 : 0.22));
  g.add(person, meal);
  return g;
}

/** The meal on the table in front of a seated avatar (seated frames only), in the avatar's frame: a burger box, a flat
 *  pizza box, a bowl; each with a drink */
export function createSquareMeal(truck: Truck, options: Options = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = `meal-${truck}`;
  const top = PAD + TABLE_TOP;
  if (truck === 'burger') {
    g.add(box(0.09, 0.05, 0.09, '#f3efe6', 0, top + 0.025, 0, options));
    g.add(box(0.095, 0.012, 0.095, '#c8402f', 0, top + 0.056, 0, options));
  } else if (truck === 'pizza') {
    g.add(box(0.16, 0.02, 0.16, '#efe4c8', 0, top + 0.01, 0, options));
    g.add(box(0.12, 0.004, 0.12, '#c7402f', 0, top + 0.022, 0, options));
  } else {
    const bowl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.045, 0.05, 12),
      new THREE.MeshStandardMaterial({ color: '#a8492e', roughness: 0.8, emissive: '#a8492e', emissiveIntensity: 0.25 }),
    );
    bowl.position.set(0, top + 0.025, 0);
    bowl.castShadow = options?.castShadow ?? true;
    g.add(bowl, box(0.1, 0.006, 0.1, '#e8a23a', 0, top + 0.05, 0, options));
  }
  g.add(box(0.04, 0.08, 0.04, '#e8a23a', 0.12, top + 0.04, 0.02, options));
  return g;
}

export { BENCH_TOP, plan as squarePlanToModel };
