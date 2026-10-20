// Peek cards for walk-in buildings: one per beat, shown while the avatar stands on the beat's stand tile (the tile of a
// standSpot in lib/city/buildingInteriors.ts) and closed when it walks on. Data only; the card is components/city/PeekCard.tsx.
// Texts are Gustav's beat sheet (2026-10-16). Colleagues stay anonymous: role tags only, no names.
import { BUILDING_INTERIORS } from "./buildingInteriors";

export interface InteriorBeat {
  /** Small label over the text: where the avatar stands */
  kicker: string;
  /** The beat's headline */
  lead: string;
  /** Optional sentences under the headline */
  text?: string;
  /** Optional rows under the lead, e.g. one per field: a label and its lesson */
  items?: { label: string; text: string }[];
  /** Show the building's case study link on the card (the leave beat) */
  caseStudy?: boolean;
  /** A sit-and-look moment: on the stand tile the avatar walks to `at` (plan tiles) and sits, the building shows its
   *  seated sprite (buildings.ts seatSprites[beat]), and the screens open large over the city (ScreensOverlay) */
  seat?: { at: [number, number]; screens: { src: string; alt: string; caption: string }[] };
}

// Stand-tile beats (desk, room, lunch) open on their standSpot tile. "enter" and "leave" are door beats: they open when
// the avatar crosses the main door in or out (MainScene "interiorDoorCrossed"), not on a tile.
export const INTERIOR_BEATS: Record<string, Record<string, InteriorBeat>> = {
  // LEGO HQ: texts from the interior story board (Figma 651:3604, Gustav's picks 2026-10-17). One room has its beat so
  // far (the shelf room); the other rooms get theirs as they are built.
  "lego-hq": {
    enter: {
      kicker: "LEGO, Billund",
      lead: "At LEGO I designed between the company's long game and the seller's quick win.",
      text: "Product team for an internal sales tool. Student worker, then intern. Follow the rooms: the shelf comes first.",
    },
    shelf: {
      kicker: "1 · The shelf room",
      lead: "One shelf. Two goals.",
      text: "The company plays the long game: bring young builders in. The seller wants the quick win: sets that sell fast. The shelf has room for only some of them. The tool had to plan for both.",
    },
    test: {
      kicker: "2 · The test room",
      lead: "Hands on, not shown.",
      text: "In hands-on tests, sellers could not follow the model. Their own numbers were in another system. Before launch we added simple animations that show what the model does. Data links came later.",
    },
    team: {
      kicker: "3 · The team room",
      lead: "Bring the users to the data scientists.",
      text: "Every other week I showed short clips from the tests to the team. The data scientists and developers saw who the users were.",
    },
    map: {
      kicker: "4 · The systems map room",
      lead: "Many ways, one map.",
      text: "Sellers planned in many different ways, and our tool had to work with another big system. I mapped both: the flows people used, and how a plan moved between the two systems. When it is all on one wall, the patterns show.",
    },
    ailab: {
      kicker: "5 · The AI lab",
      lead: "Something I started myself.",
      text: "I made a learning template for AI-assisted coding and held open-door sessions for the designers. Many signed up. It was my own idea, and it taught me to learn new tools fast.",
    },
    leave: {
      kicker: "Leaving LEGO",
      lead: "At LEGO I designed between the company's long game and the seller's quick win.",
      caseStudy: true,
    },
  },
  "valtech-office": {
    enter: {
      kicker: "Valtech",
      lead: "At Valtech I learned to scope: find the system, find the fast path, take the small step.",
    },
    leave: {
      kicker: "Leaving Valtech",
      lead: "I scope before I design.",
      caseStudy: true,
    },
    lunch: {
      kicker: "Lunch",
      lead: "Two fields at a time.",
      text: "Adaptability is key, and it was fun.",
    },
    room: {
      kicker: "Meeting room 01",
      lead: "The crit.",
      text: "My first design crits with the other designers. I showed work that was not finished, and it got better.",
    },
    desk: {
      kicker: "My desk",
      lead: "Three fields, three lessons.",
      items: [
        { label: "CMS design guide", text: "Find the system behind the parts." },
        { label: "File-sharing platform", text: "Real content tells the truth." },
        { label: "B2B webshop", text: "Small scoped steps get the work out." },
      ],
      // the chair (art/img2threejs/valtech-office build_spec.py kit_chair "int-desk-chair"); the full-size case images
      seat: {
        at: [4.72, 0.74],
        screens: [
          { src: "/images/valtech/vestas%201.png", alt: "B2B webshop: search results with filters and product rows", caption: "B2B webshop: search results" },
          { src: "/images/valtech/vestas%20drawer.png", alt: "B2B webshop: the request product drawer", caption: "B2B webshop: request a product" },
        ],
      },
    },
  },
};

/** Buildings whose story is told only by their beat cards: the tour dialog (RPGDialogBox) does not open for them
 *  (Gustav, 2026-10-16: delete the old Valtech dialog). Their case study opens from the logo and the leave card. */
export const BEAT_CARD_BUILDINGS = new Set(Object.keys(INTERIOR_BEATS));

/** The beat whose stand tile is the footprint tile (lx, ly) of a walk-in building, or null */
export function beatAtTile(buildingId: string, lx: number, ly: number): string | null {
  const spots = BUILDING_INTERIORS[buildingId]?.standSpots ?? {};
  const beats = INTERIOR_BEATS[buildingId] ?? {};
  for (const [key, [x, y]] of Object.entries(spots)) {
    if (beats[key] && Math.floor(x) === lx && Math.floor(y) === ly) return key;
  }
  return null;
}
