// Avatar builder: the slots, their options and the saved choice. The builder draws each option as a 2D layer
// (components/shell/sections/AvatarLayerView.tsx) and the city wears the matching pre-baked 2D sheets
// (lib/city/avatar3dSprites.ts). Art source: art/avatar-builder/builder-2d/.

// Builder tabs: one option per slot. The football club shirt's id is clubShirt.
export const AVATAR_SLOTS = [
  {
    id: 'top',
    label: 'Top',
    options: [
      { id: 'tee', label: 'Tee' },
      { id: 'hoodie', label: 'Hoodie' },
      { id: 'sweater', label: 'Sweater' },
      { id: 'clubShirt', label: 'Football shirt' },
      { id: 'skiShell', label: 'Ski jacket' },
    ],
  },
  {
    id: 'head',
    label: 'Head',
    options: [
      { id: 'none', label: 'No hat' },
      { id: 'beanie', label: 'Beanie' },
      { id: 'helmet', label: 'Ski helmet' },
    ],
  },
  {
    id: 'legs',
    label: 'Legs',
    options: [
      { id: 'denim', label: 'Denim' },
      { id: 'cargo', label: 'Cargo' },
      { id: 'skiPants', label: 'Ski pants' },
    ],
  },
] as const satisfies readonly { id: string; label: string; options: readonly { id: string; label: string }[] }[];

// Option tile pictures, drawn from the same 2D layers (art/avatar-builder/builder-2d).
export function avatarThumbUrl(optionId: string): string {
  return `/game/pogicity/Characters/avatar-builder-2d/thumbs/${optionId}.png`;
}

// A builder choice is one option id per slot; its look key names the pre-baked city sheet folder
// (public/game/pogicity/Characters/avatar-builder/2d-<key>/), for example 'hoodie-beanie-cargo'.
export type AvatarChoice = { top: string; head: string; legs: string };
export const AVATAR_DEFAULT_CHOICE: AvatarChoice = { top: 'tee', head: 'none', legs: 'denim' };
export const AVATAR_STORAGE_KEY = 'avatar-builder:v1';
// Fired on window (detail: AvatarChoice) whenever the builder saves, so a running city can change outfit.
export const AVATAR_CHANGE_EVENT = 'avatar-builder:change';
// Fired on window by the builder's "Walk the city" button: the shell closes the panel, the city walks.
export const AVATAR_WALK_EVENT = 'avatar-builder:walk';

export function avatarLookKey(choice: AvatarChoice): string {
  return `${choice.top}-${choice.head}-${choice.legs}`;
}

// The looks with city sheets (art/avatar-builder/builder-2d/doll.py): every combination of the slot options.
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

// The name tag the visitor typed in the builder ('' when none), shown over the city avatar.
export function readAvatarName(): string {
  try {
    const raw = JSON.parse(window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? 'null');
    return typeof raw?.name === 'string' ? raw.name.trim().slice(0, 16) : '';
  } catch {
    return '';
  }
}
