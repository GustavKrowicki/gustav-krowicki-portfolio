import Phaser from "phaser";
import {
  NPCData,
  NPCState,
  Direction,
  CharacterType,
  getCharacterTextureKey,
  TILE_HEIGHT,
} from "../types";
import { gridToScreen } from "./gameConfig";
import { TourStop } from "@/lib/city/tourStops";
import { playGifAnimation } from "./GifLoader";
import { cityFont } from "@/lib/city/cityFont";

export interface NPCSpawnData {
  buildingId: string;
  gridX: number;
  gridY: number;
  tourStopIndex: number;
}

export class NPCManager {
  private scene: Phaser.Scene;
  private npcs: Map<string, NPCData> = new Map();
  private sprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

  // NPC appearance settings (using existing character sprites)
  private npcCharacterType: CharacterType = CharacterType.Apple; // Gustav is an apple!

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  spawnNPCs(
    tourStops: TourStop[],
    getBuildingPosition: (buildingId: string) => { x: number; y: number } | null
  ): void {
    // Clear existing NPCs
    this.destroy();

    // Spawn NPC for each tour stop with a building
    tourStops.forEach((stop, index) => {
      if (!stop.buildingId) return;

      const position = getBuildingPosition(stop.buildingId);
      if (!position) return;

      // Offset NPC slightly in front of building
      const offsetX = 1; // 1 tile to the right
      const offsetY = 1; // 1 tile down (towards camera)

      const npcId = `npc_${stop.buildingId}`;
      const npcData: NPCData = {
        id: npcId,
        buildingId: stop.buildingId,
        gridX: position.x + offsetX,
        gridY: position.y + offsetY,
        state: NPCState.Idle,
        tourStopIndex: index,
      };

      this.npcs.set(npcId, npcData);
    });
  }

  setNPCState(buildingId: string, state: NPCState): void {
    const npcId = `npc_${buildingId}`;
    const npc = this.npcs.get(npcId);
    if (npc) {
      npc.state = state;
    }
  }

  alertNearbyNPCs(playerGridX: number, playerGridY: number, radius: number): void {
    for (const [, npc] of this.npcs) {
      const distance = Math.sqrt(
        Math.pow(playerGridX - npc.gridX, 2) +
        Math.pow(playerGridY - npc.gridY, 2)
      );

      if (distance <= radius && npc.state === NPCState.Idle) {
        npc.state = NPCState.Alert;
      } else if (distance > radius && npc.state === NPCState.Alert) {
        npc.state = NPCState.Idle;
      }
    }
  }

  private getNPCDirection(npc: NPCData, playerGridX?: number, playerGridY?: number): Direction {
    // If alert and player position known, face the player
    if (npc.state === NPCState.Alert && playerGridX !== undefined && playerGridY !== undefined) {
      const dx = playerGridX - npc.gridX;
      const dy = playerGridY - npc.gridY;

      if (Math.abs(dx) > Math.abs(dy)) {
        return dx > 0 ? Direction.Right : Direction.Left;
      } else {
        return dy > 0 ? Direction.Down : Direction.Up;
      }
    }

    // Default: face down (toward camera)
    return Direction.Down;
  }

  private getTextureKey(direction: Direction): string {
    return getCharacterTextureKey(this.npcCharacterType, direction);
  }

  render(
    visitedBuildings: Set<string>,
    playerGridX: number,
    playerGridY: number,
    depthFromSortPoint: (x: number, y: number, offset: number) => number,
    gifsLoaded: boolean,
    // Depth for an NPC standing just in front of a walk-in building, whose big sprite would otherwise paint over it
    depthOverride?: (gridX: number, gridY: number) => number | null
  ): void {
    for (const [npcId, npc] of this.npcs) {
      // Skip NPCs at visited buildings
      if (visitedBuildings.has(npc.buildingId)) {
        // Remove sprite if exists
        const existingSprite = this.sprites.get(npcId);
        if (existingSprite) {
          existingSprite.destroy();
          this.sprites.delete(npcId);
        }
        continue;
      }

      const screenPos = gridToScreen(npc.gridX, npc.gridY);
      const groundY = screenPos.y + TILE_HEIGHT / 2;
      const direction = this.getNPCDirection(npc, playerGridX, playerGridY);
      const textureKey = this.getTextureKey(direction);

      let sprite = this.sprites.get(npcId);

      if (!sprite && gifsLoaded && this.scene.textures.exists(textureKey)) {
        sprite = this.scene.add.sprite(screenPos.x, groundY, textureKey, 0);
        sprite.setOrigin(0.5, 1);
        this.sprites.set(npcId, sprite);
      }

      if (sprite) {
        sprite.setPosition(screenPos.x, groundY);
        sprite.setDepth(depthOverride?.(npc.gridX, npc.gridY) ?? depthFromSortPoint(screenPos.x, groundY, 0.2));

        // Play animation
        if (gifsLoaded && this.scene.textures.exists(textureKey)) {
          playGifAnimation(sprite, textureKey);
        }

        // Add exclamation mark for alert state
        if (npc.state === NPCState.Alert) {
          this.showAlertIndicator(npcId, screenPos.x, groundY - 40);
        } else {
          this.hideAlertIndicator(npcId);
        }
      }
    }
  }

  private alertIndicators: Map<string, Phaser.GameObjects.Text> = new Map();

  private showAlertIndicator(npcId: string, x: number, y: number): void {
    let indicator = this.alertIndicators.get(npcId);

    if (!indicator) {
      indicator = this.scene.add.text(x, y, "!", {
        fontFamily: cityFont(),
        fontSize: "16px",
        color: "#ffff00",
        stroke: "#000000",
        strokeThickness: 4,
      });
      indicator.setOrigin(0.5, 0.5);
      indicator.setDepth(1_900_000);
      this.alertIndicators.set(npcId, indicator);

      // Bounce animation
      this.scene.tweens.add({
        targets: indicator,
        y: y - 5,
        duration: 300,
        yoyo: true,
        repeat: -1,
        ease: "Bounce.easeOut",
      });
    } else {
      indicator.setPosition(x, y);
    }
  }

  private hideAlertIndicator(npcId: string): void {
    const indicator = this.alertIndicators.get(npcId);
    if (indicator) {
      indicator.destroy();
      this.alertIndicators.delete(npcId);
    }
  }

  getNPC(buildingId: string): NPCData | null {
    return this.npcs.get(`npc_${buildingId}`) || null;
  }

  destroy(): void {
    // Destroy sprites
    for (const [, sprite] of this.sprites) {
      sprite.destroy();
    }
    this.sprites.clear();

    // Destroy alert indicators
    for (const [, indicator] of this.alertIndicators) {
      indicator.destroy();
    }
    this.alertIndicators.clear();

    this.npcs.clear();
  }
}
