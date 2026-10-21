// Phaser loader + animation config for the city avatar: the pre-baked 2D paper doll sheets of the avatar builder
// (public/game/pogicity/Characters/avatar-builder/2d-<look>/, art/avatar-builder/builder-2d/doll.py). Every visitor
// wears one from the first load: the saved builder choice (the Avatar tab), else the base outfit.
// A choice changed while the city runs (AVATAR_CHANGE_EVENT) loads that look's sheets and swaps them in.
import type Phaser from 'phaser';
import {
  AVATAR_BAKED_LOOKS,
  AVATAR_CHANGE_EVENT,
  AVATAR_DEFAULT_CHOICE,
  avatarLookKey,
  readAvatarChoice,
  type AvatarChoice,
} from '@/lib/city/models/avatarPieces';

export const AVATAR_BUILDER_BASE = '/game/pogicity/Characters/avatar-builder';

// Fallback when a manifest names no displayScale: 0.25 draws the 4x sheets at the city standard 24 px at zoom 1,
// 48 px at Street zoom 2.
export const AVATAR3D_DISPLAY_SCALE = 0.25;

type Manifest = {
  frameWidth: number;
  frameHeight: number;
  origin: [number, number];
  displayScale?: number;
  animations: Record<string, { file: string; outlineFile: string; frames: number; fps: number }>;
};

const BAKED = new Set(AVATAR_BAKED_LOOKS.map(avatarLookKey));

// The look folder for a choice: 2d-<key>, the 2D paper doll sheets (every combination of the slot options).
function bakedLook(choice: AvatarChoice | null): string | null {
  return choice && BAKED.has(avatarLookKey(choice)) ? `2d-${avatarLookKey(choice)}` : null;
}

const DEFAULT_LOOK = `2d-${avatarLookKey(AVATAR_DEFAULT_CHOICE)}`;

// The look to wear at load: ?look=<folder> (for checks), else the saved choice, else the base outfit.
export function avatarBuilderLook(): string {
  if (typeof window === 'undefined') return DEFAULT_LOOK;
  const param = new URLSearchParams(window.location.search).get('look');
  // Any safe folder name for checks (a missing folder falls back to the base outfit in loadAvatar3dSprites)
  if (param && /^[\w-]+$/.test(param)) return param;
  return bakedLook(readAvatarChoice()) ?? DEFAULT_LOOK;
}

// The sheet set the player wears now. Texture keys are `avatarb_<look>_<walk|idle>_<compass>`, so several looks can
// stay loaded side by side.
type SheetSet = { prefix: string; origin: [number, number]; displayScale: number };
let current: SheetSet = { prefix: `avatarb_${DEFAULT_LOOK}`, origin: [0.5, 1], displayScale: AVATAR3D_DISPLAY_SCALE };
// One load per sheet set and game, shared by every caller (a new game after a route change or HMR has an empty
// texture manager, so it loads again)
const loadingByGame = new WeakMap<Phaser.Game, Map<string, Promise<SheetSet>>>();

export function avatar3dPrefix(): string {
  return current.prefix;
}
export function avatar3dOrigin(): [number, number] {
  return current.origin;
}
export function avatar3dDisplayScale(): number {
  return current.displayScale;
}

// Texture / animation keys follow GifLoader's convention (animation `<texture>_anim`), so playGifAnimation()
// plays them unchanged.
export async function loadAvatar3dSprites(scene: Phaser.Scene, outline = true): Promise<void> {
  const look = avatarBuilderLook();
  try {
    current = await loadLook(scene, look, outline);
  } catch (err) {
    if (look === DEFAULT_LOOK) throw err;
    current = await loadLook(scene, DEFAULT_LOOK, outline);
  }
}

function loadLook(scene: Phaser.Scene, look: string, outline: boolean): Promise<SheetSet> {
  return loadSheets(scene, `avatarb_${look}`, `${AVATAR_BUILDER_BASE}/${look}`, outline);
}

// Each look's sheets carry their own walk fps (stride matched to that figure's legs).
function loadSheets(scene: Phaser.Scene, prefix: string, dir: string, outline: boolean): Promise<SheetSet> {
  let loading = loadingByGame.get(scene.game);
  if (!loading) loadingByGame.set(scene.game, (loading = new Map()));
  let pending = loading.get(prefix);
  if (!pending) {
    pending = fetchSheets(scene, prefix, dir, outline);
    pending.catch(() => loading.delete(prefix));   // a failed load can be tried again
    loading.set(prefix, pending);
  }
  return pending;
}

async function fetchSheets(
  scene: Phaser.Scene,
  prefix: string,
  dir: string,
  outline: boolean,
): Promise<SheetSet> {
  const manifest = (await (await fetch(`${dir}/avatar3d.json`)).json()) as Manifest;
  await Promise.all(
    Object.entries(manifest.animations).map(
      ([name, a]) =>
        new Promise<void>((resolve, reject) => {
          const key = `${prefix}_${name}`;
          if (scene.textures.exists(key)) return resolve();
          const img = new Image();
          img.onload = () => {
            scene.textures.addSpriteSheet(key, img, { frameWidth: manifest.frameWidth, frameHeight: manifest.frameHeight });
            scene.anims.create({
              key: `${key}_anim`,
              frames: scene.anims.generateFrameNumbers(key, { start: 0, end: a.frames - 1 }),
              frameRate: a.fps,
              repeat: -1,
            });
            resolve();
          };
          img.onerror = reject;
          img.src = `${dir}/${outline ? a.outlineFile : a.file}`;
        }),
    ),
  );
  return { prefix, origin: manifest.origin, displayScale: manifest.displayScale ?? AVATAR3D_DISPLAY_SCALE };
}

// Follows the builder while the city runs: each saved choice loads its look (once) and the player switches to it
// on the next frame. Unbaked choices keep whatever the player wears now. Returns the unsubscribe.
export function followAvatarBuilder(scene: Phaser.Scene, outline = true): () => void {
  if (typeof window === 'undefined') return () => {};
  let latest = 0;
  const onChange = (event: Event) => {
    const look = bakedLook((event as CustomEvent<AvatarChoice>).detail ?? null);
    if (!look) return;
    const ticket = ++latest;
    loadLook(scene, look, outline)
      .then((set) => {
        if (ticket !== latest) return; // a newer choice arrived while this one loaded
        current = set;
      })
      .catch(() => {});
  };
  window.addEventListener(AVATAR_CHANGE_EVENT, onChange);
  // A choice saved before this subscribed (the Avatar tab saves on mount, which can land between preload and
  // create) would otherwise never load: wear it now
  const saved = readAvatarChoice();
  const forced = new URLSearchParams(window.location.search).has('look');   // ?look= wins, for checks
  if (!forced && saved && bakedLook(saved) && current.prefix !== `avatarb_${bakedLook(saved)}`) {
    onChange(new CustomEvent(AVATAR_CHANGE_EVENT, { detail: saved }));
  }
  return () => window.removeEventListener(AVATAR_CHANGE_EVENT, onChange);
}
