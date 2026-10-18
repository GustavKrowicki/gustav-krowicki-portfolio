// Avatar builder pieces and colours. No three.js here, so the builder UI can import it without pulling
// the 3D view into the page bundle (lib/city/models/avatarToon.ts renders them).

// Base outfit flat colours, keyed by the GLB material names (sRGB hex).
export const AVATAR_BASE_COLORS: Record<string, string> = {
  skin: '#f0c3a0',
  hair: '#c4602a',
  moustache: '#d48a5c',
  eye: '#2a1d18',
  tee: '#f5f2ea',
  denim: '#223680',
  cuff: '#5274bd',
  shoe: '#1e1a1a',
  welt: '#e6c13a',
  sole: '#141212',
  hoodie: '#6e6e73',
  'hoodie-pocket': '#5f5f64',
  string: '#e9e7e1',
  beanie: '#dca528',
  'beanie-cuff': '#c8941f',
  sweater: '#3c5a46',
  'sweater-rib': '#253a2c',
  'club-white': '#fafafa',
  'club-blue': '#0046a0',
  cargo: '#968769',
  'cargo-dark': '#6c5f47',
};

// Swappable pieces in the GLB (node names): one piece per slot, and the base pieces each one covers.
export const AVATAR_PIECES = {
  hoodie: { slot: 'top', covers: ['tee'] },
  sweater: { slot: 'top', covers: ['tee'] },
  clubShirt: { slot: 'top', covers: ['tee'] }, // the football club shirt
  beanie: { slot: 'head', covers: [] },
  cargo: { slot: 'legs', covers: ['jeans'] },
} as const satisfies Record<string, { slot: string; covers: readonly string[] }>;
export type AvatarPiece = keyof typeof AVATAR_PIECES;

// Builder tabs: each slot lists its options; `piece: null` is the base outfit piece for that slot.
export const AVATAR_SLOTS = [
  {
    id: 'top',
    label: 'Top',
    options: [
      { id: 'tee', label: 'Tee', piece: null, swatch: AVATAR_BASE_COLORS.tee },
      { id: 'hoodie', label: 'Hoodie', piece: 'hoodie', swatch: AVATAR_BASE_COLORS.hoodie },
      { id: 'sweater', label: 'Sweater', piece: 'sweater', swatch: AVATAR_BASE_COLORS.sweater },
      { id: 'clubShirt', label: 'Football shirt', piece: 'clubShirt', swatch: AVATAR_BASE_COLORS['club-blue'] },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    options: [
      { id: 'none', label: 'None', piece: null, swatch: AVATAR_BASE_COLORS.hair },
      { id: 'beanie', label: 'Beanie', piece: 'beanie', swatch: AVATAR_BASE_COLORS.beanie },
    ],
  },
  {
    id: 'legs',
    label: 'Legs',
    options: [
      { id: 'denim', label: 'Denim', piece: null, swatch: AVATAR_BASE_COLORS.denim },
      { id: 'cargo', label: 'Cargo', piece: 'cargo', swatch: AVATAR_BASE_COLORS.cargo },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  options: readonly { id: string; label: string; piece: AvatarPiece | null; swatch: string }[];
}[];

// A builder choice is one option id per slot; its look key names the pre-baked city sheet folder
// (public/game/pogicity/Characters/avatar-builder/<key>/), for example 'hoodie-beanie-cargo'.
export type AvatarChoice = { top: string; head: string; legs: string };
export const AVATAR_DEFAULT_CHOICE: AvatarChoice = { top: 'tee', head: 'none', legs: 'denim' };
export const AVATAR_STORAGE_KEY = 'avatar-builder:v1';
// Fired on window (detail: AvatarChoice) whenever the builder saves, so a running city can change outfit.
export const AVATAR_CHANGE_EVENT = 'avatar-builder:change';

export function avatarLookKey(choice: AvatarChoice): string {
  return `${choice.top}-${choice.head}-${choice.legs}`;
}

export function avatarLookPieces(choice: AvatarChoice): AvatarPiece[] {
  return AVATAR_SLOTS.flatMap((slot) => {
    const piece = (slot.options as readonly { id: string; piece: AvatarPiece | null }[]).find(
      (o) => o.id === choice[slot.id],
    )?.piece;
    return piece ? [piece] : [];
  });
}

// The looks with city sheets (art/avatar-builder/base/bake_sheets.mjs): every combination of the slot options.
// A choice outside this list (a future piece not baked yet) falls back to the shipped avatar sheets.
export const AVATAR_BAKED_LOOKS: AvatarChoice[] = AVATAR_SLOTS[0].options.flatMap((top) =>
  AVATAR_SLOTS[1].options.flatMap((head) =>
    AVATAR_SLOTS[2].options.map((legs) => ({ top: top.id, head: head.id, legs: legs.id })),
  ),
);

// The saved builder choice in this browser, or null when the visitor never opened the builder.
export function readAvatarChoice(): AvatarChoice | null {
  try {
    const raw = JSON.parse(window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? 'null');
    if (!raw?.choice) return null;
    const choice = { ...AVATAR_DEFAULT_CHOICE };
    for (const slot of AVATAR_SLOTS) {
      const id = raw.choice[slot.id];
      if (slot.options.some((o) => o.id === id)) choice[slot.id] = id;
    }
    return choice;
  } catch {
    return null;
  }
}
