import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';

// Grid dimensions
export const GRID_WIDTH = 20;
export const GRID_HEIGHT = 15;

// Isometric tile dimensions (2:1 ratio like Pogicity)
export const TILE_WIDTH = 44;
export const TILE_HEIGHT = 22;

// Legacy TILE_SIZE for compatibility (average of width/height for scaling)
export const TILE_SIZE = 32;

// Calculate canvas size from grid (Pogicity method)
const isoWidth = (GRID_WIDTH + GRID_HEIGHT) * (TILE_WIDTH / 2);
const isoHeight = (GRID_WIDTH + GRID_HEIGHT) * (TILE_HEIGHT / 2);

// Padding for buildings that extend above their tile
const CANVAS_PADDING_TOP = 100;
const CANVAS_PADDING_BOTTOM = 50;
const CANVAS_PADDING_SIDES = 50;

export const GAME_WIDTH = Math.ceil(isoWidth) + CANVAS_PADDING_SIDES * 2;
export const GAME_HEIGHT = Math.ceil(isoHeight) + CANVAS_PADDING_TOP + CANVAS_PADDING_BOTTOM;

// Offset to center the grid in the canvas
export const GRID_OFFSET_X = GAME_WIDTH / 2;
export const GRID_OFFSET_Y = CANVAS_PADDING_TOP;

// Create config once to prevent recreation
let cachedConfig: Phaser.Types.Core.GameConfig | null = null;

export const createGameConfig = (): Phaser.Types.Core.GameConfig => {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    type: Phaser.CANVAS,
    backgroundColor: '#1e293b', // slate-800
    pixelArt: false, // Smooth scaling for detailed sprites
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, MainScene],
    scale: {
      mode: Phaser.Scale.FIT, // Scales to fit container, maintains aspect ratio
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return cachedConfig;
};
