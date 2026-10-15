// Walk-in buildings: which footprint tiles the player can stand on, which tile edges are doors, and the main door
// whose crossing opens the roof. Coordinates are local to the footprint (x right, y down, the origin tile = 0,0),
// for the building's default orientation. Built from the same plan as the model (art/img2threejs/lego-hq-avatar).

export interface BuildingInterior {
  /** One string per footprint row; one char per tile: a room code, or '#' = not walkable (props, courtyard, walls) */
  map: string[];
  /** Room codes that are outside (walkable from the street, e.g. the plaza) */
  outside: string;
  /** Tile pairs [x1, y1, x2, y2] with an open edge between different rooms */
  doors: [number, number, number, number][];
  /** The main door: crossing from `outside` to `inside` opens the roof, back again closes it */
  entrance: { outside: [number, number]; inside: [number, number] };
}

// LEGO HQ at avatar scale, 8 x 8 (board section 529:3604). M map room, W Workshop, L lobby, S studio,
// R launch room, A AI lab, P plaza. Blocked: the round courtyard, the Workshop table and shelf, the lobby desk,
// the studio shelf and table, the AI lab desks, the map room desk, the statue.
const LEGO_HQ: BuildingInterior = {
  map: [
    "MMMWWWW#",
    "M#MW####",
    "MM#WWWWW",
    "#SS#LLRR",
    "#SSLLLRR",
    "S##LLLA#",
    "SSSLLLA#",
    "P#PPPPPP",
  ],
  outside: "P",
  doors: [
    [4, 6, 4, 7], // main door, under the yellow 2x4 plate
    [4, 2, 4, 3], // lobby - Workshop
    [2, 4, 3, 4], // lobby - studio
    [5, 3, 6, 3], // lobby - launch room
    [5, 5, 6, 5], // lobby - AI lab
    [2, 1, 3, 1], // map room - Workshop
    [1, 2, 1, 3], // map room - studio
  ],
  entrance: { outside: [4, 7], inside: [4, 6] },
};

export const BUILDING_INTERIORS: Record<string, BuildingInterior> = {
  "lego-hq": LEGO_HQ,
};

export function interiorCode(interior: BuildingInterior, x: number, y: number): string | null {
  const ch = interior.map[y]?.[x];
  return ch === undefined || ch === "#" ? null : ch;
}

export function isInteriorDoor(interior: BuildingInterior, x1: number, y1: number, x2: number, y2: number): boolean {
  return interior.doors.some(
    ([a, b, c, d]) => (a === x1 && b === y1 && c === x2 && d === y2) || (a === x2 && b === y2 && c === x1 && d === y1)
  );
}
