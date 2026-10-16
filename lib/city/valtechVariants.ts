// Valtech office interior grey-box variants, behind the preview flag ?valtech=<variant> (4x2, 4x2d, 4x3, 5x2, 6x2).
// Without the flag nothing changes: the approved 4 x 2 building and its walk map stay as they are. With it, the grid
// placement, sprites, walk map and guide position switch to the variant, so each one can be walked in the live city.
// Models: art/img2threejs/valtech-office (VARIANT=... build_spec.py, export_variant.sh).
import { Direction, TileType, type GridCell } from '@/components/city/pogicity/types';
import { BUILDINGS } from './buildings';
import { BUILDING_INTERIORS, type BuildingInterior } from './buildingInteriors';
import { TOUR_STOPS } from './tourStops';
import { ZOOM } from './units';

export type ValtechVariant = '4x2' | '4x2d' | '4x3' | '5x2' | '6x2';

const ID = 'valtech-office';
const SPRITE_DIR = '/game/pogicity/Building/landmark';

interface VariantDef {
  origin: [number, number];
  footprint: { width: number; height: number };
  /** Sprite name stem; null = the approved sprites */
  sprite: string | null;
  interior: BuildingInterior;
  /** Guide character: tiles from its default spot (one right and down of the building centre), so it stands at (14,27) */
  npcShift: { x: number; y: number };
  /** Grid edits around the plot */
  clear?: [number, number][];
  moveApartmentsWest?: boolean;
  /** What the size costs in the city (review page) */
  cost: string;
}

// Walk maps from the beat sheet (art/img2threejs/valtech-office walkmap-<variant>.json): O the walkway with a stand tile
// in front of each beat, G the gate passage (main door from the street tile south of it, lit door into O).
const beats = (map: string[], standSpots: Record<string, [number, number]>): BuildingInterior => {
  const w = map[0].length, h = map.length;
  return { map, outside: '', doors: [[w - 2, h - 1, w - 1, h - 1]], entrance: { outside: [w - 1, h], inside: [w - 1, h - 1] }, standSpots };
};

export const VALTECH_VARIANTS: Record<ValtechVariant, VariantDef> = {
  '4x2': {
    origin: [12, 25], footprint: { width: 4, height: 2 }, sprite: null, interior: BUILDING_INTERIORS[ID], npcShift: { x: -1, y: 0 },
    cost: 'Nothing: today\'s plot.',
  },
  '4x2d': {
    origin: [12, 25], footprint: { width: 4, height: 2 }, sprite: null,
    interior: { ...BUILDING_INTERIORS[ID], insideZoom: ZOOM.detail }, npcShift: { x: -1, y: 0 },
    cost: 'Nothing in the city; the camera zooms to Detail while the avatar is inside.',
  },
  '4x3': {
    origin: [12, 24], footprint: { width: 4, height: 3 }, sprite: 'valtech-office-v4x3', interior: beats(['####', '##O#', 'OOOG'], { desk: [2.5, 1.5], room: [1.5, 2.5], lunch: [0.5, 2.5], gate: [3.5, 2.5] }), npcShift: { x: -1, y: 0.5 },
    cost: 'The grass row north of the plot (x 12-15, y 24). The street front, the gate tile and the 4 x 2 louvre block stay; the extra row is a one-storey back wing.',
  },
  '5x2': {
    origin: [11, 25], footprint: { width: 5, height: 2 }, sprite: 'valtech-office-v5x2', interior: beats(['#####', '#OOOG'], { desk: [3.5, 1.5], room: [2.5, 1.5], lunch: [1.5, 1.5], gate: [4.5, 1.5] }), npcShift: { x: -0.5, y: 0 },
    clear: [[11, 25]],
    cost: 'The tree at (11,25) goes and the block touches the apartment block on its west side (no grass between). Road and gate tile stay. Longer than the chosen 4 x 2 proportions.',
  },
  '6x2': {
    origin: [10, 25], footprint: { width: 6, height: 2 }, sprite: 'valtech-office-v6x2', interior: beats(['######', '#OOOOG'], { desk: [4.5, 1.5], room: [3.5, 1.5], lunch: [1.5, 1.5], gate: [5.5, 1.5] }), npcShift: { x: 0, y: 0 },
    clear: [[11, 25]], moveApartmentsWest: true,
    cost: 'The apartment block moves one tile west (onto 2 grass and 2 paving tiles), the tree at (11,25) goes. Road and gate tile stay. Much longer than the chosen 4 x 2 proportions.',
  },
};

export function valtechVariantFromUrl(): ValtechVariant | null {
  if (typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('valtech');
  return v && v in VALTECH_VARIANTS ? (v as ValtechVariant) : null;
}

function buildingCells(grid: GridCell[][], id: string, ox: number, oy: number, w: number, h: number): void {
  for (let y = oy; y < oy + h; y++) {
    for (let x = ox; x < ox + w; x++) {
      grid[y][x] = {
        type: TileType.Building, x, y, isOrigin: x === ox && y === oy, originX: ox, originY: oy,
        buildingId: id, buildingOrientation: Direction.Down,
      };
    }
  }
}

/** The grid with the variant applied (a copy), and the building, walk map and guide switched to it */
export function applyValtechVariant(grid: GridCell[][], variant: ValtechVariant): GridCell[][] {
  const def = VALTECH_VARIANTS[variant];
  const out = grid.map((row) => row.map((cell) => ({ ...cell })));
  const ground = (x: number, y: number, type: TileType) => { out[y][x] = { type, x, y, isOrigin: true }; };
  for (const row of out) for (const cell of row) if (cell.buildingId === ID) ground(cell.x, cell.y, TileType.Tile);
  for (const [x, y] of def.clear ?? []) ground(x, y, TileType.Grass);
  if (def.moveApartmentsWest) {
    const apt = out.flat().find((c) => c.isOrigin && c.buildingId === 'medium-apartments' && c.x === 7 && c.y === 24);
    if (apt) {
      for (let y = 24; y < 28; y++) for (let x = 7; x < 11; x++) ground(x, y, x === 10 ? TileType.Tile : TileType.Grass);
      buildingCells(out, 'medium-apartments', 6, 24, 4, 4);
    }
  }
  buildingCells(out, ID, def.origin[0], def.origin[1], def.footprint.width, def.footprint.height);

  const building = BUILDINGS[ID];
  building.footprint = def.footprint;
  if (def.sprite) {
    const on = `${SPRITE_DIR}/${def.sprite}_south.png`;
    const open = `${SPRITE_DIR}/${def.sprite}-open_south.png`;
    building.sprites = { south: on, north: on, east: on, west: on };
    building.openSprites = { south: open, north: open, east: open, west: open };
  }
  BUILDING_INTERIORS[ID] = def.interior;
  const stop = TOUR_STOPS.find((s) => s.buildingId === ID);
  if (stop) stop.npcShift = def.npcShift;
  return out;
}

/** Applies ?valtech=<variant> when present; otherwise returns the grid unchanged */
export function applyValtechVariantFromUrl(grid: GridCell[][]): GridCell[][] {
  const v = valtechVariantFromUrl();
  return v ? applyValtechVariant(grid, v) : grid;
}
