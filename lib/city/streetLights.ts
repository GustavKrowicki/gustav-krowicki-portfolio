// Street lamps for the city at night (POR-39, Figma board "City at night – light plan v1", node 678-3604).
// Lamps are placed by hand in the city editor (/city/editor, the lamp tab) and saved on their cell in cityGrid.json
// (GridCell.streetLamp). This file turns those cells into lamps: where each one stands, and for wire lamps where the
// wire runs.

import type { GridCell, StreetLampType } from "@/components/city/pogicity/types";
import { TileType } from "@/components/city/pogicity/types";

export type { StreetLampType };

export interface StreetLamp {
  type: StreetLampType;
  x: number;      // ground point in grid units (continuous)
  y: number;
  order: number;  // switch-on order at dusk, along each street
  // Wire lamps: the wire runs across the street between these two ground points (grid units), at WIRE_HEIGHT
  wire?: { x0: number; y0: number; x1: number; y1: number };
}

export interface StreetLampSpec {
  day: string;
  lit: string;
  height: number;       // where the lamp head sits above the ground, in wu (the light source for the glow)
  hangHeight?: number;  // wire lamps: the top of the rod, in wu above the ground
  // Light pool on the ground: radii in wu; falloff is how fast it fades (lower = more even light out to the edge)
  pool: { rx: number; ry: number; strength: number; falloff?: number };
}

export const WIRE_HEIGHT = 3.2; // ~6.4 m

export const STREET_LAMPS: Record<StreetLampType, StreetLampSpec> = {
  // Slim grey pole, ~3.5 m, wide open cone; light goes only down in a wide cone (a pool about 4 tiles across)
  // Squares are the brightest tier of the light plan: wide, even pools that overlap, so a square at night feels safe
  // and welcoming, with faces readable across it
  post: { day: "/game/pogicity/Props/night/post_day.png", lit: "/game/pogicity/Props/night/post_lit.png", height: 2.0,
    pool: { rx: 2.9, ry: 2.9, strength: 0.8, falloff: 0.9 } },
  // Rust-brown dome, gold inside, hung on a wire over the middle of the road; a long warm oval that reaches the next lamp
  wire: { day: "/game/pogicity/Props/night/wire_day.png", lit: "/game/pogicity/Props/night/wire_lit.png", height: WIRE_HEIGHT - 0.6,
    hangHeight: WIRE_HEIGHT, pool: { rx: 3.0, ry: 2.0, strength: 1 } },
  // The old lantern post: warm and small
  lantern: { day: "/game/pogicity/Props/night/lantern_day.png", lit: "/game/pogicity/Props/night/lantern_lit.png", height: 1.6,
    pool: { rx: 1.7, ry: 1.7, strength: 0.85 } },
};

const isRoad = (grid: GridCell[][], x: number, y: number) => {
  const type = grid[y]?.[x]?.type;
  return type === TileType.Road || type === TileType.Asphalt;
};

// A wire lamp hangs over a road; the post and the lantern stand beside it, never on the road or in a building
export function canPlaceStreetLamp(cell: GridCell | undefined, type: StreetLampType): boolean {
  if (!cell || cell.type === TileType.Building) return false;
  const onRoad = cell.type === TileType.Road || cell.type === TileType.Asphalt;
  return type === "wire" ? onRoad : !onRoad;
}

// The run of road cells through (x, y) along one axis
function roadSpan(grid: GridCell[][], x: number, y: number, axis: "x" | "y"): [number, number] {
  const dx = axis === "x" ? 1 : 0;
  const dy = axis === "y" ? 1 : 0;
  let a = 0;
  let b = 0;
  while (isRoad(grid, x - (a + 1) * dx, y - (a + 1) * dy)) a++;
  while (isRoad(grid, x + (b + 1) * dx, y + (b + 1) * dy)) b++;
  return axis === "x" ? [x - a, x + b] : [y - a, y + b];
}

export function lampsFromGrid(grid: GridCell[][]): StreetLamp[] {
  const lamps: StreetLamp[] = [];
  const seen = new Set<string>();
  for (const row of grid) {
    for (const cell of row) {
      const type = cell.streetLamp;
      if (!type || cell.type === TileType.Building) continue;
      // A wire lamp needs a road to hang over
      if (type === "wire" && !isRoad(grid, cell.x, cell.y)) continue;
      let lamp: StreetLamp;
      if (type === "wire") {
        // Hung over the middle of the road, on a wire across it (along the shorter run of road) that reaches one
        // tile past the road edge on each side, to the building line
        const sx = roadSpan(grid, cell.x, cell.y, "x");
        const sy = roadSpan(grid, cell.x, cell.y, "y");
        if (sy[1] - sy[0] <= sx[1] - sx[0]) {
          const mid = (sy[0] + sy[1] + 1) / 2;
          lamp = { type, x: cell.x + 0.5, y: mid, order: 0,
            wire: { x0: cell.x + 0.5, y0: sy[0] - 1, x1: cell.x + 0.5, y1: sy[1] + 2 } };
        } else {
          const mid = (sx[0] + sx[1] + 1) / 2;
          lamp = { type, x: mid, y: cell.y + 0.5, order: 0,
            wire: { x0: sx[0] - 1, y0: cell.y + 0.5, x1: sx[1] + 2, y1: cell.y + 0.5 } };
        }
      } else {
        lamp = { type, x: cell.x + 0.5, y: cell.y + 0.5, order: 0 };
      }
      // Two clicks on the same road crossing give one lamp
      const key = `${type},${lamp.x},${lamp.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Switch on from north-west to south-east, so the lamps come on along each street
      lamp.order = lamp.x + lamp.y;
      lamps.push(lamp);
    }
  }
  return lamps.sort((a, b) => a.order - b.order);
}
