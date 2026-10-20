// The hour matters at night (POR-39, step 3 of the brief): which buildings are lit at which hour. The city's hour is the
// visitor's own clock (or ?hour= on the URL). Each lit building has two groups of windows (A and B, split at random per
// window) and, for food places and the bar, a lit shopfront and a warm spill of light on the street in front.

export type NightKind = "home" | "food" | "bar" | "office";

// Filler buildings by id. Portfolio buildings get their window light from their 3D scenes later (step 4 of the brief)
const KIND_BY_ID: Record<string, NightKind> = {
  popeyes: "food",
  dunkin: "food",
  checkers: "food",
  "martini-bar": "bar",
  "promptlayer-office": "office",
  "ease-health": "office",
  "general-intelligence-office": "office",
  "palo-alto-office-center": "office",
  "magicpath-office": "office",
  bookstore: "home", // flats over the shop; the shop itself is closed at night
};

export function nightKind(buildingId: string, category: string): NightKind | null {
  return KIND_BY_ID[buildingId] ?? (category === "residential" ? "home" : null);
}

export interface NightLevels {
  a: number;     // window group A, 0..1
  b: number;     // window group B, 0..1
  front: number; // lit shopfront and the spill on the street (food places and the bar)
}

const OFF: NightLevels = { a: 0, b: 0, front: 0 };

// What is lit at this hour. seed (0..1, fixed per building) makes some homes stay up late and some offices work late
export function nightLevels(kind: NightKind, hour: number, seed: number): NightLevels {
  const h = ((hour % 24) + 24) % 24;
  switch (kind) {
    case "home":
      if (h >= 17 && h < 23) return { a: 1, b: seed < 0.7 ? 1 : 0, front: 0 };   // evening: most homes lit
      if (h >= 23 || h < 1) return { a: seed < 0.6 ? 1 : 0, b: 0, front: 0 };    // going to bed
      if (h >= 1 && h < 5) return { a: seed < 0.15 ? 1 : 0, b: 0, front: 0 };    // only a few still up
      return { a: seed < 0.4 ? 1 : 0, b: 0, front: 0 };                           // early risers
    case "food":
      if (h >= 7 && h < 22) return { a: 1, b: 1, front: 1 };                       // open, full in the evening
      if (h >= 22 && h < 23) return { a: 1, b: 0, front: 0.35 };                   // closing up
      return OFF;
    case "bar":
      if (h >= 16 || h < 2) return { a: 1, b: 1, front: 1 };                       // open to 02:00
      if (h >= 2 && h < 3) return { a: 1, b: 0, front: 0 };                        // last ones out
      return OFF;
    case "office":
      if (h >= 7 && h < 18) return { a: 1, b: 1, front: 0 };
      if (h >= 18 && h < 21) return { a: seed < 0.6 ? 1 : 0, b: 0, front: 0 };     // a few working late
      return OFF;
  }
}

// Late at night the city dims its street lamps (Copenhagen dims most of its lamps remotely); landmarks stay as they are
export function lampDimming(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  return h >= 1 && h < 5 ? 0.6 : 1;
}

// Walkers out at this hour, as a share of the daytime crowd
export function walkerShare(hour: number): number {
  const h = ((hour % 24) + 24) % 24;
  if (h >= 7 && h < 19) return 1;
  if (h >= 19 && h < 23) return 0.55;
  if (h >= 23 || h < 2) return 0.3;
  return 0.12;
}

// A stable 0..1 number from a string (a building's grid key), so the same houses stay up late every night
export function seedFrom(key: string): number {
  let x = 2166136261;
  for (let i = 0; i < key.length; i++) x = Math.imul(x ^ key.charCodeAt(i), 16777619);
  return ((x >>> 0) % 10000) / 10000;
}

// The visitor's pick in the time of day menu (the shell's side rail). Auto follows their own clock
export type TimeOfDay = "auto" | "morning" | "day" | "evening" | "night";

export const TIMES_OF_DAY: { id: TimeOfDay; label: string }[] = [
  { id: "auto", label: "Auto" },
  { id: "morning", label: "Morning" },
  { id: "day", label: "Day" },
  { id: "evening", label: "Evening" },
  { id: "night", label: "Night" },
];

// The hour each pick stands for (null: the visitor's clock)
export const HOUR_OF: Record<TimeOfDay, number | null> = { auto: null, morning: 8, day: 13, evening: 20, night: 1 };

export const isNightHour = (hour: number) => hour >= 19 || hour < 7;
