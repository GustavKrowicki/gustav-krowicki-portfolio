export enum TileType {
  Grass = "grass",
  Road = "road",
  Asphalt = "asphalt",
  Tile = "tile",
  Snow = "snow",
  Building = "building",
}

// Simplified tool types - Building is now generic, actual building selected separately
export enum ToolType {
  None = "none",
  RoadNetwork = "roadNetwork",
  Asphalt = "asphalt",
  Tile = "tile",
  Snow = "snow",
  Building = "building", // Generic - actual building ID stored separately
  StreetLamp = "streetLamp", // Actual lamp type stored separately
  Eraser = "eraser",
}

// Street lamps for the city at night (lib/city/streetLights.ts). A lamp sits on top of a cell and does not change its type
export type StreetLampType = "wire" | "post" | "lantern" | "bollard";

export interface GridCell {
  type: TileType;
  x: number;
  y: number;
  // For multi-tile objects, marks the origin (top-left in grid coords)
  isOrigin?: boolean;
  originX?: number;
  originY?: number;
  // For buildings, specify the ID (from building registry)
  buildingId?: string;
  // For rotatable buildings, specify the orientation (defaults to Down/South)
  buildingOrientation?: Direction;
  // For props, store the underlying tile type (so props don't render their own floor)
  underlyingTileType?: TileType;
  // A street lamp placed on this cell in the editor
  streetLamp?: StreetLampType;
}

export enum Direction {
  Up = "up",
  Down = "down",
  Left = "left",
  Right = "right",
}

export const DIRECTION_TO_COMPASS: Record<Direction, string> = {
  [Direction.Up]: "north",
  [Direction.Down]: "south",
  [Direction.Left]: "west",
  [Direction.Right]: "east",
};

export const DIRECTION_TO_SHORT_COMPASS: Record<Direction, string> = {
  [Direction.Up]: "n",
  [Direction.Down]: "s",
  [Direction.Left]: "w",
  [Direction.Right]: "e",
};

// Gustav's sprites were drawn with a different facing convention than the
// apple/banana art, so applying DIRECTION_TO_COMPASS to them would render
// him rotated 90°.
const GUSTAV_DIRECTION_TO_COMPASS: Record<Direction, string> = {
  [Direction.Up]: "west",
  [Direction.Down]: "east",
  [Direction.Left]: "south",
  [Direction.Right]: "north",
};

export enum LightingType {
  Day = "day",
  Night = "night",
  Sunset = "sunset",
}

export interface VisualSettings {
  blueness: number; // -100 to 100 (hue shift toward blue)
  contrast: number; // 0.5 to 2.0
  saturation: number; // 0.5 to 2.0
  brightness: number; // 0.5 to 2.0
}

export enum CharacterType {
  Banana = "banana",
  Apple = "apple",
  Gustav = "gustav",
}

export function getCharacterTextureKey(
  characterType: CharacterType,
  direction: Direction
): string {
  const compass =
    characterType === CharacterType.Gustav
      ? GUSTAV_DIRECTION_TO_COMPASS[direction]
      : DIRECTION_TO_COMPASS[direction];
  return `${characterType}_${compass}`;
}

export interface Character {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  characterType: CharacterType;
}

export enum CarType {
  Jeep = "jeep",
  Taxi = "taxi",
}

export interface Car {
  id: string;
  x: number;
  y: number;
  direction: Direction;
  speed: number;
  waiting: number;
  carType: CarType;
}

export const GRID_WIDTH = 48;
export const GRID_HEIGHT = 48;

export const CAR_SPEED = 0.05;

// Isometric tile dimensions (44x22 isometric diamond); the world-unit standard lives in lib/city/units
export { TILE_WIDTH, TILE_HEIGHT } from "@/lib/city/units";

// Tile sizes for different types (in grid cells) - this is the FOOTPRINT
export const TILE_SIZES: Record<TileType, { w: number; h: number }> = {
  [TileType.Grass]: { w: 1, h: 1 },
  [TileType.Road]: { w: 1, h: 1 },
  [TileType.Asphalt]: { w: 1, h: 1 },
  [TileType.Tile]: { w: 1, h: 1 },
  [TileType.Snow]: { w: 1, h: 1 },
  [TileType.Building]: { w: 4, h: 4 }, // Default, actual size from building registry
};

// Character movement constants
export const CHARACTER_PIXELS_PER_FRAME_X = 13 / 58;
export const CHARACTER_PIXELS_PER_FRAME_Y = 5 / 58;
export const CHARACTER_SPEED = 0.015;

// Adventure Mode Types
export enum GameMode {
  Viewer = "viewer",       // Camera pans between buildings; no avatar
  Adventure = "adventure", // Pokemon Go-style exploration
}

export enum PlayerState {
  Idle = "idle",
  Walking = "walking",
  AutoWalking = "autoWalking",
}

export enum NPCState {
  Idle = "idle",
  Alert = "alert",
  Talking = "talking",
}

export interface PlayerData {
  gridX: number;
  gridY: number;
  worldX: number;
  worldY: number;
  direction: Direction;
  state: PlayerState;
  characterType: CharacterType;
  walkableDirections?: Direction[];
}

export interface NPCData {
  id: string;
  buildingId: string;
  gridX: number;
  gridY: number;
  state: NPCState;
  tourStopIndex: number;
}

export interface TriggerZone {
  buildingId: string;
  centerX: number;
  centerY: number;
  radius: number;
  tourStopIndex: number;
}

// Player movement constants
export const PLAYER_SPEED = 0.08; // Faster than NPCs for responsive feel
export const PLAYER_MOVE_LERP = 0.20; // Interpolation factor for smooth movement
export const TRIGGER_ZONE_RADIUS = 3.5; // Tiles around landmark to trigger interaction
