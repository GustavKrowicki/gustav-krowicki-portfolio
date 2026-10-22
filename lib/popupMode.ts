// ?popups=slot turns on the one-slot pop-up pattern (Figma board F): a tap on any building opens its place in the
// panel (desktop) or the sheet (phones), a case opens in the same slot, Back goes one step, and finds are a pill on
// every screen. Without it the site keeps today's cards in the city, so both can be compared on one preview link.
export function readSlotPopups(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return new URLSearchParams(window.location.search).get('popups') === 'slot';
  } catch {
    return false;
  }
}

// The place's Walk in (in the panel): the city walks the avatar through the open building's door
export const PLACE_WALK_IN_EVENT = 'place:walk-in';
