// Street lamps for the city at night (POR-39, Figma board "City at night – light plan v1", node 678-3604).
// A rule places the lamps from the city grid, so they follow the city when it is reorganised. This first pass covers
// one test street: the east-west avenue (wire lamps over the road), the campus squares south of it (post lamps) and
// the old street in the west (lanterns).

import type { GridCell } from "@/components/city/pogicity/types";
import { TileType } from "@/components/city/pogicity/types";

export type StreetLampType = "wire" | "post" | "lantern";

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
  pool: { rx: number; ry: number; strength: number }; // light pool on the ground, radii in wu
}

export const WIRE_HEIGHT = 3.2; // ~6.4 m

export const STREET_LAMPS: Record<StreetLampType, StreetLampSpec> = {
  // Slim grey pole, ~3.5 m, wide open cone; light goes only down in a wide cone (a pool about 4 tiles across)
  post: { day: "/game/pogicity/Props/night/post_day.png", lit: "/game/pogicity/Props/night/post_lit.png", height: 2.0,
    pool: { rx: 2.3, ry: 2.3, strength: 1 } },
  // Rust-brown dome, gold inside, hung on a wire over the middle of the road; a long warm oval that reaches the next lamp
  wire: { day: "/game/pogicity/Props/night/wire_day.png", lit: "/game/pogicity/Props/night/wire_lit.png", height: WIRE_HEIGHT - 0.6,
    hangHeight: WIRE_HEIGHT, pool: { rx: 3.0, ry: 2.0, strength: 1 } },
  // The old lantern post: warm and small
  lantern: { day: "/game/pogicity/Props/night/lantern_day.png", lit: "/game/pogicity/Props/night/lantern_lit.png", height: 1.6,
    pool: { rx: 1.7, ry: 1.7, strength: 0.85 } },
};

const at = (grid: GridCell[][], x: number, y: number) => grid[y]?.[x];
const isType = (grid: GridCell[][], x: number, y: number, ...types: TileType[]) => {
  const c = at(grid, x, y);
  return !!c && types.includes(c.type as TileType);
};
const isRoad = (grid: GridCell[][], x: number, y: number) => isType(grid, x, y, TileType.Road, TileType.Asphalt);

export function placeStreetLamps(grid: GridCell[][]): StreetLamp[] {
  const lamps: StreetLamp[] = [];

  // Wire lamps: every 4 tiles along the avenue (asphalt on rows 29 and 30), hung over the middle of the road on a
  // wire from the building line on one side to the other
  const avenue = { y0: 29, y1: 30, x0: 2, x1: 27 };
  for (let x = avenue.x0; x <= avenue.x1; x += 4) {
    if (!isType(grid, x, avenue.y0, TileType.Asphalt) || !isType(grid, x, avenue.y1, TileType.Asphalt)) continue;
    lamps.push({ type: "wire", x: x + 0.5, y: avenue.y1, order: x,
      wire: { x0: x + 0.5, y0: avenue.y0 - 1, x1: x + 0.5, y1: avenue.y1 + 2 } });
  }

  // Post lamps: on the paved squares south of the avenue, one every 3 tiles
  for (let y = 31; y <= 40; y++) {
    for (let x = 20; x <= 27; x++) {
      if (x % 3 !== 2 || y % 3 !== 2 || !isType(grid, x, y, TileType.Tile)) continue;
      lamps.push({ type: "post", x: x + 0.5, y: y + 0.5, order: 30 + (x - 20) + (y - 31) });
    }
  }

  // Lanterns: along the old street in the west, on the free cells next to the road, at least 3 tiles apart
  let last = -10;
  for (let y = 31; y <= 47; y++) {
    if (y - last < 3) continue;
    if (!isType(grid, 8, y, TileType.Grass, TileType.Tile) || !isRoad(grid, 7, y)) continue;
    lamps.push({ type: "lantern", x: 8.3, y: y + 0.5, order: 50 + y });
    last = y;
  }

  return lamps.sort((a, b) => a.order - b.order);
}
