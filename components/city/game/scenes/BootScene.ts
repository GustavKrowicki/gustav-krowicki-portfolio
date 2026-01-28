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

    // Load actual sprites
    this.load.image('building-lego', '/game/sprites/LEGO HQ-96px S.png');
    this.load.image('building-valtech', '/game/sprites/Valtech-96px.png');

    // Education district
    this.load.image('building-sdu', '/game/sprites/SDU kolding-96px.png');
    this.load.image('building-melbourne', '/game/sprites/Melbourne uni .png');
    this.load.image('building-berlin', '/game/sprites/Berlin uni-96px.png');
    this.load.image('building-aarhus', '/game/sprites/erhvervsakademiet -96px.png');

    // Personal district
    this.load.image('building-library', '/game/sprites/Library dokk1-96px.png');
    this.load.image('building-agf', '/game/sprites/stadium new-south-96px.png');
    this.load.image('building-tree-skiing', '/game/sprites/tree skiing-96px.png');
    this.load.image('building-ski-chute', '/game/sprites/ski chute-96px.png');
    this.load.image('building-concert', '/game/sprites/concert-96px.png');

    // Load placeholder assets for buildings without sprites yet
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

    // Building placeholders (isometric-ish) - only for buildings without real sprites
    const buildingColors: Record<string, number> = {
      'building-cateit': 0xf59e0b, // amber
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

    // Ground tile (44x22 isometric diamond - 2:1 ratio)
    graphics.clear();
    graphics.fillStyle(0x334155, 1); // slate-700
    graphics.beginPath();
    graphics.moveTo(22, 0);   // top
    graphics.lineTo(44, 11);  // right
    graphics.lineTo(22, 22);  // bottom
    graphics.lineTo(0, 11);   // left
    graphics.closePath();
    graphics.fillPath();
    graphics.generateTexture('tile-ground', 44, 22);

    // Highlight tile
    graphics.clear();
    graphics.lineStyle(2, 0xfbbf24, 1); // amber-400
    graphics.beginPath();
    graphics.moveTo(22, 1);
    graphics.lineTo(43, 11);
    graphics.lineTo(22, 21);
    graphics.lineTo(1, 11);
    graphics.closePath();
    graphics.strokePath();
    graphics.generateTexture('tile-highlight', 44, 22);

    graphics.destroy();
  }

  create() {
    this.scene.start('MainScene');
  }
}
