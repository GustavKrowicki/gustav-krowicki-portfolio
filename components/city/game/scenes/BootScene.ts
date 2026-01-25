import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private onLoadProgress?: (progress: number) => void;
  private onLoadComplete?: () => void;

  constructor() {
    super({ key: 'BootScene' });
  }

  init() {
    this.onLoadProgress = this.registry.get('onLoadProgress');
    this.onLoadComplete = this.registry.get('onLoadComplete');
  }

  preload() {
    // Progress bar
    this.load.on('progress', (value: number) => {
      if (this.onLoadProgress) {
        this.onLoadProgress(Math.round(value * 100));
      }
    });

    this.load.on('complete', () => {
      if (this.onLoadComplete) {
        this.onLoadComplete();
      }
    });

    // Load placeholder assets
    // In the future, these will be replaced with actual isometric sprites
    this.createPlaceholderTextures();
  }

  private createPlaceholderTextures() {
    // Create simple colored rectangles as placeholder textures
    const graphics = this.make.graphics({ x: 0, y: 0 });

    // Player sprite (simple character placeholder)
    graphics.clear();
    graphics.fillStyle(0x60a5fa, 1); // blue-400
    graphics.fillRect(0, 0, 32, 48);
    graphics.fillStyle(0xfbbf24, 1); // amber-400
    graphics.fillCircle(16, 12, 10);
    graphics.generateTexture('player', 32, 48);

    // Building placeholders (isometric-ish)
    const buildingColors: Record<string, number> = {
      'building-lego': 0xef4444, // red
      'building-valtech': 0x3b82f6, // blue
      'building-sdu': 0x10b981, // green
      'building-cateit': 0xf59e0b, // amber
      'building-home': 0x8b5cf6, // purple
    };

    Object.entries(buildingColors).forEach(([key, color]) => {
      graphics.clear();
      graphics.fillStyle(color, 1);
      // Simple isometric building shape
      graphics.beginPath();
      graphics.moveTo(48, 0);
      graphics.lineTo(96, 24);
      graphics.lineTo(96, 72);
      graphics.lineTo(48, 96);
      graphics.lineTo(0, 72);
      graphics.lineTo(0, 24);
      graphics.closePath();
      graphics.fillPath();
      // Darker side
      graphics.fillStyle(color - 0x333333, 1);
      graphics.beginPath();
      graphics.moveTo(48, 96);
      graphics.lineTo(96, 72);
      graphics.lineTo(96, 24);
      graphics.lineTo(48, 48);
      graphics.closePath();
      graphics.fillPath();
      graphics.generateTexture(key, 96, 96);
    });

    // Ground tile
    graphics.clear();
    graphics.fillStyle(0x334155, 1); // slate-700
    graphics.beginPath();
    graphics.moveTo(32, 0);
    graphics.lineTo(64, 16);
    graphics.lineTo(32, 32);
    graphics.lineTo(0, 16);
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('tile-ground', 64, 32);

    // Highlight tile
    graphics.clear();
    graphics.lineStyle(2, 0xfbbf24, 1); // amber-400
    graphics.beginPath();
    graphics.moveTo(32, 2);
    graphics.lineTo(62, 16);
    graphics.lineTo(32, 30);
    graphics.lineTo(2, 16);
    graphics.closePath();
    graphics.strokePath();
    graphics.generateTexture('tile-highlight', 64, 32);

    graphics.destroy();
  }

  create() {
    this.scene.start('MainScene');
  }
}
