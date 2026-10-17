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
