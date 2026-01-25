import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';

export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 600;
export const TILE_SIZE = 64;

// Create config once to prevent recreation
let cachedConfig: Phaser.Types.Core.GameConfig | null = null;

export const createGameConfig = (): Phaser.Types.Core.GameConfig => {
  if (cachedConfig) return cachedConfig;

  cachedConfig = {
    type: Phaser.CANVAS,
    backgroundColor: '#1e293b', // slate-800
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [BootScene, MainScene],
    scale: {
      mode: Phaser.Scale.RESIZE, // Resize to fill container
      width: '100%',
      height: '100%',
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  return cachedConfig;
};
