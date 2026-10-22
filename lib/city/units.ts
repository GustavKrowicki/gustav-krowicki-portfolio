// City standard v1 (docs/city-rules.md): one world unit (wu) = one tile edge, about 2 m.
// Game logic works in wu; pixels exist only in the render step. Nothing else hard-codes these numbers.

// ==================== PROJECTION ====================

// The 2:1 tile defines the camera: orthographic, yaw 45 deg, pitch asin(22 / 44) = 30 deg.
export const TILE_WIDTH = 44;
export const TILE_HEIGHT = 22;

export const PITCH_RAD = Math.asin(TILE_HEIGHT / TILE_WIDTH);
export const YAW_DEG = 45;

// Screen pixels per wu at zoom 1: k along the ground, k_h for heights.
export const PX_PER_WU = TILE_WIDTH / Math.SQRT2; // 31.11
export const PX_PER_WU_UP = PX_PER_WU * Math.cos(PITCH_RAD); // 26.94

export const METRES_PER_WU = 2;

// ==================== SCALE ====================

// Characters set the scale; buildings are compressed in plan, never in storey or door height.
export const CHARACTER_HEIGHT_WU = 0.9;
export const CHARACTER_RADIUS_WU = 0.2;
export const DOOR_HEIGHT_WU = CHARACTER_HEIGHT_WU + 0.1;
export const DOOR_WIDTH_WU = { single: 0.5, double: 1.0 } as const;
export const STOREY_HEIGHT_WU = 1.2;
export const GROUND_STOREY_HEIGHT_WU = 1.4;
export const WINDOW_WU = { width: 0.5, height: 0.6, bay: 1.0 } as const;
export const PARAPET_WU = 0.15;

// Tiles per footprint side from the real building width (square root, anchored on the 300 m LEGO campus = 7).
export function footprintTiles(realWidthMetres: number): number {
  return clamp(Math.round(7 * Math.sqrt(realWidthMetres / 300)), 2, 8);
}

// ==================== WALKING ====================

// Set B of POR-53 (picked 2026-10-22): a short visit needs game speeds, not real time. The run keeps a reference
// site's run-to-walk ratio of about 3.5.
export const WALK_SPEED_WU_PER_S = 2;
export const RUN_SPEED_WU_PER_S = 7;
export const WALK_STEP_WU = 0.28;
export const RUN_STEP_WU = 1.0;

// One animation cycle is two steps, so feet never slide: walk 0.28 s, run 0.29 s.
export function cycleDurationMs(speedWuPerS: number, stepWu: number): number {
  return (2 * stepWu / speedWuPerS) * 1000;
}

// ==================== CAMERA ====================

// Powers of two keep pixel art crisp. Overview is computed (fit the city) and stays <= 1.
export const ZOOM = {
  street: 2,
  detail: 4,
} as const;

// Zoom at which a door fills about a quarter of the viewport, floored to a power of two.
export function doorCutInZoom(viewportHeightPx: number, doorHeightWu: number = DOOR_HEIGHT_WU): number {
  const zoom = (0.25 * viewportHeightPx) / (doorHeightWu * PX_PER_WU_UP);
  return Math.pow(2, Math.max(0, Math.floor(Math.log2(zoom))));
}

// ==================== TIMING ====================

export function panDurationMs(distancePx: number): number {
  return clamp(200 + 0.5 * distancePx, 250, 800);
}

// Zoom is interpolated in log space, 250 ms per doubling.
export function zoomDurationMs(fromZoom: number, toZoom: number): number {
  if (fromZoom === toZoom) return 0;
  return clamp(250 * Math.abs(Math.log2(toZoom / fromZoom)), 250, 900);
}

// Turns an ease on progress into a zoom ease that moves evenly in log(zoom), for Phaser's camera.zoomTo.
export function logZoomEase(
  fromZoom: number,
  toZoom: number,
  ease: (t: number) => number
): (t: number) => number {
  if (fromZoom === toZoom) return ease;
  return (t) => (fromZoom * Math.pow(toZoom / fromZoom, ease(t)) - fromZoom) / (toZoom - fromZoom);
}

// ==================== CONVERSIONS ====================

// Continuous world position (x, y on the ground, z up, all in wu) to screen pixels at zoom 1,
// relative to the top corner of tile (0, 0). Tile (i, j) covers [i, i + 1] x [j, j + 1].
export function wuToScreen(x: number, y: number, z: number = 0): { x: number; y: number } {
  return {
    x: (x - y) * (TILE_WIDTH / 2),
    y: (x + y) * (TILE_HEIGHT / 2) - z * PX_PER_WU_UP,
  };
}

// Screen pixels (relative to the same origin) back to the ground plane, z = 0.
export function screenToWu(screenX: number, screenY: number): { x: number; y: number } {
  return {
    x: (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2,
    y: (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2,
  };
}

// ==================== SPRITE EXPORT ====================

// Sprite-converter settings computed from the footprint, so every building lands on its tiles.
// The converter normalises the model's largest dimension to 3 units; `groundY` is the model's ground
// plane height in that normalised scene, `footprintWidthModel` the footprint side in model units.
export function converterSettings(opts: {
  footprintW: number;
  footprintH: number;
  footprintWidthModel: number;
  maxDim: number;
  groundY: number;
  size: number;
  density?: 1 | 2;
}): { zoom: number; verticalOffset: number } {
  const d = opts.density ?? 1;
  const zoom =
    (5 * opts.footprintW * TILE_WIDTH * d * opts.maxDim) /
    (3 * Math.SQRT2 * opts.size * opts.footprintWidthModel);
  const frame = 5 / zoom;
  const verticalOffset =
    ((opts.footprintW + opts.footprintH) * TILE_HEIGHT * d) / (4 * opts.size) -
    (opts.groundY * Math.cos(PITCH_RAD)) / frame;
  return { zoom, verticalOffset };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
