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
  DIRECTION_TO_COMPASS,
  DIRECTION_TO_SHORT_COMPASS,
  getCharacterTextureKey,
} from "../types";
import { GAME_HEIGHT, GAME_WIDTH, gridToScreen, screenToGrid } from "./gameConfig";
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
import { ZOOM, logZoomEase, panDurationMs, zoomDurationMs } from "@/lib/city/units";
import { STREET_LAMPS, StreetLamp, StreetLampType, canPlaceStreetLamp, lampsFromGrid } from "@/lib/city/streetLights";
import { CityLook, LOOKS, NightKind, lampDimming, nightKind, nightLevels, seedFrom, walkerShare } from "@/lib/city/nightSchedule";
import { findWindows } from "@/lib/city/nightWindows";
import { followAvatarBuilder, loadAvatar3dSprites } from "@/lib/city/avatar3dSprites";
import { BUILDING_INTERIORS, BuildingInterior, interiorCode, isEntranceStep, isInteriorDoor } from "@/lib/city/buildingInteriors";
import { INTERIOR_BEATS, beatAtTile } from "@/lib/city/interiorBeats";
import { redrawWhenCityFontLoads } from "@/lib/city/cityFont";

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

// Keys that walk the avatar (PlayerController.handleKeyDown)
const MOVE_KEYS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d", "W", "A", "S", "D"]);

export class MainScene extends Phaser.Scene {
  private readonly DEPTH_Y_MULT = 10000;
  // Ground tiles sit in their own layer under everything; light pools on the ground sit just above that layer, so a pool
  // lights the street and never a roof, a wall or a person in front of it
  private static readonly GROUND_DEPTH = -100_000_000;
  private static readonly POOL_DEPTH = -50_000_000;

  // Sprite containers
  private tileSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private buildingSprites: Map<string, Phaser.GameObjects.Image> = new Map();
  private entrancePavings: Map<string, Phaser.GameObjects.Image> = new Map();
  // Building sprite key -> what it shows, so a roof-off swap can re-texture it in place
  private buildingSpriteInfo: Map<string, { buildingId: string; orientation?: Direction }> = new Map();
  // Buildings with openSprites whose roof is off (walk-in buildings: player inside; others: player in the trigger zone)
  private openBuildings: Set<string> = new Set();
  // Walk-in building tiles: "x,y" -> the building and the tile's local position in its interior map
  private interiorTiles: Map<string, { buildingId: string; key: string; interior: BuildingInterior; lx: number; ly: number }> = new Map();
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
  // create() has run: walk mode can start (the Avatar tab may ask before the game has booted)
  get ready(): boolean {
    return this.isReady;
  }
  private gifsLoaded: boolean = false;
  private pendingGrid: GridCell[][] | null = null;

  // Debug flags
  private showPaths: boolean = false;
  private pathOverlaySprites: Phaser.GameObjects.Graphics | null = null;

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
  private panPointerButton: "left" | "right" | null = null;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panDragDistance: number = 0;
  private cameraStartX: number = 0;
  private cameraStartY: number = 0;
  private lastManualCameraInteractionAt: number | null = null;
  private readonly MANUAL_CAMERA_FOLLOW_COOLDOWN_MS = 4000;
  private readonly FIT_CITY_PADDING_X = 120;
  private readonly FIT_CITY_PADDING_Y = 120;
  private readonly MOBILE_FIT_ZOOM_MULTIPLIER = 1.5;
  private baseScrollX: number = 0;
  private baseScrollY: number = 0;
  private lastPinchDist: number | null = null;
  private readonly TAP_DRAG_THRESHOLD = 8;

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
  private blockedTiles: Set<string> = new Set();
  private isAdventureActive: boolean = false;
  private cameraFollowPlayer: boolean = false;
  // Phaser's camera follows this point (the player's feet); null mode = not following
  private readonly cameraFollowTarget = { x: 0, y: 0 };
  private cameraFollowMode: "lerp" | "deadzone" | null = null;
  private manualCameraOverrideInAdventure: boolean = false;

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
      for (const [dir, path] of Object.entries(building.openSprites ?? {})) {
        this.load.image(`${building.id}_open_${dir}`, path);
      }
      for (const [beat, path] of Object.entries(building.seatSprites ?? {})) {
        this.load.image(`${building.id}_sit_${beat}`, path);
      }
      if (building.door) {
        this.load.spritesheet(`${building.id}_door`, building.door.sheet, {
          frameWidth: building.door.frameWidth, frameHeight: building.door.frameHeight,
        });
      }
      (building.moments ?? []).forEach((m, i) => {
        this.load.spritesheet(`${building.id}_moment${i}`, m.sheet, { frameWidth: m.frameWidth, frameHeight: m.frameHeight });
      });
      if (building.ambient) {
        this.load.spritesheet(`${building.id}_ambient`, building.ambient.sheet, {
          frameWidth: building.ambient.frameWidth, frameHeight: building.ambient.frameHeight,
        });
      }
      (building.reactions ?? []).forEach((r, i) => {
        this.load.spritesheet(`${building.id}_reaction${i}`, r.sheet, { frameWidth: r.frameWidth, frameHeight: r.frameHeight });
      });
      for (const group of ["a", "b", "front"] as const) {
        const path = building.nightWindows?.[group];
        if (path) this.load.image(`${building.id}_win_${group}`, path);
      }
      if (building.groundMask) this.load.image(`${building.id}_ground`, building.groundMask);
      if (building.nightLights) {
        this.load.spritesheet(`${building.id}_lights`, building.nightLights.sheet, {
          frameWidth: building.nightLights.frameWidth, frameHeight: building.nightLights.frameHeight,
        });
      }
    }

    // Street lamps (lib/city/streetLights.ts): a day sprite, tinted with the city, and the parts that glow at night
    for (const [type, spec] of Object.entries(STREET_LAMPS)) {
      this.load.image(`lamp_${type}_day`, spec.day);
      this.load.image(`lamp_${type}_lit`, spec.lit);
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
    // The avatar builder (Avatar tab) can change the player's outfit while the city runs
    const unfollowAvatarBuilder = followAvatarBuilder(this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, unfollowAvatarBuilder);
    this.events.once(Phaser.Scenes.Events.DESTROY, unfollowAvatarBuilder);
    redrawWhenCityFontLoads(this);
    // The player (and its window listener for the builder's name and outfit cue) goes with the scene, even mid-walk
    const releasePlayer = () => this.playerController?.destroy();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, releasePlayer);
    this.events.once(Phaser.Scenes.Events.DESTROY, releasePlayer);
    const releasePeek = () => { if (this.peekEscHandler) window.removeEventListener("keydown", this.peekEscHandler); };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, releasePeek);
    this.events.once(Phaser.Scenes.Events.DESTROY, releasePeek);

    // Snap pixel art to whole pixels whenever the camera allows it (integer zoom, see updateCamera)
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (gameObject: Phaser.GameObjects.GameObject) => {
      gameObject.setVertexRoundMode("fullAuto");
    });

    // Set up keyboard controls
    if (this.input.keyboard) {
      this.cursors = this.input.keyboard.createCursorKeys();
      this.wasd = {
        W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
        A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
        S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
        D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      };
      // The keys above are captured (preventDefault) page-wide, which would stop a visitor typing W, A, S, D, space or
      // the arrows into a text field (the avatar name tag). Let go of the keyboard while a field has focus.
      const keyboard = this.input.keyboard;
      const isField = (el: EventTarget | null) =>
        el instanceof HTMLElement && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      const onFocusChange = () => {
        const typing = isField(document.activeElement);
        if (typing) keyboard.disableGlobalCapture();
        else keyboard.enableGlobalCapture();
        keyboard.enabled = !typing;
        if (typing) keyboard.resetKeys();
      };
      document.addEventListener("focusin", onFocusChange);
      document.addEventListener("focusout", onFocusChange);
      const releaseFocusWatch = () => {
        document.removeEventListener("focusin", onFocusChange);
        document.removeEventListener("focusout", onFocusChange);
      };
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, releaseFocusWatch);
      this.events.once(Phaser.Scenes.Events.DESTROY, releaseFocusWatch);
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
    this.input.on("gameout", () => this.walkHover?.setVisible(false)); // the tile hint leaves with the mouse
    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("wheel", this.handleWheel, this);

    // Initial render
    this.renderGrid();
    this.buildStreetLamps();

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

    // Center the camera on the city grid. With Scale.FIT, the full internal canvas stays visible.
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

    // The player wears the avatar builder's 2D sheets (the saved look, else the base outfit); the GIFs are NPCs.
    loadPromises.push(loadAvatar3dSprites(this));

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

  update(time: number, delta: number): void {
    if (!this.isReady) return;

    this.updatePinchZoom();
    this.updateAmbients(time);
    this.updateNight(time);
    this.updateStreetLamps(time);

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

  private updatePinchZoom(): void {
    const ptr1 = this.input.pointer1;
    const ptr2 = this.input.pointer2;

    if (!(ptr1.isDown && ptr2.isDown)) {
      this.lastPinchDist = null;
      return;
    }

    const currentDist = Phaser.Math.Distance.Between(ptr1.x, ptr1.y, ptr2.x, ptr2.y);
    if (currentDist <= 0) return;

    if (this.lastPinchDist !== null) {
      const camera = this.cameras.main;
      const scale = currentDist / this.lastPinchDist;
      const midpointX = (ptr1.x + ptr2.x) / 2;
      const midpointY = (ptr1.y + ptr2.y) / 2;
      const targetZoom = Phaser.Math.Clamp(
        camera.zoom * scale,
        MainScene.MIN_ZOOM,
        this.maxZoomNow()
      );

      if (Math.abs(targetZoom - camera.zoom) >= 0.001) {
        this.applyZoomAtPointer(targetZoom, midpointX, midpointY);
        this.zoomLevel = targetZoom;
        this.zoomHandledInternally = true;
        this.recordManualCameraInteraction();
        this.events.emit("zoomChanged", targetZoom);
      }
    }

    this.lastPinchDist = currentDist;
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

    // Walk-in buildings: roof off while inside, player drawn above the building while in its footprint
    this.updateInteriorState(playerPos.gridX, playerPos.gridY);
    this.updateDoors();
    this.updateMoments();
    this.updateReactions();

    // Render player
    this.playerController.render((x, y, offset) => this.depthFromSortPoint(x, y, offset));

    // Render NPCs (only if not visited; a walk-in building's guide steps away while the player is inside, so it does
    // not stand in front of the opened rooms)
    const insideId = this.insideBuildingId(playerPos.gridX, playerPos.gridY);
    this.npcManager.render(
      insideId ? new Set([...this.visitedBuildings, insideId]) : this.visitedBuildings,
      playerPos.gridX,
      playerPos.gridY,
      (x, y, offset) => this.depthFromSortPoint(x, y, offset),
      this.gifsLoaded,
      (x, y) => this.frontOfPlotDepth(x, y)
    );

    // Camera follow player
    const playerState = this.playerController.getState();
    const isMobile = this.isMobileViewport();
    const shouldFollowPlayer =
      this.cameraFollowPlayer &&
      !this.manualCameraOverrideInAdventure &&
      (playerState === PlayerState.AutoWalking || playerState === PlayerState.Walking);

    if (shouldFollowPlayer) {
      // On mobile, always use smooth lerp follow (joystick AND auto-walk).
      // Dead zone follow is for desktop only — on mobile at zoom=2 the dead zone
      // spans most of the screen, so the camera appears frozen during auto-walk.
      this.cameraFollowTarget.x = playerPos.worldX;
      this.cameraFollowTarget.y = playerPos.worldY;
      this.startCameraFollow(isMobile ? "lerp" : "deadzone");
    } else {
      this.stopCameraFollow();
    }
  }

  // Phaser follows in preRender, after every update, so the camera never trails the player by a frame.
  private startCameraFollow(mode: "lerp" | "deadzone"): void {
    if (this.cameraFollowMode === mode) return;

    const camera = this.cameras.main;
    const { scrollX, scrollY } = camera;
    camera.stopFollow();
    if (mode === "deadzone") {
      // The player can roam the middle 60% of the view before the camera moves
      camera.setDeadzone(camera.worldView.width * 0.6, camera.worldView.height * 0.6);
    } else {
      camera.setDeadzone();
    }
    const lerp = mode === "lerp" ? 0.12 : 0.1;
    camera.startFollow(this.cameraFollowTarget, Number.isInteger(camera.zoom), lerp, lerp);
    // startFollow snaps the view onto the target; keep the current framing and let the follow ease in
    camera.setScroll(scrollX, scrollY);
    this.cameraFollowMode = mode;
  }

  private stopCameraFollow(): void {
    if (this.cameraFollowMode === null) return;
    this.cameras.main.stopFollow();
    this.cameraFollowMode = null;
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

    // Pixel art snaps to whole pixels only at integer zoom; at other zooms rounding makes it flicker
    camera.roundPixels = Number.isInteger(camera.zoom);

    // While Phaser follows the player it owns the scroll; mirror it so drag, wheel and pans start from there
    if (this.cameraFollowMode !== null) {
      this.baseScrollX = camera.scrollX;
      this.baseScrollY = camera.scrollY;
      return;
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

  private getGridCell(x: number, y: number): GridCell | null {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gx < 0 || gx >= GRID_WIDTH || gy < 0 || gy >= GRID_HEIGHT) return null;
    return this.grid[gy]?.[gx] ?? null;
  }

  private isWalkable(x: number, y: number): boolean {
    const tileType = this.getGridCell(x, y)?.type;
    if (!tileType) return false;
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
          const tileType = this.getGridCell(gx, gy)?.type;
          if (!tileType) continue;
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
    return this.getGridCell(x, y)?.type === TileType.Asphalt;
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
          if (this.getGridCell(gx, gy)?.type === TileType.Asphalt) {
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
    return gridToScreen(gridX, gridY);
  }

  screenToGrid(screenX: number, screenY: number): { x: number; y: number } {
    return screenToGrid(screenX, screenY);
  }

  private depthFromSortPoint(sortX: number, sortY: number, layerOffset: number = 0): number {
    return sortY * this.DEPTH_Y_MULT + sortX + layerOffset;
  }

  handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.isReady) return;

    if (this.isPanning) {
      if (this.input.pointer1.isDown && this.input.pointer2.isDown) {
        this.stopPanning();
        return;
      }

      const activeButtonDown =
        this.panPointerButton === "left"
          ? pointer.leftButtonDown()
          : this.panPointerButton === "right"
            ? pointer.rightButtonDown()
            : false;

      if (!activeButtonDown) {
        this.stopPanning();
        return;
      }

      const camera = this.cameras.main;
      this.panDragDistance = Math.max(
        this.panDragDistance,
        Phaser.Math.Distance.Between(this.panStartX, this.panStartY, pointer.x, pointer.y)
      );
      const dx = (this.panStartX - pointer.x) / camera.zoom;
      const dy = (this.panStartY - pointer.y) / camera.zoom;
      this.baseScrollX = this.cameraStartX + dx;
      this.baseScrollY = this.cameraStartY + dy;
      this.recordManualCameraInteraction();
      camera.setScroll(
        Math.round(this.baseScrollX + (this.shakeAxis === "x" ? this.shakeOffset : 0)),
        Math.round(this.baseScrollY + (this.shakeAxis === "y" ? this.shakeOffset : 0))
      );
      return;
    }

    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    if (!pointer.wasTouch) {
      const key = this.walkInBuildingAt(worldPoint.x, worldPoint.y);
      this.hoverWalkIn(key);
      const g = this.screenToGrid(worldPoint.x, worldPoint.y);
      this.hoverWalkTarget(this.walkTargetAt(Math.floor(g.x), Math.floor(g.y), key));
    }
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

    if (pointer.rightButtonDown()) {
      this.startPanning(pointer, "right");
      return;
    }

    if (pointer.leftButtonDown()) {
      const shouldPan = this.selectedTool === ToolType.None ||
        (this.selectedTool === ToolType.Building && !this.hoverTile);

      if (shouldPan) {
        this.startPanning(pointer, "left");
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
      const shouldTriggerTap = this.panPointerButton === "left";
      const wasTap = this.panDragDistance < this.TAP_DRAG_THRESHOLD;
      this.stopPanning();
      if (shouldTriggerTap && wasTap && this.tapWalkIn(_pointer)) return;
      if (shouldTriggerTap && wasTap && this.hoverTile) {
        this.events_.onTileClick(this.hoverTile.x, this.hoverTile.y);
      }
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


  private static readonly MIN_ZOOM = 0.25;
  private static readonly MAX_ZOOM = 4;

  private applyWheelZoom(deltaY: number, sensitivity: number, pointer: Phaser.Input.Pointer): void {
    const camera = this.cameras.main;
    const zoomFactor = Math.exp(-deltaY * sensitivity);
    const targetZoom = Phaser.Math.Clamp(
      camera.zoom * zoomFactor,
      MainScene.MIN_ZOOM,
      this.maxZoomNow()
    );
    if (Math.abs(targetZoom - camera.zoom) < 0.001) return;
    this.applyZoomAtPointer(targetZoom, pointer.x, pointer.y);
    this.zoomHandledInternally = true;
    this.recordManualCameraInteraction();
    this.events.emit("zoomChanged", targetZoom);
  }

  handleWheel(
    pointer: Phaser.Input.Pointer,
    _gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number,
    _deltaZ: number,
    _eventData?: unknown
  ): void {
    if (!this.isReady) return;

    const nativeWheelEvent = pointer.event as WheelEvent | undefined;
    nativeWheelEvent?.preventDefault();
    nativeWheelEvent?.stopPropagation();
    const isPinchZoom = nativeWheelEvent?.ctrlKey === true;
    // Trackpad pan: only when there's horizontal movement (two-finger diagonal/horizontal scroll).
    // Pure vertical scroll (mouse wheel or trackpad) → zoom instead.
    const isTrackpadPan = !isPinchZoom && Math.abs(deltaX) > 1;

    if (isPinchZoom) {
      this.applyWheelZoom(deltaY, 0.0025, pointer);
      return;
    }

    if (isTrackpadPan) {
      const camera = this.cameras.main;
      this.baseScrollX += deltaX / camera.zoom;
      this.baseScrollY += deltaY / camera.zoom;
      this.recordManualCameraInteraction();
      return;
    }

    // Mouse wheel: continuous zoom at pointer (Google Maps style)
    this.applyWheelZoom(deltaY, 0.003, pointer);
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
          oldCell.underlyingTileType !== newCell.underlyingTileType ||
          oldCell.streetLamp !== newCell.streetLamp
        ) {
          this.gridDirtyTiles.add(`${x},${y}`);
        }
      }
    }

    this.grid = newGrid;

    if (this.gridDirtyTiles.size > 0) {
      this.gridDirty = true;
      this.buildStreetLamps();
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
      tileSprite.setDepth(MainScene.GROUND_DEPTH + this.depthFromSortPoint(screenPos.x, screenPos.y, 0));
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
      this.applyZoomAtPointer(zoom, camera.width / 2, camera.height / 2);
    }
    this.zoomLevel = zoom;
  }

  zoomAtPoint(zoom: number, screenX: number, screenY: number): void {
    if (!this.isReady) {
      this.zoomLevel = zoom;
      return;
    }

    this.applyZoomAtPointer(zoom, screenX, screenY);
  }

  fitCityView(): void {
    if (!this.isReady) return;

    const camera = this.cameras.main;
    const contentWidth = GAME_WIDTH + this.FIT_CITY_PADDING_X * 2;
    const contentHeight = GAME_HEIGHT + this.FIT_CITY_PADDING_Y * 2;

    // With Scale.ENVELOP on mobile the canvas overflows its parent element.
    // Only parentSize / displaySize of the canvas is visible, so we must use the
    // visible game-pixel dimensions to compute the correct fit zoom. The parent is
    // the whole viewport on /city, but only the area above the panel in the shell.
    const isMobile = this.isMobileViewport();
    const displayW = this.scale.displaySize.width;
    const displayH = this.scale.displaySize.height;
    const parentW = this.scale.parentSize.width;
    const parentH = this.scale.parentSize.height;
    const effectiveW = isMobile ? camera.width * (parentW / displayW) : camera.width;
    const effectiveH = isMobile ? camera.height * (parentH / displayH) : camera.height;

    const fitZoom = Math.min(effectiveW / contentWidth, effectiveH / contentHeight);

    const finalZoom = Phaser.Math.Clamp(
      fitZoom,
      MainScene.MIN_ZOOM,
      MainScene.MAX_ZOOM
    );

    camera.setZoom(finalZoom);
    camera.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
    camera.scrollX = Math.round(camera.scrollX);
    camera.scrollY = Math.round(camera.scrollY);
    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
    this.zoomLevel = finalZoom;
    this.recordManualCameraInteraction();
    this.events.emit("zoomChanged", finalZoom);
  }

  setShowPaths(show: boolean): void {
    this.showPaths = show;
  }

  setShowStats(show: boolean): void {
    this.showStats = show;
  }

  // Tour navigation - smoothly pan camera to a grid position
  panToPosition(gridX: number, gridY: number, options?: { dialogVisible?: boolean }): void {
    if (!this.isReady) return;

    const camera = this.cameras.main;

    // Set a tour zoom level (1.4 = zoomed in, enables panning)
    const tourZoom = 1.4;
    const targetZoom = Math.max(this.zoomLevel, tourZoom);

    const screenPos = this.gridToScreen(gridX, gridY);

    const isMobileViewport = this.isMobileViewport();
    const isPortraitViewport = camera.height >= camera.width;
    const hasDialog = options?.dialogVisible ?? false;
    const modalOffsetX = isMobileViewport ? 0 : 200;
    let modalOffsetY: number;
    if (hasDialog) {
      modalOffsetY = isMobileViewport && isPortraitViewport
        ? camera.height * 0.15
        : camera.height * 0.18;
    } else {
      modalOffsetY = isMobileViewport && isPortraitViewport ? camera.height * 0.18 : 0;
    }
    const targetScrollX = screenPos.x - camera.width / 2 - modalOffsetX;
    const targetScrollY = screenPos.y - camera.height / 2 - modalOffsetY;

    // Clamp to prevent showing empty space past the world edges
    const minScrollY = -this.FIT_CITY_PADDING_Y;
    const clampedScrollY = Math.max(minScrollY, targetScrollY);

    this.moveCamera(targetScrollX, clampedScrollY, targetZoom);
  }

  // Pan (and zoom) with the standard timing: the duration follows the distance and the zoom ratio
  // (docs/city-rules.md, section 10). Scroll is the unzoomed top-left, so it does not depend on zoom.
  private moveCamera(targetScrollX: number, targetScrollY: number, targetZoom: number, fixedDurationMs?: number): void {
    const camera = this.cameras.main;
    const fromZoom = camera.zoom;
    const distancePx =
      Phaser.Math.Distance.Between(camera.scrollX, camera.scrollY, targetScrollX, targetScrollY) * fromZoom;
    const duration = fixedDurationMs ?? Math.max(panDurationMs(distancePx), zoomDurationMs(fromZoom, targetZoom));
    const ease = Phaser.Math.Easing.Cubic.InOut;

    camera.pan(
      targetScrollX + camera.width / 2,
      targetScrollY + camera.height / 2,
      duration,
      ease,
      true,
      (cam: Phaser.Cameras.Scene2D.Camera) => {
        this.baseScrollX = cam.scrollX;
        this.baseScrollY = cam.scrollY;
      }
    );

    if (Math.abs(targetZoom - fromZoom) < 0.001) return;
    camera.zoomTo(
      targetZoom,
      duration,
      logZoomEase(fromZoom, targetZoom, ease),
      true,
      (_cam: Phaser.Cameras.Scene2D.Camera, progress: number) => {
        if (progress < 1) return;
        this.zoomLevel = targetZoom;
        this.zoomHandledInternally = true;
        this.events.emit("zoomChanged", targetZoom);
        // A running follow keeps the dead zone it got at the old zoom; restart it next frame, sized for this one
        this.stopCameraFollow();
      }
    );
  }

  // Manual input always wins: stop a running pan or zoom where it is
  private stopCameraMoves(): void {
    const camera = this.cameras.main;
    camera.panEffect.reset();
    if (camera.zoomEffect.isRunning) {
      camera.zoomEffect.reset();
      this.zoomLevel = camera.zoom;
      this.zoomHandledInternally = true;
      this.events.emit("zoomChanged", camera.zoom);
    }
  }

  panToBuildingById(buildingId: string, options?: { dialogVisible?: boolean }): void {
    if (!this.isReady || !this.grid) return;

    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (cell?.buildingId === buildingId && cell?.isOrigin) {
          const building = getBuilding(buildingId);
          if (!building) return;
          const footprint = getBuildingFootprint(building, cell.buildingOrientation);
          const centerX = x + footprint.width / 2;
          const centerY = y + footprint.height / 2;

          const camera = this.cameras.main;
          const screenPos = this.gridToScreen(centerX, centerY);
          const targetZoom = Math.max(camera.zoom, 1.4);
          const hasDialog = options?.dialogVisible ?? false;
          const isMobileViewport = this.isMobileViewport();
          const isPortraitViewport = camera.height >= camera.width;
          let dialogOffsetY = 0;
          if (hasDialog) {
            dialogOffsetY = isMobileViewport && isPortraitViewport
              ? camera.height * 0.15
              : camera.height * 0.18;
          }
          const targetScrollX = screenPos.x - camera.width / 2;
          const targetScrollY = screenPos.y - camera.height / 2 - dialogOffsetY;

          // Clamp to prevent showing empty space past the world edges
          const minScrollY = -this.FIT_CITY_PADDING_Y;
          const clampedScrollY = Math.max(minScrollY, targetScrollY);

          this.moveCamera(targetScrollX, clampedScrollY, targetZoom);
          return;
        }
      }
    }
  }

  // Highlighted building for tour
  private highlightedBuildingId: string | null = null;
  private highlightSprite: Phaser.GameObjects.Graphics | null = null;

  // Walk-in building plots by sprite key, for drawing the player above a plot it stands in front of
  private interiorPlots: Map<string, { originX: number; originY: number; width: number; height: number }> = new Map();

  // Walk-in buildings (default orientation only): index every footprint tile against its interior map
  private computeInteriorTiles(): Map<string, { buildingId: string; key: string; interior: BuildingInterior; lx: number; ly: number }> {
    const tiles = new Map<string, { buildingId: string; key: string; interior: BuildingInterior; lx: number; ly: number }>();
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (!cell?.isOrigin || !cell.buildingId) continue;
        const interior = BUILDING_INTERIORS[cell.buildingId];
        if (!interior || (cell.buildingOrientation && cell.buildingOrientation !== Direction.Down)) continue;
        this.interiorPlots.set(`building_${x},${y}`, { originX: x, originY: y, width: interior.map[0].length, height: interior.map.length });
        interior.map.forEach((row, ly) => {
          for (let lx = 0; lx < row.length; lx++) {
            tiles.set(`${x + lx},${y + ly}`, { buildingId: cell.buildingId!, key: `building_${x},${y}`, interior, lx, ly });
          }
        });
      }
    }
    return tiles;
  }

  // One step between neighbouring tiles: inside a building only within a room or through a door (any step between areas in
  // an open-plan building); in and out only
  // through the building's outside rooms (the plaza), or across a main door that opens straight onto the street
  private canStepInterior(fx: number, fy: number, tx: number, ty: number): boolean {
    const a = this.interiorTiles.get(`${fx},${fy}`);
    const b = this.interiorTiles.get(`${tx},${ty}`);
    if (!a && !b) return true;
    const ca = a ? interiorCode(a.interior, a.lx, a.ly) : null;
    const cb = b ? interiorCode(b.interior, b.lx, b.ly) : null;
    if (b && !cb) return false;
    if (a && b) {
      if (a.key !== b.key) return false;
      if (ca === cb || isInteriorDoor(a.interior, a.lx, a.ly, b.lx, b.ly)) return true;
      // Open plan: areas join freely; the outside rooms (plaza) still meet the inside only at a door
      const outside = a.interior.outside;
      return !!a.interior.openPlan && !outside.includes(ca!) && !outside.includes(cb!);
    }
    if (b) return b.interior.outside.includes(cb!) || isEntranceStep(b.interior, b.lx, b.ly, fx - tx, fy - ty);
    return !ca || a!.interior.outside.includes(ca) || isEntranceStep(a!.interior, a!.lx, a!.ly, tx - fx, ty - fy);
  }

  // A step from outside that a walk-in building's wall blocks: the tile just inside its main door, so the player walks
  // there instead of bumping (the door is easy to miss by one tile, and the grid's "up" runs diagonally on screen)
  private entranceGuide(fx: number, fy: number, tx: number, ty: number): { x: number; y: number } | null {
    const b = this.interiorTiles.get(`${tx},${ty}`);
    if (!b) return null;
    const a = this.interiorTiles.get(`${fx},${fy}`);
    const ca = a ? interiorCode(a.interior, a.lx, a.ly) : null;
    if (a && ca && !a.interior.outside.includes(ca)) return null; // already inside
    if (a && a.key !== b.key) return null;
    const [ix, iy] = b.interior.entrance.inside;
    return { x: tx - b.lx + ix, y: ty - b.ly + iy };
  }

  private updateInteriorState(gridX: number, gridY: number): void {
    if (!this.playerController) return;
    const here = this.interiorTiles.get(`${gridX},${gridY}`);
    const target = this.playerController.getTargetGrid();
    const next = this.interiorTiles.get(`${target.x},${target.y}`);
    const code = here ? interiorCode(here.interior, here.lx, here.ly) : null;
    const inside = !!here && !!code && !here.interior.outside.includes(code);
    for (const id of Object.keys(BUILDING_INTERIORS)) {
      this.setBuildingOpen(id, (inside && here!.buildingId === id) || this.peek?.buildingId === id);
    }
    // Door beats: tell React when the player crosses a walk-in building's main door, in or out
    const insideId = inside ? here!.buildingId : null;
    if (insideId && this.walkIn) this.hideWalkIn();
    if (insideId !== this.insideBuilding) {
      if (this.insideBuilding) this.events.emit("interiorDoorCrossed", { buildingId: this.insideBuilding, inward: false });
      if (insideId) this.events.emit("interiorDoorCrossed", { buildingId: insideId, inward: true });
      this.insideBuilding = insideId;
    }
    // walked into the building opened in place: its card closes, its roof stays off (insideBuilding is set by now)
    if (insideId && this.peek?.buildingId === insideId) this.closeWalkInPeek();
    this.updateInsideZoom(inside ? here! : null);
    // Peek card: the player stands on a beat's stand tile (arrived, not passing through on the way to the next tile)
    const stopped = target.x === gridX && target.y === gridY;
    const beat = inside && stopped ? beatAtTile(here!.buildingId, here!.lx, here!.ly) : null;
    this.setInteriorBeat(beat ? { buildingId: here!.buildingId, beat } : null);
    this.updateSeat(beat ? here!.buildingId : null, beat);
    const tile = here ?? next;
    if (!tile) {
      this.playerController.setDepthOverride(this.frontOfPlotDepth(gridX, gridY));
      return;
    }
    const sprite = this.buildingSprites.get(tile.key);
    this.playerController.setDepthOverride(sprite ? sprite.depth + this.footprintSortOffset(tile.lx + 0.5, tile.ly + 0.5) : null);
  }

  // The beat whose peek card is open ("buildingId:beat"); React gets "interiorBeatChanged" with the beat or null
  private activeBeat: string | null = null;
  private insideBuilding: string | null = null;
  private setInteriorBeat(next: { buildingId: string; beat: string } | null): void {
    const key = next ? `${next.buildingId}:${next.beat}` : null;
    if (key === this.activeBeat) return;
    this.activeBeat = key;
    this.beatSince = this.time.now;
    this.events.emit("interiorBeatChanged", next);
    // Leaving the hatch while the cook still serves cancels the walk to the table
    this.serveTimer?.remove();
    this.serveTimer = null;
    this.updateBeatZoom(next && INTERIOR_BEATS[next.buildingId]?.[next.beat]?.zoomIn ? key : null);
  }

  // Cards with zoomIn (the food truck hatches): ease in one zoom step on the player while the card is open, back after
  private beatZoomFrom: { key: string; zoom: number } | null = null;
  private updateBeatZoom(key: string | null): void {
    if ((this.beatZoomFrom?.key ?? null) === key) return;
    const camera = this.cameras.main;
    const p = this.playerController!.getPosition();
    if (key && !this.beatZoomFrom) {
      // Snap to the zoom step (powers of two) so a zoom-out still running does not leave an in-between zoom behind
      const from = 2 ** Math.round(Math.log2(camera.zoom));
      this.beatZoomFrom = { key, zoom: from };
      const target = Math.min(from * 2, this.maxZoomNow());
      if (target > from) this.moveCamera(p.worldX - camera.width / 2, p.worldY - camera.height / 2, target);
    } else if (!key && this.beatZoomFrom) {
      const zoom = this.beatZoomFrom.zoom;
      this.beatZoomFrom = null;
      this.moveCamera(p.worldX - camera.width / 2, p.worldY - camera.height / 2, zoom);
    } else if (key && this.beatZoomFrom) this.beatZoomFrom.key = key;
  }

  // Sit-and-look moments (lib/city/interiorBeats.ts seat): a short pause on the stand tile, then the avatar walks into
  // the chair and the building shows its seated sprite; React opens the screens ("interiorSeatChanged"). Any move, or
  // standUp() from the overlay, stands it up; it does not sit again until the player has left the stand tile.
  private seated: { buildingId: string; beat: string } | null = null;
  private seatPending = false;
  private seatDismissed: string | null = null;
  private beatSince = 0;

  private updateSeat(buildingId: string | null, beat: string | null): void {
    const key = buildingId && beat ? `${buildingId}:${beat}` : null;
    if (!key) this.seatDismissed = null;
    const moving = this.playerController?.getState() !== PlayerState.Idle;
    if (this.seated || this.seatPending) {
      const seatedKey = this.seated ? `${this.seated.buildingId}:${this.seated.beat}` : this.activeBeat;
      if (moving || key !== seatedKey) this.standUp();
      return;
    }
    const seat = key ? INTERIOR_BEATS[buildingId!]?.[beat!]?.seat : undefined;
    if (!seat || moving || this.seatDismissed === key) return;
    if (this.time.now - this.beatSince < 450) return;
    this.sitDown(buildingId!, beat!, seat.at);
  }

  private sitDown(buildingId: string, beat: string, at: [number, number]): void {
    const pc = this.playerController;
    const spot = BUILDING_INTERIORS[buildingId]?.standSpots?.[beat];
    if (!pc || !spot) return;
    // the chair relative to the stand spot, in plan tiles, to screen pixels (the player stands on the spot's tile centre)
    const dx = at[0] - spot[0], dy = at[1] - spot[1];
    const p = pc.getPosition();
    this.seatPending = true;
    pc.walkToSeat(p.worldX + (dx - dy) * (TILE_WIDTH / 2), p.worldY + (dx + dy) * (TILE_HEIGHT / 2), () => {
      this.seatPending = false;
      this.seated = { buildingId, beat };
      this.refreshBuildingTexture(buildingId, 160);
      this.events.emit("interiorSeatChanged", { buildingId, beat });
    });
  }

  /** Stand the avatar up from its chair (also called by the screens overlay's close) */
  standUp(): void {
    if (!this.seated && !this.seatPending) return;
    const was = this.seated;
    this.seatDismissed = was ? `${was.buildingId}:${was.beat}` : this.activeBeat;
    this.seated = null;
    this.seatPending = false;
    this.playerController?.standFromSeat();
    if (was) this.refreshBuildingTexture(was.buildingId, 160);
    this.events.emit("interiorSeatChanged", null);
  }

  // The walk-in building the player is inside (past its main door), or null
  private insideBuildingId(gridX: number, gridY: number): string | null {
    const here = this.interiorTiles.get(`${gridX},${gridY}`);
    const code = here ? interiorCode(here.interior, here.lx, here.ly) : null;
    return here && code && !here.interior.outside.includes(code) ? here.buildingId : null;
  }

  // Walk-in buildings with an inside zoom: zoom in around the player on entering, back to the earlier zoom on leaving
  private insideZoomFrom: { buildingId: string; zoom: number } | null = null;
  private updateInsideZoom(here: { buildingId: string; interior: BuildingInterior } | null): void {
    const id = here?.interior.insideZoom ? here.buildingId : null;
    if ((this.insideZoomFrom?.buildingId ?? null) === id) return;
    const camera = this.cameras.main;
    const target = id ? here!.interior.insideZoom! : this.insideZoomFrom!.zoom;
    if (id) this.insideZoomFrom = { buildingId: id, zoom: camera.zoom };
    else this.insideZoomFrom = null;
    const p = this.playerController!.getPosition();
    this.moveCamera(p.worldX - camera.width / 2, p.worldY - camera.height / 2, target);
  }

  // Walk-in buildings (BUILDING_INTERIORS), walking or not. Hovering one (mouse) draws a faint dashed line along its two
  // camera-facing ground edges. A tap or click opens it in place: the roof comes off, the line stays,
  // and React shows a small card (Walk in / Read the case, "walkInPeek"). A tap on it again, a tap elsewhere or Esc
  // puts the roof back. While walking, a tap on the ground or on the open building's floor walks the avatar there, through
  // the main door when it has to.
  private walkIn: { key: string; parts: Phaser.GameObjects.GameObject[] } | null = null;
  private walkInTimer: ReturnType<typeof setTimeout> | null = null;
  private walkInPending: string | null = null;
  private peek: { key: string; buildingId: string; line: Phaser.GameObjects.Graphics } | null = null;
  private peekEscHandler: ((e: KeyboardEvent) => void) | null = null;

  // The walk-in plots and their tiles are indexed when walking starts; opening a building in place needs them before that
  private ensureInteriorTiles(): void {
    if (this.interiorPlots.size === 0) this.interiorTiles = this.computeInteriorTiles();
  }

  // The walk-in plot whose building is under a world point (its drawn pixels, or its footprint), or null
  private walkInBuildingAt(wx: number, wy: number): string | null {
    this.ensureInteriorTiles();
    for (const key of this.interiorPlots.keys()) {
      const sprite = this.buildingSprites.get(key) as Phaser.GameObjects.Image | undefined;
      if (!sprite?.visible || !sprite.getBounds().contains(wx, wy)) continue;
      const fx = (wx - sprite.x) / sprite.scaleX + sprite.displayOriginX;
      const fy = (wy - sprite.y) / sprite.scaleY + sprite.displayOriginY;
      const frame = sprite.frame;
      const alpha = this.textures.getPixelAlpha(Math.floor(fx), Math.floor(fy), sprite.texture.key, frame.name);
      if (alpha && alpha > 0) return key;
    }
    const g = this.screenToGrid(wx, wy);
    const t = this.interiorTiles.get(`${Math.floor(g.x)},${Math.floor(g.y)}`);
    return t ? t.key : null;
  }

  private hoverWalkIn(key: string | null): void {
    if (key && key === this.peek?.key) key = null; // already open: its own line shows
    this.input.setDefaultCursor(key ? "pointer" : "default");
    if (key && key === this.walkInPending) return;
    if (this.walkInTimer) clearTimeout(this.walkInTimer);
    this.walkInTimer = null;
    this.walkInPending = null;
    if (!key) { this.hideWalkIn(); return; }
    if (key === this.walkIn?.key) return;
    this.walkInPending = key;
    // a short wait, so moving the mouse across the city does not flash every building on the way
    this.walkInTimer = setTimeout(() => {
      this.walkInTimer = null;
      this.walkInPending = null;
      if (this.peek?.key !== key) this.showWalkIn(key);
    }, 200);
  }

  /** A tap on the city: true when it opened or closed a walk-in building, or sent the avatar walking */
  private tapWalkIn(pointer: Phaser.Input.Pointer): boolean {
    const world = this.cameras.main.getWorldPoint(pointer.x, pointer.y);
    const g = this.screenToGrid(world.x, world.y);
    const tx = Math.floor(g.x), ty = Math.floor(g.y);
    const key = this.walkInBuildingAt(world.x, world.y);
    const target = this.walkTargetAt(tx, ty, key);
    // the open building's floor first: its open sprite covers it
    const open = this.openPlotKey();
    if (target && open && this.interiorTiles.get(`${tx},${ty}`)?.key === open) return this.walkToTarget(target);
    // inside a building, a tap on its open sprite walks (out onto the street in front of it, too)
    if (key && key === this.insidePlotKey()) return target ? this.walkToTarget(target) : true;
    if (key) {
      if (key === this.peek?.key) this.closeWalkInPeek();
      else this.openWalkInPeek(key);
      return true;
    }
    this.closeWalkInPeek();
    // Other buildings fall through to their own click (their case, or tour card)
    return target ? this.walkToTarget(target) : false;
  }

  // Where a tap on tile (tx, ty) sends the avatar while walking, or null: in the building opened in place, its floor tile
  // nearest the tap (its desks and walls count too); else the tile itself, when it is ground the avatar may stand on
  // (`overKey`: the walk-in building under the pointer, whose tap opens it instead)
  private walkTargetAt(tx: number, ty: number, overKey: string | null): { x: number; y: number } | null {
    const pc = this.playerController;
    if (!this.isAdventureActive || !pc) return null;
    const open = this.openPlotKey();
    const t = open ? this.interiorTiles.get(`${tx},${ty}`) : undefined;
    if (t && t.key === open) {
      const plot = this.interiorPlots.get(t.key)!;
      let best: { x: number; y: number; d: number } | null = pc.canStandOn(tx, ty) ? { x: tx, y: ty, d: 0 } : null;
      for (let y = plot.originY; y < plot.originY + plot.height; y++) {
        for (let x = plot.originX; x < plot.originX + plot.width; x++) {
          const f = this.interiorTiles.get(`${x},${y}`);
          const code = f ? interiorCode(f.interior, f.lx, f.ly) : null;
          if (!code || f!.interior.outside.includes(code) || !pc.canStandOn(x, y)) continue;
          const d = Math.abs(x - tx) + Math.abs(y - ty);
          if (!best || d < best.d) best = { x, y, d };
        }
      }
      return best;
    }
    if (overKey && overKey !== this.insidePlotKey()) return null;
    return pc.canStandOn(tx, ty) ? { x: tx, y: ty } : null;
  }

  // The plot of the walk-in building the avatar is inside, or null
  private insidePlotKey(): string | null {
    if (!this.insideBuilding) return null;
    for (const [key, plot] of this.interiorPlots) {
      if (this.grid[plot.originY]?.[plot.originX]?.buildingId === this.insideBuilding) return key;
    }
    return null;
  }

  // The plot whose roof is off: the building opened in place, else the one the avatar is inside
  private openPlotKey(): string | null {
    return this.peek?.key ?? this.insidePlotKey();
  }

  // Point and walk: a tile diamond under the mouse where a click would walk to, and a marker where a tap sent the avatar
  private walkHover: Phaser.GameObjects.Graphics | null = null;
  private walkMarker: Phaser.GameObjects.Graphics | null = null;

  private tileDiamond(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const pts = [gridToScreen(x, y), gridToScreen(x + 1, y), gridToScreen(x + 1, y + 1), gridToScreen(x, y + 1)]
      .map((p) => new Phaser.Math.Vector2(p.x, p.y));
    g.fillPoints(pts, true);
    g.strokePoints(pts, true);
  }

  private hoverWalkTarget(target: { x: number; y: number } | null): void {
    if (!target) { this.walkHover?.setVisible(false); return; }
    if (!this.walkHover) this.walkHover = this.add.graphics().setDepth(19_000_000);
    this.walkHover.clear().setVisible(true);
    const dim = 1 - 0.6 * this.night; // Graphics take no night tint
    this.walkHover.fillStyle(0xffffff, 0.18 * dim).lineStyle(1, 0xffffff, 0.6 * dim);
    this.tileDiamond(this.walkHover, target.x, target.y);
    this.input.setDefaultCursor("pointer");
  }

  private walkToTarget(target: { x: number; y: number }): boolean {
    const pc = this.playerController;
    if (!pc?.walkToBuilding(target.x, target.y)) return false;
    this.manualCameraOverrideInAdventure = false;
    this.cameraFollowPlayer = true;
    this.walkMarker?.destroy();
    const marker = this.add.graphics().setDepth(19_000_000);
    marker.fillStyle(0xffd23f, 0.3).lineStyle(1.5, 0xffd23f, 1);
    this.tileDiamond(marker, target.x, target.y);
    this.walkMarker = marker;
    this.tweens.add({ targets: marker, alpha: 0, delay: 700, duration: 600, onComplete: () => marker.destroy() });
    return true;
  }

  /** Open a walk-in building in place: roof off, its outline, and the card in React */
  private openWalkInPeek(key: string): void {
    const plot = this.interiorPlots.get(key);
    const buildingId = plot ? this.grid[plot.originY]?.[plot.originX]?.buildingId : undefined;
    if (!buildingId || this.insideBuilding === buildingId) return;
    this.closeWalkInPeek();
    this.hideWalkIn();
    this.peek = { key, buildingId, line: this.drawWalkInOutline(key) };
    this.setBuildingOpen(buildingId, true);
    // Keep the open building clear of the card over the top of the view: its ground centre in the lower middle
    const c = gridToScreen(plot!.originX + plot!.width / 2, plot!.originY + plot!.height / 2);
    const camera = this.cameras.main, view = camera.worldView;
    const fx = (c.x - view.x) / view.width, fy = (c.y - view.y) / view.height;
    if (fx < 0.2 || fx > 0.8 || fy < 0.55 || fy > 0.85) {
      this.cameraFollowPlayer = false;
      this.moveCamera(Math.round(c.x - camera.width / 2), Math.round(c.y - 0.18 * view.height - camera.height / 2), camera.zoom);
    }
    this.peekEscHandler = (e: KeyboardEvent) => { if (e.key === "Escape") this.closeWalkInPeek(); };
    window.addEventListener("keydown", this.peekEscHandler);
    this.events.emit("walkInPeek", { buildingId });
  }

  /** Put the roof back on the building opened in place (unless the avatar is inside it) and close its card */
  closeWalkInPeek(): void {
    if (!this.peek) return;
    const { buildingId, line } = this.peek;
    this.peek = null;
    line.destroy();
    if (this.peekEscHandler) window.removeEventListener("keydown", this.peekEscHandler);
    this.peekEscHandler = null;
    this.setBuildingOpen(buildingId, this.insideBuilding === buildingId);
    this.events.emit("walkInPeek", null);
  }

  /** The card's Walk in: the avatar walks to the open building's main door and in (walk mode must be on) */
  walkIntoPeek(): boolean {
    const key = this.peek?.key;
    if (!key || !this.isAdventureActive || !this.playerController) return false;
    this.walkIntoPlot(key);
    return true;
  }

  private walkIntoPlot(key: string): void {
    const plot = this.interiorPlots.get(key);
    const pc = this.playerController;
    this.hideWalkIn();
    if (!plot || !pc) return;
    const cell = this.grid[plot.originY]?.[plot.originX];
    const interior = cell?.buildingId ? BUILDING_INTERIORS[cell.buildingId] : undefined;
    if (!interior) return;
    const p = pc.getPosition();
    if (this.insideBuildingId(p.gridX, p.gridY) === cell!.buildingId) return;
    const [ix, iy] = interior.entrance.inside;
    if (pc.walkToBuilding(plot.originX + ix, plot.originY + iy)) {
      this.manualCameraOverrideInAdventure = false;
      this.cameraFollowPlayer = true;
    }
  }

  // The faint dashed line along a walk-in plot's two camera-facing ground edges
  private drawWalkInOutline(key: string): Phaser.GameObjects.Graphics {
    const plot = this.interiorPlots.get(key)!;
    const corner = (x: number, y: number) => gridToScreen(plot.originX + x, plot.originY + y);
    const { width: w, height: h } = plot;
    const line = this.add.graphics().setDepth(19_000_000); // above the city, below the player's pointer
    line.lineStyle(1.5, 0xffffff, 0.7 * (1 - 0.6 * this.night)); // Graphics take no night tint: dim the line instead
    const dashed = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const len = Math.hypot(b.x - a.x, b.y - a.y), dash = 4, gap = 3;
      for (let d = 0; d < len; d += dash + gap) {
        const t0 = d / len, t1 = Math.min(len, d + dash) / len;
        line.lineBetween(a.x + (b.x - a.x) * t0, a.y + (b.y - a.y) * t0, a.x + (b.x - a.x) * t1, a.y + (b.y - a.y) * t1);
      }
    };
    dashed(corner(0, h), corner(w, h));   // south edge
    dashed(corner(w, 0), corner(w, h));   // east edge
    return line;
  }

  private showWalkIn(key: string): void {
    if (this.walkIn?.key === key) return;
    this.hideWalkIn();
    const plot = this.interiorPlots.get(key);
    const buildingId = plot ? this.grid[plot.originY]?.[plot.originX]?.buildingId : undefined;
    if (!buildingId || this.insideBuilding === buildingId) return;
    this.walkIn = { key, parts: [this.drawWalkInOutline(key)] };
  }

  private hideWalkIn(): void {
    this.walkIn?.parts.forEach((p) => p.destroy());
    this.walkIn = null;
  }

  // Just outside a walk-in plot on its south or east side the whole building is behind a character, but its big sprite
  // sorts by the plot's front corner and would paint over it: the depth that draws the character above it, or null.
  // Never below the character's own sort depth, so the ground tiles it stands on stay under it.
  private frontOfPlotDepth(gridX: number, gridY: number): number | null {
    for (const [key, plot] of this.interiorPlots) {
      const lx = gridX - plot.originX, ly = gridY - plot.originY;
      const near = lx >= -2 && ly >= -2 && lx < plot.width + 4 && ly < plot.height + 4;
      const sprite = near && (lx >= plot.width || ly >= plot.height) ? this.buildingSprites.get(key) : undefined;
      if (sprite) {
        const screen = this.gridToScreen(gridX, gridY);
        const own = this.depthFromSortPoint(screen.x, screen.y + TILE_HEIGHT / 2, 0.3);
        return Math.max(own, sprite.depth + this.footprintSortOffset(lx + 0.5, ly + 0.5));
      }
    }
    return null;
  }

  // Compute tiles blocked by building sprite overhang (collision padding)
  private computeBlockedTiles(): Set<string> {
    const blocked = new Set<string>();
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        const cell = this.grid[y]?.[x];
        if (!cell?.isOrigin || !cell.buildingId) continue;
        const building = getBuilding(cell.buildingId);
        if (!building?.collisionPadding) continue;

        const fp = getBuildingFootprint(building, cell.buildingOrientation);
        const pad = building.collisionPadding;

        for (let dy = -(pad.top || 0); dy < fp.height + (pad.bottom || 0); dy++) {
          for (let dx = -(pad.left || 0); dx < fp.width + (pad.right || 0); dx++) {
            if (dx >= 0 && dx < fp.width && dy >= 0 && dy < fp.height) continue;
            const bx = x + dx, by = y + dy;
            if (bx < 0 || bx >= GRID_WIDTH || by < 0 || by >= GRID_HEIGHT) continue;
            const tile = this.grid[by]?.[bx];
            if (!tile || tile.type === TileType.Road) continue;
            blocked.add(`${bx},${by}`);
          }
        }
      }
    }
    return blocked;
  }

  // ==================== ADVENTURE MODE PUBLIC API ====================

  startAdventureMode(characterType: CharacterType): void {
    if (this.isAdventureActive) return;

    this.gameMode = GameMode.Adventure;
    this.isAdventureActive = true;
    this.visitedBuildings.clear();
    this.manualCameraOverrideInAdventure = false;

    // Initialize managers
    this.npcManager = new NPCManager(this);
    this.triggerZoneManager = new TriggerZoneManager();

    // Create player controller
    this.playerController = new PlayerController(this, this.grid);

    // Compute collision padding blocked tiles and pass to player controller
    this.blockedTiles = this.computeBlockedTiles();
    this.playerController.setBlockedTiles(this.blockedTiles);
    this.interiorPlots.clear();
    this.interiorTiles = this.computeInteriorTiles();
    this.playerController.setInteriorRules({
      isWalkable: (x, y) => {
        const t = this.interiorTiles.get(`${x},${y}`);
        return t ? interiorCode(t.interior, t.lx, t.ly) !== null : null;
      },
      canStep: (fx, fy, tx, ty) => this.canStepInterior(fx, fy, tx, ty),
      entranceGuide: (fx, fy, tx, ty) => this.entranceGuide(fx, fy, tx, ty),
    });

    // Set up trigger zone callbacks
    this.triggerZoneManager.setCallbacks({
      onEnterZone: (zone, tourStop) => {
        // Walk-in buildings open only through their main door (updateInteriorState)
        if (!BUILDING_INTERIORS[zone.buildingId]) this.setBuildingOpen(zone.buildingId, true);
        this.events.emit("playerEnteredZone", { buildingId: zone.buildingId, tourStop });
      },
      onExitZone: (zone) => {
        if (!BUILDING_INTERIORS[zone.buildingId]) this.setBuildingOpen(zone.buildingId, false);
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
    const spawnPos = this.findSpawnPosition(15, 30);

    // Spawn player
    this.playerController.spawn(spawnPos.x, spawnPos.y, characterType);

    const keepFraming = this.keepFramingOnSpawn;
    this.keepFramingOnSpawn = false;
    if (this.skipNextSpawnFocus) {
      // focusOnPlayer glides there next; follow anyway, in case that focus never lands
      this.skipNextSpawnFocus = false;
      this.manualCameraOverrideInAdventure = false;
      this.cameraFollowPlayer = true;
    } else if (this.isMobileViewport() && !keepFraming) {
      const playerPos = this.playerController.getPosition();
      this.focusCameraOnPlayerForMobile(playerPos.worldX, playerPos.worldY);
      this.manualCameraOverrideInAdventure = false;
      this.cameraFollowPlayer = true;
    } else {
      // Adventure starts from the user's current framing instead of forcing a recenter on spawn.
      this.manualCameraOverrideInAdventure = true;
      this.cameraFollowPlayer = true;
    }

    // Set up keyboard handlers
    this.setupAdventureKeyboardHandlers();

    this.events.emit("adventureModeStarted");
  }

  // A spawnable tile must be player-walkable AND have at least one player-walkable
  // neighbour — otherwise the player lands in a collision-padding pocket and can't move.
  private isSpawnable(x: number, y: number): boolean {
    if (!this.isPlayerWalkable(x, y)) return false;
    for (const dir of allDirections) {
      const vec = directionVectors[dir];
      if (this.isPlayerWalkable(x + vec.dx, y + vec.dy)) return true;
    }
    return false;
  }

  private findSpawnPosition(preferX: number, preferY: number): { x: number; y: number } {
    if (this.isSpawnable(preferX, preferY)) {
      return { x: preferX, y: preferY };
    }

    // Expanding ring search — only check the perimeter at each radius
    for (let radius = 1; radius < 10; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
          const x = preferX + dx;
          const y = preferY + dy;
          if (this.isSpawnable(x, y)) {
            return { x, y };
          }
        }
      }
    }

    // Last-resort grid scan: take the first spawnable tile, falling back to any
    // player-walkable tile (so a 1-tile pocket is still better than the prefer point).
    let walkableFallback: { x: number; y: number } | null = null;
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        if (this.isSpawnable(x, y)) {
          return { x, y };
        }
        if (!walkableFallback && this.isPlayerWalkable(x, y)) {
          walkableFallback = { x, y };
        }
      }
    }
    return walkableFallback ?? { x: preferX, y: preferY };
  }

  stopAdventureMode(): void {
    if (!this.isAdventureActive) return;

    this.isAdventureActive = false;
    this.gameMode = GameMode.Viewer;
    this.cameraFollowPlayer = false;
    this.avatarFocusActive = false;
    this.focusFollowTimer?.remove();
    this.focusFollowTimer = null;
    this.manualCameraOverrideInAdventure = false;
    this.stopCameraFollow();
    this.standUp();
    this.insideBuilding = null;
    this.setInteriorBeat(null);
    this.hideWalkIn();
    this.walkHover?.setVisible(false);
    // the avatar is gone: only a building opened in place keeps its roof off
    for (const id of Object.keys(BUILDING_INTERIORS)) this.setBuildingOpen(id, this.peek?.buildingId === id);

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
          this.events.emit("interactionTriggered", { tourStop: activeTourStop, buildingId: activeZone.buildingId, method: 'keyboard' });
        }
      }

      // Handle movement keys: a step brings the camera back to the avatar, after a pan or zoom by hand too
      // (during a glide to the avatar its own timer turns the follow on once it lands)
      if (MOVE_KEYS.has(e.key)) {
        // panned away by hand: glide back to the avatar's centre first, then follow
        if (this.manualCameraOverrideInAdventure && !this.focusFollowTimer && this.playerController) {
          this.focusOnPlayer(true, 400);
        }
        this.manualCameraOverrideInAdventure = false;
        if (!this.focusFollowTimer) this.cameraFollowPlayer = true;
      }
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

  // Uses player walkability rules (Road, Tile, Grass, Snow, Asphalt) rather than
  // MainScene.isWalkable which is for car movement (Road, Tile only).
  private isPlayerWalkable(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) return false;
    if (this.blockedTiles.has(`${x},${y}`)) return false;
    const inside = this.interiorTiles.get(`${x},${y}`);
    if (inside) return interiorCode(inside.interior, inside.lx, inside.ly) !== null;
    const cell = this.grid[y]?.[x];
    if (!cell) return false;
    const t = cell.type;
    return t === TileType.Road || t === TileType.Tile || t === TileType.Grass || t === TileType.Snow || t === TileType.Asphalt;
  }

  private findWalkableTilesInZone(centerX: number, centerY: number, zoneRadius: number = TRIGGER_ZONE_RADIUS): { x: number; y: number }[] {
    const searchRadius = Math.ceil(zoneRadius) + 1;
    const radiusSq = zoneRadius * zoneRadius;
    const candidates: { x: number; y: number; distSq: number }[] = [];

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const x = Math.floor(centerX) + dx;
        const y = Math.floor(centerY) + dy;

        if (!this.isSpawnable(x, y)) continue;

        const ex = x - centerX;
        const ey = y - centerY;
        const distSq = ex * ex + ey * ey;

        if (distSq <= radiusSq) {
          candidates.push({ x, y, distSq });
        }
      }
    }

    candidates.sort((a, b) => a.distSq - b.distSq);
    return candidates;
  }

  /** Walk the avatar to a beat's stand tile inside a walk-in building (a card's button, e.g. "Eat" walks to the table) */
  walkPlayerToBeat(buildingId: string, beat: string): boolean {
    const spot = BUILDING_INTERIORS[buildingId]?.standSpots?.[beat];
    const plot = [...this.interiorTiles.values()].find((t) => t.buildingId === buildingId && t.lx === 0 && t.ly === 0);
    if (!this.playerController || !spot || !plot) return false;
    const origin = this.interiorPlots.get(plot.key)!;
    if (!this.playerController.walkToBuilding(origin.originX + Math.floor(spot[0]), origin.originY + Math.floor(spot[1]))) return false;
    // the camera follows the walk, also when the visitor had panned away
    this.manualCameraOverrideInAdventure = false;
    this.cameraFollowPlayer = true;
    return true;
  }

  /** Walk the avatar in through a walk-in building's main door (a hidden find's "Walk me close") */
  walkPlayerIntoBuilding(buildingId: string): boolean {
    const plot = [...this.interiorTiles.values()].find((t) => t.buildingId === buildingId && t.lx === 0 && t.ly === 0);
    if (!this.playerController || !plot) return false;
    const p = this.playerController.getPosition();
    if (this.insideBuildingId(p.gridX, p.gridY) === buildingId) return true;
    this.walkIntoPlot(plot.key);
    return this.playerController.getState() === PlayerState.AutoWalking;
  }

  /** Run the walk that just started (walks sent from the panel) */
  runPlayer(): void {
    this.playerController?.run();
  }

  walkPlayerToBuilding(buildingId: string): boolean {
    if (!this.playerController) return false;

    const position = findBuildingPosition(this.grid, buildingId);
    if (!position) return false;

    // Try walkable tiles within the trigger zone, closest first.
    // Some tiles may be unreachable by A*, so try a few before falling back.
    const building = getBuilding(buildingId);
    const zoneRadius = building?.triggerZoneRadius ?? TRIGGER_ZONE_RADIUS;
    const candidates = this.findWalkableTilesInZone(position.x, position.y, zoneRadius);
    const maxAttempts = Math.min(candidates.length, 5);

    for (let i = 0; i < maxAttempts; i++) {
      if (this.playerController.walkToBuilding(candidates[i].x, candidates[i].y, buildingId)) {
        this.manualCameraOverrideInAdventure = false;
        this.cameraFollowPlayer = true;
        return true;
      }
    }

    const fallback = this.findSpawnPosition(
      Math.floor(position.x + 1),
      Math.floor(position.y + 1)
    );
    if (this.playerController.walkToBuilding(fallback.x, fallback.y, buildingId)) {
      this.manualCameraOverrideInAdventure = false;
      this.cameraFollowPlayer = true;
      return true;
    }
    return false;
  }

  movePlayerToBuilding(buildingId: string): boolean {
    if (!this.playerController) return false;

    const position = findBuildingPosition(this.grid, buildingId);
    if (!position) return false;

    // Use the first walkable tile within the trigger zone (closest to center)
    const bld = getBuilding(buildingId);
    const zoneRadius = bld?.triggerZoneRadius ?? TRIGGER_ZONE_RADIUS;
    const candidates = this.findWalkableTilesInZone(position.x, position.y, zoneRadius);
    const target = candidates[0] ?? this.findSpawnPosition(
      Math.floor(position.x + 1),
      Math.floor(position.y + 1)
    );

    this.manualCameraOverrideInAdventure = false;
    this.cameraFollowPlayer = true;
    this.playerController.moveTo(target.x, target.y);
    return true;
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

  // Player feet in world pixels
  getPlayerWorldPosition(): { x: number; y: number } | null {
    const position = this.playerController?.getPosition();
    return position ? { x: position.worldX, y: position.worldY } : null;
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

        positions.push({
          buildingId: cell.buildingId,
          screenX: screenPos.x,
          screenY: screenPos.y,
          logoUrl: building.logoUrl,
          logoOffset: building.logoOffset || { x: 0, y: 60 },
        });
      }
    }

    return positions;
  }

  // Get camera state for syncing with overlay
  getCameraState(): {
    scrollX: number;
    scrollY: number;
    zoom: number;
    worldWidth: number;
    worldHeight: number;
  } {
    const camera = this.cameras.main;
    return {
      scrollX: this.baseScrollX,
      scrollY: this.baseScrollY,
      zoom: camera.zoom,
      worldWidth: camera.width,
      worldHeight: camera.height,
    };
  }

  private startPanning(pointer: Phaser.Input.Pointer, button: "left" | "right"): void {
    this.isPanning = true;
    this.panPointerButton = button;
    this.panStartX = pointer.x;
    this.panStartY = pointer.y;
    this.panDragDistance = 0;
    this.cameraStartX = this.baseScrollX;
    this.cameraStartY = this.baseScrollY;
    this.recordManualCameraInteraction();
  }

  private stopPanning(): void {
    this.isPanning = false;
    this.panPointerButton = null;
    this.panDragDistance = 0;
  }

  private isMobileViewport(): boolean {
    return window.innerWidth < 768;
  }

  // The avatar builder's tab opened: glide (pan and zoom together, ease in-out) to the player at a close whole zoom,
  // past the usual MAX_ZOOM because the city view beside or above the panel is small, and keep following it.
  // close = true glides back to street zoom for walking once the tab closes.
  avatarFocusZoom = 6;
  private focusFollowTimer: Phaser.Time.TimerEvent | null = null;
  // While the Avatar tab holds the camera close, wheel and pinch may go up to that zoom instead of snapping to 4
  private avatarFocusActive = false;
  private maxZoomNow(): number {
    return this.avatarFocusActive ? Math.max(MainScene.MAX_ZOOM, this.avatarFocusZoom) : MainScene.MAX_ZOOM;
  }
  // The Avatar tab starts walk mode only to show the avatar: skip the phone's snap to it, focusOnPlayer glides there
  skipNextSpawnFocus = false;
  // The new site starts walking on load: the avatar spawns while the camera keeps showing the whole city (landWalking)
  keepFramingOnSpawn = false;
  focusOnPlayer(close = false, durationMs = 800): boolean {
    if (!this.playerController || !this.isAdventureActive) return false;
    const p = this.playerController.getPosition();
    this.stopCameraMoves();
    this.stopCameraFollow();
    const camera = this.cameras.main;
    this.avatarFocusActive = !close;
    // phones walk a little closer than street zoom: at 2 the avatar is a few pixels tall in the small city strip
    const zoom = close ? (this.isMobileViewport() ? 3 : ZOOM.street) : this.avatarFocusZoom;
    const y = p.worldY - (close ? 0 : 12);
    this.cameraFollowPlayer = false;
    this.moveCamera(Math.round(p.worldX - camera.width / 2), Math.round(y - camera.height / 2), zoom, durationMs);
    this.manualCameraOverrideInAdventure = false;
    // follow again once the glide has landed (a follow during the tween would fight it)
    this.focusFollowTimer?.remove();
    this.focusFollowTimer = this.time.delayedCall(durationMs + 20, () => {
      this.focusFollowTimer = null;
      if (this.isAdventureActive) this.cameraFollowPlayer = true;
    });
    return true;
  }

  // Landing walking (POR-47): a moment close on the avatar ("this is you"), then out to street zoom (3 on a phone) to show the
  // streets around it. A pan or zoom by hand in the meantime keeps the visitor's own framing.
  landWalking(delayMs: number, glideMs: number): void {
    if (!this.playerController) return;
    if (delayMs > 0) {
      const p = this.playerController.getPosition();
      const camera = this.cameras.main;
      this.stopCameraMoves();
      this.cameraFollowPlayer = false;
      this.moveCamera(Math.round(p.worldX - camera.width / 2), Math.round(p.worldY - 12 - camera.height / 2), ZOOM.detail, 1);
    }
    const since = this.time.now;
    this.time.delayedCall(delayMs, () => {
      if ((this.lastManualCameraInteractionAt ?? -1) >= since) return;
      this.focusOnPlayer(true, glideMs);
    });
  }

  private focusCameraOnPlayerForMobile(playerWorldX: number, playerWorldY: number): void {
    const camera = this.cameras.main;
    const zoom = Math.max(camera.zoom, ZOOM.street);

    camera.setZoom(zoom);
    camera.scrollX = Math.round(playerWorldX - camera.width / 2);
    camera.scrollY = Math.round(playerWorldY - camera.height / 2);
    this.baseScrollX = camera.scrollX;
    this.baseScrollY = camera.scrollY;
    this.zoomLevel = zoom;
    // Prevent React's zoom useEffect from re-applying the zoom via applyZoomAtPointer,
    // which would corrupt the scroll using a stale camera render matrix.
    this.zoomHandledInternally = true;
    this.events.emit("zoomChanged", zoom);
  }

  private recordManualCameraInteraction(): void {
    this.lastManualCameraInteractionAt = this.time.now;
    // A zoom by hand while a hatch card is open stays: leaving the hatch does not undo it
    this.beatZoomFrom = null;
    this.stopCameraFollow();
    this.stopCameraMoves();
    if (this.isAdventureActive) {
      this.manualCameraOverrideInAdventure = true;
    }
  }

  private applyZoomAtPointer(zoom: number, screenX: number, screenY: number): void {
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
    this.buildingSpriteInfo.clear();
    this.doors.clear();
    this.ambients.clear();
    this.reactions.clear();

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
        tileSprite.setDepth(MainScene.GROUND_DEPTH + this.depthFromSortPoint(screenPos.x, screenPos.y, 0));
        this.tileSprites.set(key, tileSprite);

        if (cell.type === TileType.Building && cell.isOrigin && cell.buildingId) {
          this.renderBuilding(x, y, cell.buildingId, cell.buildingOrientation);
        }
      }
    }
  }

  private static readonly PAVING_DENSITY = 4;   // texels per screen pixel at zoom 1 (sharp up to Detail zoom)

  // The paving texture for one tile: drawn in tile units (u east, v south, 0..1) through the isometric transform, so the
  // pavers lie flat on the ground. Brick herringbone in the building's brick colour (Gustav picked it from six options,
  // 2026-10-21): 2 x 1 bricks, a staircase of a horizontal brick at (a, a) and a vertical one at (a, a + 1), repeated
  // every (2, -2), so the lattice (1, 1), (2, -2) covers the tile with no gaps.
  private entrancePavingTexture(buildingId: string, brick: number): string {
    const key = `${buildingId}_entrance_paving`;
    if (this.textures.exists(key)) return key;
    const S = MainScene.PAVING_DENSITY, w = TILE_WIDTH * S, h = TILE_HEIGHT * S;
    const tex = this.textures.createCanvas(key, w, h);
    if (!tex) return key;
    const ctx = tex.getContext();
    ctx.setTransform(w / 2, h / 2, -w / 2, h / 2, w / 2, 0);   // (u, v) -> canvas pixels
    ctx.beginPath();
    ctx.rect(0, 0, 1, 1);
    ctx.clip();
    const hex = (c: number) => `#${c.toString(16).padStart(6, "0")}`;
    const shade = (c: number, k: number) => {
      const ch = (s: number) => Math.max(0, Math.min(255, Math.round(((c >> s) & 255) * k)));
      return (ch(16) << 16) | (ch(8) << 8) | ch(0);
    };
    const joint = 0.012, b = 1 / 9;
    const bricks = [brick, shade(brick, 0.92), shade(brick, 1.08)].map(hex);
    const fill = (color: string, u: number, v: number, du: number, dv: number) => {
      ctx.fillStyle = color;
      ctx.fillRect(u + joint / 2, v + joint / 2, du - joint, dv - joint);
    };
    ctx.fillStyle = hex(shade(brick, 0.72));   // the joints
    ctx.fillRect(0, 0, 1, 1);
    for (let a = -20; a < 20; a++) for (let k = -10; k < 10; k++) {
      const x = (a + 2 * k) * b, y = (a - 2 * k) * b;
      if (x > 1.2 || y > 1.2 || x < -0.4 || y < -0.4) continue;
      fill(bricks[((a % 3) + 3) % 3], x, y, 2 * b, b);
      fill(bricks[(((a + 1) % 3) + 3) % 3], x, y + b, b, 2 * b);
    }
    tex.refresh();
    return key;
  }

  private removeBuildingSprites(buildingKey: string): void {
    const sprite = this.buildingSprites.get(buildingKey);
    if (sprite) {
      sprite.destroy();
      this.buildingSprites.delete(buildingKey);
    }
    this.buildingSpriteInfo.delete(buildingKey);

    const doorSprite = this.buildingSprites.get(`${buildingKey}_door`);
    if (doorSprite) {
      doorSprite.destroy();
      this.buildingSprites.delete(`${buildingKey}_door`);
    }
    this.doors.delete(buildingKey);
    this.entrancePavings.get(buildingKey)?.destroy();
    this.entrancePavings.delete(buildingKey);
    const ambientSprite = this.buildingSprites.get(`${buildingKey}_ambient`);
    if (ambientSprite) {
      ambientSprite.destroy();
      this.buildingSprites.delete(`${buildingKey}_ambient`);
    }
    this.ambients.delete(buildingKey);
    // By the reactions map, not by index: a reaction whose sheet failed to load leaves a gap in the numbers
    [...this.reactions.keys()].filter((k) => k.startsWith(`${buildingKey}_reaction`)).forEach((k) => {
      this.buildingSprites.get(k)?.destroy();
      this.buildingSprites.delete(k);
      this.reactions.delete(k);
    });
    const lightsSprite = this.buildingSprites.get(`${buildingKey}_lights`);
    if (lightsSprite) {
      lightsSprite.destroy();
      this.buildingSprites.delete(`${buildingKey}_lights`);
    }
    this.nightLights.delete(buildingKey);
    for (const part of ["wa", "wb", "wf", "spill"]) {
      this.buildingSprites.get(`${buildingKey}_${part}`)?.destroy();
      this.buildingSprites.delete(`${buildingKey}_${part}`);
    }
    this.buildingWindows.delete(buildingKey);
    for (let i = 0; this.buildingSprites.has(`${buildingKey}_moment${i}`); i++) {
      this.buildingSprites.get(`${buildingKey}_moment${i}`)?.destroy();
      this.buildingSprites.delete(`${buildingKey}_moment${i}`);
      this.moments.delete(`${buildingKey}_moment${i}`);
    }

    for (let i = 0; i < 40; i++) {
      const decorKey = `${buildingKey}_d${i}`;
      const decor = this.buildingSprites.get(decorKey);
      if (!decor) continue;
      decor.destroy();
      this.buildingSprites.delete(decorKey);
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
    sprite.setScale(this.buildingTextureScale(building, textureKey));
    sprite.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y + TILE_HEIGHT / 2, 0.05));

    this.buildingSprites.set(key, sprite);
    this.buildingSpriteInfo.set(key, { buildingId, orientation });
    if (building.slices) this.sliceBuildingSprite(sprite, key, originX, originY, footprint.width, footprint.height);

    // Paving on the street tile in front of the main door: an image, so the night tint reaches it like the ground tiles
    const interior = BUILDING_INTERIORS[buildingId];
    const paving = building.entrancePaving;
    if (paving && interior && (!orientation || orientation === Direction.Down)) {
      const tx = originX + interior.entrance.outside[0];
      const ty = originY + interior.entrance.outside[1];
      const top = this.gridToScreen(tx, ty);
      const image = this.add.image(top.x, top.y, this.entrancePavingTexture(buildingId, paving.brick));
      image.setOrigin(0.5, 0);
      image.setScale(1 / MainScene.PAVING_DENSITY);
      const front = this.gridToScreen(tx + 1, ty + 1);
      image.setDepth(MainScene.GROUND_DEPTH + this.depthFromSortPoint(front.x, front.y, 0.02)); // in the ground layer, above its tile
      this.entrancePavings.set(key, image);
    }

    // Animated main door over the building sprite (frames cropped from the same sprite, so it lines up exactly)
    const door = building.door;
    if (door && (!orientation || orientation === Direction.Down) && this.textures.exists(`${building.id}_door`)) {
      const s = building.spriteScale ?? 1;
      const left = sprite.x - sprite.width * s / 2;
      const top = sprite.y - sprite.height * s;
      const image = this.add.image(left + door.x * s, top + door.y * s, `${building.id}_door`, 0);
      image.setOrigin(0, 0);
      image.setScale(s);
      image.setDepth(sprite.depth + 0.05);
      this.buildingSprites.set(`${key}_door`, image);
      this.doors.set(key, { image, buildingId, originX, originY, value: 0 });
    }

    // Ambient loop over the building sprite (a flag, a screen): frames cropped from the south sprite, played on a timer
    const ambient = building.ambient;
    if (ambient && (!orientation || orientation === Direction.Down) && this.textures.exists(`${building.id}_ambient`)) {
      const s = sprite.scaleX;
      const left = sprite.x - sprite.width * s / 2;
      const top = sprite.y - sprite.height * s;
      const image = this.add.image(left + ambient.x * s, top + ambient.y * s, `${building.id}_ambient`, 0);
      image.setOrigin(0, 0);
      image.setScale(s);
      image.setDepth(sprite.depth + 0.04);
      this.buildingSprites.set(`${key}_ambient`, image);
      this.ambients.set(key, { image, frames: ambient.frames, fps: ambient.fps });
    }

    // Reactions (the food truck cooks): same crop maths as the ambient loop, frame 0 shown until the visitor comes near
    if (!orientation || orientation === Direction.Down) {
      (building.reactions ?? []).forEach((r, i) => {
        if (!this.textures.exists(`${building.id}_reaction${i}`)) return;
        const s = sprite.scaleX;
        const left = sprite.x - sprite.width * s / 2;
        const top = sprite.y - sprite.height * s;
        const image = this.add.image(left + r.x * s, top + r.y * s, `${building.id}_reaction${i}`, 0);
        image.setOrigin(0, 0);
        image.setScale(s);
        image.setDepth(sprite.depth + 0.042);
        this.buildingSprites.set(`${key}_reaction${i}`, image);
        this.reactions.set(`${key}_reaction${i}`, { image, buildingId, index: i, originX, originY, mode: 'idle', value: 0, near: false });
      });
    }

    // Night lights: same crop maths as the ambient loop, untinted and faded in with the night (updateNight)
    const lights = building.nightLights;
    if (lights && (!orientation || orientation === Direction.Down) && this.textures.exists(`${building.id}_lights`)) {
      const s = sprite.scaleX;
      const left = sprite.x - sprite.width * s / 2;
      const top = sprite.y - sprite.height * s;
      const image = this.add.image(left + lights.x * s, top + lights.y * s, `${building.id}_lights`, 0);
      image.setOrigin(0, 0);
      image.setScale(s);
      // Over every slice of a sliced building (the bowl spans several), so the lit part is never cut by a later slice
      let depth = sprite.depth;
      for (let n = 1; this.buildingSprites.has(`${key}_s${n}`); n++) {
        depth = Math.max(depth, this.buildingSprites.get(`${key}_s${n}`)!.depth);
      }
      image.setDepth(depth + 0.045);
      image.setAlpha(this.night);
      image.setVisible(this.night > 0);
      this.buildingSprites.set(`${key}_lights`, image);
      this.nightLights.set(key, { image, frames: lights.frames, fps: lights.fps, hours: lights.hours, level: MainScene.onByHours(lights.hours, this.hour) });
    }

    // Lit windows by the hour (filler buildings; lib/city/nightSchedule.ts)
    const kind = nightKind(building.id, building.category);
    if (kind && !building.slices) this.addBuildingWindows(key, sprite, textureKey, kind, originX, originY, footprint, orientation);
    if (building.nightWindows && (!orientation || orientation === Direction.Down)) this.addModelWindows(key, sprite, building);

    // Interior moments over the roof-off sprite (shown only while the roof is off; updateMoments)
    if (!orientation || orientation === Direction.Down) {
      (building.moments ?? []).forEach((moment, i) => {
        if (!this.textures.exists(`${building.id}_moment${i}`)) return;
        const s = building.openSpriteScale ?? building.spriteScale ?? 1;
        const left = sprite.x - sprite.width * sprite.scaleX / 2;
        const top = sprite.y - sprite.height * sprite.scaleY;
        const image = this.add.image(left + moment.x * s, top + moment.y * s, `${building.id}_moment${i}`, 0);
        image.setOrigin(0, 0);
        image.setScale(s);
        image.setDepth(sprite.depth + 0.04);
        image.setVisible(this.openBuildings.has(buildingId));
        this.buildingSprites.set(`${key}_moment${i}`, image);
        this.moments.set(`${key}_moment${i}`, { image, buildingId, index: i, originX, originY, value: 0 });
      });
    }

    // Library props on the footprint (building.decor), drawn just above the building and sorted among themselves
    // (and against the player inside the footprint) by their local ground position
    if (!orientation || orientation === Direction.Down) {
      (building.decor ?? []).forEach((d, i) => {
        const textureKey = `${d.prop}_south`;
        if (!this.textures.exists(textureKey)) return;
        const p = this.gridToScreen(originX + d.x, originY + d.y);
        const image = this.add.image(p.x, p.y, textureKey);
        const frame = image.frame;
        const bottom = this.decorBottom.get(textureKey) ?? this.measureBottom(textureKey, frame.height);
        image.setOrigin(0.5, bottom / frame.height);
        image.setScale(d.scale);
        image.setDepth(sprite.depth + this.footprintSortOffset(d.x, d.y));
        this.buildingSprites.set(`${key}_d${i}`, image);
      });
    }
  }

  // Cut a building sprite into vertical slices along the tile diagonals (docs/city-rules.md section 8). Lines of tiles
  // with the same local x - y share a screen column; a slice runs between the centres of two neighbouring lines and sorts
  // by the front-most footprint tile of either line, so what stands in front of one part of a big building is drawn over
  // that part only. The main sprite becomes the first slice; the others are `${key}_s1`.. (removeBuildingSprites).
  private sliceBuildingSprite(
    sprite: Phaser.GameObjects.Image, key: string, originX: number, originY: number, width: number, height: number,
  ): void {
    const s = sprite.scaleX;
    const fw = sprite.frame.width, fh = sprite.frame.height;
    let n = 0;
    for (const st of this.sliceStrips(fw, s, originX, originY, width, height)) {
      let image = sprite;
      if (n > 0) {
        image = this.add.image(sprite.x, sprite.y, sprite.texture.key);
        image.setOrigin(sprite.originX, sprite.originY);
        image.setScale(s);
        this.buildingSprites.set(`${key}_s${n}`, image);
      }
      image.setCrop(st.x0, 0, st.x1 - st.x0, fh);
      image.setDepth(st.depth);
      n++;
    }
  }

  // The slices of a building sprite fw texture pixels wide at scale s: texture columns x0..x1 and each one's depth
  private sliceStrips(
    fw: number, s: number, originX: number, originY: number, width: number, height: number,
  ): { x0: number; x1: number; depth: number }[] {
    const dFront = (width - 1) - (height - 1);                 // the sprite's x is the front tile's line
    const front = (d: number) => {                              // front-most tile on line d (local x - y = d)
      const lx = Math.min(width - 1, d + height - 1);
      return { x: originX + lx, y: originY + lx - d, sum: 2 * lx - d };
    };
    const depthOf = (t: { x: number; y: number }) => {
      const p = this.gridToScreen(t.x, t.y);
      return this.depthFromSortPoint(p.x, p.y + TILE_HEIGHT / 2, 0.05);
    };
    const texX = (d: number) => Math.round(fw / 2 + ((d - dFront) * TILE_WIDTH) / 2 / s);
    const first = -(height - 1), last = width - 1;
    const strips: { x0: number; x1: number; depth: number }[] = [{ x0: 0, x1: texX(first), depth: depthOf(front(first)) }];
    for (let d = first; d < last; d++) {
      const a = front(d), b = front(d + 1);
      strips.push({ x0: texX(d), x1: texX(d + 1), depth: depthOf(a.sum >= b.sum ? a : b) });
    }
    strips.push({ x0: texX(last), x1: fw, depth: depthOf(front(last)) });
    return strips
      .map((st) => ({ x0: Math.max(0, st.x0), x1: Math.min(fw, st.x1), depth: st.depth }))
      .filter((st) => st.x1 > st.x0);
  }

  // Ambient loops by building key (docs/city-rules.md section 9: every landmark has one); frame from the scene clock
  private ambients: Map<string, { image: Phaser.GameObjects.Image; frames: number; fps: number }> = new Map();

  private updateAmbients(time: number): void {
    this.ambients.forEach((a) => {
      if (a.image.active) a.image.setFrame(Math.floor((time / 1000) * a.fps) % a.frames);
    });
  }

  // The look (lib/city/nightSchedule.ts LOOKS): every scene object is multiplied by the look's tint (grade), eased over
  // 0.9 s, except the lights. night is the lights' level, 0 (off: morning, day) .. 1 (on: evening, night); the night
  // lights fade in over their buildings and play on the scene clock
  private night = 0;
  private nightTarget = 0;
  private grade = { r: 255, g: 255, b: 255 };
  private gradeTarget = { r: 255, g: 255, b: 255 };
  private nightLights: Map<string, { image: Phaser.GameObjects.Image; frames: number; fps: number; hours?: [number, number]; level: number }> = new Map();
  private static readonly DAY_BACKGROUND = { r: 0x73, g: 0x64, b: 0x5f };

  setLook(look: CityLook): void {
    const { tint, lights } = LOOKS[look];
    this.gradeTarget = { r: tint[0], g: tint[1], b: tint[2] };
    this.nightTarget = lights ? 1 : 0;
  }

  setNight(on: boolean): void {
    this.setLook(on ? "night" : "day");
  }

  // The city's hour (the visitor's clock, or ?hour=): which windows are lit, how many walk, how bright the lamps are
  private hour = 21;
  setHour(hour: number): void {
    if (hour === this.hour) return;
    this.hour = hour;
    this.buildingWindows.forEach((w) => { w.levels = this.windowLevels(w, hour); });
    this.nightApplied = { tint: -1, count: -1 };
  }

  // Lit windows: two random groups of window glass found in the sprite (lib/city/nightWindows.ts), the shopfront of
  // food places and the bar, and a warm spill of light on the street in front of an open one. All untinted, faded in
  // with the night and set by the hour
  // A building's windows from its 3D model (nightWindows) carry buildingId, so they hide while its roof is off (`shown`)
  private buildingWindows: Map<string, {
    kind: NightKind; frontKind?: NightKind; seed: number; levels: { a: number; b: number; front: number };
    parts: { image: Phaser.GameObjects.Image; group: "a" | "b" | "front"; strength: number }[];
    buildingId?: string; shown: number;
  }> = new Map();

  private windowLevels(w: { kind: NightKind; frontKind?: NightKind; seed: number }, hour: number) {
    const levels = nightLevels(w.kind, hour, w.seed);
    return w.frontKind ? { ...levels, front: nightLevels(w.frontKind, hour, w.seed).front } : levels;
  }

  // On by the hour: inside from..to (wrapping past midnight), or always without hours
  private static onByHours(hours: [number, number] | undefined, hour: number): number {
    if (!hours) return 1;
    const [from, to] = hours;
    return (from <= to ? hour >= from && hour < to : hour >= from || hour < to) ? 1 : 0;
  }

  // Lit windows rendered from a building's 3D model (BuildingDefinition.nightWindows), over every slice of the sprite
  private addModelWindows(key: string, sprite: Phaser.GameObjects.Image, building: BuildingDefinition): void {
    const win = building.nightWindows!;
    const seed = 0; // the portfolio buildings are the ones someone always works late in
    let depth = sprite.depth;
    for (let n = 1; this.buildingSprites.has(`${key}_s${n}`); n++) {
      depth = Math.max(depth, this.buildingSprites.get(`${key}_s${n}`)!.depth);
    }
    const parts: { image: Phaser.GameObjects.Image; group: "a" | "b" | "front"; strength: number }[] = [];
    (["a", "b", "front"] as const).forEach((group, i) => {
      const texture = `${building.id}_win_${group}`;
      if (!win[group] || !this.textures.exists(texture)) return;
      const image = this.add.image(sprite.x, sprite.y, texture).setOrigin(sprite.originX, sprite.originY);
      image.setScale(sprite.scaleX, sprite.scaleY).setDepth(depth + 0.041 + i * 0.001).setVisible(false).setAlpha(0);
      this.buildingSprites.set(`${key}_w${group === "front" ? "f" : group}`, image);
      parts.push({ image, group, strength: group === "front" ? 0.9 : 0.8 });
    });
    const w = { kind: win.kind, frontKind: win.frontKind, seed, buildingId: building.id, shown: 1, parts, levels: { a: 0, b: 0, front: 0 } };
    w.levels = this.windowLevels(w, this.hour);
    this.buildingWindows.set(key, w);
    this.nightApplied = { tint: -1, count: -1 };
  }

  private windowTextures(textureKey: string, shopfront: "left" | "right" | null): { a: string; b: string; front: string | null } | null {
    const base = `${textureKey}_win${shopfront ? `_${shopfront}` : ""}`;
    const keys = { a: `${base}_a`, b: `${base}_b`, front: shopfront ? `${base}_f` : null };
    if (this.textures.exists(keys.a)) return keys;
    const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const w = source.width, h = source.height;
    if (!w || !h) return null;
    const scratch = document.createElement("canvas");
    scratch.width = w; scratch.height = h;
    const ctx = scratch.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(source, 0, 0);
    const layers = findWindows(ctx.getImageData(0, 0, w, h), shopfront);
    const put = (key: string, data: ImageData) => {
      const canvas = this.textures.createCanvas(key, w, h);
      if (!canvas) return;
      canvas.getContext().putImageData(data, 0, 0);
      canvas.refresh();
    };
    put(keys.a, layers.a);
    put(keys.b, layers.b);
    if (keys.front && layers.front) put(keys.front, layers.front);
    return keys;
  }

  private addBuildingWindows(
    key: string, sprite: Phaser.GameObjects.Image, textureKey: string, kind: NightKind,
    originX: number, originY: number, footprint: { width: number; height: number }, orientation?: Direction
  ): void {
    // The front faces +y for a south sprite (the left face on screen) and +x for an east one (the right face)
    const facing = orientation ?? Direction.Down;
    const shopfront = kind === "food" || kind === "bar"
      ? (facing === Direction.Down ? "left" : facing === Direction.Right ? "right" : null) : null;
    const keys = this.windowTextures(textureKey, shopfront);
    if (!keys) return;
    const seed = seedFrom(key);
    const parts: { image: Phaser.GameObjects.Image; group: "a" | "b" | "front"; strength: number }[] = [];
    const overlay = (texture: string, part: "wa" | "wb" | "wf", group: "a" | "b" | "front", depth: number) => {
      const image = this.add.image(sprite.x, sprite.y, texture).setOrigin(sprite.originX, sprite.originY);
      image.setScale(sprite.scaleX, sprite.scaleY).setDepth(sprite.depth + depth).setVisible(false).setAlpha(0);
      this.buildingSprites.set(`${key}_${part}`, image);
      parts.push({ image, group, strength: 1 });
    };
    overlay(keys.a, "wa", "a", 0.001);
    overlay(keys.b, "wb", "b", 0.002);
    if (keys.front) overlay(keys.front, "wf", "front", 0.003);

    // The spill: a warm pool on the street in front of the door side
    if (kind === "food" || kind === "bar") {
      const { width: fw, height: fh } = footprint;
      const at = facing === Direction.Down ? { x: originX + fw / 2, y: originY + fh + 0.6 }
        : facing === Direction.Right ? { x: originX + fw + 0.6, y: originY + fh / 2 }
        : facing === Direction.Up ? { x: originX + fw / 2, y: originY - 0.6 }
        : { x: originX - 0.6, y: originY + fh / 2 };
      const ground = this.gridToScreen(at.x, at.y);
      const spill = this.add.image(ground.x, ground.y, this.spillTexture()).setBlendMode(Phaser.BlendModes.ADD);
      spill.setDepth(MainScene.POOL_DEPTH).setVisible(false).setAlpha(0);
      this.buildingSprites.set(`${key}_spill`, spill);
      parts.push({ image: spill, group: "front", strength: 0.8 });
    }
    this.buildingWindows.set(key, { kind, seed, levels: nightLevels(kind, this.hour, seed), parts, shown: 1 });
    this.nightApplied = { tint: -1, count: -1 };
  }

  // A shopfront spill: a soft warm ellipse on the ground, about 2 x 1.4 tiles
  private spillTexture(): string {
    const key = "shop_spill";
    if (this.textures.exists(key)) return key;
    this.drawPool(key, 1.4, 1.4, [255, 196, 120], 0.75, 1.6);
    return key;
  }

  // A light pool on the ground in ground space: an ellipse with radii (rx, ry) in wu, projected to the 2:1 tiles. The
  // falloff is cut into a few hard brightness steps with a 4 x 4 dither between them, so it reads as pixel art rather
  // than a blur (the way a pixel-art game shades its light)
  private static readonly BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  private drawPool(key: string, rx: number, ry: number, [r, g, b]: number[], peak: number, falloff: number): void {
    const halfW = TILE_WIDTH / 2, halfH = TILE_HEIGHT / 2;
    const w = Math.ceil((rx + ry) * halfW * 2), h = Math.ceil((rx + ry) * halfH * 2);
    const canvas = this.textures.createCanvas(key, w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const img = ctx.createImageData(w, h);
    const steps = 5;
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const sx = px + 0.5 - w / 2, sy = py + 0.5 - h / 2;
        const gx = (sx / halfW + sy / halfH) / 2, gy = (sy / halfH - sx / halfW) / 2;
        const d = Math.sqrt((gx / rx) ** 2 + (gy / ry) ** 2);
        if (d >= 1) continue;
        const v = Math.pow(1 - d, falloff) * steps;
        const base = Math.floor(v);
        const level = base + (v - base > (MainScene.BAYER4[(py % 4) * 4 + (px % 4)] + 0.5) / 16 ? 1 : 0);
        const i = (py * w + px) * 4;
        img.data[i] = r; img.data[i + 1] = g; img.data[i + 2] = b;
        img.data[i + 3] = Math.round((Math.min(steps, level) / steps) * peak * 255);
      }
    }
    ctx.putImageData(img, 0, 0);
    canvas.refresh();
  }

  private nightClock = 0;
  private windowDusk: number | null = null;
  private nightApplied = { tint: 0xffffff, count: 0 };
  // Room light by building key (0..1): on while the roof is off, so a visitor can see inside at night
  private roomLight: Map<string, number> = new Map();
  // The old textures of a cross-fading building (refreshBuildingTexture): tinted once, left out of the night re-tint
  private crossFades: Set<Phaser.GameObjects.Image> = new Set();
  private static readonly ROOM_COLOR: [number, number, number] = [255, 240, 218];
  private static readonly ROOM_STRENGTH = 0.85;

  private updateNight(time: number): void {
    const last = this.nightClock;
    this.nightClock = time;
    const g = this.grade, gt = this.gradeTarget;
    const settled = g.r === gt.r && g.g === gt.g && g.b === gt.b && this.night === this.nightTarget;
    if (settled && this.night === 0 && g.r === 255 && g.g === 255 && g.b === 255) return;
    const step = Math.min(1, (time - last) / 900);             // a 0.9 s fade on the scene clock, not the smoothed delta
    this.night = this.night < this.nightTarget
      ? Math.min(this.nightTarget, this.night + step)
      : Math.max(this.nightTarget, this.night - step);
    const ease = (c: number, target: number) =>
      c < target ? Math.min(target, c + step * 255) : Math.max(target, c - step * 255);
    this.grade = { r: ease(g.r, gt.r), g: ease(g.g, gt.g), b: ease(g.b, gt.b) };
    const t = this.night, n = this.grade, bg = MainScene.DAY_BACKGROUND;
    const tint = (Math.round(n.r) << 16) | (Math.round(n.g) << 8) | Math.round(n.b);
    const lit = new Set<Phaser.GameObjects.GameObject>([...this.streetLampLit, ...this.crossFades]);
    // At dusk the windows come on house by house over 2.5 s (each building at its own moment), not all at once
    if (this.nightTarget === 1 && t >= 0.3 && this.windowDusk === null) this.windowDusk = time;
    if (this.nightTarget === 0) this.windowDusk = null;
    const fade = Math.min(1, (time - last) / 450); // the roof's cross-fade (refreshBuildingTexture)
    this.buildingWindows.forEach((w) => {
      const since = this.windowDusk === null ? 0 : time - this.windowDusk - w.seed * 2500;
      const on = this.nightTarget === 0 ? 1 : Math.min(1, Math.max(0, since / 300));
      const shown = w.buildingId && this.openBuildings.has(w.buildingId) ? 0 : 1;
      w.shown = w.shown < shown ? Math.min(shown, w.shown + fade) : Math.max(shown, w.shown - fade);
      w.parts.forEach((part) => {
        lit.add(part.image);
        if (!part.image.active) return;
        const level = w.levels[part.group] * t * on * w.shown;
        part.image.setVisible(level > 0).setAlpha(level * part.strength);
      });
    });
    this.nightLights.forEach((l) => {
      lit.add(l.image);
      if (!l.image.active) return;
      // Lights with hours (the stadium's floodlights) switch on and off over 2 s when the hour crosses them
      const on = MainScene.onByHours(l.hours, this.hour);
      const ramp = Math.min(1, (time - last) / 2000);
      l.level = l.level < on ? Math.min(on, l.level + ramp) : Math.max(on, l.level - ramp);
      l.image.setVisible(t * l.level > 0);
      l.image.setAlpha(t * l.level);
      l.image.setFrame(Math.floor((time / 1000) * l.fps) % l.frames);
    });
    // Rooms light up while their roof is off (a tap or the player inside), so the interior reads at night
    let roomsMoving = false;
    this.buildingSpriteInfo.forEach((info, key) => {
      const want = this.openBuildings.has(info.buildingId) ? 1 : 0;
      const was = this.roomLight.get(key) ?? 0;
      if (was === want) return;
      // On: fade up with the roof. Off: at once, as the closed roof fades in over the open rooms (the fading-out rooms
      // keep their own tint, refreshBuildingTexture), so the roof never shows lit warm for a moment
      this.roomLight.set(key, was < want ? Math.min(want, was + fade) : want);
      roomsMoving = true;
    });
    const rooms: { image: Phaser.GameObjects.GameObject; tint: number }[] = [];
    this.roomLight.forEach((level, key) => {
      if (level === 0) return;
      const k = level * t * MainScene.ROOM_STRENGTH, room = MainScene.ROOM_COLOR;
      const ch = (c: number, w: number) => Math.round(c * (1 - k) + w * k);
      const roomTint = (ch(n.r, room[0]) << 16) | (ch(n.g, room[1]) << 8) | ch(n.b, room[2]);
      this.buildingSprites.forEach((image, k2) => {
        if (k2 !== key && !(k2.startsWith(`${key}_`) && !/_(wa|wb|wf|spill|lights)$/.test(k2))) return;
        lit.add(image);
        rooms.push({ image, tint: roomTint });
      });
    });
    // Re-tint only while fading or when objects were added (characters, cars), not every frame of a settled night
    const count = this.children.list.length;
    if (!roomsMoving && tint === this.nightApplied.tint && count === this.nightApplied.count) return;
    this.nightApplied = { tint, count };
    rooms.forEach(({ image, tint: roomTint }) => (image as Phaser.GameObjects.Image).setTint(roomTint));
    this.children.list.forEach((child) => {
      if (lit.has(child)) return;
      const c = child as Phaser.GameObjects.GameObject & { setTint?: (color: number) => unknown };
      c.setTint?.(tint);
    });
    const shade = (c: number, k: number) => Math.round(c * k / 255);
    const background = (shade(bg.r, n.r) << 16) | (shade(bg.g, n.g) << 8) | shade(bg.b, n.b);
    this.cameras.main.setBackgroundColor(background);
    // The canvas is letterboxed on a desktop (Scale.FIT): shade the box around it too, so the bars are not day brown
    const parent = this.game.canvas?.parentElement;
    if (parent) parent.style.backgroundColor = `#${background.toString(16).padStart(6, "0")}`;
  }

  // Street lamps (POR-39): placed by a rule from the grid (lib/city/streetLights.ts). At dusk they switch on one by one
  // along each street; each throws a warm pool on the ground (additive, so it brightens the dark ground under it) and a
  // small glow round its head. The player is lit warm while standing in a pool.
  private streetLamps: {
    lamp: StreetLamp; level: number; strength: number; screen: { x: number; y: number };
    pool: { rx: number; ry: number };
    objects: Phaser.GameObjects.GameObject[]; lit: Phaser.GameObjects.Image; glow: Phaser.GameObjects.Image;
    lights: { image: Phaser.GameObjects.Image; strength: number }[];
  }[] = [];
  private streetLampLit: Set<Phaser.GameObjects.GameObject> = new Set();
  private duskStart: number | null = null;
  private lastLampTime = 0;
  private playerLampTinted = false;
  private static readonly LAMP_COLOR: Record<StreetLampType, [number, number, number]> = {
    post: [255, 232, 196], wire: [255, 196, 112], lantern: [255, 188, 104],
  };

  // A light pool texture, drawn in ground space: a soft ellipse with radii (rx, ry) in wu, projected to the 2:1 tiles
  private lampPoolTexture(type: StreetLampType): string {
    const key = `lamp_pool_${type}`;
    if (this.textures.exists(key)) return key;
    const { rx, ry, falloff = 1.4 } = STREET_LAMPS[type].pool;
    this.drawPool(key, rx, ry, MainScene.LAMP_COLOR[type], 0.9, falloff);
    return key;
  }

  private lampGlowTexture(): string {
    const key = "lamp_glow";
    if (this.textures.exists(key)) return key;
    const size = 40;
    const canvas = this.textures.createCanvas(key, size, size);
    if (!canvas) return key;
    const ctx = canvas.getContext();
    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0, "rgba(255, 220, 160, 0.55)");
    grad.addColorStop(0.35, "rgba(255, 190, 110, 0.22)");
    grad.addColorStop(1, "rgba(255, 170, 90, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
    canvas.refresh();
    return key;
  }

  private buildStreetLamps(): void {
    // Keep each lamp's level across a rebuild (an edit in the editor), so the other lamps do not blink off and on
    const lampKey = (l: { type: string; x: number; y: number }) => `${l.type},${l.x},${l.y}`;
    const levels = new Map(this.streetLamps.map((l) => [lampKey(l.lamp), l.level]));
    this.streetLamps.forEach((l) => l.objects.forEach((o) => o.destroy()));
    this.streetLamps = [];
    this.streetLampLit.clear();
    this.plotPoolKeys.forEach((k) => this.textures.remove(k));
    this.plotPoolKeys = [];
    if (!this.textures.exists("lamp_post_day")) return;
    const glowKey = this.lampGlowTexture();
    for (const lamp of lampsFromGrid(this.grid)) {
      const spec = STREET_LAMPS[lamp.type];
      const ground = this.gridToScreen(lamp.x, lamp.y);
      const plot = lamp.plot ? this.lampPlotPools(lamp) : null;
      const depth = plot ? plot.depth : this.depthFromSortPoint(ground.x, ground.y, 0.05);
      const objects: Phaser.GameObjects.GameObject[] = [];
      let body: Phaser.GameObjects.Image;
      if (lamp.wire && spec.hangHeight !== undefined) {
        // The wire across the street, with a slight sag to the rod top
        const top = gridToScreen(lamp.x, lamp.y, spec.hangHeight - 0.08);
        const a = gridToScreen(lamp.wire.x0, lamp.wire.y0, spec.hangHeight);
        const b = gridToScreen(lamp.wire.x1, lamp.wire.y1, spec.hangHeight);
        const wire = this.add.graphics();
        wire.lineStyle(1, 0x2a282e, 1);
        wire.lineBetween(a.x, a.y, top.x, top.y);
        wire.lineBetween(top.x, top.y, b.x, b.y);
        wire.setDepth(depth - 0.002);
        objects.push(wire);
        body = this.add.image(top.x, top.y, `lamp_${lamp.type}_day`).setOrigin(0.5, 0);
      } else {
        body = this.add.image(ground.x, ground.y + 1, `lamp_${lamp.type}_day`).setOrigin(0.5, 1);
      }
      body.setDepth(depth);
      objects.push(body);
      const lit = this.add.image(body.x, body.y, `lamp_${lamp.type}_lit`).setOrigin(body.originX, body.originY);
      lit.setDepth(depth + 0.001).setAlpha(0).setVisible(false);
      const head = gridToScreen(lamp.x, lamp.y, spec.height);
      const glow = this.add.image(head.x, head.y, glowKey).setBlendMode(Phaser.BlendModes.ADD);
      glow.setScale(lamp.type === "post" ? 1 : 0.75).setDepth(depth + 0.002).setAlpha(0).setVisible(false);
      const { rx, ry } = spec.pool;
      // The pool on the ground; a lamp on a building's plot also lights the paving drawn in the building's sprite
      const light = this.add.image(ground.x, ground.y, this.lampPoolTexture(lamp.type)).setBlendMode(Phaser.BlendModes.ADD);
      light.setDepth(MainScene.POOL_DEPTH).setAlpha(0).setVisible(false);
      const lights = [{ image: light, strength: spec.pool.strength }, ...(plot?.pools ?? [])];
      objects.push(lit, glow, ...lights.map((p) => p.image));
      [lit, glow, ...lights.map((p) => p.image)].forEach((o) => this.streetLampLit.add(o));
      this.streetLamps.push({ lamp, level: levels.get(lampKey(lamp)) ?? 0, strength: spec.pool.strength, screen: ground, pool: { rx, ry }, objects, lit, glow, lights });
    }
    this.nightApplied = { tint: -1, count: -1 }; // re-tint so the new lamp bodies match the current night
  }

  // A lamp on a building's paved plot: the paving is part of the building's sprite, so the pool in the ground layer
  // sits under it. A second pool, cut by the building's ground mask (only the open paving and the stairs), is drawn over
  // the building in the building's own slices, so whatever stands in front of a slice still covers its light. Lighter
  // than a ground pool: added onto the pale paving, the full pool washes it out to white. The lamp sorts with the
  // building like its decor
  private static readonly PLOT_POOL_STRENGTH = 0.6;
  private plotPoolKeys: string[] = [];
  private lampPlotPools(lamp: StreetLamp): { depth: number; pools: { image: Phaser.GameObjects.Image; strength: number }[] } | null {
    const { buildingId, originX, originY } = lamp.plot!;
    const building = getBuilding(buildingId);
    const maskKey = `${buildingId}_ground`;
    if (!building || !this.textures.exists(maskKey)) return null;
    const footprint = getBuildingFootprint(building, Direction.Down);
    const front = this.gridToScreen(originX + footprint.width - 1, originY + footprint.height - 1);
    const buildingDepth = this.depthFromSortPoint(front.x, front.y + TILE_HEIGHT / 2, 0.05);
    const depth = buildingDepth + this.footprintSortOffset(lamp.x - originX, lamp.y - originY);

    const pool = this.textures.get(this.lampPoolTexture(lamp.type)).getSourceImage() as HTMLCanvasElement;
    const mask = this.textures.get(maskKey).getSourceImage() as HTMLImageElement;
    const key = `lamp_pool_plot_${lamp.x}_${lamp.y}`;
    if (this.textures.exists(key)) this.textures.remove(key);
    const canvas = this.textures.createCanvas(key, pool.width, pool.height);
    if (!canvas) return null;
    const ctx = canvas.getContext();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(pool, 0, 0);
    // The mask lies where the building's sprite does: bottom centre on the plot's front corner, at the sprite's scale
    const scale = building.spriteScale ?? 1;
    const ground = this.gridToScreen(lamp.x, lamp.y);
    const poolLeft = ground.x - pool.width / 2, poolTop = ground.y - pool.height / 2;
    const spriteLeft = front.x - (mask.width * scale) / 2;
    ctx.globalCompositeOperation = "destination-in";
    ctx.drawImage(mask, spriteLeft - poolLeft, front.y + TILE_HEIGHT - mask.height * scale - poolTop, mask.width * scale, mask.height * scale);
    canvas.refresh();
    this.plotPoolKeys.push(key);

    const strength = STREET_LAMPS[lamp.type].pool.strength * MainScene.PLOT_POOL_STRENGTH;
    const pools: { image: Phaser.GameObjects.Image; strength: number }[] = [];
    const strips = building.slices
      ? this.sliceStrips(mask.width, scale, originX, originY, footprint.width, footprint.height)
      : [{ x0: 0, x1: mask.width, depth: buildingDepth }];
    for (const st of strips) {
      const x0 = Math.max(0, spriteLeft + st.x0 * scale - poolLeft), x1 = Math.min(pool.width, spriteLeft + st.x1 * scale - poolLeft);
      if (x1 <= x0) continue;
      const image = this.add.image(ground.x, ground.y, key).setBlendMode(Phaser.BlendModes.ADD);
      image.setCrop(x0, 0, x1 - x0, pool.height);
      image.setDepth(st.depth + 0.29).setAlpha(0).setVisible(false); // over its slice, under the lamps on the plot
      pools.push({ image, strength });
    }
    return { depth, pools };
  }

  private updateStreetLamps(time: number): void {
    const dt = Math.min(100, time - this.lastLampTime);
    this.lastLampTime = time;
    if (this.streetLamps.length === 0) return;
    const goingDark = this.nightTarget === 1 && this.night >= 0.5;
    if (goingDark && this.duskStart === null) this.duskStart = time;
    if (!goingDark) this.duskStart = null;
    let any = false;
    this.streetLamps.forEach((l, i) => {
      const target = this.duskStart !== null && time >= this.duskStart + i * 70 ? 1 : 0;
      if (target > l.level) l.level = Math.min(target, l.level + dt / 220);
      else if (target < l.level) l.level = Math.max(target, l.level - dt / 450);
      l.level = Math.min(l.level, Math.max(this.night, target)); // never brighter than the night allows while fading out
      const on = l.level > 0;
      any ||= on;
      const dim = lampDimming(this.hour); // late at night the lamps dim, they never go out
      l.lit.setVisible(on).setAlpha(l.level);
      l.glow.setVisible(on).setAlpha(l.level * 0.85 * dim);
      l.lights.forEach((p) => p.image.setVisible(on).setAlpha(l.level * p.strength * dim));
    });
    this.lightPlayer(any);
  }

  // Warm the player's tint while they stand in a lamp's pool (the pools themselves sit under the characters)
  private lightPlayer(anyLampOn: boolean): void {
    const sprite = this.playerController?.getSprite();
    if (!sprite) return;
    if (!anyLampOn || this.night === 0) {
      if (this.playerLampTinted) {
        this.playerLampTinted = false;
        this.nightApplied = { tint: -1, count: -1 };
      }
      return;
    }
    const p = this.playerController!.getPosition();
    let light = 0;
    const halfW = TILE_WIDTH / 2, halfH = TILE_HEIGHT / 2;
    for (const l of this.streetLamps) {
      if (l.level === 0) continue;
      const sx = p.worldX - l.screen.x, sy = p.worldY - l.screen.y;
      const gx = (sx / halfW + sy / halfH) / 2, gy = (sy / halfH - sx / halfW) / 2;
      const d = Math.sqrt((gx / l.pool.rx) ** 2 + (gy / l.pool.ry) ** 2);
      if (d < 1) light = Math.max(light, Math.pow(1 - d, 0.8) * l.level * l.strength);
    }
    // Inside a lit room the room light wins over the lamps outside
    let roomLevel = 0;
    if (this.insideBuilding) {
      this.buildingSpriteInfo.forEach((info, key) => {
        if (info.buildingId === this.insideBuilding) roomLevel = Math.max(roomLevel, this.roomLight.get(key) ?? 0);
      });
    }
    const roomK = roomLevel * this.night * MainScene.ROOM_STRENGTH;
    const n = this.grade, lampK = Math.min(1, light * 0.9);
    const [k, warm] = roomK > lampK ? [roomK, MainScene.ROOM_COLOR] : [lampK, [255, 214, 160]];
    const ch = (c: number, w: number) => Math.round(c * (1 - k) + w * k);
    sprite.setTint((ch(n.r, warm[0]) << 16) | (ch(n.g, warm[1]) << 8) | ch(n.b, warm[2]));
    this.playerLampTinted = true;
  }

  // Animated doors by building key: current open value 0..1
  private doors: Map<string, { image: Phaser.GameObjects.Image; buildingId: string; originX: number; originY: number; value: number }> = new Map();

  // Doors open within their radius of the player (0.4 s) and close after (0.6 s); hidden while the roof is off
  private updateDoors(): void {
    if (!this.playerController || this.doors.size === 0) return;
    const pos = this.playerController.getPosition();
    const target = this.playerController.getTargetGrid();
    const dt = this.game.loop.delta / 1000;
    this.doors.forEach((d) => {
      const def = getBuilding(d.buildingId)?.door;
      if (!def || !d.image.active) return;
      const ax = d.originX + def.at[0], ay = d.originY + def.at[1];
      const dist = Math.min(
        Math.hypot(pos.gridX + 0.5 - ax, pos.gridY + 0.5 - ay),
        Math.hypot(target.x + 0.5 - ax, target.y + 0.5 - ay),
      );
      const want = dist <= def.radius ? 1 : 0;
      d.value = want > d.value ? Math.min(1, d.value + dt / 0.4) : Math.max(0, d.value - dt / 0.6);
      d.image.setVisible(!this.openBuildings.has(d.buildingId));
      d.image.setFrame(Math.round(d.value * (def.frames - 1)));
    });
  }

  // Reactions by `${building key}_reaction${index}` (the food truck cooks): idle at frame 0; a wave plays once when the
  // player steps within `radius`; serve() plays the hand-over and holds it until the player leaves
  private reactions: Map<string, { image: Phaser.GameObjects.Image; buildingId: string; index: number; originX: number; originY: number;
    mode: 'idle' | 'wave' | 'serve'; value: number; near: boolean }> = new Map();

  private updateReactions(): void {
    if (!this.playerController || this.reactions.size === 0) return;
    const pos = this.playerController.getPosition();
    const dt = this.game.loop.delta / 1000;
    this.reactions.forEach((r) => {
      const def = getBuilding(r.buildingId)?.reactions?.[r.index];
      if (!def || !r.image.active) return;
      const near = Math.hypot(pos.gridX + 0.5 - (r.originX + def.at[0]), pos.gridY + 0.5 - (r.originY + def.at[1])) <= def.radius;
      if (near && !r.near && r.mode === 'idle') { r.mode = 'wave'; r.value = 1; }
      if (!near && r.mode !== 'serve') r.mode = 'idle';
      if (!near && r.mode === 'serve' && this.seated?.buildingId !== r.buildingId && !this.seatPending) r.mode = 'idle';
      r.near = near;
      if (r.mode === 'wave') {
        r.value += dt * def.fps;
        if (r.value >= def.wave) { r.mode = 'idle'; r.value = 0; }
      } else if (r.mode === 'serve') {
        r.value = Math.min(def.frames - 1, r.value + dt * def.fps);
      } else r.value = 0;
      r.image.setVisible(this.seated?.buildingId !== r.buildingId);
      r.image.setFrame(Math.floor(r.value));
    });
  }

  /** The cook at a hatch hands the food over (its reaction's serve frames), then the avatar walks to `to` (a card's
   *  "Eat"). Without a reaction for the beat it walks at once. */
  private serveTimer: Phaser.Time.TimerEvent | null = null;
  serveThenWalk(buildingId: string, beat: string, to: string): boolean {
    // One serve at a time: a second tap on Eat while the cook serves does nothing
    if (this.serveTimer) return false;
    let ms = 0;
    this.reactions.forEach((r) => {
      const def = getBuilding(r.buildingId)?.reactions?.[r.index];
      if (r.buildingId !== buildingId || def?.beat !== beat) return;
      r.mode = 'serve';
      r.value = def.wave;
      ms = ((def.frames - def.wave) / def.fps) * 1000 + 250;
    });
    this.serveTimer = this.time.delayedCall(ms, () => {
      this.serveTimer = null;
      if (this.activeBeat === `${buildingId}:${beat}`) this.walkPlayerToBeat(buildingId, to);
    });
    return true;
  }

  // Interior moments by `${building key}_moment${index}`: current frame position (0..frames)
  private moments: Map<string, { image: Phaser.GameObjects.Image; buildingId: string; index: number; originX: number; originY: number; value: number }> = new Map();

  // A moment plays while the player is near (and the roof is off): forward once and holds, or in a loop; it resets
  // when they leave
  private updateMoments(): void {
    if (!this.playerController || this.moments.size === 0) return;
    const pos = this.playerController.getPosition();
    const dt = this.game.loop.delta / 1000;
    this.moments.forEach((m) => {
      const def = getBuilding(m.buildingId)?.moments?.[m.index];
      if (!def || !m.image.active) return;
      const open = this.openBuildings.has(m.buildingId);
      const near = open && Math.hypot(pos.gridX + 0.5 - (m.originX + def.at[0]), pos.gridY + 0.5 - (m.originY + def.at[1])) <= def.radius;
      if (!near) m.value = 0;
      else m.value = def.loop ? (m.value + dt * def.fps) % def.frames : Math.min(def.frames - 1, m.value + dt * def.fps);
      m.image.setVisible(open);
      m.image.setFrame(Math.floor(m.value));
    });
  }

  // Bottom row of a prop sprite's visible pixels (its ground point), cached per texture
  private decorBottom: Map<string, number> = new Map();
  private measureBottom(textureKey: string, height: number): number {
    let bottom = height;
    const source = this.textures.get(textureKey).getSourceImage() as HTMLImageElement;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = source.width; canvas.height = source.height;
      const g = canvas.getContext("2d");
      if (g) {
        g.drawImage(source, 0, 0);
        const data = g.getImageData(0, 0, source.width, source.height).data;
        search: for (let y = source.height - 1; y >= 0; y--) {
          for (let x = 0; x < source.width; x++) if (data[(y * source.width + x) * 4 + 3] > 20) { bottom = y + 1; break search; }
        }
      }
    } catch {
      // keep the sprite bottom
    }
    this.decorBottom.set(textureKey, bottom);
    return bottom;
  }

  // Small depth step above a walk-in building's sprite for things on its footprint (decor, the player)
  private footprintSortOffset(localX: number, localY: number): number {
    return 0.3 + (localX + localY) * 0.001;
  }

  // Roof off / on: cross-fade the building's sprite to its open (or closed) texture
  private setBuildingOpen(buildingId: string, open: boolean): void {
    const building = getBuilding(buildingId);
    if (!building?.openSprites || this.openBuildings.has(buildingId) === open) return;
    if (open) this.openBuildings.add(buildingId);
    else this.openBuildings.delete(buildingId);
    this.refreshBuildingTexture(buildingId, 450);
  }

  // Cross-fade a building's sprite to the texture its state calls for (open, seated, closed)
  private refreshBuildingTexture(buildingId: string, fadeMs: number): void {
    const building = getBuilding(buildingId);
    if (!building) return;
    this.buildingSpriteInfo.forEach((info, key) => {
      if (info.buildingId !== buildingId) return;
      const sprite = this.buildingSprites.get(key);
      const textureKey = this.getBuildingTextureKey(building, info.orientation);
      // The ambient loop is cut out of the still sprite: a seated frame is whole, so the loop pauses while the avatar sits
      this.buildingSprites.get(`${key}_ambient`)?.setVisible(this.seated?.buildingId !== buildingId);
      for (let i = 0; this.buildingSprites.has(`${key}_reaction${i}`); i++) {
        this.buildingSprites.get(`${key}_reaction${i}`)?.setVisible(this.seated?.buildingId !== buildingId);
      }
      if (!sprite || sprite.texture.key === textureKey || !this.textures.exists(textureKey)) return;
      const previous = this.add.image(sprite.x, sprite.y, sprite.texture.key);
      previous.setOrigin(0.5, 1);
      previous.setScale(sprite.scaleX, sprite.scaleY);
      previous.setDepth(sprite.depth + 0.001);
      previous.setTint(sprite.tint); // the old look keeps its light (night, room) while it fades out
      this.crossFades.add(previous);
      sprite.setTexture(textureKey);
      sprite.setScale(this.buildingTextureScale(building, textureKey));
      this.tweens.add({ targets: previous, alpha: 0, duration: fadeMs, ease: "Sine.easeInOut", onComplete: () => { this.crossFades.delete(previous); previous.destroy(); } });
    });
  }

  // Display scale of a building texture: open (roof-off) textures may have their own texel density
  private buildingTextureScale(building: BuildingDefinition, textureKey: string): number {
    const base = building.spriteScale ?? 1;
    const open = textureKey.startsWith(`${building.id}_open_`) || textureKey.startsWith(`${building.id}_sit_`);
    return open ? building.openSpriteScale ?? base : base;
  }

  private getBuildingTextureKey(building: BuildingDefinition, orientation?: Direction): string {
    const dir = orientation ? DIRECTION_TO_COMPASS[orientation] : "south";

    // seated: also for plots with no roof to take off (the food truck's table), which are never "open"
    if (this.seated?.buildingId === building.id && dir === "south") {
      const sitKey = `${building.id}_sit_${this.seated.beat}`;
      if (this.textures.exists(sitKey)) return sitKey;
    }
    if (this.openBuildings.has(building.id) && building.openSprites) {
      const openKey = `${building.id}_open_${dir}`;
      if (this.textures.exists(openKey)) return openKey;
      if (this.textures.exists(`${building.id}_open_south`)) return `${building.id}_open_south`;
    }

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
    return `${carType}_${DIRECTION_TO_SHORT_COMPASS[direction]}`;
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
      const textureKey = getCharacterTextureKey(char.characterType, char.direction);

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

      // Fewer people walk at night: the rest stay home (the same ones every night)
      const out = this.night < 0.5 || seedFrom(char.id) < walkerShare(this.hour);
      if (this.gifsLoaded && this.textures.exists(textureKey)) {
        sprite.setVisible(out);
        playGifAnimation(sprite, textureKey);
      }

      sprite.setDepth(this.depthFromSortPoint(screenPos.x, centerY, 0.2));
    }
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

    // Street lamp tool (the selected id is the lamp type): green where it may stand, red where not
    if (this.selectedTool === ToolType.StreetLamp && this.selectedBuildingId) {
      const type = this.selectedBuildingId as StreetLampType;
      const ok = canPlaceStreetLamp(this.grid[y]?.[x], type);
      const screenPos = this.gridToScreen(x, y);
      const tile = this.add.image(screenPos.x, screenPos.y, "road").setOrigin(0.5, 0).setAlpha(0.5);
      tile.setTint(ok ? 0x00ff00 : 0xff3030);
      tile.setDepth(this.depthFromSortPoint(screenPos.x, screenPos.y, 1_000_000));
      this.previewSprites.push(tile);
      if (ok && type !== "wire") {
        const ground = this.gridToScreen(x + 0.5, y + 0.5);
        const ghost = this.add.image(ground.x, ground.y + 1, `lamp_${type}_day`).setOrigin(0.5, 1).setAlpha(0.7);
        ghost.setDepth(this.depthFromSortPoint(ground.x, ground.y, 1_000_001));
        this.previewSprites.push(ghost);
      }
    }
  }
}
