// Phaser loader + animation config for the 3D-rendered avatar sheets (public/game/pogicity/Characters/avatar3d/),
// rendered from lib/city/models/gustavAvatar.ts by art/img2threejs/gustav-avatar/render_sheets.mjs + pack_sheets.py.
// Opt-in: ?avatar=3d, or a saved avatar builder choice (the Avatar tab), which picks that look's pre-baked 2D sheets
// in public/game/pogicity/Characters/avatar-builder/2d-<look>/ (same format). The live GIFs stay the default.
// A choice changed while the city runs (AVATAR_CHANGE_EVENT) loads that look's sheets and swaps them in.
import type Phaser from 'phaser';
import {
  AVATAR_BAKED_LOOKS,
  AVATAR_CHANGE_EVENT,
  avatarLookKey,
  readAvatarChoice,
  type AvatarChoice,
} from '@/lib/city/models/avatarPieces';

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

const BAKED = new Set(AVATAR_BAKED_LOOKS.map(avatarLookKey));

// The look folder for a choice: 2d-<key>, the 2D paper doll sheets (every combination of the slot options).
function bakedLook(choice: AvatarChoice | null): string | null {
  return choice && BAKED.has(avatarLookKey(choice)) ? `2d-${avatarLookKey(choice)}` : null;
}

// The builder look to wear at load: ?look=<key> (for checks), else the saved choice. Null when neither names a
// baked look, so an unbaked combination falls back to the shipped sheets.
export function avatarBuilderLook(): string | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('look');
  // Any safe folder name for checks (a missing folder falls back to the shipped sheets in loadAvatar3dSprites)
  if (param) return /^[\w-]+$/.test(param) ? param : null;
  return bakedLook(readAvatarChoice());
}

// Decided at load, then switched on once a builder look has loaded later (a visitor opening the Avatar tab while
// the city runs), never before its sheets exist.
let enabled: boolean | null = null;
export function avatar3dEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (enabled === null) {
    const params = new URLSearchParams(window.location.search);
    enabled = params.get('avatar') === '3d' || params.has('look') || readAvatarChoice() !== null;
  }
  return enabled;
}

// The sheet set the player wears now. Texture keys are `<prefix>_<walk|idle>_<compass>`: 'avatar3d' for the
// shipped sheets, `avatarb_<look>` for a builder look, so several looks can stay loaded side by side.
type SheetSet = { prefix: string; origin: [number, number]; displayScale: number };
let current: SheetSet = { prefix: 'avatar3d', origin: [0.5, 1], displayScale: AVATAR3D_DISPLAY_SCALE };
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
    current = look ? await loadLook(scene, look, outline) : await loadShipped(scene, outline);
  } catch (err) {
    if (!look) throw err;
    current = await loadShipped(scene, outline);
  }
}

function loadShipped(scene: Phaser.Scene, outline: boolean): Promise<SheetSet> {
  return loadSheets(scene, 'avatar3d', AVATAR3D_BASE, outline, false);
}

function loadLook(scene: Phaser.Scene, look: string, outline: boolean): Promise<SheetSet> {
  return loadSheets(scene, `avatarb_${look}`, `${AVATAR_BUILDER_BASE}/${look}`, outline, true);
}

// Builder sheets carry their own walk fps (stride matched to that figure's legs); the shipped sheets use
// AVATAR3D_WALK_FPS.
function loadSheets(scene: Phaser.Scene, prefix: string, dir: string, outline: boolean, ownFps: boolean): Promise<SheetSet> {
  let loading = loadingByGame.get(scene.game);
  if (!loading) loadingByGame.set(scene.game, (loading = new Map()));
  let pending = loading.get(prefix);
  if (!pending) {
    pending = fetchSheets(scene, prefix, dir, outline, ownFps);
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
  ownFps: boolean,
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
              frameRate: name.startsWith('walk') && !ownFps ? AVATAR3D_WALK_FPS : a.fps,
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
        enabled = true;
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
