// Phaser loader + animation config for the 3D-rendered avatar sheets (public/game/pogicity/Characters/avatar3d/),
// rendered from lib/city/models/gustavAvatar.ts by art/img2threejs/gustav-avatar/render_sheets.mjs + pack_sheets.py.
// Opt-in: ?avatar=3d, or a saved avatar builder choice (the Avatar tab), which picks that look's pre-baked sheets
// in public/game/pogicity/Characters/avatar-builder/<look>/ (same format). The live GIFs stay the default.
import type Phaser from 'phaser';
import { AVATAR_BAKED_LOOKS, avatarLookKey, readAvatarChoice } from '@/lib/city/models/avatarPieces';

export const AVATAR3D_BASE = '/game/pogicity/Characters/avatar3d';
export const AVATAR_BUILDER_BASE = '/game/pogicity/Characters/avatar-builder';

// Sheets are 4x world pixels (0.9 wu = 97 px); 0.25 draws the city standard 0.9 wu = 24 px at zoom 1, 48 px at
// Street zoom 2. Walk fps: the walk clip covers 0.36 wu per 1.0 s cycle (0.40 H/s), so at the city's 1.6 wu/s
// the 8-frame cycle must run 1.6 / 0.36 = 4.44 times a second = 35.6 fps for the feet not to slide.
export const AVATAR3D_DISPLAY_SCALE = 0.25;
export const AVATAR3D_WALK_FPS = 35.56;

type Manifest = {
  frameWidth: number;
  frameHeight: number;
  origin: [number, number];
  displayScale?: number;
  animations: Record<string, { file: string; outlineFile: string; frames: number; fps: number }>;
};

// The builder look to wear: ?look=<key> (for checks), else the saved choice. Null when neither names a baked
// look, so an unbaked combination falls back to the shipped sheets.
export function avatarBuilderLook(): string | null {
  if (typeof window === 'undefined') return null;
  const baked = new Set(AVATAR_BAKED_LOOKS.map(avatarLookKey));
  const param = new URLSearchParams(window.location.search).get('look');
  if (param) return baked.has(param) ? param : null;
  const choice = readAvatarChoice();
  return choice && baked.has(avatarLookKey(choice)) ? avatarLookKey(choice) : null;
}

function savedBuilderChoice(): boolean {
  return typeof window !== 'undefined' && readAvatarChoice() !== null;
}

// Decided once per page load: a choice saved later (the Avatar tab, while the city runs) only takes effect on the
// next load, so the player never asks for sheets that were not loaded.
let enabled: boolean | null = null;
export function avatar3dEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (enabled === null) {
    const params = new URLSearchParams(window.location.search);
    enabled = params.get('avatar') === '3d' || params.has('look') || savedBuilderChoice();
  }
  return enabled;
}

let origin: [number, number] = [0.5, 1];
export function avatar3dOrigin(): [number, number] {
  return origin;
}

let displayScale = AVATAR3D_DISPLAY_SCALE;
export function avatar3dDisplayScale(): number {
  return displayScale;
}

// Texture / animation keys follow GifLoader's convention: texture `avatar3d_<walk|idle>_<compass>`,
// animation `<texture>_anim`, so playGifAnimation() plays them unchanged.
export async function loadAvatar3dSprites(scene: Phaser.Scene, outline = true): Promise<void> {
  const look = avatarBuilderLook();
  const dir = look ? `${AVATAR_BUILDER_BASE}/${look}` : AVATAR3D_BASE;
  let manifest: Manifest;
  try {
    manifest = (await (await fetch(`${dir}/avatar3d.json`)).json()) as Manifest;
  } catch (err) {
    if (!look) throw err;
    return loadSheets(scene, AVATAR3D_BASE, (await (await fetch(`${AVATAR3D_BASE}/avatar3d.json`)).json()) as Manifest, outline, false);
  }
  return loadSheets(scene, dir, manifest, outline, Boolean(look));
}

// Builder sheets carry their own walk fps (stride matched to that figure's legs); the shipped sheets use
// AVATAR3D_WALK_FPS.
async function loadSheets(scene: Phaser.Scene, dir: string, manifest: Manifest, outline: boolean, ownFps: boolean): Promise<void> {
  origin = manifest.origin;
  displayScale = manifest.displayScale ?? AVATAR3D_DISPLAY_SCALE;
  await Promise.all(Object.entries(manifest.animations).map(([name, a]) => new Promise<void>((resolve, reject) => {
    const key = `avatar3d_${name}`;
    const img = new Image();
    img.onload = () => {
      scene.textures.addSpriteSheet(key, img, { frameWidth: manifest.frameWidth, frameHeight: manifest.frameHeight });
      scene.anims.create({
        key: `${key}_anim`,
        frames: scene.anims.generateFrameNumbers(key, { start: 0, end: a.frames - 1 }),
        frameRate: name.startsWith('walk') && !ownFps ? AVATAR3D_WALK_FPS : a.fps,
        repeat: -1,
      });
      resolve();
    };
    img.onerror = reject;
    img.src = `${dir}/${outline ? a.outlineFile : a.file}`;
  })));
}
