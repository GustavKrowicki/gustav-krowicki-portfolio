import Phaser from "phaser";
import {
  GridCell,
  Character,
  Car,
  TileType,
  Direction,
  CharacterType,
  CarType,
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  ToolType,
  CHARACTER_SPEED,
  CAR_SPEED,
  GameMode,
  PlayerState,
  NPCState,
  PlayerData,
  TRIGGER_ZONE_RADIUS,
} from "../types";
import { GRID_OFFSET_X, GRID_OFFSET_Y } from "./gameConfig";
import {
  ROAD_SEGMENT_SIZE,
  getRoadSegmentOrigin,
  getRoadConnections,
  getSegmentType,
  generateRoadPattern,
  canPlaceRoadSegment,
  getLaneDirection,
  isAtIntersection,
} from "../roadUtils";
import {
  BUILDINGS,
  getBuilding,
  getBuildingFootprint,
  BuildingDefinition,
} from "@/lib/city/buildings";
import { loadGifAsAnimation, playGifAnimation } from "./GifLoader";
import { PlayerController } from "./PlayerController";
import { NPCManager } from "./NPCManager";
import { TriggerZoneManager, TriggerZoneCallbacks } from "./TriggerZoneManager";
import { TourStop, TOUR_STOPS, findBuildingPosition } from "@/lib/city/tourStops";

// Event types for React communication
export interface SceneEvents {
  onTileClick: (x: number, y: number) => void;
  onTileHover: (x: number | null, y: number | null) => void;
  onTilesDrag?: (tiles: Array<{ x: number; y: number }>) => void;
  onEraserDrag?: (tiles: Array<{ x: number; y: number }>) => void;
  onRoadDrag?: (segments: Array<{ x: number; y: number }>) => void;
}

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Direction vectors for movement
const directionVectors: Record<Direction, { dx: number; dy: number }> = {
  [Direction.Up]: { dx: 0, dy: -1 },
  [Direction.Down]: { dx: 0, dy: 1 },
  [Direction.Left]: { dx: -1, dy: 0 },
  [Direction.Right]: { dx: 1, dy: 0 },
};

// Opposite directions
const oppositeDirection: Record<Direction, Direction> = {
  [Direction.Up]: Direction.Down,
  [Direction.Down]: Direction.Up,
  [Direction.Left]: Direction.Right,
  [Direction.Right]: Direction.Left,
};

// All directions as array
const allDirections = [
  Direction.Up,
  Direction.Down,
  Direction.Left,
  Direction.Right,
];

// Deterministic snow variant based on grid position
function getSnowTextureKey(x: number, y: number): string {
  const variant = ((x * 7 + y * 13) % 3) + 1;
  return `snow_${variant}`;
}

export class MainScene extends Phaser.Scene {
  private readonly DEPTH_Y_MULT = 10000;

  // Sprite containers
  private tileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private buildingSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private glowSprites: Map<string, Phaser.GameObjects.GameObject> = new Map();
  private carSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private characterSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private previewSprites: Phaser.GameObjects.Image[] = [];

  // Game state
  private grid: GridCell[][] = [];
  private characters: Character[] = [];
  private cars: Car[] = [];

  // Tool state
  private selectedTool: ToolType = ToolType.RoadNetwork;
  private selectedBuildingId: string | null = null;
  private buildingOrientation: Direction = Direction.Down;
  private hoverTile: { x: number; y: number } | null = null;

  // Event callbacks
  private events_: SceneEvents = {
    onTileClick: () => {},
    onTileHover: () => {},
  };

  // Zoom level
  private zoomLevel: number = 1;
  private zoomHandledInternally: boolean = false;

  // Scene ready flag
  private isReady: boolean = false;
  private gifsLoaded: boolean = false;
  private pendingGrid: GridCell[][] | null = null;

  // Debug flags
  private showPaths: boolean = false;
  private pathOverlaySprites: Phaser.GameObjects.Graphics | null = null;
  private showWalkability: boolean = false;
  private walkabilityOverlay: Phaser.GameObjects.Graphics | null = null;

  // Driving mode state
  private isPlayerDriving: boolean = false;
  private playerCar: Car | null = null;
  private pressedKeys: Set<string> = new Set();

  // Keyboard controls
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };
  private readonly CAMERA_SPEED = 8;

  // Dirty flags
  private gridDirty: boolean = false;
  private gridDirtyTiles: Set<string> = new Set();

  // Stats display
  private statsText: Phaser.GameObjects.Text | null = null;
  private showStats: boolean = true;

  // Drag state
  private isDragging: boolean = false;
  private dragTiles: Set<string> = new Set();
  private dragStartTile: { x: number; y: number } | null = null;
  private dragDirection: "horizontal" | "vertical" | null = null;

  // Camera panning state
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private baseScrollX: number = 0;
  private baseScrollY: number = 0;

  // Screen shake
  private shakeAxis: "x" | "y" = "y";
  private shakeOffset: number = 0;
  private shakeDuration: number = 0;
  private shakeIntensity: number = 0;
  private shakeElapsed: number = 0;
  private shakeCycles: number = 3;

  // Adventure mode state
  private gameMode: GameMode = GameMode.Viewer;
  private playerController: PlayerController | null = null;
  private npcManager: NPCManager | null = null;
  private triggerZoneManager: TriggerZoneManager | null = null;
  private visitedBuildings: Set<string> = new Set();
  private isAdventureActive: boolean = false;
  private cameraFollowPlayer: boolean = false;

  constructor() {
    super({ key: "MainScene" });
  }

  preload(): void {
    // Load tile textures
    this.load.image("grass", "/game/pogicity/Tiles/1x1grass.png");
    this.load.image("road", "/game/pogicity/Tiles/1x1square_tile.png");
    this.load.image("asphalt", "/game/pogicity/Tiles/1x1asphalt_tile.png");
    this.load.image("snow_1", "/game/pogicity/Tiles/1x1snow_tile_1.png");
    this.load.image("snow_2", "/game/pogicity/Tiles/1x1snow_tile_2.png");
    this.load.image("snow_3", "/game/pogicity/Tiles/1x1snow_tile_3.png");

    // Load building textures from registry
    for (const building of Object.values(BUILDINGS)) {
      for (const [dir, path] of Object.entries(building.sprites)) {
        const key = `${building.id}_${dir}`;
        this.load.image(key, path);
      }
    }

    // Load car textures
    const carTypes = ["jeep", "taxi"];
    const directions = ["n", "s", "e", "w"];
    for (const car of carTypes) {
      for (const dir of directions) {
        this.load.image(`${car}_${dir}`, `/game/pogicity/cars/${car}${dir}.png`);
      }
    }
  }

  create(): void {
    // Set up keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
    }

    // Initialize grid - use pending grid if available, otherwise create empty
    if (this.pendingGrid) {
      this.grid = this.pendingGrid;
      this.pendingGrid = null;
    } else {
      this.initializeGrid();
    }
    this.isReady = true;

    // Enable input
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("wheel", this.handleWheel, this);

    // Initial render
    this.renderGrid();

    // Load character animations
    this.loadCharacterAnimations();

    // Create stats display
    this.statsText = this.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#00ff00",
      backgroundColor: "rgba(0,0,0,0.7)",
      padding: { x: 8, y: 6 },
    });
    this.statsText.setScrollFactor(0);
    this.statsText.setDepth(2_000_000);
    this.statsText.setOrigin(1, 0);

    // Center the camera on the city grid
    // With Scale.FIT mode, the entire game canvas scales to fit the viewport
    const camera = this.cameras.main;
    const gridCenterX = GRID_WIDTH / 2;
    const gridCenterY = GRID_HEIGHT / 2;
    const centerScreenPos = this.gridToScreen(gridCenterX, gridCenterY);
    this.baseScrollX = centerScreenPos.x - camera.width / 2;
    this.baseScrollY = centerScreenPos.y - camera.height / 2;
    camera.setScroll(this.baseScrollX, this.baseScrollY);
  }

  private initializeGrid(): void {
    this.grid = Array.from({ length: GRID_HEIGHT }, (_, y) =>
      Array.from({ length: GRID_WIDTH }, (_, x) => ({
        type: TileType.Grass,
        x,
        y,
        isOrigin: true,
      }))
    );
  }

  private async loadCharacterAnimations(): Promise<void> {
    const charTypes = ["banana", "apple"];
    const charDirs = ["north", "south", "east", "west"];

    const loadPromises: Promise<void>[] = [];

    for (const char of charTypes) {
      for (const dir of charDirs) {
        const key = `${char}_${dir}`;
        const url = `/game/pogicity/Characters/${char}walk${dir}.gif`;
        loadPromises.push(loadGifAsAnimation(this, key, url));
      }
    }

    try {
      await Promise.all(loadPromises);
      this.gifsLoaded = true;
      if (this.characters.length > 0) {
        this.renderCharacters();
      }
    } catch (error) {
      console.error("Failed to load character animations:", error);
    }
  }

  update(_time: number, delta: number): void {
    if (!this.isReady) return;

    this.updateCharacters();
    this.updateCars();
    this.updateCamera(delta);
    this.renderCars();
    this.renderCharacters();

    // Adventure mode updates
    if (this.isAdventureActive) {
      this.updateAdventureMode();
    }

    if (this.gridDirty) {
      this.applyGridUpdates();
      this.gridDirty = false;
    }

    this.updateStatsDisplay();
  }

  private updateAdventureMode(): void {
    if (!this.playerController || !this.triggerZoneManager || !this.npcManager) return;

    // Update player
    this.playerController.update();

    // Get player position
    const playerPos = this.playerController.getPosition();

    // Check trigger zones
    this.triggerZoneManager.checkPlayerPosition(playerPos.gridX, playerPos.gridY);

    // Alert nearby NPCs
    this.npcManager.alertNearbyNPCs(playerPos.gridX, playerPos.gridY, TRIGGER_ZONE_RADIUS + 1);

    // Render player
    this.playerController.render((x, y, offset) => this.depthFromSortPoint(x, y, offset));

    // Render NPCs (only if not visited)
    this.npcManager.render(
      this.visitedBuildings,
      playerPos.gridX,
      playerPos.gridY,
      (x, y, offset) => this.depthFromSortPoint(x, y, offset),
      this.gifsLoaded
    );

    // Render numbered markers
    this.npcManager.renderMarkers(
      this.visitedBuildings,
      (x, y, offset) => this.depthFromSortPoint(x, y, offset)
    );

    // Camera follow player
    if (this.cameraFollowPlayer) {
      this.updateCameraFollowPlayer(playerPos.worldX, playerPos.worldY);
    }
  }

  private updateCameraFollowPlayer(playerWorldX: number, playerWorldY: number): void {
    const camera = this.cameras.main;

    // Dead zone - only move camera when player gets near edge
    const deadZoneX = camera.width * 0.2;
    const deadZoneY = camera.height * 0.2;

    // Calculate where player is on screen
    const playerScreenX = playerWorldX - this.baseScrollX;
    const playerScreenY = playerWorldY - this.baseScrollY;

    // Check if player is outside dead zone
    if (playerScreenX < deadZoneX) {
      this.baseScrollX -= (deadZoneX - playerScreenX) * 0.1;
    } else if (playerScreenX > camera.width - deadZoneX) {
      this.baseScrollX += (playerScreenX - (camera.width - deadZoneX)) * 0.1;
    }

    if (playerScreenY < deadZoneY) {
      this.baseScrollY -= (deadZoneY - playerScreenY) * 0.1;
    } else if (playerScreenY > camera.height - deadZoneY) {
      this.baseScrollY += (playerScreenY - (camera.height - deadZoneY)) * 0.1;
    }
  }

  private updateStatsDisplay(): void {
    if (!this.statsText || !this.showStats) {
      if (this.statsText) this.statsText.setVisible(false);
      return;
    }

    this.statsText.setVisible(true);
    const camera = this.cameras.main;
    this.statsText.setPosition(camera.width - 10, 60);

    const fps = Math.round(this.game.loop.actualFps);
    const charCount = this.characters.length;
    const carCount = this.cars.length + (this.playerCar ? 1 : 0);

    let fpsColor = "#00ff00";
    if (fps < 50) fpsColor = "#ffff00";
    if (fps < 30) fpsColor = "#ff0000";

    this.statsText.setText(
      [`FPS: ${fps}`, `Characters: ${charCount}`, `Cars: ${carCount}`].join("\n")
    );
    this.statsText.setColor(fpsColor);
  }

  private updateCamera(delta: number): void {
    if (!this.cursors) return;

    const camera = this.cameras.main;

    // Update screen shake
    if (this.shakeElapsed < this.shakeDuration) {
      this.shakeElapsed += delta;
      const t = Math.min(this.shakeElapsed / this.shakeDuration, 1);
      const baseEnvelope = (1 - t) * (1 - t);
      const boost = 0.1;
      const envelope = baseEnvelope * (1 + boost * (1 - t));
      const phaseT = Math.sqrt(t);
      const wave =
        Math.sin(phaseT * this.shakeCycles * Math.PI * 2) *
        this.shakeIntensity *
        envelope;
      this.shakeOffset = wave < 0 ? wave * 0.45 : wave;
    } else {
      this.shakeOffset = 0;
    }

    // Manual camera movement (disabled in adventure mode - player movement handles keys)
    if (!this.isAdventureActive) {
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement)?.isContentEditable);

      if (!isTyping) {
        const speed = this.CAMERA_SPEED / camera.zoom;
        if (this.cursors.left.isDown || this.wasd?.A.isDown) {
          this.baseScrollX -= speed;
        }
        if (this.cursors.right.isDown || this.wasd?.D.isDown) {
          this.baseScrollX += speed;
        }
        if (this.cursors.up.isDown || this.wasd?.W.isDown) {
          this.baseScrollY -= speed;
        }
        if (this.cursors.down.isDown || this.wasd?.S.isDown) {
          this.baseScrollY += speed;
        }
      }
    }

    camera.setScroll(
      Math.round(this.baseScrollX + (this.shakeAxis === "x" ? this.shakeOffset : 0)),
      Math.round(this.baseScrollY + (this.shakeAxis === "y" ? this.shakeOffset : 0))
    );
  }

  shakeScreen(
    axis: "x" | "y" = "y",
    intensity: number = 2,
    duration: number = 150
  ): void {
    this.shakeAxis = axis;
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeElapsed = 0;
  }

  // CHARACTER LOGIC
  private updateCharacters(): void {
    for (let i = 0; i < this.characters.length; i++) {
      this.characters[i] = this.updateSingleCharacter(this.characters[i]);
    }
  }

  private isWalkable(x: number, y: number): boolean {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return false;
    const tileType = this.grid[gy][gx].type;
    return tileType === TileType.Road || tileType === TileType.Tile;
  }

  private getValidDirections(tileX: number, tileY: number): Direction[] {
    const valid: Direction[] = [];
    for (const dir of allDirections) {
      const vec = directionVectors[dir];
      if (this.isWalkable(tileX + vec.dx, tileY + vec.dy)) {
        valid.push(dir);
      }
    }
    return valid;
  }

  private pickNewDirection(
    tileX: number,
    tileY: number,
    currentDir: Direction
  ): Direction | null {
    const validDirs = this.getValidDirections(tileX, tileY);
    if (validDirs.length === 0) return null;

    const opposite = oppositeDirection[currentDir];
    const preferredDirs = validDirs.filter((d) => d !== opposite);

    if (preferredDirs.includes(currentDir) && Math.random() < 0.6) {
      return currentDir;
    }

    const choices = preferredDirs.length > 0 ? preferredDirs : validDirs;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  private updateSingleCharacter(char: Character): Character {
    const { x, y, direction, speed } = char;
    const vec = directionVectors[direction];
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    if (!this.isWalkable(tileX, tileY)) {
      const walkableTiles: { x: number; y: number }[] = [];
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          const tileType = this.grid[gy][gx].type;
          if (tileType === TileType.Road || tileType === TileType.Tile) {
            walkableTiles.push({ x: gx, y: gy });
          }
        }
      }
      if (walkableTiles.length > 0) {
        const newTile = walkableTiles[Math.floor(Math.random() * walkableTiles.length)];
        return {
          ...char,
          x: newTile.x + 0.5,
          y: newTile.y + 0.5,
          direction: allDirections[Math.floor(Math.random() * allDirections.length)],
        };
      }
      return char;
    }

    const inTileX = x - tileX;
    const inTileY = y - tileY;
    const threshold = speed * 3;
    const nearCenter =
      Math.abs(inTileX - 0.5) < threshold && Math.abs(inTileY - 0.5) < threshold;

    let newDirection = direction;
    let nextX = x;
    let nextY = y;

    if (nearCenter) {
      const nextTileX = tileX + vec.dx;
      const nextTileY = tileY + vec.dy;

      if (!this.isWalkable(nextTileX, nextTileY)) {
        const newDir = this.pickNewDirection(tileX, tileY, direction);
        if (newDir) {
          newDirection = newDir;
        }
        nextX = tileX + 0.5;
        nextY = tileY + 0.5;
      } else {
        const validDirs = this.getValidDirections(tileX, tileY);
        if (validDirs.length > 2 && Math.random() < 0.1) {
          const newDir = this.pickNewDirection(tileX, tileY, direction);
          if (newDir) {
            newDirection = newDir;
            nextX = tileX + 0.5;
            nextY = tileY + 0.5;
          }
        }
      }
    }

    const moveVec = directionVectors[newDirection];
    nextX += moveVec.dx * speed;
    nextY += moveVec.dy * speed;

    const finalTileX = Math.floor(nextX);
    const finalTileY = Math.floor(nextY);

    if (!this.isWalkable(finalTileX, finalTileY)) {
      return {
        ...char,
        x: tileX + 0.5,
        y: tileY + 0.5,
        direction: newDirection,
      };
    }

    return { ...char, x: nextX, y: nextY, direction: newDirection };
  }

  // CAR LOGIC
  private updateCars(): void {
    for (let i = 0; i < this.cars.length; i++) {
      this.cars[i] = this.updateSingleCar(this.cars[i]);
    }
  }

  private isDrivable(x: number, y: number): boolean {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return false;
    return this.grid[gy][gx].type === TileType.Asphalt;
  }

  private getValidCarDirections(tileX: number, tileY: number): Direction[] {
    const valid: Direction[] = [];
    for (const dir of allDirections) {
      const vec = directionVectors[dir];
      if (this.isDrivable(tileX + vec.dx, tileY + vec.dy)) {
        valid.push(dir);
      }
    }
    return valid;
  }

  private updateSingleCar(car: Car): Car {
    const { x, y, direction, speed, waiting } = car;
    const vec = directionVectors[direction];
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    if (!this.isDrivable(tileX, tileY)) {
      const asphaltTiles: { x: number; y: number }[] = [];
      for (let gy = 0; gy < GRID_HEIGHT; gy++) {
        for (let gx = 0; gx < GRID_WIDTH; gx++) {
          if (this.grid[gy][gx].type === TileType.Asphalt) {
            asphaltTiles.push({ x: gx, y: gy });
          }
        }
      }
      if (asphaltTiles.length > 0) {
        const newTile = asphaltTiles[Math.floor(Math.random() * asphaltTiles.length)];
        const laneDir = getLaneDirection(newTile.x, newTile.y, this.grid);
        return {
          ...car,
          x: newTile.x + 0.5,
          y: newTile.y + 0.5,
          direction: laneDir || Direction.Right,
          waiting: 0,
        };
      }
      return car;
    }

    const inTileX = x - tileX;
    const inTileY = y - tileY;
    const threshold = speed * 2;
    const nearCenter =
      Math.abs(inTileX - 0.5) < threshold && Math.abs(inTileY - 0.5) < threshold;

    let newDirection = direction;
    let nextX = x;
    let nextY = y;

    if (nearCenter) {
      const nextTileX = tileX + vec.dx;
      const nextTileY = tileY + vec.dy;

      if (!this.isDrivable(nextTileX, nextTileY)) {
        const validDirs = this.getValidCarDirections(tileX, tileY);
        if (validDirs.length > 0) {
          const opposite = oppositeDirection[direction];
          const choices = validDirs.filter((d) => d !== opposite);
          newDirection = choices.length > 0
            ? choices[Math.floor(Math.random() * choices.length)]
            : validDirs[0];
        }
        nextX = tileX + 0.5;
        nextY = tileY + 0.5;
      }
    }

    const moveVec = directionVectors[newDirection];
    nextX += moveVec.dx * speed;
    nextY += moveVec.dy * speed;

    const finalTileX = Math.floor(nextX);
    const finalTileY = Math.floor(nextY);

    if (!this.isDrivable(finalTileX, finalTileY)) {
      return {
        ...car,
        x: tileX + 0.5,
        y: tileY + 0.5,
        direction: newDirection,
        waiting: 0,
      };
    }

    return { ...car, x: nextX, y: nextY, direction: newDirection, waiting: 0 };
  }

  // PUBLIC METHODS
  gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + (gridX - gridY) * (TILE_WIDTH / 2),
      y: GRID_OFFSET_Y + (gridX + gridY) * (TILE_HEIGHT / 2),
    };
  }

  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    const relX = screenX - GRID_OFFSET_X;
    const relY = screenY - GRID_OFFSET_Y;
    return {
      x: (relX / (TILE_WIDTH / 2) + relY / (TILE_HEIGHT / 2)) / 2,
      y: (relY / (TILE_HEIGHT / 2) - relX / (TILE_WIDTH / 2)) / 2,
    };
  }

  private depthFromSortPoint(sortX: number, sortY: number, layerOffset: number = 0): number {
    return sortY * this.DEPTH_Y_MULT + sortX + layerOffset;
  }

  handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isReady) return;

    if (this.isPanning && pointer.leftButtonDown()) {
      const camera = this.cameras.main;
      const dx = (this.panStartX - pointer.x) / camera.zoom;
      const dy = (this.panStartY - pointer.y) / camera.zoom;
      this.baseScrollX = this.cameraStartX + dx;
      this.baseScrollY = this.cameraStartY + dy;
      camera.setScroll(
        Math.round(this.baseScrollX + (this.shakeAxis === "x" ? this.shakeOffset : 0)),
        Math.round(this.baseScrollY + (this.shakeAxis === "y" ? this.shakeOffset : 0))
      );
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const gridPos = this.screenToGrid(worldPoint.x, worldPoint.y);
    const tileX = Math.floor(gridPos.x);
    const tileY = Math.floor(gridPos.y);

    if (tileX >= 0 && tileX < GRID_WIDTH && tileY >= 0 && tileY < GRID_HEIGHT) {
      if (!this.hoverTile || this.hoverTile.x !== tileX || this.hoverTile.y !== tileY) {
        this.hoverTile = { x: tileX, y: tileY };
        this.events_.onTileHover(tileX, tileY);

        if (this.isDragging && (
          this.selectedTool === ToolType.Snow ||
          this.selectedTool === ToolType.Tile ||
          this.selectedTool === ToolType.Asphalt ||
          this.selectedTool === ToolType.Eraser
        )) {
          this.dragTiles.add(`${tileX},${tileY}`);
        }

        if (this.isDragging && this.selectedTool === ToolType.RoadNetwork && this.dragStartTile) {
          if (this.dragDirection === null) {
            const dx = Math.abs(tileX - this.dragStartTile.x);
            const dy = Math.abs(tileY - this.dragStartTile.y);
            if (dx > dy) {
              this.dragDirection = "horizontal";
            } else if (dy > dx) {
              this.dragDirection = "vertical";
            }
          }

          this.dragTiles.clear();
          if (this.dragDirection === "horizontal") {
            const startX = Math.min(this.dragStartTile.x, tileX);
            const endX = Math.max(this.dragStartTile.x, tileX);
            const startSegment = getRoadSegmentOrigin(startX, this.dragStartTile.y);
            const endSegment = getRoadSegmentOrigin(endX, this.dragStartTile.y);
            for (let segX = startSegment.x; segX <= endSegment.x; segX += ROAD_SEGMENT_SIZE) {
              this.dragTiles.add(`${segX},${startSegment.y}`);
            }
          } else if (this.dragDirection === "vertical") {
            const startY = Math.min(this.dragStartTile.y, tileY);
            const endY = Math.max(this.dragStartTile.y, tileY);
            const startSegment = getRoadSegmentOrigin(this.dragStartTile.x, startY);
            const endSegment = getRoadSegmentOrigin(this.dragStartTile.x, endY);
            for (let segY = startSegment.y; segY <= endSegment.y; segY += ROAD_SEGMENT_SIZE) {
              this.dragTiles.add(`${startSegment.x},${segY}`);
            }
          }
        }

        this.updatePreview();
      }
    } else {
      if (this.hoverTile) {
        this.hoverTile = null;
        this.events_.onTileHover(null, null);
        this.clearPreview();
      }
    }
  }

  handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.isReady) return;

    if (pointer.leftButtonDown()) {
      const shouldPan = this.selectedTool === ToolType.None ||
        (this.selectedTool === ToolType.Building && !this.hoverTile);

      if (shouldPan) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.cameraStartX = this.baseScrollX;
        this.cameraStartY = this.baseScrollY;
        return;
      }

      if (this.hoverTile) {
        if (
          this.selectedTool === ToolType.Snow ||
          this.selectedTool === ToolType.Tile ||
          this.selectedTool === ToolType.Asphalt ||
          this.selectedTool === ToolType.Eraser ||
          this.selectedTool === ToolType.RoadNetwork
        ) {
          this.isDragging = true;
          this.dragTiles.clear();
          this.dragStartTile = { x: this.hoverTile.x, y: this.hoverTile.y };
          this.dragDirection = null;

          if (this.selectedTool === ToolType.RoadNetwork) {
            const segmentOrigin = getRoadSegmentOrigin(this.hoverTile.x, this.hoverTile.y);
            this.dragTiles.add(`${segmentOrigin.x},${segmentOrigin.y}`);
          } else {
            this.dragTiles.add(`${this.hoverTile.x},${this.hoverTile.y}`);
          }
          this.updatePreview();
        } else {
          this.events_.onTileClick(this.hoverTile.x, this.hoverTile.y);
        }
      }
    }
  }

  handlePointerUp(_pointer: Phaser.Input.Pointer): void {
    if (!this.isReady) return;

    if (this.isPanning) {
      this.isPanning = false;
    }

    if (this.isDragging) {
      const tiles = Array.from(this.dragTiles).map((key) => {
        const [x, y] = key.split(",").map(Number);
        return { x, y };
      });

      if (tiles.length > 0) {
        if (this.selectedTool === ToolType.Eraser && this.events_.onEraserDrag) {
          this.events_.onEraserDrag(tiles);
        } else if (this.selectedTool === ToolType.RoadNetwork && this.events_.onRoadDrag) {
          this.events_.onRoadDrag(tiles);
        } else if (this.events_.onTilesDrag) {
          this.events_.onTilesDrag(tiles);
        }
      }

      this.isDragging = false;
      this.dragTiles.clear();
      this.dragStartTile = null;
      this.dragDirection = null;
      this.updatePreview();
    }
  }

  private static readonly ZOOM_LEVELS = [0.25, 0.5, 1, 2, 4];
  private wheelAccumulator = 0;
  private lastWheelDirection = 0;

  handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    _deltaX: number,
    deltaY: number,
    _deltaZ: number
  ): void {
    if (!this.isReady) return;

    const camera = this.cameras.main;
    const WHEEL_THRESHOLD = 100;

    const direction = deltaY > 0 ? 1 : -1;
    if (this.lastWheelDirection !== 0 && this.lastWheelDirection !== direction) {
      this.wheelAccumulator = 0;
    }
    this.lastWheelDirection = direction;
    this.wheelAccumulator += Math.abs(deltaY);

    if (this.wheelAccumulator < WHEEL_THRESHOLD) return;
    this.wheelAccumulator = 0;

    const currentZoom = camera.zoom;
    let currentIndex = MainScene.ZOOM_LEVELS.indexOf(currentZoom);
    if (currentIndex === -1) {
      currentIndex = MainScene.ZOOM_LEVELS.reduce((closest, z, i) =>
        Math.abs(z - currentZoom) < Math.abs(MainScene.ZOOM_LEVELS[closest] - currentZoom)
          ? i
          : closest,
        0
      );
    }

    const newIndex = direction > 0
      ? Math.max(0, currentIndex - 1)
      : Math.min(MainScene.ZOOM_LEVELS.length - 1, currentIndex + 1);

    const newZoom = MainScene.ZOOM_LEVELS[newIndex];
    if (newZoom === currentZoom) return;

    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    camera.zoom = newZoom;
    camera.preRender();
    const newWorldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    camera.scrollX -= newWorldPoint.x - worldPoint.x;
    camera.scrollY -= newWorldPoint.y - worldPoint.y;

    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
    this.zoomLevel = newZoom;
    this.zoomHandledInternally = true;

    this.events.emit("zoomChanged", newZoom);
  }

  setEventCallbacks(events: SceneEvents): void {
    this.events_ = events;
  }

  updateGrid(newGrid: GridCell[][]): void {
    // If scene isn't ready yet, store the grid for later
    if (!this.isReady) {
      this.pendingGrid = newGrid;
      return;
    }

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const oldCell = this.grid[y]?.[x];
        const newCell = newGrid[y]?.[x];
        if (!oldCell || !newCell) continue;

        if (
          oldCell.type !== newCell.type ||
          oldCell.buildingId !== newCell.buildingId ||
          oldCell.isOrigin !== newCell.isOrigin ||
          oldCell.buildingOrientation !== newCell.buildingOrientation ||
          oldCell.underlyingTileType !== newCell.underlyingTileType
        ) {
          this.gridDirtyTiles.add(`${x},${y}`);
        }
      }
    }

    this.grid = newGrid;

    if (this.gridDirtyTiles.size > 0) {
      this.gridDirty = true;
    }

    this.updatePreview();
  }

  private applyGridUpdates(): void {
    const buildingsToRender = new Set<string>();
    const buildingsToRemove = new Set<string>();

    for (const key of this.gridDirtyTiles) {
      const [xStr, yStr] = key.split(",");
      const x = parseInt(xStr);
      const y = parseInt(yStr);
      const cell = this.grid[y]?.[x];
      if (!cell) continue;

      this.updateTileSprite(x, y, cell);

      if (cell.type === TileType.Building && cell.isOrigin && cell.buildingId) {
        buildingsToRender.add(`${x},${y}`);
      }

      const oldBuildingKey = `building_${x},${y}`;
      if (
        this.buildingSprites.has(oldBuildingKey) &&
        (cell.type !== TileType.Building || !cell.isOrigin)
      ) {
        buildingsToRemove.add(oldBuildingKey);
      }
    }

    for (const key of buildingsToRemove) {
      this.removeBuildingSprites(key);
    }

    for (const key of buildingsToRender) {
      const [xStr, yStr] = key.split(",");
      const x = parseInt(xStr);
      const y = parseInt(yStr);
      const cell = this.grid[y]?.[x];
      if (cell?.buildingId) {
        const buildingKey = `building_${x},${y}`;
        this.removeBuildingSprites(buildingKey);
        this.renderBuilding(x, y, cell.buildingId, cell.buildingOrientation);
      }
    }

    this.gridDirtyTiles.clear();
  }

  private updateTileSprite(x: number, y: number, cell: GridCell): void {
    const key = `${x},${y}`;
    const screenPos = this.gridToScreen(x, y);

    let textureKey = "grass";

    if (cell.type === TileType.Road) {
      textureKey = "road";
    } else if (cell.type === TileType.Asphalt) {
      textureKey = "asphalt";
    } else if (cell.type === TileType.Tile) {
      textureKey = "road";
    } else if (cell.type === TileType.Snow) {
      textureKey = getSnowTextureKey(x, y);
    } else if (cell.type === TileType.Building) {
      if (cell.buildingId) {
        const building = getBuilding(cell.buildingId);
        const preservesTile = building && (building.category === "props" || building.isDecoration);
        if (preservesTile && cell.underlyingTileType) {
          if (cell.underlyingTileType === TileType.Tile || cell.underlyingTileType === TileType.Road) {
            textureKey = "road";
          } else if (cell.underlyingTileType === TileType.Asphalt) {
            textureKey = "asphalt";
          } else if (cell.underlyingTileType === TileType.Snow) {
            textureKey = getSnowTextureKey(x, y);
          } else {
            textureKey = "grass";
          }
        } else if (preservesTile) {
          textureKey = "grass";
        } else {
          textureKey = "road";
        }
      } else {
        textureKey = "road";
      }
    }

    let tileSprite = this.tileSprites.get(key);
    const scale = textureKey.startsWith("snow_") ? 0.5 * 1.02 : 1.02;

    if (tileSprite) {
      tileSprite.setTexture(textureKey);
      tileSprite.setScale(scale);
    } else {
      tileSprite = this.add.image(screenPos.x, screenPos.y, textureKey);
      tileSprite.setOrigin(0.5, 0);
      tileSprite.setScale(scale);
      tileSprite.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y, 0));
      this.tileSprites.set(key, tileSprite);
    }
  }

  // SPAWN METHODS
  spawnCharacter(): boolean {
    // Guard against uninitialized grid
    if (!this.grid || this.grid.length === 0 || !this.grid[0]) return false;

    const roadTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!this.grid[y]?.[x]) continue;
        const tileType = this.grid[y][x].type;
        if (tileType === TileType.Road || tileType === TileType.Tile) {
          roadTiles.push({ x, y });
        }
      }
    }

    if (roadTiles.length === 0) return false;

    const roadTile = roadTiles[Math.floor(Math.random() * roadTiles.length)];
    const characterTypes = [CharacterType.Banana, CharacterType.Apple];
    const randomCharacterType = characterTypes[Math.floor(Math.random() * characterTypes.length)];

    const newCharacter: Character = {
      id: generateId(),
      x: roadTile.x + 0.5,
      y: roadTile.y + 0.5,
      direction: allDirections[Math.floor(Math.random() * allDirections.length)],
      speed: CHARACTER_SPEED,
      characterType: randomCharacterType,
    };

    this.characters.push(newCharacter);
    return true;
  }

  spawnCar(): boolean {
    // Guard against uninitialized grid
    if (!this.grid || this.grid.length === 0 || !this.grid[0]) return false;

    const asphaltTiles: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (!this.grid[y]?.[x]) continue;
        if (this.grid[y][x].type === TileType.Asphalt) {
          asphaltTiles.push({ x, y });
        }
      }
    }

    if (asphaltTiles.length === 0) return false;

    const asphaltTile = asphaltTiles[Math.floor(Math.random() * asphaltTiles.length)];
    const laneDir = getLaneDirection(asphaltTile.x, asphaltTile.y, this.grid);
    const carType = Math.random() < 0.5 ? CarType.Taxi : CarType.Jeep;

    const newCar: Car = {
      id: generateId(),
      x: asphaltTile.x + 0.5,
      y: asphaltTile.y + 0.5,
      direction: laneDir || Direction.Right,
      speed: CAR_SPEED + (Math.random() - 0.5) * 0.005,
      waiting: 0,
      carType,
    };

    this.cars.push(newCar);
    return true;
  }

  setDrivingState(isDriving: boolean): void {
    this.isPlayerDriving = isDriving;
    this.pressedKeys.clear();
  }

  getPlayerCar(): Car | null {
    return this.playerCar;
  }

  isPlayerDrivingMode(): boolean {
    return this.isPlayerDriving;
  }

  getCharacterCount(): number {
    return this.characters.length;
  }

  getCarCount(): number {
    return this.cars.length;
  }

  clearCharacters(): void {
    this.characters = [];
    this.characterSprites.forEach((sprite) => sprite.destroy());
    this.characterSprites.clear();
  }

  clearCars(): void {
    this.cars = [];
    this.carSprites.forEach((sprite) => sprite.destroy());
    this.carSprites.clear();
  }

  setSelectedTool(tool: ToolType): void {
    this.selectedTool = tool;
    if (this.isReady) {
      this.updatePreview();
    }
  }

  setSelectedBuilding(buildingId: string | null): void {
    this.selectedBuildingId = buildingId;
    if (this.isReady) {
      this.updatePreview();
    }
  }

  setBuildingOrientation(orientation: Direction): void {
    this.buildingOrientation = orientation;
    if (this.isReady) {
      this.updatePreview();
    }
  }

  setZoom(zoom: number): void {
    if (this.zoomHandledInternally) {
      this.zoomHandledInternally = false;
      return;
    }

    if (this.isReady) {
      const camera = this.cameras.main;
      const centerX = camera.midPoint.x;
      const centerY = camera.midPoint.y;
      camera.setZoom(zoom);
      camera.centerOn(centerX, centerY);
      camera.scrollX = Math.round(camera.scrollX);
      camera.scrollY = Math.round(camera.scrollY);
      this.baseScrollX = camera.scrollX;
      this.baseScrollY = camera.scrollY;
    }
    this.zoomLevel = zoom;
  }

  zoomAtPoint(zoom: number, screenX: number, screenY: number): void {
    if (!this.isReady) {
      this.zoomLevel = zoom;
      return;
    }

    const camera = this.cameras.main;
    const worldPoint = camera.getWorldPoint(screenX, screenY);
    camera.setZoom(zoom);
    camera.preRender();
    const newWorldPoint = camera.getWorldPoint(screenX, screenY);
    camera.scrollX = Math.round(camera.scrollX - (newWorldPoint.x - worldPoint.x));
    camera.scrollY = Math.round(camera.scrollY - (newWorldPoint.y - worldPoint.y));
    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
    this.zoomLevel = zoom;
  }

  setShowPaths(show: boolean): void {
    this.showPaths = show;
  }

  setShowStats(show: boolean): void {
    this.showStats = show;
  }

  toggleWalkabilityOverlay(): void {
    this.showWalkability = !this.showWalkability;
    if (this.showWalkability) {
      this.renderWalkabilityOverlay();
    } else {
      this.clearWalkabilityOverlay();
    }
  }

  private renderWalkabilityOverlay(): void {
    this.clearWalkabilityOverlay();

    this.walkabilityOverlay = this.add.graphics();
    this.walkabilityOverlay.setDepth(15_000_000); // Above all tiles and buildings

    const walkableTypes = [TileType.Road, TileType.Tile, TileType.Grass, TileType.Snow, TileType.Asphalt];

    // Helper to check if a cell is walkable (matches PlayerController logic)
    const isWalkableCell = (x: number, y: number): boolean => {
      if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
      const cell = this.grid[y]?.[x];
      if (!cell || !walkableTypes.includes(cell.type)) return false;
      return true;
    };

    // Flood fill from spawn point to find reachable tiles
    const spawnX = 15, spawnY = 30;
    const reachable = new Set<string>();
    const stack: [number, number][] = [[spawnX, spawnY]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      if (reachable.has(key)) continue;
      if (!isWalkableCell(x, y)) continue;

      reachable.add(key);
      stack.push([x+1, y], [x-1, y], [x, y+1], [x, y-1]);
    }

    // Render overlay for each tile
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (!cell) continue;

        const screenPos = this.gridToScreen(x, y);
        const key = `${x},${y}`;
        const canWalk = isWalkableCell(x, y);

        let color: number;
        let alpha: number;

        if (reachable.has(key)) {
          // Reachable - green
          color = 0x00ff00;
          alpha = 0.3;
        } else if (canWalk) {
          // Walkable but isolated - yellow/orange
          color = 0xffaa00;
          alpha = 0.5;
        } else {
          // Blocked - red
          color = 0xff0000;
          alpha = 0.2;
        }

        // Draw isometric diamond
        this.walkabilityOverlay.fillStyle(color, alpha);
        this.walkabilityOverlay.beginPath();
        this.walkabilityOverlay.moveTo(screenPos.x, screenPos.y - TILE_HEIGHT / 2);
        this.walkabilityOverlay.lineTo(screenPos.x + TILE_WIDTH / 2, screenPos.y);
        this.walkabilityOverlay.lineTo(screenPos.x, screenPos.y + TILE_HEIGHT / 2);
        this.walkabilityOverlay.lineTo(screenPos.x - TILE_WIDTH / 2, screenPos.y);
        this.walkabilityOverlay.closePath();
        this.walkabilityOverlay.fillPath();
      }
    }

  }

  private clearWalkabilityOverlay(): void {
    if (this.walkabilityOverlay) {
      this.walkabilityOverlay.destroy();
      this.walkabilityOverlay = null;
    }
  }

  // Tour navigation - smoothly pan camera to a grid position
  panToPosition(gridX: number, gridY: number): void {
    if (!this.isReady) return;

    const camera = this.cameras.main;

    // Set a tour zoom level (1.4 = zoomed in, enables panning)
    const tourZoom = 1.4;
    if (this.zoomLevel < tourZoom) {
      camera.setZoom(tourZoom);
      this.zoomLevel = tourZoom;
    }

    const screenPos = this.gridToScreen(gridX, gridY);

    // Calculate target scroll position to center on the building
    // Offset left by ~200px to account for the tour modal on the right side
    const modalOffset = 200;
    const targetScrollX = screenPos.x - camera.width / 2 - modalOffset;
    const targetScrollY = screenPos.y - camera.height / 2;

    // Animate the camera pan
    this.tweens.add({
      targets: this,
      baseScrollX: targetScrollX,
      baseScrollY: targetScrollY,
      duration: 800,
      ease: "Power2",
      onUpdate: () => {
        camera.setScroll(
          Math.round(this.baseScrollX + (this.shakeAxis === "x" ? this.shakeOffset : 0)),
          Math.round(this.baseScrollY + (this.shakeAxis === "y" ? this.shakeOffset : 0))
        );
      },
    });
  }

  // Highlighted building for tour
  private highlightedBuildingId: string | null = null;
  private highlightSprite: Phaser.GameObjects.Graphics | null = null;

  // ==================== ADVENTURE MODE PUBLIC API ====================

  startAdventureMode(characterType: CharacterType): void {
    if (this.isAdventureActive) return;

    this.gameMode = GameMode.Adventure;
    this.isAdventureActive = true;
    this.visitedBuildings.clear();

    // Initialize managers
    this.npcManager = new NPCManager(this);
    this.triggerZoneManager = new TriggerZoneManager(this);

    // Create player controller
    this.playerController = new PlayerController(this, this.grid);

    // Set up trigger zone callbacks
    this.triggerZoneManager.setCallbacks({
      onEnterZone: (zone, tourStop) => {
        this.events.emit("playerEnteredZone", { buildingId: zone.buildingId, tourStop });
      },
      onExitZone: (zone) => {
        this.events.emit("playerExitedZone", { buildingId: zone.buildingId });
      },
    });

    // Set up player position change callback
    this.playerController.setOnPositionChange((data: PlayerData) => {
      this.events.emit("playerPositionChanged", data);
    });

    // Helper to find building position
    const getBuildingPosition = (buildingId: string): { x: number; y: number } | null => {
      return findBuildingPosition(this.grid, buildingId);
    };

    // Spawn NPCs at landmarks
    this.npcManager.spawnNPCs(TOUR_STOPS, getBuildingPosition);

    // Set up trigger zones
    this.triggerZoneManager.setupZones(TOUR_STOPS, getBuildingPosition);

    // Find spawn position (on main road near Valtech area)
    const spawnPos = this.findWalkableSpawnPosition(15, 30);

    // Spawn player
    this.playerController.spawn(spawnPos.x, spawnPos.y, characterType);

    // Enable camera follow
    this.cameraFollowPlayer = true;

    // Set zoom for adventure mode
    const camera = this.cameras.main;
    camera.setZoom(1.5);
    this.zoomLevel = 1.5;

    // Center camera on player
    const screenPos = this.gridToScreen(spawnPos.x, spawnPos.y);
    this.baseScrollX = screenPos.x - camera.width / 2;
    this.baseScrollY = screenPos.y - camera.height / 2;

    // Set up keyboard handlers
    this.setupAdventureKeyboardHandlers();

    this.events.emit("adventureModeStarted");
  }

  private findWalkableSpawnPosition(preferX: number, preferY: number): { x: number; y: number } {
    // Check if preferred position is walkable
    if (this.isWalkable(preferX, preferY)) {
      return { x: preferX, y: preferY };
    }

    // Search in expanding rings around preferred position
    for (let radius = 1; radius < 10; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const x = preferX + dx;
          const y = preferY + dy;
          if (this.isWalkable(x, y)) {
            return { x, y };
          }
        }
      }
    }

    // Fallback: find any walkable tile
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.isWalkable(x, y)) {
          return { x, y };
        }
      }
    }

    return { x: preferX, y: preferY };
  }

  stopAdventureMode(): void {
    if (!this.isAdventureActive) return;

    this.isAdventureActive = false;
    this.gameMode = GameMode.Viewer;
    this.cameraFollowPlayer = false;

    // Clean up
    if (this.playerController) {
      this.playerController.destroy();
      this.playerController = null;
    }

    if (this.npcManager) {
      this.npcManager.destroy();
      this.npcManager = null;
    }

    if (this.triggerZoneManager) {
      this.triggerZoneManager.destroy();
      this.triggerZoneManager = null;
    }

    this.removeAdventureKeyboardHandlers();

    this.events.emit("adventureModeStopped");
  }

  private adventureKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private adventureKeyUpHandler: ((e: KeyboardEvent) => void) | null = null;

  private setupAdventureKeyboardHandlers(): void {
    this.adventureKeyDownHandler = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      const activeElement = document.activeElement;
      const isTyping =
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          (activeElement as HTMLElement)?.isContentEditable);

      if (isTyping) return;

      // Handle interaction key
      if (e.key === "e" || e.key === "E" || e.key === " ") {
        const activeZone = this.triggerZoneManager?.getActiveZone();
        const activeTourStop = this.triggerZoneManager?.getActiveTourStop();
        if (activeZone && activeTourStop) {
          e.preventDefault();
          this.events.emit("interactionTriggered", { tourStop: activeTourStop, buildingId: activeZone.buildingId });
        }
      }

      // Toggle walkability debug overlay (G key)
      if (e.key === "g" || e.key === "G") {
        this.toggleWalkabilityOverlay();
      }

      // Handle movement keys
      this.playerController?.handleKeyDown(e.key);
    };

    this.adventureKeyUpHandler = (e: KeyboardEvent) => {
      this.playerController?.handleKeyUp(e.key);
    };

    window.addEventListener("keydown", this.adventureKeyDownHandler);
    window.addEventListener("keyup", this.adventureKeyUpHandler);
  }

  private removeAdventureKeyboardHandlers(): void {
    if (this.adventureKeyDownHandler) {
      window.removeEventListener("keydown", this.adventureKeyDownHandler);
      this.adventureKeyDownHandler = null;
    }
    if (this.adventureKeyUpHandler) {
      window.removeEventListener("keyup", this.adventureKeyUpHandler);
      this.adventureKeyUpHandler = null;
    }
  }

  // Set player input direction (for mobile joystick)
  setPlayerInputDirection(direction: Direction | null): void {
    this.playerController?.setInputDirection(direction);
  }

  // Auto-walk player to building
  walkPlayerToBuilding(buildingId: string): boolean {
    if (!this.playerController) return false;

    const position = findBuildingPosition(this.grid, buildingId);
    if (!position) return false;

    // Find walkable position near building - try to get as close as possible
    // First try the building center, then adjacent tiles
    const candidates = [
      { x: Math.floor(position.x), y: Math.floor(position.y) },
      { x: Math.floor(position.x) + 1, y: Math.floor(position.y) },
      { x: Math.floor(position.x), y: Math.floor(position.y) + 1 },
      { x: Math.floor(position.x) + 1, y: Math.floor(position.y) + 1 },
      { x: Math.floor(position.x) - 1, y: Math.floor(position.y) },
      { x: Math.floor(position.x), y: Math.floor(position.y) - 1 },
    ];

    for (const candidate of candidates) {
      const targetPos = this.findWalkableSpawnPosition(candidate.x, candidate.y);
      // Check if the found position is close enough to the building
      const dist = Math.sqrt(
        Math.pow(targetPos.x - position.x, 2) + Math.pow(targetPos.y - position.y, 2)
      );
      if (dist <= 3) {
        return this.playerController.walkToBuilding(targetPos.x, targetPos.y, buildingId);
      }
    }

    // Fallback to original behavior
    const targetPos = this.findWalkableSpawnPosition(
      Math.floor(position.x + 1),
      Math.floor(position.y + 1)
    );

    return this.playerController.walkToBuilding(targetPos.x, targetPos.y, buildingId);
  }

  // Mark building as visited
  markBuildingVisited(buildingId: string): void {
    this.visitedBuildings.add(buildingId);
    this.events.emit("buildingVisited", { buildingId });
  }

  // Get visited buildings
  getVisitedBuildings(): Set<string> {
    return new Set(this.visitedBuildings);
  }

  // Check if adventure mode is active
  isAdventureModeActive(): boolean {
    return this.isAdventureActive;
  }

  // Get player state
  getPlayerState(): PlayerState | null {
    return this.playerController?.getState() || null;
  }

  // Trigger interaction programmatically
  triggerInteraction(): void {
    const activeZone = this.triggerZoneManager?.getActiveZone();
    const activeTourStop = this.triggerZoneManager?.getActiveTourStop();
    if (activeZone && activeTourStop) {
      this.events.emit("interactionTriggered", { tourStop: activeTourStop, buildingId: activeZone.buildingId });
    }
  }

  // ==================== END ADVENTURE MODE API ====================

  // ==================== LOGO OVERLAY API ====================

  // Get portfolio building positions for 3D logo overlay
  getPortfolioBuildingPositions(): Array<{
    buildingId: string;
    screenX: number;
    screenY: number;
    logoUrl: string;
    logoOffset: { x: number; y: number };
  }> {
    const positions: Array<{
      buildingId: string;
      screenX: number;
      screenY: number;
      logoUrl: string;
      logoOffset: { x: number; y: number };
    }> = [];

    if (!this.isReady || !this.grid) return positions;

    // Find all portfolio buildings with logos
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (!cell || !cell.buildingId || !cell.isOrigin) continue;

        const building = getBuilding(cell.buildingId);
        if (!building || building.category !== "portfolio" || !building.logoUrl) continue;

        // Get building footprint
        const footprint = getBuildingFootprint(building, cell.buildingOrientation);

        // Calculate center of building
        const centerX = x + footprint.width / 2;
        const centerY = y + footprint.height / 2;

        // Convert to screen position
        const screenPos = this.gridToScreen(centerX, centerY);

        // Position logo above building (offset upward)
        // The Y offset should place logo above the building sprite
        const logoOffsetY = 100 * this.zoomLevel;

        positions.push({
          buildingId: cell.buildingId,
          screenX: screenPos.x,
          screenY: screenPos.y - logoOffsetY,
          logoUrl: building.logoUrl,
          logoOffset: building.logoOffset || { x: 0, y: 60 },
        });
      }
    }

    return positions;
  }

  // Get camera state for syncing with overlay
  getCameraState(): { scrollX: number; scrollY: number; zoom: number; width: number; height: number } {
    const camera = this.cameras.main;
    return {
      scrollX: this.baseScrollX,
      scrollY: this.baseScrollY,
      zoom: camera.zoom,
      width: camera.width,
      height: camera.height,
    };
  }

  // ==================== END LOGO OVERLAY API ====================

  highlightBuilding(buildingId: string | null): void {
    // Clear existing highlight
    if (this.highlightSprite) {
      this.highlightSprite.destroy();
      this.highlightSprite = null;
    }

    this.highlightedBuildingId = buildingId;

    if (!buildingId || !this.isReady) return;

    // Find the building in the grid
    let buildingOrigin: { x: number; y: number } | null = null;
    let buildingCell: GridCell | null = null;

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (cell?.buildingId === buildingId && cell?.isOrigin) {
          buildingOrigin = { x, y };
          buildingCell = cell;
          break;
        }
      }
      if (buildingOrigin) break;
    }

    if (!buildingOrigin || !buildingCell) return;

    const building = getBuilding(buildingId);
    if (!building) return;

    const footprint = getBuildingFootprint(building, buildingCell.buildingOrientation);

    // Create highlight graphics
    this.highlightSprite = this.add.graphics();
    this.highlightSprite.setDepth(1_500_000);

    // Draw pulsing highlight around the building footprint
    const drawHighlight = (alpha: number) => {
      if (!this.highlightSprite || !buildingOrigin) return;

      this.highlightSprite.clear();
      this.highlightSprite.lineStyle(3, 0x4f94ef, alpha);
      this.highlightSprite.fillStyle(0x4f94ef, alpha * 0.15);

      // Draw isometric diamond for each tile
      for (let dy = 0; dy < footprint.height; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const tilePos = this.gridToScreen(buildingOrigin.x + dx, buildingOrigin.y + dy);
          this.highlightSprite.beginPath();
          this.highlightSprite.moveTo(tilePos.x, tilePos.y);
          this.highlightSprite.lineTo(tilePos.x + TILE_WIDTH / 2, tilePos.y + TILE_HEIGHT / 2);
          this.highlightSprite.lineTo(tilePos.x, tilePos.y + TILE_HEIGHT);
          this.highlightSprite.lineTo(tilePos.x - TILE_WIDTH / 2, tilePos.y + TILE_HEIGHT / 2);
          this.highlightSprite.closePath();
          this.highlightSprite.fillPath();
          this.highlightSprite.strokePath();
        }
      }
    };

    // Initial draw
    drawHighlight(0.8);

    // Pulsing animation
    this.tweens.add({
      targets: { alpha: 0.8 },
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      onUpdate: (tween) => {
        const alpha = tween.getValue() ?? 0.8;
        drawHighlight(alpha);
      },
    });
  }

  // RENDERING
  private renderGrid(): void {
    this.tileSprites.forEach((sprite) => sprite.destroy());
    this.tileSprites.clear();
    this.buildingSprites.forEach((sprite) => sprite.destroy());
    this.buildingSprites.clear();

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (!cell) continue;

        const screenPos = this.gridToScreen(x, y);
        const key = `${x},${y}`;

        let textureKey = "grass";
        if (cell.type === TileType.Road) textureKey = "road";
        else if (cell.type === TileType.Asphalt) textureKey = "asphalt";
        else if (cell.type === TileType.Tile) textureKey = "road";
        else if (cell.type === TileType.Snow) textureKey = getSnowTextureKey(x, y);
        else if (cell.type === TileType.Building) textureKey = "road";

        const tileSprite = this.add.image(screenPos.x, screenPos.y, textureKey);
        tileSprite.setOrigin(0.5, 0);
        tileSprite.setScale(textureKey.startsWith("snow_") ? 0.5 * 1.02 : 1.02);
        tileSprite.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y, 0));
        this.tileSprites.set(key, tileSprite);

        if (cell.type === TileType.Building && cell.isOrigin && cell.buildingId) {
          this.renderBuilding(x, y, cell.buildingId, cell.buildingOrientation);
        }
      }
    }
  }

  private removeBuildingSprites(buildingKey: string): void {
    const sprite = this.buildingSprites.get(buildingKey);
    if (sprite) {
      sprite.destroy();
      this.buildingSprites.delete(buildingKey);
    }

    for (let i = 1; i < 20; i++) {
      const sliceKey = `${buildingKey}_s${i}`;
      const sliceSprite = this.buildingSprites.get(sliceKey);
      if (sliceSprite) {
        sliceSprite.destroy();
        this.buildingSprites.delete(sliceKey);
      } else {
        break;
      }
    }
  }

  private renderBuilding(
    originX: number,
    originY: number,
    buildingId: string,
    orientation?: Direction
  ): void {
    const building = getBuilding(buildingId);
    if (!building) return;

    const key = `building_${originX},${originY}`;
    const textureKey = this.getBuildingTextureKey(building, orientation);

    if (!this.textures.exists(textureKey)) {
      console.warn(`Texture not found: ${textureKey}`);
      return;
    }

    const footprint = getBuildingFootprint(building, orientation);
    const frontX = originX + footprint.width - 1;
    const frontY = originY + footprint.height - 1;
    const screenPos = this.gridToScreen(frontX, frontY);
    const bottomY = screenPos.y + TILE_HEIGHT;

    // Simple rendering (without slicing for performance)
    const sprite = this.add.image(screenPos.x, bottomY, textureKey);
    sprite.setOrigin(0.5, 1);
    sprite.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y + TILE_HEIGHT / 2, 0.05));

    this.buildingSprites.set(key, sprite);
  }

  private getBuildingTextureKey(building: BuildingDefinition, orientation?: Direction): string {
    const dirMap: Record<Direction, string> = {
      [Direction.Down]: "south",
      [Direction.Up]: "north",
      [Direction.Left]: "west",
      [Direction.Right]: "east",
    };

    const dir = orientation ? dirMap[orientation] : "south";

    if (building.sprites[dir as keyof typeof building.sprites]) {
      return `${building.id}_${dir}`;
    }

    if (building.sprites.south) {
      return `${building.id}_south`;
    }

    const firstDir = Object.keys(building.sprites)[0];
    return `${building.id}_${firstDir}`;
  }

  private renderCars(): void {
    const allCars = this.playerCar ? [...this.cars, this.playerCar] : this.cars;
    const currentCarIds = new Set(allCars.map((c) => c.id));

    this.carSprites.forEach((sprite, id) => {
      if (!currentCarIds.has(id)) {
        sprite.destroy();
        this.carSprites.delete(id);
      }
    });

    for (const car of allCars) {
      const screenPos = this.gridToScreen(car.x, car.y);
      const groundY = screenPos.y + TILE_HEIGHT / 2;
      const textureKey = this.getCarTextureKey(car.carType, car.direction);

      let sprite = this.carSprites.get(car.id);
      if (!sprite) {
        sprite = this.add.sprite(screenPos.x, groundY, textureKey);
        sprite.setOrigin(0.5, 1);
        this.carSprites.set(car.id, sprite);
      } else {
        sprite.setPosition(screenPos.x, groundY);
        sprite.setTexture(textureKey);
      }
      sprite.setDepth(this.depthFromSortPoint(screenPos.x, groundY, 0.1));
    }
  }

  private getCarTextureKey(carType: CarType, direction: Direction): string {
    const dirMap: Record<Direction, string> = {
      [Direction.Up]: "n",
      [Direction.Down]: "s",
      [Direction.Left]: "w",
      [Direction.Right]: "e",
    };
    return `${carType}_${dirMap[direction]}`;
  }

  private renderCharacters(): void {
    const currentCharIds = new Set(this.characters.map((c) => c.id));
    this.characterSprites.forEach((sprite, id) => {
      if (!currentCharIds.has(id)) {
        sprite.destroy();
        this.characterSprites.delete(id);
      }
    });

    for (const char of this.characters) {
      const screenPos = this.gridToScreen(char.x, char.y);
      const centerY = screenPos.y + TILE_HEIGHT / 2;
      const textureKey = this.getCharacterTextureKey(char.characterType, char.direction);

      let sprite = this.characterSprites.get(char.id);
      if (!sprite) {
        if (this.gifsLoaded && this.textures.exists(textureKey)) {
          sprite = this.add.sprite(screenPos.x, centerY, textureKey, 0);
        } else {
          sprite = this.add.sprite(screenPos.x, centerY, "__DEFAULT");
          sprite.setVisible(false);
        }
        sprite.setOrigin(0.5, 1);
        this.characterSprites.set(char.id, sprite);
      } else {
        sprite.setPosition(screenPos.x, centerY);
      }

      if (this.gifsLoaded && this.textures.exists(textureKey)) {
        sprite.setVisible(true);
        playGifAnimation(sprite, textureKey);
      }

      sprite.setDepth(this.depthFromSortPoint(screenPos.x, centerY, 0.2));
    }
  }

  private getCharacterTextureKey(charType: CharacterType, direction: Direction): string {
    const dirMap: Record<Direction, string> = {
      [Direction.Up]: "north",
      [Direction.Down]: "south",
      [Direction.Left]: "west",
      [Direction.Right]: "east",
    };
    return `${charType}_${dirMap[direction]}`;
  }

  private clearPreview(): void {
    this.previewSprites.forEach((s) => s.destroy());
    this.previewSprites = [];
  }

  private updatePreview(): void {
    this.clearPreview();

    if (!this.hoverTile) return;
    if (this.selectedTool === ToolType.None) return;

    const { x, y } = this.hoverTile;

    if (this.selectedTool === ToolType.Building && this.selectedBuildingId) {
      const building = getBuilding(this.selectedBuildingId);
      if (!building) return;

      const footprint = getBuildingFootprint(building, this.buildingOrientation);

      for (let dy = 0; dy < footprint.height; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= GRID_WIDTH || py >= GRID_HEIGHT) continue;

          const screenPos = this.gridToScreen(px, py);
          const preview = this.add.image(screenPos.x, screenPos.y, "road");
          preview.setOrigin(0.5, 0);
          preview.setAlpha(0.5);
          preview.setTint(0x00ff00);
          preview.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y, 1_000_000));
          this.previewSprites.push(preview);
        }
      }
    }
  }
}
