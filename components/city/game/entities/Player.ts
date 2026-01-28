import Phaser from 'phaser';
import { TILE_WIDTH } from '../config';

export class Player {
  public sprite: Phaser.Physics.Arcade.Sprite;
  private speed = 100;
  private targetPosition: { x: number; y: number } | null = null;
  private isMovingToTarget = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.physics.add.sprite(x, y, 'player');
    this.sprite.setDepth(10);

    // Scale player to fit tile size (original sprite is 32x48)
    const playerScale = TILE_WIDTH / 48;
    this.sprite.setScale(playerScale);

    // Set up physics body (scaled)
    this.sprite.body?.setSize(24 * playerScale, 16 * playerScale);
    this.sprite.body?.setOffset(4 * playerScale, 32 * playerScale);
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

  forceStop() {
    // Cancel all movement including click-to-walk
    this.targetPosition = null;
    this.isMovingToTarget = false;
    this.sprite.setVelocity(0, 0);
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
