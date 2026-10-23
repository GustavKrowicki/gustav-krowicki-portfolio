"use client";

import { useMemo } from "react";
import { getBuilding } from "@/lib/city/buildings";
import { getPlace } from "@/lib/city/places";

// Building names over the city (POR-54, the way tomjohn.design does it). Close up the buildings name themselves (signs on
// the buildings), so nothing floats over them; a pill with the logo and the name shows only on intent: the building under
// the mouse (over its roof), or the one the avatar stands at (over the avatar's head). Zoomed out, every building shows its logo as a flat rounded-square tile.
// Nothing spins, and no logo is cut into a circle.
const LOGO_CONFIG = {
  // Below this camera zoom the city reads as a map: the logo tiles show (street zoom is 2, phones 3)
  mapZoom: 1.5,
  // Tile size in CSS pixels (desktop; phones 0.85 of it), the same at every zoom
  tileSize: 30,
  // Gap in CSS pixels between the building's anchor and the tile or the pill above it
  gap: 6,
  // The avatar's height in world pixels: the pill at a door sits this far over its feet
  avatarHeight: 34,
};

export interface LogoPosition {
  buildingId: string;
  screenX: number;
  screenY: number;
  /** World y of the top of the drawn building, when known */
  topY?: number;
  logoUrl: string;
  logoOffset: { x: number; y: number };
}

interface LogosOverlayProps {
  isMobile: boolean;
  logos: LogoPosition[];
  viewportLeft: number;
  viewportTop: number;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
  /** The building under the mouse */
  hoverId?: string | null;
  /** The building the avatar stands at */
  nearId?: string | null;
  /** The avatar's feet in world space, while it stands at nearId: that pill sits over its head */
  nearAt?: { x: number; y: number } | null;
  onLogoClick?: (buildingId: string) => void;
}

export default function LogosOverlay({
  isMobile,
  logos,
  viewportLeft,
  viewportTop,
  viewportWidth,
  viewportHeight,
  worldWidth,
  worldHeight,
  cameraX,
  cameraY,
  zoom,
  hoverId = null,
  nearId = null,
  nearAt = null,
  onLogoClick,
}: LogosOverlayProps) {
  const tileSize = LOGO_CONFIG.tileSize * (isMobile ? 0.85 : 1);
  const mapView = zoom < LOGO_CONFIG.mapZoom;

  const screenLogos = useMemo(() => {
    const displayScaleX = viewportWidth / worldWidth;
    const displayScaleY = viewportHeight / worldHeight;

    // Phaser zooms around the center of the viewport, so the world-to-canvas formula is:
    // canvasX = (worldX - scrollX - canvasWidth/2) * zoom + canvasWidth/2
    const halfW = worldWidth / 2;
    const halfH = worldHeight / 2;

    return logos.map((logo) => {
      const canvasX = (logo.screenX - cameraX - halfW) * zoom + halfW;
      const canvasY = (logo.screenY - cameraY - halfH) * zoom + halfH;
      // Above the drawn building's top; without it, logoOffset (world space, from the building's centre up)
      const topCanvasY =
        logo.topY !== undefined ? (logo.topY - cameraY - halfH) * zoom + halfH : canvasY - logo.logoOffset.y * zoom;
      return {
        ...logo,
        cssX: canvasX * displayScaleX,
        cssY: topCanvasY * displayScaleY - LOGO_CONFIG.gap,
      };
    });
  }, [logos, cameraX, cameraY, zoom, viewportWidth, viewportHeight, worldWidth, worldHeight]);

  if (logos.length === 0 || viewportWidth === 0 || viewportHeight === 0 || worldWidth === 0 || worldHeight === 0) {
    return null;
  }

  const pillId = mapView ? null : hoverId ?? nearId;
  const found = pillId ? screenLogos.find((l) => l.buildingId === pillId) : undefined;
  // At a door (no hover) the pill sits over the avatar's head, where the eyes are, like tomjohn.design's "E Intradiem";
  // on a phone the roof is often out of view there
  const pill =
    found && !hoverId && nearAt
      ? {
          ...found,
          cssX: ((nearAt.x - cameraX - worldWidth / 2) * zoom + worldWidth / 2) * (viewportWidth / worldWidth),
          cssY:
            ((nearAt.y - LOGO_CONFIG.avatarHeight - cameraY - worldHeight / 2) * zoom + worldHeight / 2) *
              (viewportHeight / worldHeight) -
            LOGO_CONFIG.gap,
        }
      : found;
  const pillName = pill ? getPlace(pill.buildingId)?.title ?? getBuilding(pill.buildingId)?.name ?? "" : "";

  return (
    <div
      className="absolute pointer-events-none"
      style={{ left: viewportLeft, top: viewportTop, width: viewportWidth, height: viewportHeight, zIndex: 20, overflow: "hidden" }}
    >
      {mapView &&
        screenLogos.map((logo) => (
          <button
            key={logo.buildingId}
            type="button"
            onClick={onLogoClick ? () => onLogoClick(logo.buildingId) : undefined}
            className="absolute overflow-hidden rounded-[7px] bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.18),0_2px_6px_rgba(0,0,0,0.25)]"
            style={{
              left: logo.cssX - tileSize / 2,
              top: logo.cssY - tileSize,
              width: tileSize,
              height: tileSize,
              pointerEvents: onLogoClick ? "auto" : "none",
              cursor: onLogoClick ? "pointer" : "default",
            }}
            aria-label={getPlace(logo.buildingId)?.title ?? logo.buildingId}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo.logoUrl} alt="" draggable={false} className="h-full w-full object-cover" />
          </button>
        ))}

      {pill && (
        <button
          key={pill.buildingId}
          type="button"
          onClick={onLogoClick ? () => onLogoClick(pill.buildingId) : undefined}
          className="absolute flex h-8 -translate-x-1/2 -translate-y-full items-center gap-2 whitespace-nowrap rounded-full border border-neutral-200 bg-[#FDFDFD] pl-1.5 pr-3 text-[13px] font-medium text-neutral-900 shadow-[0_4px_14px_rgba(0,0,0,0.2)] motion-safe:animate-[place-pill-in_160ms_ease-out]"
          style={{ left: Math.round(pill.cssX), top: Math.round(pill.cssY), pointerEvents: onLogoClick ? "auto" : "none" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pill.logoUrl} alt="" draggable={false} className="h-5 w-5 rounded-[5px] border border-neutral-200 bg-white object-contain p-px" />
          {pillName}
        </button>
      )}
      <style>{`@keyframes place-pill-in { from { opacity: 0; margin-top: 4px; } }`}</style>
    </div>
  );
}
