import * as THREE from 'three';
import { createBurgerTrailerModel } from './cateItBurger';
import { createPizzaTrailerModel } from './cateItPizza';
import { createStreetFoodTrailerModel } from './cateItAfrican';
import { BENCH_TOP, TABLE_TOP, beerTableSet, box } from './cateItSquareParts';

// The food truck square for the city (Linear POR-38): one 8 x 7 walk-in plot with the three trailers around a small plaza
// and two beer tables. Trucks stand square to the grid (a true half circle of 4 x 2 trucks needs 10 x 10): the street food
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
export const TABLES: [number, number][] = [[4.0, 4.5], [6.0, 5.5]];
export const SEATS: Record<Truck, [number, number]> = {
  burger: [4.3, 4.25],
  pizza: [3.7, 4.25],
  african: [6.3, 5.25],
};
const PAD = 0.02;
const plan = (p: [number, number]): [number, number] => [p[0] - SQUARE.w / 2, p[1] - SQUARE.h / 2];

const CREATE: Record<Truck, (options: Options) => THREE.Group> = {
  burger: createBurgerTrailerModel,
  pizza: createPizzaTrailerModel,
  african: createStreetFoodTrailerModel,
};

export function createCateItSquareModel(options: Options = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Food truck square';
  group.add(box(SQUARE.w, PAD - 0.002, SQUARE.h, '#ddd6c8', 0, (PAD - 0.002) / 2, 0, { ...options, castShadow: false }));
  for (const [truck, { at, yawDeg }] of Object.entries(TRUCKS) as [Truck, (typeof TRUCKS)[Truck]][]) {
    const model = CREATE[truck](options);
    const [x, z] = plan(at);
    model.position.set(x, 0, z);
    model.rotation.y = THREE.MathUtils.degToRad(yawDeg);
    model.name = `${truck}-trailer`;
    group.add(model);
  }
  for (const t of TABLES) {
    const [x, z] = plan(t);
    group.add(beerTableSet(x, z, options));
  }
  return group;
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
