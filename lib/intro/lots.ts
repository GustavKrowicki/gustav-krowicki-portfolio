// The city grid as shader data (lib/intro/lots.json, built by art/intro/build-lots.mjs). One texel per tile, RGBA:
//   R  tile class x 40: 1 grass, 2 paved, 3 snow, 4 building, 5 prop
//   G  building placement order, 0..1, counted outward from the avatar's spawn tile (0 = no building)
//   B  building height in tenths of a world unit
//   A  distance from the spawn tile, 0..1 of the farthest tile
import lotsJson from "./lots.json";

interface LotsJson {
  width: number; height: number; spawn: [number, number]; buildings: number; maxDist: number;
  cls: number[]; order: number[]; heights: number[]; dist: number[];
}

const data = lotsJson as unknown as LotsJson;

export const LOTS = {
  width: data.width,
  height: data.height,
  spawn: data.spawn,
  buildings: data.buildings,
  maxDist: data.maxDist,
};

let texels: Uint8Array | null = null;

export function lotTexels(): Uint8Array {
  if (texels) return texels;
  const n = data.width * data.height;
  const out = new Uint8Array(n * 4);
  for (let i = 0; i < n; i++) {
    out[i * 4] = data.cls[i] * 40;
    out[i * 4 + 1] = data.order[i] ? Math.round((data.order[i] / data.buildings) * 255) : 0;
    out[i * 4 + 2] = data.heights[i];
    out[i * 4 + 3] = data.dist[i];
  }
  texels = out;
  return out;
}
