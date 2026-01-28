import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Building } from '../entities/Building';
import { buildings as buildingData } from '@/lib/data/buildings';
import {
  GRID_WIDTH,
  GRID_HEIGHT,
  TILE_WIDTH,
  TILE_HEIGHT,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  GAME_WIDTH,
  GAME_HEIGHT,
} from '../config';

export class MainScene extends Phaser.Scene {
  public player!: Player;
  private buildings: Building[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private highlightedBuilding: Building | null = null;
  private touchInput = { dx: 0, dy: 0 };

  constructor() {
    super({ key: 'MainScene' });
  }

  // Convert grid coordinates to isometric screen coordinates
  private gridToIso(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * (TILE_WIDTH / 2) + GRID_OFFSET_X,
      y: (gridX + gridY) * (TILE_HEIGHT / 2) + GRID_OFFSET_Y,
    };
  }

  // Convert isometric screen coordinates back to grid coordinates
  private isoToGrid(isoX: number, isoY: number): { x: number; y: number } {
    const relX = isoX - GRID_OFFSET_X;
    const relY = isoY - GRID_OFFSET_Y;
    return {
      x: (relX / (TILE_WIDTH / 2) + relY / (TILE_HEIGHT / 2)) / 2,
      y: (relY / (TILE_HEIGHT / 2) - relX / (TILE_WIDTH / 2)) / 2,
    };
  }

  // Check if a screen position is within the isometric grid bounds
  private isWithinGridBounds(isoX: number, isoY: number): boolean {
    const grid = this.isoToGrid(isoX, isoY);
    const margin = 0.5; // Allow half a tile margin at edges
    return (
      grid.x >= -margin &&
      grid.x <= GRID_WIDTH - 1 + margin &&
      grid.y >= -margin &&
      grid.y <= GRID_HEIGHT - 1 + margin
    );
  }

  // Clamp a position to stay within grid bounds
  private clampToGridBounds(isoX: number, isoY: number): { x: number; y: number } {
    const grid = this.isoToGrid(isoX, isoY);
    const margin = 0.5;
    const clampedGridX = Math.max(-margin, Math.min(GRID_WIDTH - 1 + margin, grid.x));
    const clampedGridY = Math.max(-margin, Math.min(GRID_HEIGHT - 1 + margin, grid.y));
    return this.gridToIso(clampedGridX, clampedGridY);
  }

  create() {
    // Create ground tiles
    this.createGround();

    // Create buildings
    this.createBuildings();

    // Create player at center of isometric grid
    const centerPos = this.gridToIso(GRID_WIDTH / 2, GRID_HEIGHT / 2);
    this.player = new Player(this, centerPos.x, centerPos.y);

    // Center camera on the canvas (no scrolling - entire world fits)
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Disable camera from following anything
    this.cameras.main.stopFollow();

    // Set up input
    this.setupInput();

    // Set up click-to-walk (only on empty space)
    this.input.on('pointerdown', this.handlePointerDown, this);

    // Set up building click detection via game object events
    this.input.on('gameobjectdown', this.handleGameObjectDown, this);

    // Set up building interaction via keyboard
    this.input.keyboard?.on('keydown-E', this.interactWithBuilding, this);
    this.input.keyboard?.on('keydown-ENTER', this.interactWithBuilding, this);

    // Listen for touch events from React
    this.game.events.on('touchMove', this.handleTouchMove, this);
    this.game.events.on('touchInteract', this.interactWithBuilding, this);

    // Handle resize
    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    // Re-center camera on resize
    this.cameras.main.centerOn(GAME_WIDTH / 2, GAME_HEIGHT / 2);
  }

  private getIsometricBounds() {
    // Calculate the bounding box of the isometric grid
    // The four corners of the isometric grid:
    const topCorner = this.gridToIso(0, 0);           // Top point
    const rightCorner = this.gridToIso(GRID_WIDTH - 1, 0);  // Right point
    const bottomCorner = this.gridToIso(GRID_WIDTH - 1, GRID_HEIGHT - 1); // Bottom point
    const leftCorner = this.gridToIso(0, GRID_HEIGHT - 1);  // Left point

    // Add half tile size for tile extent
    const margin = TILE_WIDTH / 2;

    return {
      x: leftCorner.x - margin,
      y: topCorner.y - TILE_HEIGHT / 2,
      width: rightCorner.x - leftCorner.x + margin * 2,
      height: bottomCorner.y - topCorner.y + TILE_HEIGHT,
    };
  }

  // Public method to get bounds for React
  public getWorldBounds() {
    return this.getIsometricBounds();
  }

  private handleTouchMove(data: { dx: number; dy: number }) {
    this.touchInput = data;
  }

  private createGround() {
    // Create isometric ground grid with district coloring
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        // Convert grid position to isometric screen position
        const pos = this.gridToIso(x, y);

        // Create tile
        const tile = this.add.image(pos.x, pos.y, 'tile-ground').setDepth(0);

        // Tint based on district (using grid quadrants)
        const isLeft = x < GRID_WIDTH / 2;
        const isTop = y < GRID_HEIGHT / 2;

        if (isLeft && isTop) {
          tile.setTint(0x3B82F6); // Corporate - blue
        } else if (!isLeft && isTop) {
          tile.setTint(0x10B981); // Education - green
        } else if (isLeft && !isTop) {
          tile.setTint(0xF59E0B); // Startup - amber
        } else {
          tile.setTint(0x8B5CF6); // Personal - purple
        }
        tile.setAlpha(0.6);
      }
    }
  }

  private createBuildings() {
    buildingData.forEach((data) => {
      const building = new Building(this, data);
      this.buildings.push(building);

      // Make buildings interactive (hover effects)
      building.sprite.on('pointerover', () => {
        this.highlightedBuilding = building;
        building.highlight(true);
      });

      building.sprite.on('pointerout', () => {
        if (this.highlightedBuilding === building) {
          this.highlightedBuilding = null;
        }
        building.highlight(false);
      });
    });
  }

  private setupInput() {
    if (!this.input.keyboard) return;

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = {
      W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    // Prevent arrow keys from scrolling the page
    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);
  }

  private clickedOnBuilding = false;

  private handleGameObjectDown(
    _pointer: Phaser.Input.Pointer,
    gameObject: Phaser.GameObjects.GameObject
  ) {
    // Check if clicked object is a building
    const building = this.buildings.find((b) => b.sprite === gameObject);
    if (building) {
      this.clickedOnBuilding = true;
      this.emitBuildingClick(building);
    }
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer) {
    // If we just clicked on a building, don't move
    if (this.clickedOnBuilding) {
      this.clickedOnBuilding = false;
      return;
    }

    // Get world position from pointer
    const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y);

    // Only move if clicked within grid bounds
    if (this.isWithinGridBounds(worldPoint.x, worldPoint.y)) {
      this.player.moveTo(worldPoint.x, worldPoint.y);
    } else {
      // Clamp to nearest valid position within grid
      const clamped = this.clampToGridBounds(worldPoint.x, worldPoint.y);
      this.player.moveTo(clamped.x, clamped.y);
    }
  }

  private interactWithBuilding() {
    // Find closest building within interaction range (scaled for smaller world)
    const interactionRange = 35;
    let closestBuilding: Building | null = null;
    let closestDistance = Infinity;

    this.buildings.forEach((building) => {
      if (!building.data.interactable) return;

      const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        building.sprite.x,
        building.sprite.y
      );

      if (distance < interactionRange && distance < closestDistance) {
        closestDistance = distance;
        closestBuilding = building;
      }
    });

    if (closestBuilding) {
      this.emitBuildingClick(closestBuilding);
    }
  }

  private emitBuildingClick(building: Building) {
    // Emit event to React layer
    this.game.events.emit('buildingClick', {
      id: building.data.id,
      name: building.data.name,
      projectSlug: building.data.projectSlug,
      description: building.data.description,
      district: building.data.district,
    });
  }

  update() {
    // Handle keyboard movement
    let dx = 0;
    let dy = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) {
      dx = -1;
    } else if (this.cursors.right.isDown || this.wasd.D.isDown) {
      dx = 1;
    }

    if (this.cursors.up.isDown || this.wasd.W.isDown) {
      dy = -1;
    } else if (this.cursors.down.isDown || this.wasd.S.isDown) {
      dy = 1;
    }

    // Also check for touch input
    if (this.touchInput.dx !== 0 || this.touchInput.dy !== 0) {
      dx = this.touchInput.dx;
      dy = this.touchInput.dy;
    }

    if (dx !== 0 || dy !== 0) {
      this.player.moveDirection(dx, dy);
    } else {
      this.player.stop();
    }

    // Update player
    this.player.update();

    // Enforce isometric grid bounds (diamond shape)
    const playerPos = this.player.getPosition();
    if (!this.isWithinGridBounds(playerPos.x, playerPos.y)) {
      const clamped = this.clampToGridBounds(playerPos.x, playerPos.y);
      this.player.setPosition(clamped.x, clamped.y);
      this.player.forceStop();
    }

    // Sort buildings by y position for proper depth
    this.buildings.forEach((building) => {
      building.sprite.setDepth(building.sprite.y);
    });
    this.player.sprite.setDepth(this.player.sprite.y);

    // Check for nearby buildings and emit event
    this.checkNearbyBuildings();

    // Check current district
    this.checkCurrentDistrict();
  }

  private checkCurrentDistrict() {
    // Determine district based on player position relative to canvas center
    const isLeft = this.player.sprite.x < GAME_WIDTH / 2;
    const isTop = this.player.sprite.y < GAME_HEIGHT / 2;

    let district: { id: string; name: string; color: string };

    if (isLeft && isTop) {
      district = { id: 'corporate', name: 'Corporate District', color: '#3B82F6' };
    } else if (!isLeft && isTop) {
      district = { id: 'education', name: 'Education District', color: '#10B981' };
    } else if (isLeft && !isTop) {
      district = { id: 'startup', name: 'Startup District', color: '#F59E0B' };
    } else {
      district = { id: 'personal', name: 'Personal District', color: '#8B5CF6' };
    }

    this.game.events.emit('districtChange', district);
  }

  private checkNearbyBuildings() {
    const proximityRange = 45; // Scaled for smaller world
    let nearestBuilding: Building | null = null;
    let nearestDistance = Infinity;

    for (const building of this.buildings) {
      if (!building.data.interactable) continue;

      const distance = Phaser.Math.Distance.Between(
        this.player.sprite.x,
        this.player.sprite.y,
        building.sprite.x,
        building.sprite.y
      );

      if (distance < proximityRange && distance < nearestDistance) {
        nearestDistance = distance;
        nearestBuilding = building;
      }
    }

    // Emit proximity event
    if (nearestBuilding) {
      this.game.events.emit('buildingProximity', {
        id: nearestBuilding.data.id,
        name: nearestBuilding.data.name,
        distance: nearestDistance,
      });
    } else {
      this.game.events.emit('buildingProximity', null);
    }
  }
}
