import Phaser from "phaser";

/**
 * Walk-cycle animations for the city's people.
 *
 * The pogicity people were animated GIFs decoded in the browser; they are now sprite sheets baked by
 * art/npc/gif-sheets.py and loaded by MainScene.preload, with their animations created in
 * MainScene.loadCharacterAnimations (the avatar builder's sheets, lib/city/avatar3dSprites.ts, follow the same
 * `<texture>_anim` convention). What is left here is playing them.
 */

/**
 * Play animation on a sprite, creating it if needed
 */
export function playGifAnimation(
  sprite: Phaser.GameObjects.Sprite,
  animKey: string
): void {
  const fullKey = `${animKey}_anim`;

  // Check if animation exists and has valid frames before playing
  const anim = sprite.scene.anims.get(fullKey);
  if (!anim || !anim.frames || anim.frames.length === 0) {
    return; // Animation not ready yet
  }

  if (sprite.anims.currentAnim?.key !== fullKey) {
    sprite.play(fullKey);
  }
}
