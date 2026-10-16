// Peek cards for walk-in buildings: one per beat, shown while the avatar stands on the beat's stand tile (the tile of a
// standSpot in lib/city/buildingInteriors.ts) and closed when it walks on. Data only; the card is components/city/PeekCard.tsx.
// Texts are Gustav's beat sheet (2026-10-16). Colleagues stay anonymous: role tags only, no names.
import { BUILDING_INTERIORS } from "./buildingInteriors";

export interface InteriorBeat {
  /** Small label over the text: where the avatar stands */
  kicker: string;
  /** The beat's one or two sentences */
  lead: string;
  /** Optional rows under the lead, e.g. one per field: a label and its lesson */
  items?: { label: string; text: string }[];
  /** Show the building's case study link on the card (the leave beat) */
  caseStudy?: boolean;
}

// Wired this round: the desk only. The other Valtech beats (gate, room, lunch) get their entries here when their zones
// are detailed; the card and the scene event already handle any standSpot key.
export const INTERIOR_BEATS: Record<string, Record<string, InteriorBeat>> = {
  "valtech-office": {
    desk: {
      kicker: "My desk",
      lead: "Three fields, three lessons.",
      items: [
        { label: "CMS design guide", text: "Find the system behind the parts." },
        { label: "File-sharing platform", text: "Real content tells the truth." },
        { label: "B2B webshop", text: "Small scoped steps get the work out." },
      ],
    },
  },
};

/** The beat whose stand tile is the footprint tile (lx, ly) of a walk-in building, or null */
export function beatAtTile(buildingId: string, lx: number, ly: number): string | null {
  const spots = BUILDING_INTERIORS[buildingId]?.standSpots ?? {};
  const beats = INTERIOR_BEATS[buildingId] ?? {};
  for (const [key, [x, y]] of Object.entries(spots)) {
    if (beats[key] && Math.floor(x) === lx && Math.floor(y) === ly) return key;
  }
  return null;
}
