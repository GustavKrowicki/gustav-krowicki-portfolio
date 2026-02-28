import Phaser from "phaser";
import {
  Direction,
  CharacterType,
  PlayerState,
  PlayerData,
  TileType,
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  PLAYER_SPEED,
  PLAYER_MOVE_LERP,
  GridCell,
} from "../types";
import { GRID_OFFSET_X, GRID_OFFSET_Y } from "./gameConfig";
import { playGifAnimation } from "./GifLoader";

// Direction vectors for movement
const directionVectors: Record<Direction, { dx: number; dy: number }> = {
  [Direction.Up]: { dx: 0, dy: -1 },
  [Direction.Down]: { dx: 0, dy: 1 },
  [Direction.Left]: { dx: -1, dy: 0 },
  [Direction.Right]: { dx: 1, dy: 0 },
};

// Key mappings for directions
const keyDirectionMap: Record<string, Direction> = {
  W: Direction.Up,
  w: Direction.Up,
  ArrowUp: Direction.Up,
  S: Direction.Down,
  s: Direction.Down,
  ArrowDown: Direction.Down,
  A: Direction.Left,
  a: Direction.Left,
  ArrowLeft: Direction.Left,
  D: Direction.Right,
  d: Direction.Right,
  ArrowRight: Direction.Right,
};

export interface PathNode {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic cost to end
  f: number; // Total cost (g + h)
  parent: PathNode | null;
}

export class PlayerController {
  private scene: Phaser.Scene;
  private grid: GridCell[][];
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private pointer: Phaser.GameObjects.Graphics | null = null;
  private pointerBounceOffset: number = 0;
  private pointerBounceDirection: number = 1;

  // Position state
  private gridX: number = 24;
  private gridY: number = 24;
  private worldX: number = 0;
  private worldY: number = 0;
  private targetWorldX: number = 0;
  private targetWorldY: number = 0;
  private targetGridX: number = 24;
  private targetGridY: number = 24;

  // Movement state
  private direction: Direction = Direction.Down;
  private state: PlayerState = PlayerState.Idle;
  private characterType: CharacterType = CharacterType.Banana;
  private isMoving: boolean = false;

  // Input state
  private inputDirection: Direction | null = null;
  private pressedKeys: Set<string> = new Set();

  // Auto-walk state
  private autoWalkPath: { x: number; y: number }[] = [];
  private autoWalkIndex: number = 0;
  private isAutoWalking: boolean = false;

  // External direction input (for mobile joystick)
  private externalDirection: Direction | null = null;

  // Callbacks
  private onPositionChange?: (data: PlayerData) => void;
  private onReachDestination?: (buildingId: string) => void;

  // Ready state
  private isReady: boolean = false;

  constructor(scene: Phaser.Scene, grid: GridCell[][]) {
    this.scene = scene;
    this.grid = grid;
  }

  setOnPositionChange(callback: (data: PlayerData) => void): void {
    this.onPositionChange = callback;
  }

  setOnReachDestination(callback: (buildingId: string) => void): void {
    this.onReachDestination = callback;
  }

  spawn(gridX: number, gridY: number, characterType: CharacterType): void {
    this.gridX = gridX;
    this.gridY = gridY;
    this.targetGridX = gridX;
    this.targetGridY = gridY;
    this.characterType = characterType;
    this.direction = Direction.Down;
    this.state = PlayerState.Idle;

    // Calculate world position
    const screenPos = this.gridToScreen(gridX, gridY);
    this.worldX = screenPos.x;
    this.worldY = screenPos.y + TILE_HEIGHT / 2;
    this.targetWorldX = this.worldX;
    this.targetWorldY = this.worldY;

    this.isReady = true;
    this.emitPositionChange();
  }

  setCharacterType(type: CharacterType): void {
    this.characterType = type;
    // Update sprite texture if it exists
    if (this.sprite) {
      const textureKey = this.getTextureKey();
      if (this.scene.textures.exists(textureKey)) {
        playGifAnimation(this.sprite, textureKey);
      }
    }
  }

  updateGrid(grid: GridCell[][]): void {
    this.grid = grid;
  }

  setInputDirection(direction: Direction | null): void {
    this.externalDirection = direction;
  }

  handleKeyDown(key: string): void {
    this.pressedKeys.add(key);

    // Cancel auto-walk on any movement key
    if (keyDirectionMap[key]) {
      this.cancelAutoWalk();
    }
  }

  handleKeyUp(key: string): void {
    this.pressedKeys.delete(key);
  }

  private getCurrentInputDirection(): Direction | null {
    // Check external direction first (mobile joystick)
    if (this.externalDirection) {
      return this.externalDirection;
    }

    // Check keyboard input (priority order: last pressed)
    for (const key of Array.from(this.pressedKeys).reverse()) {
      if (keyDirectionMap[key]) {
        return keyDirectionMap[key];
      }
    }

    return null;
  }

  update(): void {
    if (!this.isReady) return;

    // Handle auto-walk
    if (this.isAutoWalking) {
      this.updateAutoWalk();
      return;
    }

    // Get current input
    this.inputDirection = this.getCurrentInputDirection();

    if (this.isMoving) {
      // Interpolate toward target position
      this.worldX = this.lerp(this.worldX, this.targetWorldX, PLAYER_MOVE_LERP);
      this.worldY = this.lerp(this.worldY, this.targetWorldY, PLAYER_MOVE_LERP);

      const dx = Math.abs(this.worldX - this.targetWorldX);
      const dy = Math.abs(this.worldY - this.targetWorldY);

      if (dx < 1 && dy < 1) {
        // Snap to target
        this.worldX = this.targetWorldX;
        this.worldY = this.targetWorldY;
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.isMoving = false;
        this.state = PlayerState.Idle;
        this.emitPositionChange();
      }
    } else if (this.inputDirection) {
      // Try to move in the input direction
      const vec = directionVectors[this.inputDirection];
      const newGridX = this.gridX + vec.dx;
      const newGridY = this.gridY + vec.dy;

      // Update facing direction
      this.direction = this.inputDirection;

      if (this.isWalkable(newGridX, newGridY)) {
        this.targetGridX = newGridX;
        this.targetGridY = newGridY;

        const targetScreen = this.gridToScreen(newGridX, newGridY);
        this.targetWorldX = targetScreen.x;
        this.targetWorldY = targetScreen.y + TILE_HEIGHT / 2;

        this.isMoving = true;
        this.state = PlayerState.Walking;
        this.emitPositionChange();
      }
    }
  }

  private updateAutoWalk(): void {
    if (this.autoWalkPath.length === 0 || this.autoWalkIndex >= this.autoWalkPath.length) {
      this.cancelAutoWalk();
      return;
    }

    // Check for manual input interruption
    if (this.getCurrentInputDirection() && !this.externalDirection) {
      this.cancelAutoWalk();
      return;
    }

    if (this.isMoving) {
      // Interpolate toward target position
      this.worldX = this.lerp(this.worldX, this.targetWorldX, PLAYER_MOVE_LERP);
      this.worldY = this.lerp(this.worldY, this.targetWorldY, PLAYER_MOVE_LERP);

      const dx = Math.abs(this.worldX - this.targetWorldX);
      const dy = Math.abs(this.worldY - this.targetWorldY);

      if (dx < 1 && dy < 1) {
        // Snap to target
        this.worldX = this.targetWorldX;
        this.worldY = this.targetWorldY;
        this.gridX = this.targetGridX;
        this.gridY = this.targetGridY;
        this.isMoving = false;
        this.autoWalkIndex++;
        this.emitPositionChange();

        // Check if we've reached the end
        if (this.autoWalkIndex >= this.autoWalkPath.length) {
          this.cancelAutoWalk();
        }
      }
    } else {
      // Move to next path node
      const nextNode = this.autoWalkPath[this.autoWalkIndex];

      // Calculate direction
      const dx = nextNode.x - this.gridX;
      const dy = nextNode.y - this.gridY;

      if (dx > 0) this.direction = Direction.Right;
      else if (dx < 0) this.direction = Direction.Left;
      else if (dy > 0) this.direction = Direction.Down;
      else if (dy < 0) this.direction = Direction.Up;

      this.targetGridX = nextNode.x;
      this.targetGridY = nextNode.y;

      const targetScreen = this.gridToScreen(nextNode.x, nextNode.y);
      this.targetWorldX = targetScreen.x;
      this.targetWorldY = targetScreen.y + TILE_HEIGHT / 2;

      this.isMoving = true;
      this.state = PlayerState.AutoWalking;
      this.emitPositionChange();
    }
  }

  walkToBuilding(targetGridX: number, targetGridY: number, buildingId?: string): boolean {
    // Find path using A*
    const path = this.findPath(this.gridX, this.gridY, targetGridX, targetGridY);

    if (path.length === 0) {
      return false;
    }

    // Remove the start position
    this.autoWalkPath = path.slice(1);
    this.autoWalkIndex = 0;
    this.isAutoWalking = true;
    this.state = PlayerState.AutoWalking;

    return true;
  }

  cancelAutoWalk(): void {
    this.isAutoWalking = false;
    this.autoWalkPath = [];
    this.autoWalkIndex = 0;
    this.state = this.isMoving ? PlayerState.Walking : PlayerState.Idle;
    this.emitPositionChange();
  }

  private findPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    const openSet: PathNode[] = [];
    const closedSet = new Set<string>();

    const startNode: PathNode = {
      x: startX,
      y: startY,
      g: 0,
      h: this.heuristic(startX, startY, endX, endY),
      f: this.heuristic(startX, startY, endX, endY),
      parent: null,
    };

    openSet.push(startNode);

    while (openSet.length > 0) {
      // Get node with lowest f score
      openSet.sort((a, b) => a.f - b.f);
      const current = openSet.shift()!;
      const currentKey = `${current.x},${current.y}`;

      // Check if we've reached the goal (or close enough)
      const distToEnd = Math.abs(current.x - endX) + Math.abs(current.y - endY);
      if (distToEnd <= 1 || (current.x === endX && current.y === endY)) {
        // Reconstruct path
        const path: { x: number; y: number }[] = [];
        let node: PathNode | null = current;
        while (node) {
          path.unshift({ x: node.x, y: node.y });
          node = node.parent;
        }
        return path;
      }

      closedSet.add(currentKey);

      // Check neighbors
      const neighbors = [
        { x: current.x + 1, y: current.y },
        { x: current.x - 1, y: current.y },
        { x: current.x, y: current.y + 1 },
        { x: current.x, y: current.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const neighborKey = `${neighbor.x},${neighbor.y}`;

        if (closedSet.has(neighborKey)) continue;
        if (!this.isWalkable(neighbor.x, neighbor.y)) continue;

        const g = current.g + 1;
        const h = this.heuristic(neighbor.x, neighbor.y, endX, endY);
        const f = g + h;

        const existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);

        if (existingNode) {
          if (g < existingNode.g) {
            existingNode.g = g;
            existingNode.f = f;
            existingNode.parent = current;
          }
        } else {
          openSet.push({
            x: neighbor.x,
            y: neighbor.y,
            g,
            h,
            f,
            parent: current,
          });
        }
      }

      // Limit search to prevent infinite loops
      if (closedSet.size > 5000) {
        return [];
      }
    }

    return [];
  }

  private heuristic(x1: number, y1: number, x2: number, y2: number): number {
    // Manhattan distance
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  getWalkableDirections(): Direction[] {
    const walkable: Direction[] = [];
    for (const dir of [Direction.Up, Direction.Down, Direction.Left, Direction.Right]) {
      const vec = directionVectors[dir];
      if (this.isWalkable(this.gridX + vec.dx, this.gridY + vec.dy)) {
        walkable.push(dir);
      }
    }
    return walkable;
  }

  private isWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    const cell = this.grid[y]?.[x];
    if (!cell) return false;

    const tileType = cell.type;

    // Buildings are never walkable
    if (tileType === TileType.Building) return false;

    // Check if walkable tile type
    const isWalkableTile = (
      tileType === TileType.Road ||
      tileType === TileType.Tile ||
      tileType === TileType.Grass ||
      tileType === TileType.Snow ||
      tileType === TileType.Asphalt
    );

    if (!isWalkableTile) return false;

    return true;
  }

  private gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + (gridX - gridY) * (TILE_WIDTH / 2),
      y: GRID_OFFSET_Y + (gridX + gridY) * (TILE_HEIGHT / 2),
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private getTextureKey(): string {
    const dirMap: Record<Direction, string> = {
      [Direction.Up]: "north",
      [Direction.Down]: "south",
      [Direction.Left]: "west",
      [Direction.Right]: "east",
    };
    return `${this.characterType}_${dirMap[this.direction]}`;
  }

  private emitPositionChange(): void {
    this.onPositionChange?.({
      gridX: this.gridX,
      gridY: this.gridY,
      worldX: this.worldX,
      worldY: this.worldY,
      direction: this.direction,
      state: this.state,
      characterType: this.characterType,
      walkableDirections: this.getWalkableDirections(),
    });
  }

  render(depthFromSortPoint: (x: number, y: number, offset: number) => number): void {
    if (!this.isReady) return;

    const textureKey = this.getTextureKey();

    if (!this.sprite) {
      // Create sprite
      if (this.scene.textures.exists(textureKey)) {
        this.sprite = this.scene.add.sprite(this.worldX, this.worldY, textureKey, 0);
        this.sprite.setOrigin(0.5, 1);
      }
    }

    if (this.sprite) {
      this.sprite.setPosition(this.worldX, this.worldY);

      // Calculate depth from grid position (consistent with NPCs and characters)
      // This ensures correct depth sorting with buildings while keeping smooth movement
      const screenPos = this.gridToScreen(this.gridX, this.gridY);
      const groundY = screenPos.y + TILE_HEIGHT / 2;
      this.sprite.setDepth(depthFromSortPoint(screenPos.x, groundY, 0.3));

      // Update animation
      if (this.scene.textures.exists(textureKey)) {
        playGifAnimation(this.sprite, textureKey);
      }

      // Create pointer if it doesn't exist
      if (!this.pointer) {
        this.pointer = this.scene.add.graphics();
        this.drawPointer();
      }

      // Update pointer bounce animation
      this.pointerBounceOffset += 0.15 * this.pointerBounceDirection;
      if (this.pointerBounceOffset > 4) this.pointerBounceDirection = -1;
      if (this.pointerBounceOffset < 0) this.pointerBounceDirection = 1;

      // Position pointer above player (with bounce)
      const pointerY = this.worldY - 50 - this.pointerBounceOffset;
      this.pointer.setPosition(this.worldX, pointerY);
      this.pointer.setDepth(20_000_000); // Always on top
    }
  }

  private drawPointer(): void {
    if (!this.pointer) return;

    this.pointer.clear();

    // Pixel-art style downward arrow
    // Using a simple blocky triangle design
    const color = 0xFFD700; // Gold/yellow color
    const outlineColor = 0x000000; // Black outline

    // Draw black outline first (slightly larger)
    this.pointer.fillStyle(outlineColor, 1);
    // Outer triangle outline
    this.pointer.fillRect(-7, -2, 14, 4);  // Top bar
    this.pointer.fillRect(-5, 2, 10, 4);   // Second row
    this.pointer.fillRect(-3, 6, 6, 4);    // Third row
    this.pointer.fillRect(-1, 10, 2, 4);   // Point

    // Draw inner colored arrow
    this.pointer.fillStyle(color, 1);
    this.pointer.fillRect(-5, 0, 10, 2);   // Top bar inner
    this.pointer.fillRect(-3, 2, 6, 4);    // Second row inner
    this.pointer.fillRect(-1, 6, 2, 4);    // Third row inner
  }

  getPosition(): { gridX: number; gridY: number; worldX: number; worldY: number } {
    return {
      gridX: this.gridX,
      gridY: this.gridY,
      worldX: this.worldX,
      worldY: this.worldY,
    };
  }

  getDirection(): Direction {
    return this.direction;
  }

  getState(): PlayerState {
    return this.state;
  }

  isActive(): boolean {
    return this.isReady;
  }

  destroy(): void {
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
    if (this.pointer) {
      this.pointer.destroy();
      this.pointer = null;
    }
    this.isReady = false;
  }
}
