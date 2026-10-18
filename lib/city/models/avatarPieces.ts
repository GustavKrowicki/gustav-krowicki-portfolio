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
  'cargo-dark': '#5c513b',
  'ski-shell': '#e5452b',
  'ski-black': '#1b1a1d',
  'ski-pants': '#80838b',
  'ski-pants-dark': '#5f626a',
  helmet: '#1f1f23',
  'goggle-lens': '#f25aa6',
};

// Swappable pieces in the GLB (node names): one piece per slot, and the base pieces each one covers.
export const AVATAR_PIECES = {
  hoodie: { slot: 'top', covers: ['tee'] },
  sweater: { slot: 'top', covers: ['tee'] },
  clubShirt: { slot: 'top', covers: ['tee'] }, // the football club shirt
  beanie: { slot: 'head', covers: [] },
  cargo: { slot: 'legs', covers: ['jeans'] },
  skiShell: { slot: 'top', covers: ['tee'] },
  skiPants: { slot: 'legs', covers: ['jeans'] },
  helmet: { slot: 'head', covers: [] },
} as const satisfies Record<string, { slot: string; covers: readonly string[] }>;
export type AvatarPiece = keyof typeof AVATAR_PIECES;

// Builder tabs: each slot lists its options; `piece: null` is the base outfit piece for that slot. `nodes` are
// the GLB pieces drawn in the option's tile thumbnail (avatarThumbUrl).
export const AVATAR_SLOTS = [
  {
    id: 'top',
    label: 'Top',
    options: [
      { id: 'tee', label: 'Tee', piece: null, swatch: AVATAR_BASE_COLORS.tee, nodes: ['tee'] },
      { id: 'hoodie', label: 'Hoodie', piece: 'hoodie', swatch: AVATAR_BASE_COLORS.hoodie, nodes: ['hoodie'] },
      { id: 'sweater', label: 'Sweater', piece: 'sweater', swatch: AVATAR_BASE_COLORS.sweater, nodes: ['sweater'] },
      { id: 'clubShirt', label: 'Football shirt', piece: 'clubShirt', swatch: AVATAR_BASE_COLORS['club-blue'], nodes: ['clubShirt'] },
      { id: 'skiShell', label: 'Ski jacket', piece: 'skiShell', swatch: AVATAR_BASE_COLORS['ski-shell'], nodes: ['skiShell'] },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    options: [
      { id: 'none', label: 'No hat', piece: null, swatch: AVATAR_BASE_COLORS.hair, nodes: ['hair'] },
      { id: 'beanie', label: 'Beanie', piece: 'beanie', swatch: AVATAR_BASE_COLORS.beanie, nodes: ['beanie'] },
      { id: 'helmet', label: 'Ski helmet', piece: 'helmet', swatch: AVATAR_BASE_COLORS.helmet, nodes: ['helmet'] },
    ],
  },
  {
    id: 'legs',
    label: 'Legs',
    options: [
      { id: 'denim', label: 'Denim', piece: null, swatch: AVATAR_BASE_COLORS.denim, nodes: ['jeans'] },
      { id: 'cargo', label: 'Cargo', piece: 'cargo', swatch: AVATAR_BASE_COLORS.cargo, nodes: ['cargo'] },
      { id: 'skiPants', label: 'Ski pants', piece: 'skiPants', swatch: AVATAR_BASE_COLORS['ski-pants'], nodes: ['skiPants'] },
    ],
  },
] as const satisfies readonly {
  id: string;
  label: string;
  options: readonly { id: string; label: string; piece: AvatarPiece | null; swatch: string; nodes: readonly string[] }[];
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

// Option tile thumbnails, baked with the city sheets (art/avatar-builder/base/bake_sheets.mjs).
export function avatarThumbUrl(optionId: string): string {
  return `/game/pogicity/Characters/avatar-builder/thumbs/${optionId}.png`;
}
