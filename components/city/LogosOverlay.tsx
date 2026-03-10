"use client";

import { useMemo } from "react";

const LOGO_SPIN_STYLE = `
@keyframes logo-spin {
  from { transform: perspective(200px) rotateY(0deg); }
  to { transform: perspective(200px) rotateY(360deg); }
}
`;

// ============================================
// LOGO PLACEMENT CONFIG - TWEAK THESE VALUES
// ============================================
const LOGO_CONFIG = {
  // Base size of logos in CSS pixels (constant regardless of zoom)
  baseSize: 32,

  // Vertical offset in CSS pixels above the building center (screen-space, zoom-independent)
  offsetY: 40,

  // Scale multiplier for logo size (1 = normal, 2 = double size)
  sizeMultiplier: 1,

  // Animation duration in seconds for one full rotation
  spinDuration: 3,
};
// ============================================

export interface LogoPosition {
  buildingId: string;
  screenX: number;
  screenY: number;
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
  onLogoClick,
}: LogosOverlayProps) {
  const logoSize = useMemo(() => {
    const mobileScale = isMobile ? 0.72 : 1;
    return LOGO_CONFIG.baseSize * LOGO_CONFIG.sizeMultiplier * mobileScale;
  }, [isMobile]);

  const screenLogos = useMemo(() => {
    const displayScaleX = viewportWidth / worldWidth;
    const displayScaleY = viewportHeight / worldHeight;

    // Phaser zooms around the center of the viewport, so the world-to-canvas formula is:
    // canvasX = (worldX - scrollX - canvasWidth/2) * zoom + canvasWidth/2
    const halfW = worldWidth / 2;
    const halfH = worldHeight / 2;

    return logos.map((logo) => {
      // World position → canvas pixel (accounting for Phaser's center-based zoom)
      const canvasX = (logo.screenX - cameraX - halfW) * zoom + halfW;
      const canvasY = (logo.screenY - cameraY - halfH) * zoom + halfH;

      // Canvas pixel → CSS pixel
      const cssX = canvasX * displayScaleX;
      const cssY = canvasY * displayScaleY;

      // logoOffset is in world-space, scale by zoom and displayScale
      const offsetX = logo.logoOffset.x * zoom * displayScaleX;
      const offsetY = logo.logoOffset.y * zoom * displayScaleY;

      return {
        ...logo,
        cssX: cssX + offsetX,
        cssY: cssY - offsetY - LOGO_CONFIG.offsetY,
      };
    });
  }, [logos, cameraX, cameraY, zoom, viewportWidth, viewportHeight, worldWidth, worldHeight]);

  if (
    logos.length === 0 ||
    viewportWidth === 0 ||
    viewportHeight === 0 ||
    worldWidth === 0 ||
    worldHeight === 0
  ) {
    return null;
  }

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: viewportLeft,
        top: viewportTop,
        width: viewportWidth,
        height: viewportHeight,
        zIndex: 20,
        overflow: "hidden",
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: LOGO_SPIN_STYLE }} />

      {screenLogos.map((logo) => (
        <button
          key={logo.buildingId}
          onClick={onLogoClick ? () => onLogoClick(logo.buildingId) : undefined}
          style={{
            position: "absolute",
            left: logo.cssX - logoSize / 2,
            top: logo.cssY - logoSize / 2,
            width: logoSize,
            height: logoSize,
            pointerEvents: onLogoClick ? "auto" : "none",
            background: "transparent",
            border: "none",
            cursor: onLogoClick ? "pointer" : "default",
            padding: 0,
          }}
          aria-label={`Go to ${logo.buildingId}`}
        >
          <img
            src={logo.logoUrl}
            alt=""
            width={logoSize}
            height={logoSize}
            style={{
              animation: `logo-spin ${LOGO_CONFIG.spinDuration}s linear infinite`,
              borderRadius: "50%",
              objectFit: "contain",
            }}
            draggable={false}
            onError={(e) => {
              // Fallback: show a colored circle if logo fails to load
              const target = e.currentTarget;
              target.style.display = "none";
              const fallback = target.nextElementSibling as HTMLElement;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <div
            style={{
              display: "none",
              width: logoSize,
              height: logoSize,
              borderRadius: "50%",
              backgroundColor: "#6366f1",
              border: "2px solid white",
              animation: `logo-spin ${LOGO_CONFIG.spinDuration}s linear infinite`,
            }}
          />
        </button>
      ))}
    </div>
  );
}
