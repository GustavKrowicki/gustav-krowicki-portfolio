import Phaser from "phaser";
import { GRID_WIDTH, GRID_HEIGHT, TILE_WIDTH, TILE_HEIGHT } from "../types";
import { screenToWu, wuToScreen } from "@/lib/city/units";

// Calculate canvas size for isometric grid
const isoWidth = (GRID_WIDTH + GRID_HEIGHT) * (TILE_WIDTH / 2);
const isoHeight = (GRID_WIDTH + GRID_HEIGHT) * (TILE_HEIGHT / 2);

// Add padding for buildings that extend above their footprint
const CANVAS_PADDING_TOP = 300;
const CANVAS_PADDING_BOTTOM = 100;

export const GAME_WIDTH = Math.ceil(isoWidth) + TILE_WIDTH * 4;
export const GAME_HEIGHT =
  Math.ceil(isoHeight) + CANVAS_PADDING_TOP + CANVAS_PADDING_BOTTOM;

// Offset to center the grid in the canvas
export const GRID_OFFSET_X = GAME_WIDTH / 2;
export const GRID_OFFSET_Y = CANVAS_PADDING_TOP;

// World position in wu (grid cells are the integer part) to canvas pixels, and back on the ground plane
export function gridToScreen(gridX: number, gridY: number, z: number = 0): { x: number; y: number } {
  const p = wuToScreen(gridX, gridY, z);
  return { x: GRID_OFFSET_X + p.x, y: GRID_OFFSET_Y + p.y };
}

export function screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
  return screenToWu(screenX - GRID_OFFSET_X, screenY - GRID_OFFSET_Y);
}

export function createGameConfig(
  parent: HTMLElement,
  scene: Phaser.Scene
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.WEBGL, // Canvas is deprecated in Phaser 4; filters and lighting need WebGL
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: "#73645F",
    pixelArt: true, // Crisp pixel rendering
    roundPixels: true,
    antialias: false,
    scene,
    input: {
      activePointers: 2,
    },
    // Phaser's time step clamps each frame's delta to the 60 fps target for 120 frames after the window gets focus
    // (its "cool down" after a resume). On a phone drawing 30 to 45 fps that halves game time for the first seconds
    // of a visit, so the landing hold and glide after the load intro ran late. No cool down: the clock keeps real time
    // (the 200 ms sanity limit on a single frame stays).
    fps: {
      panicMax: 0,
    },
    scale: {
      mode: window.innerWidth < 768 ? Phaser.Scale.ENVELOP : Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };
}
