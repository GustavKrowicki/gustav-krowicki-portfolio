// The one-slot pop-up pattern (Figma board F) is the default: a tap on any building opens its place in the panel
// (desktop) or the sheet (phones), a case opens in the same slot, Back goes one step, and finds are a pill on every
// screen. ?popups=cards brings back the old cards in the city, to compare the two.
export function readSlotPopups(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    return new URLSearchParams(window.location.search).get('popups') !== 'cards';
  } catch {
    return true;
  }
}

// The place's Walk in (in the panel): the city walks the avatar through the open building's door
export const PLACE_WALK_IN_EVENT = 'place:walk-in';
