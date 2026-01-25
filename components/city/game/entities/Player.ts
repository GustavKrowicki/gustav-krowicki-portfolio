import Phaser from 'phaser';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private scene: Phaser.Scene;
  private speed = 150;
  private targetPosition: { x: number; y: number } | null = null;
  private isMovingToTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    // Create player sprite
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDepth(10);

    // Set up physics body
    this.sprite.body?.setSize(24, 16);
    this.sprite.body?.setOffset(4, 32);
  }

  moveDirection(dx: number, dy: number) {
    // Cancel click-to-walk when using keyboard
    this.targetPosition = null;
    this.isMovingToTarget = false;

    // Normalize diagonal movement
    const magnitude = Math.sqrt(dx * dx + dy * dy);
    if (magnitude > 0) {
      dx /= magnitude;
      dy /= magnitude;
    }

    this.sprite.setVelocity(dx * this.speed, dy * this.speed);
  }

  moveTo(x: number, y: number) {
    this.targetPosition = { x, y };
    this.isMovingToTarget = true;
  }

  stop() {
    if (!this.isMovingToTarget) {
      this.sprite.setVelocity(0, 0);
    }
  }

  update() {
    // Handle click-to-walk movement
    if (this.isMovingToTarget && this.targetPosition) {
      const distance = Phaser.Math.Distance.Between(
        this.sprite.x,
        this.sprite.y,
        this.targetPosition.x,
        this.targetPosition.y
      );

      // Stop when close enough
      if (distance < 10) {
        this.sprite.setVelocity(0, 0);
        this.targetPosition = null;
        this.isMovingToTarget = false;
        return;
      }

      // Move towards target
      const angle = Phaser.Math.Angle.Between(
        this.sprite.x,
        this.sprite.y,
        this.targetPosition.x,
        this.targetPosition.y
      );

      this.sprite.setVelocity(
        Math.cos(angle) * this.speed,
        Math.sin(angle) * this.speed
      );
    }
  }

  getPosition(): { x: number; y: number } {
    return { x: this.sprite.x, y: this.sprite.y };
  }

  setPosition(x: number, y: number) {
    this.sprite.setPosition(x, y);
  }
}
