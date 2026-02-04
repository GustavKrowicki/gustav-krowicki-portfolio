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
  sprites: {
    south: string;
    west?: string;
    north?: string;
    east?: string;
  };
  icon: string; // Emoji for UI
  supportsRotation?: boolean;
  isDecoration?: boolean; // If true, preserves underlying tile (like props)
  // Custom portfolio metadata
  projectSlug?: string;
  description?: string;
  interactable?: boolean;
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
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/lego-hq_south.png",
      north: "/game/pogicity/Building/landmark/lego-hq_north.png",
      east: "/game/pogicity/Building/landmark/lego-hq_east.png",
      west: "/game/pogicity/Building/landmark/lego-hq_west.png",
    },
    icon: "🧱",
    projectSlug: "lego",
    description: "ML-Assisted Internal Product",
    interactable: true,
    supportsRotation: true,
  },
  "valtech-office": {
    id: "valtech-office",
    name: "Valtech Office",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/valtech-office_south.png",
      north: "/game/pogicity/Building/landmark/valtech-office_north.png",
      east: "/game/pogicity/Building/landmark/valtech-office_east.png",
      west: "/game/pogicity/Building/landmark/valtech-office_west.png",
    },
    icon: "💼",
    projectSlug: "valtech",
    description: "Design Internship",
    interactable: true,
    supportsRotation: true,
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
  },
  "berlin-uni": {
    id: "berlin-uni",
    name: "Berlin University",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
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
  },
  "business-academy": {
    id: "business-academy",
    name: "Business Academy Aarhus",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/business-academy_south.png",
      north: "/game/pogicity/Building/landmark/business-academy_north.png",
      east: "/game/pogicity/Building/landmark/business-academy_east.png",
      west: "/game/pogicity/Building/landmark/business-academy_west.png",
    },
    icon: "📚",
    description: "Business Academy",
    interactable: false,
    supportsRotation: true,
  },
  "erhvervsakademiet": {
    id: "erhvervsakademiet",
    name: "Erhvervsakademiet",
    category: "portfolio",
    footprint: { width: 4, height: 3 },
    sprites: {
      south: "/game/pogicity/Building/landmark/erhvervsakademiet _south.png",
      north: "/game/pogicity/Building/landmark/erhvervsakademiet _south.png",
      east: "/game/pogicity/Building/landmark/erhvervsakademiet _south.png",
      west: "/game/pogicity/Building/landmark/erhvervsakademiet _south.png",
    },
    icon: "🏫",
    description: "Erhvervsakademiet",
    interactable: false,
    supportsRotation: false,
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
  },
  "aarhus-stadium": {
    id: "aarhus-stadium",
    name: "Aarhus Stadium",
    category: "portfolio",
    footprint: { width: 4, height: 4 },
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
  },
  "aeroguest": {
    id: "aeroguest",
    name: "Aeroguest",
    category: "portfolio",
    footprint: { width: 3, height: 3 },
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
