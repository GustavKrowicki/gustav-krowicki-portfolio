// Where the city's camera is on the first frames, computed before Phaser exists, so the intro's shader can draw the
// real grid in the same place the city appears in. Mirrors components/city/pogicity/phaser/gameConfig.ts (canvas size
// and grid origin), MainScene.fitCityView (overview) and MainScene.landWalking (the close-up on the avatar).
import { TILE_HEIGHT, TILE_WIDTH, ZOOM, wuToScreen } from "@/lib/city/units";
import { LOTS } from "./lots";

const GRID_W = LOTS.width;
const GRID_H = LOTS.height;
const CANVAS_PADDING_TOP = 300;
const CANVAS_PADDING_BOTTOM = 100;
export const GAME_WIDTH = Math.ceil((GRID_W + GRID_H) * (TILE_WIDTH / 2)) + TILE_WIDTH * 4;
export const GAME_HEIGHT = Math.ceil((GRID_W + GRID_H) * (TILE_HEIGHT / 2)) + CANVAS_PADDING_TOP + CANVAS_PADDING_BOTTOM;
export const GRID_ORIGIN = { x: GAME_WIDTH / 2, y: CANVAS_PADDING_TOP };
const FIT_PADDING = 120;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 4;

export interface Framing { scrollX: number; scrollY: number; zoom: number }

// How Phaser's internal canvas sits in its container: FIT letterboxes on desktop, ENVELOP covers on phones
export interface Stage { scale: number; offX: number; offY: number }

export const isPhoneViewport = () => typeof window !== "undefined" && window.innerWidth < 768;

export function stageFor(containerW: number, containerH: number, phone: boolean): Stage {
  const scale = phone
    ? Math.max(containerW / GAME_WIDTH, containerH / GAME_HEIGHT)
    : Math.min(containerW / GAME_WIDTH, containerH / GAME_HEIGHT);
  return { scale, offX: (containerW - GAME_WIDTH * scale) / 2, offY: (containerH - GAME_HEIGHT * scale) / 2 };
}

export function fitFraming(containerW: number, containerH: number, phone: boolean): Framing {
  const stage = stageFor(containerW, containerH, phone);
  const effectiveW = phone ? containerW / stage.scale : GAME_WIDTH;
  const effectiveH = phone ? containerH / stage.scale : GAME_HEIGHT;
  const fit = Math.min(effectiveW / (GAME_WIDTH + FIT_PADDING * 2), effectiveH / (GAME_HEIGHT + FIT_PADDING * 2));
  return { scrollX: 0, scrollY: 0, zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)) };
}

// The avatar's spawn, in world pixels (PlayerController.spawn: the tile's centre)
export function spawnWorld(): { x: number; y: number } {
  const p = wuToScreen(LOTS.spawn[0], LOTS.spawn[1]);
  return { x: GRID_ORIGIN.x + p.x, y: GRID_ORIGIN.y + p.y + TILE_HEIGHT / 2 };
}

// landWalking: the camera starts close on the avatar (ZOOM.detail), 12 px above it
export function closeUpFraming(): Framing {
  const p = spawnWorld();
  return { scrollX: Math.round(p.x - GAME_WIDTH / 2), scrollY: Math.round(p.y - 12 - GAME_HEIGHT / 2), zoom: ZOOM.detail };
}

// Zoom moves evenly in log space, the centre in a straight line
export function lerpFraming(a: Framing, b: Framing, t: number): Framing {
  const zoom = Math.exp(Math.log(a.zoom) + (Math.log(b.zoom) - Math.log(a.zoom)) * t);
  return { scrollX: a.scrollX + (b.scrollX - a.scrollX) * t, scrollY: a.scrollY + (b.scrollY - a.scrollY) * t, zoom };
}

// world = containerPx * scale + offset. Phaser zooms around the canvas centre: internal px = (world - scroll - mid) * zoom + mid.
export function worldFromContainer(framing: Framing, stage: Stage): { scale: number; offX: number; offY: number } {
  const k = 1 / (stage.scale * framing.zoom);
  const midX = GAME_WIDTH / 2;
  const midY = GAME_HEIGHT / 2;
  return {
    scale: k,
    offX: -stage.offX * k - midX / framing.zoom + framing.scrollX + midX,
    offY: -stage.offY * k - midY / framing.zoom + framing.scrollY + midY,
  };
}

// With reduced motion the landing skips the close-up and goes straight to street zoom on the avatar
// (focusOnPlayer(close = true): zoom 3 on a phone, ZOOM.street on desktop, centred on the avatar)
export function streetFraming(phone: boolean): Framing {
  const p = spawnWorld();
  const zoom = phone ? 3 : ZOOM.street;
  return { scrollX: Math.round(p.x - GAME_WIDTH / 2), scrollY: Math.round(p.y - GAME_HEIGHT / 2), zoom };
}
