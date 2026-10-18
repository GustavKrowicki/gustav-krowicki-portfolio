// Building Registry - Single source of truth for all buildings
// Includes both Pogicity buildings and custom portfolio buildings

export type BuildingCategory =
  | "residential"
  | "commercial"
  | "civic"
  | "landmark"
  | "props"
  | "christmas"
  | "portfolio"; // Custom category for portfolio buildings

export interface BuildingDefinition {
  id: string;
  name: string;
  category: BuildingCategory;
  footprint: { width: number; height: number };
  // For buildings where rotation changes the footprint (e.g., 3x4 becomes 4x3)
  footprintByOrientation?: {
    south?: { width: number; height: number };
    north?: { width: number; height: number };
    east?: { width: number; height: number };
    west?: { width: number; height: number };
  };
  // For sprites that are visually larger than their footprint (e.g., trees)
  renderSize?: { width: number; height: number };
  // Extra tiles beyond footprint that block player movement in adventure mode.
  // Directions are in grid coords: top = lower y, left = lower x.
  collisionPadding?: { top?: number; right?: number; bottom?: number; left?: number };
  // Override trigger zone radius for this building (default: TRIGGER_ZONE_RADIUS = 3.5)
  triggerZoneRadius?: number;
  sprites: {
    south: string;
    west?: string;
    north?: string;
    east?: string;
  };
  // Library props drawn on the building's own footprint (props cannot occupy footprint tiles in the grid): the prop's
  // own sprite, scaled, with its ground point at local tile coordinates (x right, y down from the origin tile)
  decor?: { prop: string; x: number; y: number; scale: number }[];
  // Animated main door: a strip of frames (closed .. open) cropped from the south sprite at full resolution (x, y = the
  // crop's top-left in sprite pixels), drawn over the building and played when the player is near the door point
  door?: { sheet: string; frames: number; frameWidth: number; frameHeight: number; x: number; y: number; at: [number, number]; radius: number };
  // Ambient loop (docs/city-rules.md section 9): a strip of frames cropped from the south sprite like `door` (x, y = the
  // crop's top-left in sprite pixels), drawn over the building and played in a loop at `fps`
  ambient?: { sheet: string; frames: number; frameWidth: number; frameHeight: number; x: number; y: number; fps: number };
  // Interior moment (walk-in buildings): a strip of frames cropped from the roof-off south sprite like `door`, drawn over
  // it while the roof is off; plays forward once at `fps` and holds when the player is within `radius` of `at` (local
  // tiles), and goes back to frame 0 when the player leaves
  moment?: { sheet: string; frames: number; frameWidth: number; frameHeight: number; x: number; y: number; at: [number, number]; radius: number; fps: number };
  // Display scale for sprites rendered at a higher texel density (docs/city-rules.md section 4: 2x sprites use 0.5)
  spriteScale?: number;
  // Draw the sprite as vertical slices, one per tile diagonal, each sorted by its own front tile (docs/city-rules.md
  // section 8), so a building or character in front of one part is not painted over by the whole sprite. Opt-in.
  slices?: boolean;
  // Roof-off state, shown while the player is inside the building's trigger zone (same size and anchor as sprites);
  // walk-in buildings (lib/city/buildingInteriors.ts) show it while the player is inside, past the main door
  openSprites?: {
    south: string;
    west?: string;
    north?: string;
    east?: string;
  };
  // Display scale of the openSprites when they have their own texel density (default: spriteScale); they share the
  // anchor (bottom centre = the footprint's front corner), so they may be trimmed around it
  openSpriteScale?: number;
  // Roof-off south sprite with the avatar seated at a beat's chair (lib/city/interiorBeats.ts seat), same frame and
  // scale as openSprites.south; shown while the avatar sits there (the player sprite is hidden meanwhile)
  seatSprites?: Record<string, string>;
  icon: string; // Emoji for UI
  supportsRotation?: boolean;
  isDecoration?: boolean; // If true, preserves underlying tile (like props)
  // Custom portfolio metadata
  projectSlug?: string;
  description?: string;
  interactable?: boolean;
  // Logo URL for 3D spinning logo overlay
  logoUrl?: string;
  // Per-building offset for logo positioning (relative to building center)
  logoOffset?: { x: number; y: number };
}

// Helper to get the correct footprint for a building based on orientation
export function getBuildingFootprint(
  building: BuildingDefinition,
  orientation?: string
): { width: number; height: number } {
  if (!building.footprintByOrientation || !orientation) {
    return building.footprint;
  }

  const dirMap: Record<string, "south" | "north" | "east" | "west"> = {
    down: "south",
    up: "north",
    right: "east",
    left: "west",
  };

  const dir = dirMap[orientation];
  if (!dir) {
    return building.footprint;
  }
  return building.footprintByOrientation[dir] || building.footprint;
}

// All buildings defined in one place
export const BUILDINGS: Record<string, BuildingDefinition> = {
  // ========================================
  // PORTFOLIO CUSTOM BUILDINGS
  // ========================================
  "lego-hq": {
    id: "lego-hq",
    name: "LEGO HQ",
    category: "portfolio",
    // The campus on the real outline (art/img2threejs/lego-hq-avatar, plan.py; Linear POR-25): 15 x 11 with the plaza
    // row; two storeys with a three-storey glass atrium over the lobby, green roofs with courtyards, the round building at
    // the west, the terrace building, the yellow bar and block. The main door is on the south front facing the plaza,
    // under the yellow 2x4 plate: the real forecourt notch is filled in, because the south-east leg hides a door at its
    // back from the city camera. Inside: five open areas on the route from the board (node 651:3604), still a grey box.
    // Sprites at 2x density (1536 px, converter zoom 1.0128, front corner at the bottom centre), drawn at 0.5. Walk-in:
    // the roof comes off when the player walks through the main door (lib/city/buildingInteriors.ts).
    footprint: { width: 15, height: 11 },
    triggerZoneRadius: 6,
    spriteScale: 0.5,
    // Sliding glass doors (art/img2threejs/lego-hq-avatar: lab model hqAvatarDoor, door=0..1, export_door.sh)
    door: {
      sheet: "/game/pogicity/Building/landmark/lego-hq-avatar-door_south.png",
      frames: 7, frameWidth: 94, frameHeight: 78, x: 482, y: 1302, at: [8.5, 10.0], radius: 1.5,
    },
    // Test room moment: the screen plays what the model does and the tester's "?" turns into "!" (lab model
    // hqAvatarMoment, moment=0..7, export_moment.sh)
    moment: {
      sheet: "/game/pogicity/Building/landmark/lego-hq-avatar-moment_south.png",
      frames: 8, frameWidth: 126, frameHeight: 74, x: 818, y: 1266, at: [11.5, 6.5], radius: 2, fps: 5,
    },
    // Pogicity trees, downsized to the avatar scale, in the two planters and on the front grass (trees behind the building
    // would draw over its roof)
    decor: [
      { prop: "tree-4", x: 2.7, y: 9.4, scale: 0.45 },
      { prop: "tree-4", x: 3.55, y: 9.4, scale: 0.45 },
      { prop: "tree-1", x: 1.2, y: 9.5, scale: 0.55 },
      { prop: "tree-1", x: 13.3, y: 9.6, scale: 0.5 },
      { prop: "tree-1", x: 14.2, y: 2.6, scale: 0.55 },
    ],
    sprites: {
      south: "/game/pogicity/Building/landmark/lego-hq-avatar_south.png",
      north: "/game/pogicity/Building/landmark/lego-hq-avatar_north.png",
      east: "/game/pogicity/Building/landmark/lego-hq-avatar_east.png",
      west: "/game/pogicity/Building/landmark/lego-hq-avatar_west.png",
    },
    openSprites: {
      south: "/game/pogicity/Building/landmark/lego-hq-avatar-open_south.png",
      north: "/game/pogicity/Building/landmark/lego-hq-avatar-open_north.png",
      east: "/game/pogicity/Building/landmark/lego-hq-avatar-open_east.png",
      west: "/game/pogicity/Building/landmark/lego-hq-avatar-open_west.png",
    },
    icon: "🧱",
    projectSlug: "lego",
    description: "ML-Assisted Internal Product",
    interactable: true,
    supportsRotation: false,
    logoUrl: "/game/pogicity/Building/logos/lego-hq.svg",
    logoOffset: { x: 0, y: 34 },
  },
  "valtech-office": {
    id: "valtech-office",
    name: "Valtech Office",
    category: "portfolio",
    // Rebuilt with img2threejs at the avatar's scale (art/img2threejs/valtech-office, Linear POR-35): a 6 x 2 block (Gustav,
    // 2026-10-16: wide enough for the street-level interior; it was 4 x 2), long side south; ground storey with five cafe
    // bays under green awnings and the gate (the entrance, east bay of the south side, approach tile in front of it),
    // 3 louvre storeys, recessed glass top floor. Sprites at 2x density (768 px, converter zoom 0.8656, front corner at the
    // bottom centre), drawn at 0.5. Turned a quarter, the footprint is 2 x 6.
    footprint: { width: 6, height: 2 },
    footprintByOrientation: { east: { width: 2, height: 6 }, west: { width: 2, height: 6 } },
    spriteScale: 0.5,
    sprites: {
      south: "/game/pogicity/Building/landmark/valtech-office-avatar_south.png",
      north: "/game/pogicity/Building/landmark/valtech-office-avatar_north.png",
      east: "/game/pogicity/Building/landmark/valtech-office-avatar_east.png",
      west: "/game/pogicity/Building/landmark/valtech-office-avatar_west.png",
    },
    // Street-level interior (Figma board 597-3604, beat sheet 2026-10-16): the upper storeys and the cafe front come off
    // when the player walks in through the gate (lib/city/buildingInteriors.ts). Detail pass: 4x density (trimmed around
    // the anchor), drawn at 0.25, so the desk zone is 1:1 at Detail zoom.
    openSpriteScale: 0.25,
    seatSprites: { desk: "/game/pogicity/Building/landmark/valtech-office-avatar-open-sit-desk_south.png" },
    openSprites: {
      south: "/game/pogicity/Building/landmark/valtech-office-avatar-open_south.png",
      north: "/game/pogicity/Building/landmark/valtech-office-avatar-open_north.png",
      east: "/game/pogicity/Building/landmark/valtech-office-avatar-open_east.png",
      west: "/game/pogicity/Building/landmark/valtech-office-avatar-open_west.png",
    },
    icon: "💼",
    projectSlug: "valtech",
    description: "Design Internship",
    interactable: true,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/valtech-office.svg",
    logoOffset: { x: 20, y: 80 },
  },
  "melbourne-uni": {
    id: "melbourne-uni",
    name: "Melbourne University",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/melbourne-uni_south.png",
      north: "/game/pogicity/Building/landmark/melbourne-uni_north.png",
      east: "/game/pogicity/Building/landmark/melbourne-uni_east.png",
      west: "/game/pogicity/Building/landmark/melbourne-uni_west.png",
    },
    icon: "🦘",
    description: "Exchange Semester in Australia",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/melbourne-uni.svg",
    logoOffset: { x: 0, y: 80 },
  },
  "berlin-uni": {
    id: "berlin-uni",
    name: "Berlin University",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    collisionPadding: { left: 2, top: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/berlin-uni_south.png",
      north: "/game/pogicity/Building/landmark/berlin-uni_north.png",
      east: "/game/pogicity/Building/landmark/berlin-uni_east.png",
      west: "/game/pogicity/Building/landmark/berlin-uni_west.png",
    },
    icon: "🇩🇪",
    description: "Exchange Semester in Germany",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/berlin-uni.svg",
    logoOffset: { x: 0, y: 60 },
  },
  "sdu-kolding": {
    id: "sdu-kolding",
    name: "SDU Kolding",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/SDU kolding_south.png",
      north: "/game/pogicity/Building/landmark/SDU kolding_north.png",
      east: "/game/pogicity/Building/landmark/SDU kolding_east.png",
      west: "/game/pogicity/Building/landmark/SDU kolding_west.png",
    },
    icon: "🎓",
    description: "SDU Kolding",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/sdu-kolding.svg",
    logoOffset: { x: 0, y: 10 },
  },
  "erhvervsakademiet": {
    id: "erhvervsakademiet",
    name: "Erhvervsakademiet",
    category: "portfolio",
    footprint: { width: 4, height: 3 },
    collisionPadding: { left: 2, top: 2 },
    triggerZoneRadius: 5.5,
    sprites: {
      south: "/game/pogicity/Building/landmark/erhvervsakademiet_south.png",
      north: "/game/pogicity/Building/landmark/erhvervsakademiet_north.png",
      east: "/game/pogicity/Building/landmark/erhvervsakademiet_east.png",
      west: "/game/pogicity/Building/landmark/erhvervsakademiet_west.png",
    },
    icon: "🏫",
    description: "Erhvervsakademiet",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/erhvervsakademiet.svg",
    logoOffset: { x: 20, y: 20 },
  },
  "dokk1-library": {
    id: "dokk1-library",
    name: "Dokk1 Library",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/dokk1-library_south.png",
      north: "/game/pogicity/Building/landmark/dokk1-library_north.png",
      east: "/game/pogicity/Building/landmark/dokk1-library_east.png",
      west: "/game/pogicity/Building/landmark/dokk1-library_west.png",
    },
    icon: "📖",
    description: "Reading & Learning",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/dokk1-library.svg",
    logoOffset: { x: 0, y: 120 },
  },
  "aarhus-stadium": {
    id: "aarhus-stadium",
    name: "Aarhus Stadium",
    category: "portfolio",
    // The new stadium (opens 2027), rebuilt with img2threejs at the avatar's scale
    // (art/img2threejs/aarhus-stadium, Linear POR-36): shape A on Figma board 611:3604, a 6 x 5 plot with the white roof
    // ring at 2.6 wu on 26 curved ribs; 8 x 5 since 2026-10-17 (Gustav: wider than shape A's 6 x 5), AARHUS in the seats.
    // The red hall (stadionhallerne) stands centred on its south side as the entrance and a brick link joins them. Sprites
    // at 2x density (768 px), drawn at 0.5. Turned a quarter, the footprint is 5 x 8. Drawn in slices, so the hall in front
    // of it (and characters) sort against each 1 wu column.
    footprint: { width: 8, height: 5 },
    footprintByOrientation: { east: { width: 5, height: 8 }, west: { width: 5, height: 8 } },
    slices: true,
    spriteScale: 0.5,
    triggerZoneRadius: 4,
    sprites: {
      south: "/game/pogicity/Building/landmark/aarhus-stadium_south.png",
      north: "/game/pogicity/Building/landmark/aarhus-stadium_north.png",
      east: "/game/pogicity/Building/landmark/aarhus-stadium_east.png",
      west: "/game/pogicity/Building/landmark/aarhus-stadium_west.png",
    },
    icon: "⚽",
    description: "Football & Sports",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/aarhus-stadium.svg",
    logoOffset: { x: 0, y: 80 },
  },
  // The red heritage hall (Stadionhallerne) on the stadium's south side, as its entrance
  // (Gustav, 2026-10-17): art/img2threejs/stadium-hall, a 4 x 2 plot, two gabled brick halls either side of the lobby.
  stadionhallerne: {
    id: "stadionhallerne",
    name: "Stadionhallerne",
    category: "portfolio",
    footprint: { width: 4, height: 2 },
    footprintByOrientation: { east: { width: 2, height: 4 }, west: { width: 2, height: 4 } },
    spriteScale: 0.5,
    sprites: {
      south: "/game/pogicity/Building/landmark/stadionhallerne_south.png",
      north: "/game/pogicity/Building/landmark/stadionhallerne_north.png",
      east: "/game/pogicity/Building/landmark/stadionhallerne_east.png",
      west: "/game/pogicity/Building/landmark/stadionhallerne_west.png",
    },
    icon: "🏛️",
    // A Danish flag waving on the lobby roof (lib/city/models/stadionHallStates.ts, export_flag.sh)
    ambient: {
      sheet: "/game/pogicity/Building/landmark/stadionhallerne-flag_south.png",
      frames: 8, frameWidth: 34, frameHeight: 34, x: 208, y: 294, fps: 8,
    },
    description: "The stadium entrance",
    interactable: false,
    supportsRotation: true,
  },
  "aeroguest": {
    id: "aeroguest",
    name: "Aeroguest",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    collisionPadding: { left: 2, top: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/aeroguest_south.png",
      north: "/game/pogicity/Building/landmark/aeroguest_north.png",
      east: "/game/pogicity/Building/landmark/aeroguest_east.png",
      west: "/game/pogicity/Building/landmark/aeroguest_west.png",
    },
    icon: "✈️",
    description: "Aviation Company",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/aeroguest.svg",
    logoOffset: { x: 0, y: 150 },
  },
  "northside-stage": {
    id: "northside-stage",
    name: "Northside Stage",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/northside-stage_south.png",
      north: "/game/pogicity/Building/landmark/northside-stage_north.png",
      east: "/game/pogicity/Building/landmark/northside-stage_east.png",
      west: "/game/pogicity/Building/landmark/northside-stage_west.png",
    },
    icon: "🎸",
    description: "Music & Events",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/northside-stage.svg",
    logoOffset: { x: 0, y: 70 },
  },
  "ski-chute-1": {
    id: "ski-chute-1",
    name: "Ski Chute",
    category: "portfolio",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/ski-chute-1_south.png",
      north: "/game/pogicity/Building/landmark/ski-chute-1_north.png",
      east: "/game/pogicity/Building/landmark/ski-chute-1_east.png",
      west: "/game/pogicity/Building/landmark/ski-chute-1_west.png",
    },
    icon: "🎿",
    description: "Skiing & Adventure",
    interactable: false,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/ski-chute.svg",
    logoOffset: { x: 0, y: 50 },
  },
  "ski-chute-2": {
    id: "ski-chute-2",
    name: "Ski Chute 2",
    category: "portfolio",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/ski-chute-2_south.png",
      north: "/game/pogicity/Building/landmark/ski-chute-2_north.png",
      east: "/game/pogicity/Building/landmark/ski-chute-2_east.png",
      west: "/game/pogicity/Building/landmark/ski-chute-2_west.png",
    },
    icon: "🎿",
    description: "Skiing & Adventure",
    interactable: false,
    supportsRotation: true,
  },
  "ski-moguls": {
    id: "ski-moguls",
    name: "Ski Moguls",
    category: "portfolio",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/ski-moguls_south.png",
      north: "/game/pogicity/Building/landmark/ski-moguls_north.png",
      east: "/game/pogicity/Building/landmark/ski-moguls_east.png",
      west: "/game/pogicity/Building/landmark/ski-moguls_west.png",
    },
    icon: "⛷️",
    description: "Mogul Skiing",
    interactable: false,
    supportsRotation: true,
  },
  "tree-skiing": {
    id: "tree-skiing",
    name: "Tree Skiing",
    category: "portfolio",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/landmark/tree-skiing_south.png",
      north: "/game/pogicity/Building/landmark/tree-skiing_north.png",
      east: "/game/pogicity/Building/landmark/tree-skiing_east.png",
      west: "/game/pogicity/Building/landmark/tree-skiing_west.png",
    },
    icon: "🌲",
    description: "Skiing & Nature",
    interactable: false,
    supportsRotation: true,
  },
  "cate-it": {
    id: "cate-it",
    name: "Cate it",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    collisionPadding: { right: 0, top: 0 },
    triggerZoneRadius: 3.5,
    sprites: {
      south: "/game/pogicity/Building/landmark/cate-it_south.png",
      north: "/game/pogicity/Building/landmark/cate-it_north.png",
      east: "/game/pogicity/Building/landmark/cate-it_east.png",
      west: "/game/pogicity/Building/landmark/cate-it_west.png",
    },
    icon: "🚚",
    projectSlug: "cate-it",
    description: "AI-powered catering platform - Co-founder & Designer",
    interactable: true,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/cate-it logo.png",
    logoOffset: { x: 0, y: 70 },
  },
  "viz-generator": {
    id: "viz-generator",
    name: "Viz Generator",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/commercial/4x3general_intelligence_office_south.png",
      north: "/game/pogicity/Building/commercial/4x3general_intelligence_office_north.png",
      east: "/game/pogicity/Building/commercial/3x4general_intelligence_office_east.png",
      west: "/game/pogicity/Building/commercial/3x4general_intelligence_office_west.png",
    },
    icon: "📊",
    projectSlug: "viz-generator",
    description: "Data visualization tool for creating charts",
    interactable: true,
    supportsRotation: true,
    logoUrl: "/game/pogicity/Building/logos/viz-generator.svg",
    logoOffset: { x: 0, y: 70 },
  },

  // ========================================
  // POGICITY PROPS
  // ========================================
  "bus-shelter": {
    id: "bus-shelter",
    name: "Bus Shelter",
    category: "props",
    footprint: { width: 2, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/2x1busshelter.png",
    },
    icon: "🚏",
  },
  "flower-bush": {
    id: "flower-bush",
    name: "Flower Bush",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1flowerbush.png",
    },
    icon: "🌺",
  },
  "park-table": {
    id: "park-table",
    name: "Park Table",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1park_table.png",
    },
    icon: "🪑",
  },
  fountain: {
    id: "fountain",
    name: "Fountain",
    category: "props",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Props/2x2fountain.png",
    },
    icon: "⛲",
  },
  statue: {
    id: "statue",
    name: "Statue",
    category: "props",
    footprint: { width: 1, height: 2 },
    sprites: {
      south: "/game/pogicity/Props/1x2statue.png",
    },
    icon: "🗽",
  },
  "modern-bench": {
    id: "modern-bench",
    name: "Modern Bench",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1modern_bench_south.png",
      north: "/game/pogicity/Props/1x1modern_bench_north.png",
      east: "/game/pogicity/Props/1x1modern_bench_east.png",
      west: "/game/pogicity/Props/1x1modern_bench_west.png",
    },
    icon: "🪑",
    supportsRotation: true,
    isDecoration: true,
  },
  "victorian-bench": {
    id: "victorian-bench",
    name: "Victorian Bench",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1victorian_bench_south.png",
      north: "/game/pogicity/Props/1x1victorian_bench_north.png",
      east: "/game/pogicity/Props/1x1victorian_bench_east.png",
      west: "/game/pogicity/Props/1x1victorian_bench_west.png",
    },
    icon: "🛋️",
    supportsRotation: true,
    isDecoration: true,
  },
  // Trees - 1x1 footprint but rendered as 4x4 for visual size
  "tree-1": {
    id: "tree-1",
    name: "Oak Tree",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Props/1x1tree1.png",
    },
    icon: "🌳",
    isDecoration: true,
  },
  "tree-2": {
    id: "tree-2",
    name: "Maple Tree",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Props/1x1tree2.png",
    },
    icon: "🌲",
    isDecoration: true,
  },
  "tree-3": {
    id: "tree-3",
    name: "Elm Tree",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Props/1x1tree3.png",
    },
    icon: "🌴",
    isDecoration: true,
  },
  "tree-4": {
    id: "tree-4",
    name: "Birch Tree",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Props/1x1tree4.png",
    },
    icon: "🎋",
    isDecoration: true,
  },
  // Kongelunden forest round the new stadium (Linear POR-36, round 5): the maple and birch trees at half size, so they
  // match the avatar-scale stadium and don't cover its columns
  "forest-tree-1": {
    id: "forest-tree-1",
    name: "Forest Maple",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    spriteScale: 0.5,
    sprites: {
      south: "/game/pogicity/Props/1x1tree2.png",
    },
    icon: "🌳",
    isDecoration: true,
  },
  "forest-tree-2": {
    id: "forest-tree-2",
    name: "Forest Birch",
    category: "props",
    footprint: { width: 1, height: 1 },
    renderSize: { width: 4, height: 4 },
    spriteScale: 0.5,
    sprites: {
      south: "/game/pogicity/Props/1x1tree4.png",
    },
    icon: "🌳",
    isDecoration: true,
  },
  "stadium-fan-1": {
    id: "stadium-fan-1",
    name: "Stadium Fan (back)",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1stadium_fan_1.png",
    },
    icon: "🧑",
    isDecoration: true,
  },
  "stadium-fan-2": {
    id: "stadium-fan-2",
    name: "Stadium Fan (front)",
    category: "props",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1stadium_fan_2.png",
    },
    icon: "👕",
    isDecoration: true,
  },

  // ========================================
  // POGICITY RESIDENTIAL
  // ========================================
  "yellow-apartments": {
    id: "yellow-apartments",
    name: "Yellow Apartments",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2yellow_apartments_south.png",
      north: "/game/pogicity/Building/residential/2x2yellow_apartments_north.png",
      east: "/game/pogicity/Building/residential/2x2yellow_apartments_east.png",
      west: "/game/pogicity/Building/residential/2x2yellow_apartments_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "english-townhouse": {
    id: "english-townhouse",
    name: "English Townhouse",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2english_townhouse_south.png",
      north: "/game/pogicity/Building/residential/2x2english_townhouse_north.png",
      east: "/game/pogicity/Building/residential/2x2english_townhouse_east.png",
      west: "/game/pogicity/Building/residential/2x2english_townhouse_west.png",
    },
    icon: "🏘️",
    supportsRotation: true,
  },
  brownstone: {
    id: "brownstone",
    name: "Brownstone",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3brownstone_south.png",
      north: "/game/pogicity/Building/residential/2x3brownstone_north.png",
      east: "/game/pogicity/Building/residential/3x2brownstone_east.png",
      west: "/game/pogicity/Building/residential/3x2brownstone_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "row-houses": {
    id: "row-houses",
    name: "Row Houses",
    category: "residential",
    footprint: { width: 3, height: 2 },
    footprintByOrientation: {
      south: { width: 3, height: 2 },
      north: { width: 3, height: 2 },
      east: { width: 2, height: 3 },
      west: { width: 2, height: 3 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/3x2small_rowhouses_south.png",
      north: "/game/pogicity/Building/residential/3x2small_rowhouses_north.png",
      east: "/game/pogicity/Building/residential/2x3small_rowhouses_east.png",
      west: "/game/pogicity/Building/residential/2x3small_rowhouses_west.png",
    },
    icon: "🏘️",
    supportsRotation: true,
  },
  "80s-apartment": {
    id: "80s-apartment",
    name: "80s Apartment",
    category: "residential",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/residential/3x380s_small_apartment_building_south.png",
      north: "/game/pogicity/Building/residential/3x380s_small_apartment_building_north.png",
      east: "/game/pogicity/Building/residential/3x380s_small_apartment_building_east.png",
      west: "/game/pogicity/Building/residential/3x380s_small_apartment_building_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "medium-apartments": {
    id: "medium-apartments",
    name: "Medium Apartments",
    category: "residential",
    footprint: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Building/residential/4x4medium_apartments_south.png",
      north: "/game/pogicity/Building/residential/4x4medium_apartments_north.png",
      east: "/game/pogicity/Building/residential/4x4medium_apartments_east.png",
      west: "/game/pogicity/Building/residential/4x4medium_apartments_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  limestone: {
    id: "limestone",
    name: "Limestone Building",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2limestone_south.png",
      north: "/game/pogicity/Building/residential/2x2limestone_north.png",
      east: "/game/pogicity/Building/residential/2x2limestone_east.png",
      west: "/game/pogicity/Building/residential/2x2limestone_west.png",
    },
    icon: "🏛️",
    supportsRotation: true,
  },
  "romanesque-2": {
    id: "romanesque-2",
    name: "Romanesque Building",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2romanesque_2_south.png",
      north: "/game/pogicity/Building/residential/2x2romanesque_2_north.png",
      east: "/game/pogicity/Building/residential/2x2romanesque_2_east.png",
      west: "/game/pogicity/Building/residential/2x2romanesque_2_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },
  "romanesque-3": {
    id: "romanesque-3",
    name: "Romanesque Building 2",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2romanesque_3_south.png",
      north: "/game/pogicity/Building/residential/2x2romanesque_3_north.png",
      east: "/game/pogicity/Building/residential/2x2romanesque_3_east.png",
      west: "/game/pogicity/Building/residential/2x2romanesque_3_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },
  "sf-green-apartments": {
    id: "sf-green-apartments",
    name: "SF Green Apartments",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2sf_green_apartments_south.png",
      north: "/game/pogicity/Building/residential/2x2sf_green_apartments_north.png",
      east: "/game/pogicity/Building/residential/2x2sf_green_apartments_east.png",
      west: "/game/pogicity/Building/residential/2x2sf_green_apartments_west.png",
    },
    icon: "🏡",
    supportsRotation: true,
  },
  "sf-marina-house": {
    id: "sf-marina-house",
    name: "SF Marina House",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2sf_marina_house_south.png",
      north: "/game/pogicity/Building/residential/2x2sf_marina_house_north.png",
      east: "/game/pogicity/Building/residential/2x2sf_marina_house_east.png",
      west: "/game/pogicity/Building/residential/2x2sf_marina_house_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "strange-townhouse": {
    id: "strange-townhouse",
    name: "Strange Townhouse",
    category: "residential",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/residential/2x2strange_townhouse_south.png",
      north: "/game/pogicity/Building/residential/2x2strange_townhouse_north.png",
      east: "/game/pogicity/Building/residential/2x2strange_townhouse_east.png",
      west: "/game/pogicity/Building/residential/2x2strange_townhouse_west.png",
    },
    icon: "🏚️",
    supportsRotation: true,
  },
  "blue-painted-lady": {
    id: "blue-painted-lady",
    name: "Blue Painted Lady",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3blue_painted_lady_south.png",
      north: "/game/pogicity/Building/residential/2x3blue_painted_lady_north.png",
      east: "/game/pogicity/Building/residential/3x2blue_painted_lady_east.png",
      west: "/game/pogicity/Building/residential/3x2blue_painted_lady_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "full-house-house": {
    id: "full-house-house",
    name: "Full House House",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3full_house_house_south.png",
      north: "/game/pogicity/Building/residential/2x3full_house_house_north.png",
      east: "/game/pogicity/Building/residential/3x2full_house_house_east.png",
      west: "/game/pogicity/Building/residential/3x2full_house_house_west.png",
    },
    icon: "🏡",
    supportsRotation: true,
  },
  "romanesque-townhouse": {
    id: "romanesque-townhouse",
    name: "Romanesque Townhouse",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3romanesque_townhouse_south.png",
      north: "/game/pogicity/Building/residential/2x3romanesque_townhouse_north.png",
      east: "/game/pogicity/Building/residential/3x2romanesque_townhouse_east.png",
      west: "/game/pogicity/Building/residential/3x2romanesque_townhouse_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },
  "sf-victorian": {
    id: "sf-victorian",
    name: "SF Victorian",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3sf_victorian_south.png",
      north: "/game/pogicity/Building/residential/2x3sf_victorian_north.png",
      east: "/game/pogicity/Building/residential/3x2sf_victorian_east.png",
      west: "/game/pogicity/Building/residential/3x2sf_victorian_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "sf-victorian-2": {
    id: "sf-victorian-2",
    name: "SF Victorian 2",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3sf_victorian_2_south.png",
      north: "/game/pogicity/Building/residential/2x3sf_victorian_2_north.png",
      east: "/game/pogicity/Building/residential/3x2sf_victorian_2_east.png",
      west: "/game/pogicity/Building/residential/3x2sf_victorian_2_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "sf-yellow-victorian-apartments": {
    id: "sf-yellow-victorian-apartments",
    name: "SF Yellow Victorian Apartments",
    category: "residential",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x3sf_yellow_victorian_apartments_south.png",
      north: "/game/pogicity/Building/residential/2x3sf_yellow_victorian_apartments_north.png",
      east: "/game/pogicity/Building/residential/3x2sf_yellow_victorian_apartments_east.png",
      west: "/game/pogicity/Building/residential/3x2sf_yellow_victorian_apartments_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "alternate-brownstone": {
    id: "alternate-brownstone",
    name: "Alternate Brownstone",
    category: "residential",
    footprint: { width: 2, height: 4 },
    footprintByOrientation: {
      south: { width: 2, height: 4 },
      north: { width: 2, height: 4 },
      east: { width: 4, height: 2 },
      west: { width: 4, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x4alternate_brownstone_south.png",
      north: "/game/pogicity/Building/residential/2x4alternate_brownstone_north.png",
      east: "/game/pogicity/Building/residential/4x2alternate_brownstone_east.png",
      west: "/game/pogicity/Building/residential/4x2alternate_brownstone_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "sf-blue-duplex": {
    id: "sf-blue-duplex",
    name: "SF Blue Duplex",
    category: "residential",
    footprint: { width: 2, height: 4 },
    footprintByOrientation: {
      south: { width: 2, height: 4 },
      north: { width: 2, height: 4 },
      east: { width: 4, height: 2 },
      west: { width: 4, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x4sf_blue_duplex_south.png",
      north: "/game/pogicity/Building/residential/2x4sf_blue_duplex_north.png",
      east: "/game/pogicity/Building/residential/4x2sf_blue_duplex_east.png",
      west: "/game/pogicity/Building/residential/4x2sf_blue_duplex_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "sf-yellow-painted-lady": {
    id: "sf-yellow-painted-lady",
    name: "SF Yellow Painted Lady",
    category: "residential",
    footprint: { width: 2, height: 4 },
    footprintByOrientation: {
      south: { width: 2, height: 4 },
      north: { width: 2, height: 4 },
      east: { width: 4, height: 2 },
      west: { width: 4, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x4sf_yellow_painted_lady_south.png",
      north: "/game/pogicity/Building/residential/2x4sf_yellow_painted_lady_north.png",
      east: "/game/pogicity/Building/residential/4x2sf_yellow_painted_lady_east.png",
      west: "/game/pogicity/Building/residential/4x2sf_yellow_painted_lady_west.png",
    },
    icon: "🏡",
    supportsRotation: true,
  },
  "sf-green-victorian-apartments": {
    id: "sf-green-victorian-apartments",
    name: "SF Green Victorian Apartments",
    category: "residential",
    footprint: { width: 2, height: 5 },
    footprintByOrientation: {
      south: { width: 2, height: 5 },
      north: { width: 2, height: 5 },
      east: { width: 5, height: 2 },
      west: { width: 5, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/2x5sf_green_victorian_apartments_south.png",
      north: "/game/pogicity/Building/residential/2x5sf_green_victorian_apartments_north.png",
      east: "/game/pogicity/Building/residential/5x2sf_green_victorian_apartments_east.png",
      west: "/game/pogicity/Building/residential/5x2sf_green_victorian_apartments_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "leafy-apartments": {
    id: "leafy-apartments",
    name: "Leafy Apartments",
    category: "residential",
    footprint: { width: 3, height: 2 },
    footprintByOrientation: {
      south: { width: 3, height: 2 },
      north: { width: 3, height: 2 },
      east: { width: 2, height: 3 },
      west: { width: 2, height: 3 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/3x2leafy_apartments_south.png",
      north: "/game/pogicity/Building/residential/3x2leafy_apartments_north.png",
      east: "/game/pogicity/Building/residential/2x3leafy_apartments_east.png",
      west: "/game/pogicity/Building/residential/2x3leafy_apartments_west.png",
    },
    icon: "🌿",
    supportsRotation: true,
  },
  limestones: {
    id: "limestones",
    name: "Limestones",
    category: "residential",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/residential/3x3limestones_south.png",
      north: "/game/pogicity/Building/residential/3x3limestones_north.png",
      east: "/game/pogicity/Building/residential/3x3limestones_east.png",
      west: "/game/pogicity/Building/residential/3x3limestones_west.png",
    },
    icon: "🏛️",
    supportsRotation: true,
  },
  "romanesque-duplex": {
    id: "romanesque-duplex",
    name: "Romanesque Duplex",
    category: "residential",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/residential/3x3romanesque_duplex_south.png",
      north: "/game/pogicity/Building/residential/3x3romanesque_duplex_north.png",
      east: "/game/pogicity/Building/residential/3x3romanesque_duplex_east.png",
      west: "/game/pogicity/Building/residential/3x3romanesque_duplex_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },
  "sf-duplex": {
    id: "sf-duplex",
    name: "SF Duplex",
    category: "residential",
    footprint: { width: 3, height: 4 },
    footprintByOrientation: {
      south: { width: 3, height: 4 },
      north: { width: 3, height: 4 },
      east: { width: 4, height: 3 },
      west: { width: 4, height: 3 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/3x4sf_duplex_south.png",
      north: "/game/pogicity/Building/residential/3x4sf_duplex_north.png",
      east: "/game/pogicity/Building/residential/4x3sf_duplex_east.png",
      west: "/game/pogicity/Building/residential/4x3sf_duplex_west.png",
    },
    icon: "🏠",
    supportsRotation: true,
  },
  "modern-terracotta-condos": {
    id: "modern-terracotta-condos",
    name: "Modern Terracotta Condos",
    category: "residential",
    footprint: { width: 6, height: 5 },
    footprintByOrientation: {
      south: { width: 6, height: 5 },
      north: { width: 6, height: 5 },
      east: { width: 5, height: 6 },
      west: { width: 5, height: 6 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/6x5modern_terracotta_condos_south.png",
      north: "/game/pogicity/Building/residential/6x5modern_terracotta_condos_north.png",
      east: "/game/pogicity/Building/residential/5x6modern_terracotta_condos_east.png",
      west: "/game/pogicity/Building/residential/5x6modern_terracotta_condos_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "gothic-apartments": {
    id: "gothic-apartments",
    name: "Gothic Apartments",
    category: "residential",
    footprint: { width: 6, height: 6 },
    sprites: {
      south: "/game/pogicity/Building/residential/6x6gothic_apartments_south.png",
      north: "/game/pogicity/Building/residential/6x6gothic_apartments_north.png",
      east: "/game/pogicity/Building/residential/6x6gothic_apartments_east.png",
      west: "/game/pogicity/Building/residential/6x6gothic_apartments_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },
  "large-apartments-20s": {
    id: "large-apartments-20s",
    name: "Large 1920s Apartments",
    category: "residential",
    footprint: { width: 7, height: 7 },
    sprites: {
      south: "/game/pogicity/Building/residential/7x7large_apartments_20s_south.png",
      north: "/game/pogicity/Building/residential/7x7large_apartments_20s_north.png",
      east: "/game/pogicity/Building/residential/7x7large_apartments_20s_east.png",
      west: "/game/pogicity/Building/residential/7x7large_apartments_20s_west.png",
    },
    icon: "🏛️",
    supportsRotation: true,
  },
  "large-apartments-60s": {
    id: "large-apartments-60s",
    name: "Large 1960s Apartments",
    category: "residential",
    footprint: { width: 8, height: 7 },
    footprintByOrientation: {
      south: { width: 8, height: 7 },
      north: { width: 8, height: 7 },
      east: { width: 7, height: 8 },
      west: { width: 7, height: 8 },
    },
    sprites: {
      south: "/game/pogicity/Building/residential/8x7large_apartments_60s_south.png",
      north: "/game/pogicity/Building/residential/8x7large_apartments_60s_north.png",
      east: "/game/pogicity/Building/residential/7x8large_apartments_60s_east.png",
      west: "/game/pogicity/Building/residential/7x8large_apartments_60s_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "the-dakota": {
    id: "the-dakota",
    name: "The Dakota",
    category: "residential",
    footprint: { width: 8, height: 8 },
    sprites: {
      south: "/game/pogicity/Building/residential/8x8the_dakota_south.png",
      north: "/game/pogicity/Building/residential/8x8the_dakota_north.png",
      east: "/game/pogicity/Building/residential/8x8the_dakota_east.png",
      west: "/game/pogicity/Building/residential/8x8the_dakota_west.png",
    },
    icon: "🏰",
    supportsRotation: true,
  },

  // ========================================
  // POGICITY COMMERCIAL
  // ========================================
  checkers: {
    id: "checkers",
    name: "Checkers",
    category: "commercial",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/commercial/2x2checkers_south.png",
      north: "/game/pogicity/Building/commercial/2x2checkers_north.png",
      east: "/game/pogicity/Building/commercial/2x2checkers_east.png",
      west: "/game/pogicity/Building/commercial/2x2checkers_west.png",
    },
    icon: "🍔",
    supportsRotation: true,
  },
  popeyes: {
    id: "popeyes",
    name: "Popeyes",
    category: "commercial",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/commercial/2x2popeyes_south.png",
      north: "/game/pogicity/Building/commercial/2x2popeyes_north.png",
      east: "/game/pogicity/Building/commercial/2x2popeyes_east.png",
      west: "/game/pogicity/Building/commercial/2x2popeyes_west.png",
    },
    icon: "🍗",
    supportsRotation: true,
  },
  dunkin: {
    id: "dunkin",
    name: "Dunkin",
    category: "commercial",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/commercial/2x2dunkin_south.png",
      north: "/game/pogicity/Building/commercial/2x2dunkin_north.png",
      east: "/game/pogicity/Building/commercial/2x2dunkin_east.png",
      west: "/game/pogicity/Building/commercial/2x2dunkin_west.png",
    },
    icon: "🍩",
    supportsRotation: true,
  },
  "martini-bar": {
    id: "martini-bar",
    name: "Martini Bar",
    category: "commercial",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Building/commercial/2x2martini_bar_south.png",
      north: "/game/pogicity/Building/commercial/2x2martini_bar_north.png",
      east: "/game/pogicity/Building/commercial/2x2martini_bar_east.png",
      west: "/game/pogicity/Building/commercial/2x2martini_bar_west.png",
    },
    icon: "🍸",
    supportsRotation: true,
  },
  bookstore: {
    id: "bookstore",
    name: "Bookstore",
    category: "commercial",
    footprint: { width: 4, height: 4 },
    sprites: {
      south: "/game/pogicity/Building/commercial/4x4bookstore_south.png",
      north: "/game/pogicity/Building/commercial/4x4bookstore_north.png",
      east: "/game/pogicity/Building/commercial/4x4bookstore_east.png",
      west: "/game/pogicity/Building/commercial/4x4bookstore_west.png",
    },
    icon: "📚",
    supportsRotation: true,
  },
  "promptlayer-office": {
    id: "promptlayer-office",
    name: "Promptlayer Office",
    category: "commercial",
    footprint: { width: 2, height: 3 },
    footprintByOrientation: {
      south: { width: 2, height: 3 },
      north: { width: 2, height: 3 },
      east: { width: 3, height: 2 },
      west: { width: 3, height: 2 },
    },
    sprites: {
      south: "/game/pogicity/Building/commercial/2x3promptlayer_office_south.png",
      north: "/game/pogicity/Building/commercial/2x3promptlayer_office_north.png",
      east: "/game/pogicity/Building/commercial/3x2promptlayer_office_east.png",
      west: "/game/pogicity/Building/commercial/3x2promptlayer_office_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "ease-health": {
    id: "ease-health",
    name: "Ease Health",
    category: "commercial",
    footprint: { width: 3, height: 6 },
    footprintByOrientation: {
      south: { width: 3, height: 6 },
      north: { width: 3, height: 6 },
      east: { width: 6, height: 3 },
      west: { width: 6, height: 3 },
    },
    sprites: {
      south: "/game/pogicity/Building/commercial/3x6ease_health_south.png",
      north: "/game/pogicity/Building/commercial/3x6ease_health_north.png",
      east: "/game/pogicity/Building/commercial/6x3ease_health_east.png",
      west: "/game/pogicity/Building/commercial/6x3ease_health_west.png",
    },
    icon: "🏥",
    supportsRotation: true,
  },
  "general-intelligence-office": {
    id: "general-intelligence-office",
    name: "General Intelligence Office",
    category: "commercial",
    footprint: { width: 4, height: 3 },
    footprintByOrientation: {
      south: { width: 4, height: 3 },
      north: { width: 4, height: 3 },
      east: { width: 3, height: 4 },
      west: { width: 3, height: 4 },
    },
    sprites: {
      south: "/game/pogicity/Building/commercial/4x3general_intelligence_office_south.png",
      north: "/game/pogicity/Building/commercial/4x3general_intelligence_office_north.png",
      east: "/game/pogicity/Building/commercial/3x4general_intelligence_office_east.png",
      west: "/game/pogicity/Building/commercial/3x4general_intelligence_office_west.png",
    },
    icon: "🧠",
    supportsRotation: true,
  },
  "palo-alto-office-center": {
    id: "palo-alto-office-center",
    name: "Palo Alto Office Center",
    category: "commercial",
    footprint: { width: 6, height: 5 },
    footprintByOrientation: {
      south: { width: 6, height: 5 },
      north: { width: 6, height: 5 },
      east: { width: 5, height: 6 },
      west: { width: 5, height: 6 },
    },
    sprites: {
      south: "/game/pogicity/Building/commercial/6x5palo_alto_office_center_south.png",
      north: "/game/pogicity/Building/commercial/6x5palo_alto_office_center_north.png",
      east: "/game/pogicity/Building/commercial/5x6palo_alto_office_center_east.png",
      west: "/game/pogicity/Building/commercial/5x6palo_alto_office_center_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },
  "magicpath-office": {
    id: "magicpath-office",
    name: "Magicpath Office",
    category: "commercial",
    footprint: { width: 6, height: 6 },
    sprites: {
      south: "/game/pogicity/Building/commercial/6x6magicpath_office_south.png",
      north: "/game/pogicity/Building/commercial/6x6magicpath_office_north.png",
      east: "/game/pogicity/Building/commercial/6x6magicpath_office_east.png",
      west: "/game/pogicity/Building/commercial/6x6magicpath_office_west.png",
    },
    icon: "✨",
    supportsRotation: true,
  },
  "palo-alto-wide-office": {
    id: "palo-alto-wide-office",
    name: "Palo Alto Wide Office",
    category: "commercial",
    footprint: { width: 6, height: 8 },
    footprintByOrientation: {
      south: { width: 6, height: 8 },
      north: { width: 6, height: 8 },
      east: { width: 8, height: 6 },
      west: { width: 8, height: 6 },
    },
    sprites: {
      south: "/game/pogicity/Building/commercial/6x8palo_alto_wide_office_south.png",
      north: "/game/pogicity/Building/commercial/6x8palo_alto_wide_office_north.png",
      east: "/game/pogicity/Building/commercial/8x6palo_alto_wide_office_east.png",
      west: "/game/pogicity/Building/commercial/8x6palo_alto_wide_office_west.png",
    },
    icon: "🏢",
    supportsRotation: true,
  },

  // ========================================
  // POGICITY LANDMARK
  // ========================================
  church: {
    id: "church",
    name: "Church",
    category: "landmark",
    footprint: { width: 6, height: 6 },
    sprites: {
      south: "/game/pogicity/Building/landmark/6x6church_south2.png",
      north: "/game/pogicity/Building/landmark/6x6church_north.png",
      east: "/game/pogicity/Building/landmark/6x6church_east.png",
      west: "/game/pogicity/Building/landmark/6x6church_west.png",
    },
    icon: "⛪",
    supportsRotation: true,
  },
  "internet-archive": {
    id: "internet-archive",
    name: "Internet Archive",
    category: "landmark",
    footprint: { width: 6, height: 6 },
    sprites: {
      south: "/game/pogicity/Building/landmark/6x6internet_archive_south.png",
      north: "/game/pogicity/Building/landmark/6x6internet_archive_north.png",
      east: "/game/pogicity/Building/landmark/6x6internet_archive_east.png",
      west: "/game/pogicity/Building/landmark/6x6internet_archive_west.png",
    },
    icon: "📚",
    supportsRotation: true,
  },

  // ========================================
  // POGICITY CHRISTMAS
  // ========================================
  "christmas-tree": {
    id: "christmas-tree",
    name: "Christmas Tree",
    category: "christmas",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Props/2x2christmas_tree.png",
    },
    icon: "🎄",
    isDecoration: true,
  },
  snowman: {
    id: "snowman",
    name: "Snowman",
    category: "christmas",
    footprint: { width: 1, height: 1 },
    sprites: {
      south: "/game/pogicity/Props/1x1snowman_south.png",
      north: "/game/pogicity/Props/1x1snowman_north.png",
      east: "/game/pogicity/Props/1x1snowman_east.png",
      west: "/game/pogicity/Props/1x1snowman_west.png",
    },
    icon: "⛄",
    supportsRotation: true,
    isDecoration: true,
  },
  "santas-sleigh": {
    id: "santas-sleigh",
    name: "Santa's Sleigh",
    category: "christmas",
    footprint: { width: 2, height: 2 },
    sprites: {
      south: "/game/pogicity/Props/2x2sleigh_south.png",
      north: "/game/pogicity/Props/2x2sleigh_north.png",
      east: "/game/pogicity/Props/2x2sleigh_east.png",
      west: "/game/pogicity/Props/2x2sleigh_west.png",
    },
    icon: "🛷",
    supportsRotation: true,
    isDecoration: true,
  },
};

// Helper to get building by ID
export function getBuilding(id: string): BuildingDefinition | undefined {
  return BUILDINGS[id];
}

// Helper to get all buildings in a category
export function getBuildingsByCategory(
  category: BuildingCategory
): BuildingDefinition[] {
  return Object.values(BUILDINGS).filter((b) => b.category === category);
}

// Helper to get all categories that have buildings (in display order)
const CATEGORY_ORDER: BuildingCategory[] = [
  "portfolio",
  "residential",
  "commercial",
  "props",
  "christmas",
  "civic",
  "landmark",
];

export function getCategories(): BuildingCategory[] {
  const usedCategories = new Set(
    Object.values(BUILDINGS).map((b) => b.category)
  );
  return CATEGORY_ORDER.filter((cat) => usedCategories.has(cat));
}

// Category display names
export const CATEGORY_NAMES: Record<BuildingCategory, string> = {
  portfolio: "⭐ Portfolio",
  residential: "Residential",
  commercial: "Commercial",
  civic: "Civic",
  landmark: "Landmarks",
  props: "Props",
  christmas: "🎄 Christmas",
};
