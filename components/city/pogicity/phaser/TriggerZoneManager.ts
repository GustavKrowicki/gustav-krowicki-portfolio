import { TriggerZone, TRIGGER_ZONE_RADIUS } from "../types";
import { TourStop } from "@/lib/city/tourStops";
import { getBuilding } from "@/lib/city/buildings";

export interface TriggerZoneCallbacks {
  onEnterZone: (zone: TriggerZone, tourStop: TourStop) => void;
  onExitZone: (zone: TriggerZone) => void;
}

export class TriggerZoneManager {
  private zones: TriggerZone[] = [];
  private tourStops: TourStop[] = [];
  private callbacks: TriggerZoneCallbacks | null = null;

  // Track which zone the player is currently in
  private activeZone: TriggerZone | null = null;

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

      // Use per-building trigger zone radius if set, otherwise default
      const building = getBuilding(stop.buildingId);
      const radius = building?.triggerZoneRadius ?? TRIGGER_ZONE_RADIUS;

      const zone: TriggerZone = {
        buildingId: stop.buildingId,
        centerX: position.x,
        centerY: position.y,
        radius,
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
      if (this.activeZone) {
        this.callbacks?.onExitZone(this.activeZone);
      }

      this.activeZone = currentZone;
      const tourStop = this.tourStops[currentZone.tourStopIndex];
      if (tourStop) {
        this.callbacks?.onEnterZone(currentZone, tourStop);
      }
    } else if (!inAnyZone && this.activeZone) {
      this.callbacks?.onExitZone(this.activeZone);
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

  destroy(): void {
    this.zones = [];
    this.activeZone = null;
  }
}
