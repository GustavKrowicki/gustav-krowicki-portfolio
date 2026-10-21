import { useSyncExternalStore } from 'react';

// Finds (POR-21): small things a visitor discovers in the city. Each one teaches one true thing about Gustav.
// Texts are Gustav's own lines (Figma "Finds – the loop v1", 2026-10-21); titles and "how" lines are drafts for his edit.
// A find counts when the visitor reaches the spot or sees the thing happen, never on a logo click.
// Progress stays in this browser only.

export type FindGroup = 'work' | 'life' | 'secret';

export interface Find {
  id: string;
  group: FindGroup;
  title: string;
  /** One plain line about Gustav */
  about: string;
  /** What the visitor did, in the past tense */
  how: string;
  /** Where it hides, shown on the grey slot before it is found (secrets show nothing) */
  where?: string;
  /** Found on a walk-in building's beat card: the card shows the "Found" tag, so no toast */
  onCard?: boolean;
}

export const FIND_GROUPS: { id: FindGroup; label: string }[] = [
  { id: 'work', label: 'At work' },
  { id: 'life', label: 'Free time' },
  { id: 'secret', label: 'Secrets' },
];

// Ids: "<building>:<beat>" for beat cards, "zone:<building>" for places the avatar walks up to, plain names otherwise
export const FINDS: Find[] = [
  { id: 'lego-hq:shelf', group: 'work', title: 'The shelf room', about: 'Worked on finding the best product mix for shelves out in the world.', how: 'You walked into the room', where: 'LEGO HQ', onCard: true },
  { id: 'lego-hq:test', group: 'work', title: 'The test room', about: 'Facilitated user tests.', how: 'You walked into the room', where: 'LEGO HQ', onCard: true },
  { id: 'lego-hq:team', group: 'work', title: 'The team room', about: 'Engaged the team with continuous discovery.', how: 'You walked into the room', where: 'LEGO HQ', onCard: true },
  { id: 'lego-hq:map', group: 'work', title: 'The systems map room', about: 'Mapped flows and systems to understand the present and the future.', how: 'You walked into the room', where: 'LEGO HQ', onCard: true },
  { id: 'lego-hq:ailab', group: 'work', title: 'The AI lab', about: 'Started an AI initiative myself.', how: 'You walked into the lab', where: 'LEGO HQ', onCard: true },
  { id: 'valtech-office:desk', group: 'work', title: 'Locked in', about: 'My desk at the office, where I worked on three client projects.', how: 'You found my desk', where: 'Valtech', onCard: true },
  { id: 'valtech-office:room', group: 'work', title: 'Meeting room 01', about: 'Workshops.', how: 'You walked into the room', where: 'Valtech', onCard: true },
  { id: 'valtech-office:lunch', group: 'work', title: 'Lunch', about: 'Had a great time with great people.', how: 'You joined us for lunch', where: 'Valtech', onCard: true },
  { id: 'cate-it:booked', group: 'work', title: 'Side project', about: 'Cate it: the food trucks I launched.', how: 'You booked a truck', where: 'the food trucks', onCard: true },
  { id: 'cate-it:table-pizza', group: 'work', title: 'How we found the trucks', about: 'Walked out in the wild.', how: 'You sat down to eat', where: 'the food trucks', onCard: true },
  { id: 'zone:aarhus-stadium', group: 'life', title: 'Season card', about: 'Season card holder. The second best time of my life.', how: 'You walked to the stadium', where: 'the stadium' },
  { id: 'zone:ski-chute-2', group: 'life', title: 'Fresh powder', about: 'Skiing: the best time of my life.', how: 'You found the slope', where: 'the ski slope' },
  { id: 'zone:northside-stage', group: 'life', title: 'Music', about: 'Good music with nice people.', how: 'You found the stage', where: 'the stage' },
  { id: 'zone:dokk1-library', group: 'life', title: 'Books', about: 'I like to read and deepen my knowledge.', how: 'You found the library', where: 'the library' },
  { id: 'avatar', group: 'life', title: 'Try-on haul', about: 'Every visitor can dress up and walk my city.', how: 'You changed your outfit', where: 'the Avatar tab' },
  { id: 'night-owl', group: 'secret', title: 'Night owl', about: 'Aarhus after midnight. The lamps dim at 01. I am interested in city living.', how: 'You were here' },
  { id: 'bounce-rate', group: 'secret', title: 'Bounce rate', about: 'Five minutes in my city, counted across every visit.', how: 'Your fifth minute was up' },
];

const BY_ID = new Map(FINDS.map((find) => [find.id, find]));
export const getFind = (id: string) => BY_ID.get(id);

// Tile pictures, cropped from the city (public/images/finds). The hidden version is 12x8 px, shown as a dark mosaic.
const imageName = (find: Find) => find.id.replace(':', '--');
export const findImage = (find: Find) => `/images/finds/${imageName(find)}.webp`;
export const findHiddenImage = (find: Find) => `/images/finds/${imageName(find)}-hidden.png`;

// "Walk there" from the panel: the avatar walks to a find's place. A found room walks to its spot; a hidden one only to
// its building, so the room is still the visitor's to find. Secrets and the Avatar tab have no place.
export const FIND_WALK_EVENT = 'finds:walk';
export interface FindWalkTarget {
  buildingId: string;
  beat?: string;
}
export function findWalkTarget(find: Find, found: boolean): FindWalkTarget | null {
  const [head, tail] = find.id.split(':');
  if (!tail) return null;
  if (head === 'zone') return { buildingId: tail };
  return found ? { buildingId: head, beat: tail } : { buildingId: head };
}

const STORAGE_KEY = 'portfolio_finds';
const SECONDS_KEY = 'portfolio_city_seconds';
export const BOUNCE_RATE_SECONDS = 5 * 60;

// When this visit started (kept per tab in sessionStorage, so a reload is the same visit): a find saved before it was
// made "during an earlier visit"
export const VISIT_STARTED_AT = typeof window === 'undefined' ? 0 : visitStart();
function visitStart(): number {
  try {
    const saved = Number(window.sessionStorage.getItem('portfolio_visit_started'));
    if (saved > 0) return saved;
    const now = Date.now();
    window.sessionStorage.setItem('portfolio_visit_started', String(now));
    return now;
  } catch {
    return Date.now();
  }
}

/** Found find ids, with the time each was found (ms) */
export type FoundMap = Record<string, number>;
const EMPTY: FoundMap = {};

const listeners = new Set<() => void>();
const foundListeners = new Set<(find: Find, count: number) => void>();
let cached: FoundMap | null = null;

function read(): FoundMap {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    cached = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? Object.fromEntries(Object.entries(parsed).filter((e): e is [string, number] => BY_ID.has(e[0]) && typeof e[1] === 'number'))
      : {};
  } catch {
    // Private windows and blocked storage: start with nothing found.
    cached = {};
  }
  return cached;
}

/** Mark a find as found. Unknown ids and finds already found are ignored. Returns true the first time. */
export function markFound(id: string): boolean {
  const find = BY_ID.get(id);
  if (!find) return false;
  const found = read();
  if (found[id] !== undefined) return false;
  cached = { ...found, [id]: Date.now() };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the progress for this visit even if it cannot be saved.
  }
  const count = Object.keys(cached).length;
  listeners.forEach((listener) => listener());
  foundListeners.forEach((listener) => listener(find, count));
  return true;
}

export const isFound = (id: string) => read()[id] !== undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Called once for each new find, e.g. for the toast in the city and analytics */
export function onFound(listener: (find: Find, count: number) => void) {
  foundListeners.add(listener);
  return () => foundListeners.delete(listener);
}

export function useFound(): FoundMap {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

/** Seconds spent in the city, across every visit (for "Bounce rate") */
let visitSeconds = 0;
export function addCitySeconds(seconds: number): number {
  visitSeconds += seconds;
  try {
    const total = (Number(window.localStorage.getItem(SECONDS_KEY)) || 0) + seconds;
    window.localStorage.setItem(SECONDS_KEY, String(total));
    return total;
  } catch {
    // Without storage, only this visit counts.
    return visitSeconds;
  }
}
