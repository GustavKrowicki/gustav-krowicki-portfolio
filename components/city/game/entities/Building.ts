import Phaser from 'phaser';
import { Building as BuildingData } from '@/lib/data/buildings';
import { TILE_SIZE } from '../config';

export class Building {
  public sprite: Phaser.GameObjects.Sprite;
  public data: BuildingData;
  public isoX: number;
  public isoY: number;
  private scene: Phaser.Scene;
  private highlightSprite: Phaser.GameObjects.Sprite | null = null;
  private nameText: Phaser.GameObjects.Text | null = null;

  constructor(scene: Phaser.Scene, data: BuildingData, worldWidth: number) {
    this.scene = scene;
    this.data = data;

    // Convert grid position to isometric screen position
    const gridX = data.gridPosition.x;
    const gridY = data.gridPosition.y;
    this.isoX = (gridX - gridY) * (TILE_SIZE / 2) + worldWidth / 2;
    this.isoY = (gridX + gridY) * (TILE_SIZE / 4) + 100;

    // Create building sprite at isometric position
    this.sprite = scene.add.sprite(this.isoX, this.isoY, data.sprite);

    // Make interactive with explicit hit area (96x96 is the building texture size)
    if (data.interactable) {
      this.sprite.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, 96, 96),
        Phaser.Geom.Rectangle.Contains
      );
      this.sprite.input!.cursor = 'pointer';
    }

    // Set depth based on isometric y position
    this.sprite.setDepth(this.isoY);
  }

  highlight(show: boolean) {
    if (show) {
      // Add glow effect
      this.sprite.setTint(0xffffaa);

      // Show name tooltip
      if (!this.nameText) {
        this.nameText = this.scene.add.text(
          this.sprite.x,
          this.sprite.y - 60,
          this.data.name,
          {
            fontSize: '14px',
            color: '#ffffff',
            backgroundColor: '#1e293b',
            padding: { x: 8, y: 4 },
          }
        );
        this.nameText.setOrigin(0.5);
        this.nameText.setDepth(1000);
      }
    } else {
      // Remove glow
      this.sprite.clearTint();

      // Hide name tooltip
      if (this.nameText) {
        this.nameText.destroy();
        this.nameText = null;
      }
    }
  }

  destroy() {
    if (this.highlightSprite) {
      this.highlightSprite.destroy();
    }
    if (this.nameText) {
      this.nameText.destroy();
    }
    this.sprite.destroy();
  }
}
