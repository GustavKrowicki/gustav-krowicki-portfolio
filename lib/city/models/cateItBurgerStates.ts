import * as THREE from 'three';
import { createBurgerTrailerModel } from './cateItBurger';

// The burger trailer's walk-in plot for the city (Linear POR-38, the Eat / Book loop): a 4 x 4 plaza with the 4 x 2 trailer
// on its north half (hatch facing south) and one beer table set on the south-west of it. Model units are wu, the plot
// centred on the origin: X east (-2..2), +Z south (-2..2). Plan tile (lx, ly) -> model (lx - 2, ly - 2).
// The walk map and the beats are in lib/city/buildingInteriors.ts and lib/city/interiorBeats.ts.
type Options = Parameters<typeof createBurgerTrailerModel>[0];

export const BURGER_SITE = { w: 4, h: 4 };
/** The beer table set: centre in plan tiles, length along X; the avatar sits on the north bench, facing south */
export const BURGER_TABLE = { at: [1.0, 3.5] as [number, number], length: 1.1 };
export const TABLE_TOP = 0.385;           // 0.77 m
export const BENCH_TOP = 0.235;           // 0.47 m
const PAD = 0.02;

function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, options: Options): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: 0.85, emissive: color, emissiveIntensity: 0.25 }),
  );
  mesh.position.set(x, y, z);
  mesh.castShadow = options?.castShadow ?? true;
  mesh.receiveShadow = options?.receiveShadow ?? true;
  return mesh;
}

/** A beer hall table and two benches, centred on (x, z), long side along X */
function beerTableSet(x: number, z: number, options: Options): THREE.Group {
  const g = new THREE.Group();
  g.name = 'beer-table-set';
  const L = BURGER_TABLE.length;
  const wood = '#b98a55', legs = '#4b4f54';
  g.add(box(L, 0.03, 0.25, wood, x, PAD + TABLE_TOP - 0.015, z, options));
  for (const dx of [-L / 2 + 0.12, L / 2 - 0.12]) g.add(box(0.03, TABLE_TOP - 0.03, 0.2, legs, x + dx, PAD + (TABLE_TOP - 0.03) / 2, z, options));
  for (const dz of [-0.25, 0.25]) {
    g.add(box(L, 0.025, 0.12, wood, x, PAD + BENCH_TOP - 0.0125, z + dz, options));
    for (const dx of [-L / 2 + 0.12, L / 2 - 0.12]) g.add(box(0.03, BENCH_TOP - 0.025, 0.09, legs, x + dx, PAD + (BENCH_TOP - 0.025) / 2, z + dz, options));
  }
  return g;
}

export function createBurgerSiteModel(options: Options = {}): THREE.Group {
  const group = new THREE.Group();
  group.name = 'Burger trailer plot';
  // the plaza: one pad for the whole plot, slightly under the trailer's own pad (same colour)
  group.add(box(BURGER_SITE.w, PAD - 0.002, BURGER_SITE.h, '#ddd6c8', 0, (PAD - 0.002) / 2, 0, { ...options, castShadow: false }));
  const trailer = createBurgerTrailerModel(options);
  trailer.position.z = -1;
  group.add(trailer);
  group.add(beerTableSet(BURGER_TABLE.at[0] - BURGER_SITE.w / 2, BURGER_TABLE.at[1] - BURGER_SITE.h / 2, options));
  return group;
}

/** The food on the table in front of the seated avatar (the seated frame only): a takeaway burger box and a drink */
export function createBurgerMeal(options: Options = {}): THREE.Group {
  const g = new THREE.Group();
  g.name = 'meal';
  const top = PAD + TABLE_TOP;
  g.add(box(0.09, 0.05, 0.09, '#f3efe6', 0, top + 0.025, 0, options));
  g.add(box(0.095, 0.012, 0.095, '#c8402f', 0, top + 0.056, 0, options));
  g.add(box(0.04, 0.08, 0.04, '#e8a23a', 0.12, top + 0.04, 0.02, options));
  return g;
}
