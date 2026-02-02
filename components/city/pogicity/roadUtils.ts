import { TileType, GridCell, GRID_WIDTH, GRID_HEIGHT, Direction } from "./types";

// Road segment size (4x4 grid cells)
export const ROAD_SEGMENT_SIZE = 4;

// Check if placing a road segment at (segmentX, segmentY) would be valid
export function canPlaceRoadSegment(
  grid: GridCell[][],
  segmentX: number,
  segmentY: number
): { valid: boolean; reason?: string } {
  // Check bounds
  if (
    segmentX < 0 ||
    segmentY < 0 ||
    segmentX + ROAD_SEGMENT_SIZE > GRID_WIDTH ||
    segmentY + ROAD_SEGMENT_SIZE > GRID_HEIGHT
  ) {
    return { valid: false, reason: "out_of_bounds" };
  }

  // Check each cell in the proposed segment
  for (let dy = 0; dy < ROAD_SEGMENT_SIZE; dy++) {
    for (let dx = 0; dx < ROAD_SEGMENT_SIZE; dx++) {
      const px = segmentX + dx;
      const py = segmentY + dy;
      const cell = grid[py]?.[px];

      if (!cell) continue;

      // Can only place on grass
      if (cell.type !== TileType.Grass) {
        return { valid: false, reason: "blocked" };
      }
    }
  }

  return { valid: true };
}

// Direction flags for road connections
export enum RoadConnection {
  None = 0,
  North = 1 << 0, // -Y direction in grid
  South = 1 << 1, // +Y direction in grid
  East = 1 << 2, // +X direction in grid
  West = 1 << 3, // -X direction in grid
}

// Road segment types based on connections
export enum RoadSegmentType {
  Isolated = "isolated", // No connections - 4-way intersection default
  DeadEndNorth = "deadEndNorth",
  DeadEndSouth = "deadEndSouth",
  DeadEndEast = "deadEndEast",
  DeadEndWest = "deadEndWest",
  Horizontal = "horizontal", // East-West
  Vertical = "vertical", // North-South
  CornerNE = "cornerNE",
  CornerNW = "cornerNW",
  CornerSE = "cornerSE",
  CornerSW = "cornerSW",
  TeeNorth = "teeNorth", // T facing north (missing south)
  TeeSouth = "teeSouth",
  TeeEast = "teeEast",
  TeeWest = "teeWest",
  Intersection = "intersection", // 4-way
}

// Get the road segment origin (top-left of 4x4 block) for any grid position
// Roads snap to a 4x4 grid for clean connections
export function getRoadSegmentOrigin(
  x: number,
  y: number
): { x: number; y: number } {
  return {
    x: Math.floor(x / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE,
    y: Math.floor(y / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE,
  };
}

// Check if a 4x4 area contains a road segment at exact position
export function hasRoadSegment(
  grid: GridCell[][],
  segmentX: number,
  segmentY: number
): boolean {
  // Check if this segment origin is within bounds
  if (
    segmentX < 0 ||
    segmentY < 0 ||
    segmentX >= GRID_WIDTH ||
    segmentY >= GRID_HEIGHT
  ) {
    return false;
  }

  // Check if the origin cell is marked as a road segment
  const cell = grid[segmentY]?.[segmentX];
  return (
    cell?.isOrigin === true &&
    cell?.originX === segmentX &&
    cell?.originY === segmentY &&
    (cell?.type === TileType.Road || cell?.type === TileType.Asphalt)
  );
}

// Find all road segment origins in the grid
export function findAllRoadSegments(grid: GridCell[][]): Array<{ x: number; y: number }> {
  const segments: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < GRID_HEIGHT; y++) {
    for (let x = 0; x < GRID_WIDTH; x++) {
      const cell = grid[y]?.[x];
      if (
        cell?.isOrigin === true &&
        cell?.originX === x &&
        cell?.originY === y &&
        (cell?.type === TileType.Road || cell?.type === TileType.Asphalt)
      ) {
        segments.push({ x, y });
      }
    }
  }
  return segments;
}

// Get connection flags for a road segment based on neighboring segments
// Simple: just check the 4 cardinal neighbors at ROAD_SEGMENT_SIZE distance
export function getRoadConnections(
  grid: GridCell[][],
  segmentX: number,
  segmentY: number
): number {
  let connections = RoadConnection.None;

  // Check north (-Y)
  if (hasRoadSegment(grid, segmentX, segmentY - ROAD_SEGMENT_SIZE)) {
    connections |= RoadConnection.North;
  }
  // Check south (+Y)
  if (hasRoadSegment(grid, segmentX, segmentY + ROAD_SEGMENT_SIZE)) {
    connections |= RoadConnection.South;
  }
  // Check east (+X)
  if (hasRoadSegment(grid, segmentX + ROAD_SEGMENT_SIZE, segmentY)) {
    connections |= RoadConnection.East;
  }
  // Check west (-X)
  if (hasRoadSegment(grid, segmentX - ROAD_SEGMENT_SIZE, segmentY)) {
    connections |= RoadConnection.West;
  }

  return connections;
}

// Determine road segment type from connections
export function getSegmentType(connections: number): RoadSegmentType {
  const n = (connections & RoadConnection.North) !== 0;
  const s = (connections & RoadConnection.South) !== 0;
  const e = (connections & RoadConnection.East) !== 0;
  const w = (connections & RoadConnection.West) !== 0;

  const count = (n ? 1 : 0) + (s ? 1 : 0) + (e ? 1 : 0) + (w ? 1 : 0);

  if (count === 0) return RoadSegmentType.Isolated;
  if (count === 4) return RoadSegmentType.Intersection;

  if (count === 1) {
    if (n) return RoadSegmentType.DeadEndNorth;
    if (s) return RoadSegmentType.DeadEndSouth;
    if (e) return RoadSegmentType.DeadEndEast;
    if (w) return RoadSegmentType.DeadEndWest;
  }

  if (count === 2) {
    if (n && s) return RoadSegmentType.Vertical;
    if (e && w) return RoadSegmentType.Horizontal;
    if (n && e) return RoadSegmentType.CornerNE;
    if (n && w) return RoadSegmentType.CornerNW;
    if (s && e) return RoadSegmentType.CornerSE;
    if (s && w) return RoadSegmentType.CornerSW;
  }

  if (count === 3) {
    if (!s) return RoadSegmentType.TeeNorth;
    if (!n) return RoadSegmentType.TeeSouth;
    if (!w) return RoadSegmentType.TeeEast;
    if (!e) return RoadSegmentType.TeeWest;
  }

  return RoadSegmentType.Intersection;
}

// Generate the 4x4 tile pattern for a road segment
// Returns array of { dx, dy, type } for each tile relative to segment origin
export function generateRoadPattern(
  segmentType: RoadSegmentType
): Array<{ dx: number; dy: number; type: TileType }> {
  const pattern: Array<{ dx: number; dy: number; type: TileType }> = [];

  for (let dy = 0; dy < ROAD_SEGMENT_SIZE; dy++) {
    for (let dx = 0; dx < ROAD_SEGMENT_SIZE; dx++) {
      const isEdgeX = dx === 0 || dx === ROAD_SEGMENT_SIZE - 1;
      const isEdgeY = dy === 0 || dy === ROAD_SEGMENT_SIZE - 1;
      const isCenterX = dx === 1 || dx === 2;
      const isCenterY = dy === 1 || dy === 2;

      let type: TileType = TileType.Road; // Default to sidewalk

      switch (segmentType) {
        case RoadSegmentType.Isolated:
          if (isCenterX && isCenterY) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.Horizontal:
          if (isCenterY) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.Vertical:
          if (isCenterX) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.Intersection:
          if (isCenterX || isCenterY) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.DeadEndNorth:
          if (isCenterX && (dy < 3)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.DeadEndSouth:
          if (isCenterX && (dy > 0)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.DeadEndEast:
          if (isCenterY && (dx > 0)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.DeadEndWest:
          if (isCenterY && (dx < 3)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.CornerNE:
          if ((isCenterX && dy <= 2) || (isCenterY && dx >= 1)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.CornerNW:
          if ((isCenterX && dy <= 2) || (isCenterY && dx <= 2)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.CornerSE:
          if ((isCenterX && dy >= 1) || (isCenterY && dx >= 1)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.CornerSW:
          if ((isCenterX && dy >= 1) || (isCenterY && dx <= 2)) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.TeeNorth:
          if (isCenterX && dy <= 2) {
            type = TileType.Asphalt;
          } else if (isCenterY) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.TeeSouth:
          if (isCenterX && dy >= 1) {
            type = TileType.Asphalt;
          } else if (isCenterY) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.TeeEast:
          if (isCenterY && dx >= 1) {
            type = TileType.Asphalt;
          } else if (isCenterX) {
            type = TileType.Asphalt;
          }
          break;

        case RoadSegmentType.TeeWest:
          if (isCenterY && dx <= 2) {
            type = TileType.Asphalt;
          } else if (isCenterX) {
            type = TileType.Asphalt;
          }
          break;
      }

      pattern.push({ dx, dy, type });
    }
  }

  return pattern;
}

// Get all segment origins that need updating when a segment changes
export function getAffectedSegments(
  segmentX: number,
  segmentY: number
): Array<{ x: number; y: number }> {
  const affected: Array<{ x: number; y: number }> = [];

  // The segment itself
  affected.push({ x: segmentX, y: segmentY });

  // All 4 neighbors
  const neighbors = [
    { x: segmentX, y: segmentY - ROAD_SEGMENT_SIZE }, // North
    { x: segmentX, y: segmentY + ROAD_SEGMENT_SIZE }, // South
    { x: segmentX + ROAD_SEGMENT_SIZE, y: segmentY }, // East
    { x: segmentX - ROAD_SEGMENT_SIZE, y: segmentY }, // West
  ];

  for (const n of neighbors) {
    if (n.x >= 0 && n.y >= 0 && n.x < GRID_WIDTH && n.y < GRID_HEIGHT) {
      affected.push(n);
    }
  }

  return affected;
}

// Get the preferred lane direction for a car at a given position
export function getLaneDirection(x: number, y: number, grid?: GridCell[][]): Direction | null {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const localX = tileX % ROAD_SEGMENT_SIZE;
  const localY = tileY % ROAD_SEGMENT_SIZE;

  const isHorizontalLane = localY === 1 || localY === 2;
  const isVerticalLane = localX === 1 || localX === 2;
  const isCenterTile = isHorizontalLane && isVerticalLane;

  if (!grid) {
    if (isVerticalLane) {
      return localX === 1 ? Direction.Down : Direction.Up;
    }
    if (isHorizontalLane) {
      return localY === 1 ? Direction.Left : Direction.Right;
    }
    return null;
  }

  const segmentX = Math.floor(tileX / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE;
  const segmentY = Math.floor(tileY / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE;

  const hasNorth = hasRoadSegment(grid, segmentX, segmentY - ROAD_SEGMENT_SIZE);
  const hasSouth = hasRoadSegment(grid, segmentX, segmentY + ROAD_SEGMENT_SIZE);
  const hasEast = hasRoadSegment(grid, segmentX + ROAD_SEGMENT_SIZE, segmentY);
  const hasWest = hasRoadSegment(grid, segmentX - ROAD_SEGMENT_SIZE, segmentY);

  const hasVerticalConnections = hasNorth || hasSouth;
  const hasHorizontalConnections = hasEast || hasWest;
  const connectionCount = (hasNorth ? 1 : 0) + (hasSouth ? 1 : 0) + (hasEast ? 1 : 0) + (hasWest ? 1 : 0);

  if (connectionCount >= 3) {
    if (isCenterTile) {
      return null;
    }
    if (isHorizontalLane && !isVerticalLane) {
      return localY === 1 ? Direction.Left : Direction.Right;
    }
    if (isVerticalLane && !isHorizontalLane) {
      return localX === 1 ? Direction.Down : Direction.Up;
    }
    return null;
  }

  if (hasVerticalConnections && !hasHorizontalConnections) {
    if (isVerticalLane) {
      return localX === 1 ? Direction.Down : Direction.Up;
    }
    return localX <= 1 ? Direction.Down : Direction.Up;
  }

  if (hasHorizontalConnections && !hasVerticalConnections) {
    if (isHorizontalLane) {
      return localY === 1 ? Direction.Left : Direction.Right;
    }
    return localY <= 1 ? Direction.Left : Direction.Right;
  }

  if (connectionCount === 2 && hasVerticalConnections && hasHorizontalConnections) {
    if (isCenterTile) {
      return null;
    }
    if (isHorizontalLane && !isVerticalLane) {
      return localY === 1 ? Direction.Left : Direction.Right;
    }
    if (isVerticalLane && !isHorizontalLane) {
      return localX === 1 ? Direction.Down : Direction.Up;
    }
    return null;
  }

  if (isVerticalLane) {
    return localX === 1 ? Direction.Down : Direction.Up;
  }
  if (isHorizontalLane) {
    return localY === 1 ? Direction.Left : Direction.Right;
  }

  return null;
}

// Check if a position is at an intersection
export function isAtIntersection(x: number, y: number, grid?: GridCell[][]): boolean {
  const tileX = Math.floor(x);
  const tileY = Math.floor(y);
  const localX = tileX % ROAD_SEGMENT_SIZE;
  const localY = tileY % ROAD_SEGMENT_SIZE;

  const isHorizontalLane = localY === 1 || localY === 2;
  const isVerticalLane = localX === 1 || localX === 2;

  if (!isHorizontalLane || !isVerticalLane) {
    return false;
  }

  if (!grid) {
    return false;
  }

  const segmentX = Math.floor(tileX / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE;
  const segmentY = Math.floor(tileY / ROAD_SEGMENT_SIZE) * ROAD_SEGMENT_SIZE;

  const hasNorthSegment = hasRoadSegment(grid, segmentX, segmentY - ROAD_SEGMENT_SIZE);
  const hasSouthSegment = hasRoadSegment(grid, segmentX, segmentY + ROAD_SEGMENT_SIZE);
  const hasEastSegment = hasRoadSegment(grid, segmentX + ROAD_SEGMENT_SIZE, segmentY);
  const hasWestSegment = hasRoadSegment(grid, segmentX - ROAD_SEGMENT_SIZE, segmentY);

  const hasVerticalConnection = hasNorthSegment || hasSouthSegment;
  const hasHorizontalConnection = hasEastSegment || hasWestSegment;

  return hasVerticalConnection && hasHorizontalConnection;
}

// Check if a car can turn to a specific direction from current position
export function canTurnAtTile(
  tileX: number,
  tileY: number,
  currentDir: Direction,
  targetDir: Direction
): boolean {
  const localX = tileX % ROAD_SEGMENT_SIZE;
  const localY = tileY % ROAD_SEGMENT_SIZE;

  if (currentDir === targetDir) return true;

  const opposite: Record<Direction, Direction> = {
    [Direction.Up]: Direction.Down,
    [Direction.Down]: Direction.Up,
    [Direction.Left]: Direction.Right,
    [Direction.Right]: Direction.Left,
  };
  if (targetDir === opposite[currentDir]) return false;

  switch (currentDir) {
    case Direction.Right:
      if (targetDir === Direction.Up) {
        return localX === 2 && localY === 2;
      }
      if (targetDir === Direction.Down) {
        return localX === 1 && localY === 2;
      }
      break;

    case Direction.Left:
      if (targetDir === Direction.Down) {
        return localX === 1 && localY === 1;
      }
      if (targetDir === Direction.Up) {
        return localX === 2 && localY === 1;
      }
      break;

    case Direction.Up:
      if (targetDir === Direction.Left) {
        return localX === 2 && localY === 1;
      }
      if (targetDir === Direction.Right) {
        return localX === 2 && localY === 2;
      }
      break;

    case Direction.Down:
      if (targetDir === Direction.Right) {
        return localX === 1 && localY === 2;
      }
      if (targetDir === Direction.Left) {
        return localX === 1 && localY === 1;
      }
      break;
  }

  return false;
}

// Get the correct direction for a U-turn at a dead end
export function getUTurnDirection(
  tileX: number,
  tileY: number,
  currentDir: Direction,
  grid: GridCell[][]
): Direction | null {
  const localX = tileX % ROAD_SEGMENT_SIZE;
  const localY = tileY % ROAD_SEGMENT_SIZE;

  const hasNorth = tileY > 0 && grid[tileY - 1]?.[tileX]?.type === TileType.Asphalt;
  const hasSouth = tileY < GRID_HEIGHT - 1 && grid[tileY + 1]?.[tileX]?.type === TileType.Asphalt;
  const hasWest = tileX > 0 && grid[tileY]?.[tileX - 1]?.type === TileType.Asphalt;
  const hasEast = tileX < GRID_WIDTH - 1 && grid[tileY]?.[tileX + 1]?.type === TileType.Asphalt;

  switch (currentDir) {
    case Direction.Right:
      if (localY === 2 && hasSouth) {
        if (hasNorth) return Direction.Up;
        if (hasSouth) return Direction.Down;
      }
      if (localY === 1) return Direction.Left;
      break;

    case Direction.Left:
      if (localY === 1 && hasNorth) {
        if (hasSouth) return Direction.Down;
        if (hasNorth) return Direction.Up;
      }
      if (localY === 2) return Direction.Right;
      break;

    case Direction.Up:
      if (localX === 2 && hasWest) {
        if (hasWest) return Direction.Left;
        if (hasEast) return Direction.Right;
      }
      if (localX === 1) return Direction.Down;
      break;

    case Direction.Down:
      if (localX === 1 && hasEast) {
        if (hasEast) return Direction.Right;
        if (hasWest) return Direction.Left;
      }
      if (localX === 2) return Direction.Up;
      break;
  }

  if (hasNorth && currentDir !== Direction.Down) return Direction.Up;
  if (hasSouth && currentDir !== Direction.Up) return Direction.Down;
  if (hasEast && currentDir !== Direction.Left) return Direction.Right;
  if (hasWest && currentDir !== Direction.Right) return Direction.Left;

  return null;
}

// Get the correct lane position for a given direction entering a road segment
export function getLanePositionForDirection(
  segmentX: number,
  segmentY: number,
  direction: Direction
): { x: number; y: number } {
  switch (direction) {
    case Direction.Up:
      return { x: segmentX + 2 + 0.5, y: segmentY + 2 + 0.5 };
    case Direction.Down:
      return { x: segmentX + 1 + 0.5, y: segmentY + 1 + 0.5 };
    case Direction.Left:
      return { x: segmentX + 2 + 0.5, y: segmentY + 2 + 0.5 };
    case Direction.Right:
      return { x: segmentX + 1 + 0.5, y: segmentY + 1 + 0.5 };
  }
}
