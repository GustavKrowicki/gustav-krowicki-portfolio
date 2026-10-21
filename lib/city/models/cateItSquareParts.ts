import * as THREE from 'three';

// Shared pieces for the food truck square (lib/city/models/cateItSquareStates.ts): the beer table set and a flat box helper.
// Model units are wu.
type Options = { castShadow?: boolean; receiveShadow?: boolean };

export const TABLE_TOP = 0.385;           // 0.77 m
export const BENCH_TOP = 0.235;           // 0.47 m
const PAD = 0.02;

export function box(w: number, h: number, d: number, color: string, x: number, y: number, z: number, options: Options): THREE.Mesh {
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
export function beerTableSet(x: number, z: number, options: Options): THREE.Group {
  const g = new THREE.Group();
  g.name = 'beer-table-set';
  const L = 1.1;                              // 2.2 m
  const wood = '#b98a55', legs = '#4b4f54';
  g.add(box(L, 0.03, 0.25, wood, x, PAD + TABLE_TOP - 0.015, z, options));
  for (const dx of [-L / 2 + 0.12, L / 2 - 0.12]) g.add(box(0.03, TABLE_TOP - 0.03, 0.2, legs, x + dx, PAD + (TABLE_TOP - 0.03) / 2, z, options));
  for (const dz of [-0.25, 0.25]) {
    g.add(box(L, 0.025, 0.12, wood, x, PAD + BENCH_TOP - 0.0125, z + dz, options));
    for (const dx of [-L / 2 + 0.12, L / 2 - 0.12]) g.add(box(0.03, BENCH_TOP - 0.025, 0.09, legs, x + dx, PAD + (BENCH_TOP - 0.025) / 2, z + dz, options));
  }
  return g;
}
