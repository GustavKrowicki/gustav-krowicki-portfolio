import { useSyncExternalStore } from 'react';

// The 8 places a visitor can find in the city (building ids in lib/city/buildings.ts).
// Placeholder for shell step 5: found places are stored in this browser only.
export const ACHIEVEMENT_PLACES = [
  'lego-hq',
  'valtech-office',
  'cate-it',
  'aeroguest',
  'sdu-kolding',
  'melbourne-uni',
  'berlin-uni',
  'erhvervsakademiet',
] as const;

const STORAGE_KEY = 'portfolio_places_found';
const EMPTY: string[] = [];

const listeners = new Set<() => void>();
let cached: string[] | null = null;

function read(): string[] {
  if (cached) return cached;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
    cached = Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    // Private windows and blocked storage: start with nothing found.
    cached = [];
  }
  return cached;
}

// Called by the city when a visitor clicks or reaches a building. Other buildings are ignored.
export function markPlaceFound(buildingId: string) {
  if (!(ACHIEVEMENT_PLACES as readonly string[]).includes(buildingId)) return;
  const found = read();
  if (found.includes(buildingId)) return;
  cached = [...found, buildingId];
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    // Keep the progress for this visit even if it cannot be saved.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFoundPlaces(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
