// Phaser loader + animation config for the 3D-rendered avatar sheets (public/game/pogicity/Characters/avatar3d/),
// rendered from lib/city/models/gustavAvatar.ts by art/img2threejs/gustav-avatar/render_sheets.mjs + pack_sheets.py.
// Opt-in only (?avatar=3d): the live GIFs stay the default.
import type Phaser from 'phaser';
import { CHARACTER_HEIGHT_WU, PX_PER_WU_UP, TILE_HEIGHT, TILE_WIDTH } from '@/lib/city/units';

export const AVATAR3D_BASE = '/game/pogicity/Characters/avatar3d';

// Sheets are 4x world pixels (0.9 wu = 97 px); 0.25 draws the city standard 0.9 wu = 24 px at zoom 1, 48 px at
// Street zoom 2.
export const AVATAR3D_DISPLAY_SCALE = 0.25;
// Walk: the clip covers 0.36 wu per 1.0 s cycle (0.40 H/s, 8 frames). The 3D player walks at 0.8 wu/s (the GIF
// player keeps its lerp), so the cycle runs 0.8 / 0.36 = 2.22 times a second = 17.8 fps and the feet do not slide.
export const AVATAR3D_STRIDE_WU_PER_CYCLE = 0.36;
export const AVATAR3D_WALK_SPEED_WU = 0.8;
export const AVATAR3D_WALK_FPS = (8 * AVATAR3D_WALK_SPEED_WU) / AVATAR3D_STRIDE_WU_PER_CYCLE;
// Screen px per wu along a grid axis (one tile moves the screen by (TILE_WIDTH/2, TILE_HEIGHT/2)).
export const AVATAR3D_WALK_PX_PER_S = AVATAR3D_WALK_SPEED_WU * Math.hypot(TILE_WIDTH / 2, TILE_HEIGHT / 2);
// Gold pointer: the figure's displayed height (0.9 wu = 24.2 px at zoom 1) plus a 7 px gap above the head.
export const AVATAR3D_POINTER_OFFSET_PX = CHARACTER_HEIGHT_WU * PX_PER_WU_UP + 7;

type Manifest = {
  frameWidth: number;
  frameHeight: number;
  origin: [number, number];
  animations: Record<string, { file: string; outlineFile: string; frames: number; fps: number }>;
};

export function avatar3dEnabled(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('avatar') === '3d';
}

let origin: [number, number] = [0.5, 1];
export function avatar3dOrigin(): [number, number] {
  return origin;
}

// Texture / animation keys follow GifLoader's convention: texture `avatar3d_<walk|idle>_<compass>`,
// animation `<texture>_anim`, so playGifAnimation() plays them unchanged.
export async function loadAvatar3dSprites(scene: Phaser.Scene, outline = true): Promise<void> {
  const manifest = (await (await fetch(`${AVATAR3D_BASE}/avatar3d.json`)).json()) as Manifest;
  origin = manifest.origin;
  await Promise.all(Object.entries(manifest.animations).map(([name, a]) => new Promise<void>((resolve, reject) => {
    const key = `avatar3d_${name}`;
    const img = new Image();
    img.onload = () => {
      scene.textures.addSpriteSheet(key, img, { frameWidth: manifest.frameWidth, frameHeight: manifest.frameHeight });
      scene.anims.create({
        key: `${key}_anim`,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: a.frames - 1 }),
        frameRate: name.startsWith('walk') ? AVATAR3D_WALK_FPS : a.fps,
        repeat: -1,
      });
      resolve();
    };
    img.onerror = reject;
    img.src = `${AVATAR3D_BASE}/${outline ? a.outlineFile : a.file}`;
  })));
}
