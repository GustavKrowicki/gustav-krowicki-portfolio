// Phaser loader + animation config for the 3D-rendered avatar sheets (public/game/pogicity/Characters/avatar3d/),
// rendered from lib/city/models/gustavAvatar.ts by art/img2threejs/gustav-avatar/render_sheets.mjs + pack_sheets.py.
// Opt-in only (?avatar=3d): the live GIFs stay the default.
import type Phaser from 'phaser';

export const AVATAR3D_BASE = '/game/pogicity/Characters/avatar3d';

// Sheets are 4x world pixels (0.9 wu = 97 px); 0.25 draws the city standard 0.9 wu = 24 px at zoom 1, 48 px at
// Street zoom 2. Walk fps: the walk clip covers 0.36 wu per 1.0 s cycle (0.40 H/s), so at the city's 1.6 wu/s
// the 8-frame cycle must run 1.6 / 0.36 = 4.44 times a second = 35.6 fps for the feet not to slide.
export const AVATAR3D_DISPLAY_SCALE = 0.25;
export const AVATAR3D_WALK_FPS = 35.56;

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
