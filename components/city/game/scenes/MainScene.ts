import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { Building } from '../entities/Building';
import { buildings as buildingData } from '@/lib/data/buildings';
import { TILE_SIZE } from '../config';

export class MainScene extends Phaser.Scene {
  public player!: Player;
  private buildings: Building[] = [];
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: { W: Phaser.Input.Keyboard.Key; A: Phaser.Input.Keyboard.Key; S: Phaser.Input.Keyboard.Key; D: Phaser.Input.Keyboard.Key };
  private highlightedBuilding: Building | null = null;
  private touchInput = { dx: 0, dy: 0 };

  // Map dimensions (in tiles)
  private mapWidth = 20;
  private mapHeight = 15;
  private worldWidth = 0;
  private worldHeight = 0;

  constructor() {
    super({ key: 'MainScene' });
  }

  create() {
    // Calculate world dimensions
    this.worldWidth = this.mapWidth * TILE_SIZE;
    this.worldHeight = this.mapHeight * TILE_SIZE;

    // Create ground tiles
    this.createGround();

    // Create buildings
    this.createBuildings();

    // Create player at center of isometric grid
    const centerGridX = this.mapWidth / 2;
    const centerGridY = this.mapHeight / 2;
    const playerStartX = (centerGridX - centerGridY) * (TILE_SIZE / 2) + this.worldWidth / 2;
    const playerStartY = (centerGridX + centerGridY) * (TILE_SIZE / 4) + 100;
    this.player = new Player(this, playerStartX, playerStartY);

    // Set up camera to follow player
    this.cameras.main.startFollow(this.player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5); // Zoom in a bit for better view

    // Set camera bounds to cover the isometric area
    const isoBounds = this.getIsometricBounds();
    this.cameras.main.setBounds(isoBounds.x, isoBounds.y, isoBounds.width, isoBounds.height);
    this.physics.world.setBounds(isoBounds.x, isoBounds.y, isoBounds.width, isoBounds.height);

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
    // Update camera bounds on resize
    const isoBounds = this.getIsometricBounds();
    this.cameras.main.setBounds(isoBounds.x, isoBounds.y, isoBounds.width, isoBounds.height);
  }

  private getIsometricBounds() {
    // Calculate the bounding box of the isometric diamond
    // Grid corners and their isometric positions:
    // Top (0,0): center of diamond top
    // Right (mapWidth-1, 0): right corner
    // Bottom (mapWidth-1, mapHeight-1): bottom corner
    // Left (0, mapHeight-1): left corner

    const halfTile = TILE_SIZE / 2;
    const quarterTile = TILE_SIZE / 4;
    const offsetX = this.worldWidth / 2;
    const offsetY = 100;

    // Calculate corner positions
    const topY = offsetY; // grid (0,0)
    const rightX = ((this.mapWidth - 1) - 0) * halfTile + offsetX; // grid (mapWidth-1, 0)
    const bottomY = ((this.mapWidth - 1) + (this.mapHeight - 1)) * quarterTile + offsetY; // grid (mapWidth-1, mapHeight-1)
    const leftX = (0 - (this.mapHeight - 1)) * halfTile + offsetX; // grid (0, mapHeight-1)

    // Add generous padding
    const padding = 200;

    return {
      x: leftX - padding,
      y: topY - padding,
      width: (rightX - leftX) + padding * 2,
      height: (bottomY - topY) + padding * 2,
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
    for (let y = 0; y < this.mapHeight; y++) {
      for (let x = 0; x < this.mapWidth; x++) {
        // Convert grid position to isometric screen position
        const isoX = (x - y) * (TILE_SIZE / 2) + this.worldWidth / 2;
        const isoY = (x + y) * (TILE_SIZE / 4) + 100;

        // Create tile
        const tile = this.add.image(isoX, isoY, 'tile-ground').setDepth(0);

        // Tint based on district (using grid quadrants)
        const isLeft = x < this.mapWidth / 2;
        const isTop = y < this.mapHeight / 2;

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
      const building = new Building(this, data, this.worldWidth);
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

    // Move player towards clicked position
    this.player.moveTo(worldPoint.x, worldPoint.y);
  }

  private interactWithBuilding() {
    // Find closest building within interaction range
    const interactionRange = 80;
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
    // Determine district based on player position relative to world center
    const isLeft = this.player.sprite.x < this.worldWidth / 2;
    const isTop = this.player.sprite.y < this.worldHeight / 2;

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
    const proximityRange = 100;
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
