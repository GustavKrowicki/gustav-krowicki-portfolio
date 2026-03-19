import Phaser from "phaser";
import {
  TriggerZone,
  TILE_WIDTH,
  TILE_HEIGHT,
  TRIGGER_ZONE_RADIUS,
} from "../types";
import { GRID_OFFSET_X, GRID_OFFSET_Y } from "./gameConfig";
import { TourStop } from "@/lib/city/tourStops";

export interface TriggerZoneCallbacks {
  onEnterZone: (zone: TriggerZone, tourStop: TourStop) => void;
  onExitZone: (zone: TriggerZone) => void;
}

export class TriggerZoneManager {
  private scene: Phaser.Scene;
  private zones: TriggerZone[] = [];
  private tourStops: TourStop[] = [];
  private callbacks: TriggerZoneCallbacks | null = null;

  // Track which zone the player is currently in
  private activeZone: TriggerZone | null = null;

  // Interaction prompt graphics
  private promptGraphics: Phaser.GameObjects.Graphics | null = null;
  private promptText: Phaser.GameObjects.Text | null = null;
  private promptTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  setCallbacks(callbacks: TriggerZoneCallbacks): void {
    this.callbacks = callbacks;
  }

  setupZones(
    tourStops: TourStop[],
    getBuildingPosition: (buildingId: string) => { x: number; y: number } | null
  ): void {
    this.tourStops = tourStops;
    this.zones = [];

    // Create trigger zones for each tour stop with a building
    tourStops.forEach((stop, index) => {
      // Skip stops without buildings (welcome, outro)
      if (!stop.buildingId) return;

      const position = getBuildingPosition(stop.buildingId);
      if (!position) return;

      const zone: TriggerZone = {
        buildingId: stop.buildingId,
        centerX: position.x,
        centerY: position.y,
        radius: TRIGGER_ZONE_RADIUS,
        tourStopIndex: index,
      };

      this.zones.push(zone);
    });
  }

  checkPlayerPosition(playerGridX: number, playerGridY: number): void {
    let inAnyZone = false;
    let currentZone: TriggerZone | null = null;

    // Check all zones
    for (const zone of this.zones) {
      const distance = Math.sqrt(
        Math.pow(playerGridX - zone.centerX, 2) +
        Math.pow(playerGridY - zone.centerY, 2)
      );

      if (distance <= zone.radius) {
        inAnyZone = true;
        currentZone = zone;
        break; // Only one zone at a time
      }
    }

    // Handle zone enter/exit
    if (currentZone && currentZone !== this.activeZone) {
      // Left previous zone
      if (this.activeZone) {
        this.callbacks?.onExitZone(this.activeZone);
        this.hidePrompt();
      }

      // Entered new zone
      this.activeZone = currentZone;
      const tourStop = this.tourStops[currentZone.tourStopIndex];
      if (tourStop) {
        this.callbacks?.onEnterZone(currentZone, tourStop);
        this.showPrompt(currentZone);
      }
    } else if (!inAnyZone && this.activeZone) {
      // Left all zones
      this.callbacks?.onExitZone(this.activeZone);
      this.hidePrompt();
      this.activeZone = null;
    }
  }

  getActiveZone(): TriggerZone | null {
    return this.activeZone;
  }

  getActiveTourStop(): TourStop | null {
    if (!this.activeZone) return null;
    return this.tourStops[this.activeZone.tourStopIndex] || null;
  }

  private gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: GRID_OFFSET_X + (gridX - gridY) * (TILE_WIDTH / 2),
      y: GRID_OFFSET_Y + (gridX + gridY) * (TILE_HEIGHT / 2),
    };
  }

  private showPrompt(zone: TriggerZone): void {
    this.hidePrompt();

    const screenPos = this.gridToScreen(zone.centerX, zone.centerY);

    // Create "Press E" prompt
    this.promptGraphics = this.scene.add.graphics();
    this.promptGraphics.setDepth(1_800_000);

    // Draw a semi-transparent pill background
    const bgWidth = 80;
    const bgHeight = 32;
    const bgX = screenPos.x - bgWidth / 2;
    const bgY = screenPos.y - 100 - bgHeight / 2;

    this.promptGraphics.fillStyle(0x000000, 0.7);
    this.promptGraphics.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, 8);

    this.promptGraphics.lineStyle(2, 0xffffff, 0.5);
    this.promptGraphics.strokeRoundedRect(bgX, bgY, bgWidth, bgHeight, 8);

    // Add text
    this.promptText = this.scene.add.text(screenPos.x, screenPos.y - 100, "Press E", {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      color: "#ffffff",
    });
    this.promptText.setOrigin(0.5, 0.5);
    this.promptText.setDepth(1_800_001);

    // Animate the prompt (bouncing)
    this.promptTween = this.scene.tweens.add({
      targets: [this.promptGraphics, this.promptText],
      y: "-=6",
      duration: 500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  private hidePrompt(): void {
    if (this.promptTween) {
      this.promptTween.stop();
      this.promptTween = null;
    }

    if (this.promptGraphics) {
      this.promptGraphics.destroy();
      this.promptGraphics = null;
    }

    if (this.promptText) {
      this.promptText.destroy();
      this.promptText = null;
    }
  }

  renderZones(
    visitedBuildings: Set<string>,
    depthFromSortPoint: (x: number, y: number, offset: number) => number
  ): void {
    // This can be used to render zone indicators if needed
    // For now, zones are invisible - just the prompt appears
  }

  destroy(): void {
    this.hidePrompt();
    this.zones = [];
    this.activeZone = null;
  }
}
