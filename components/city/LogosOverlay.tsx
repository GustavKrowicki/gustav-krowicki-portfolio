"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrthographicCamera } from "@react-three/drei";
import BuildingLogo3D from "./BuildingLogos3D";

// ============================================
// LOGO PLACEMENT CONFIG - TWEAK THESE VALUES
// ============================================
const LOGO_CONFIG = {
  // Base size of logos in pixels (before zoom scaling)
  baseSize: 30,

  // Horizontal offset (positive = right, negative = left)
  offsetX: 0,

  // Vertical offset (positive = up, negative = down)
  // Increase this to move logos higher above buildings
  offsetY: 60,

  // Scale multiplier for logo size (1 = normal, 2 = double size)
  sizeMultiplier: 1,

  // Rotation speed in radians per second (2 = ~1 rotation per 3 seconds)
  rotationSpeed: 2,
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
  logos: LogoPosition[];
  width: number;
  height: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
}

export default function LogosOverlay({
  logos,
  width,
  height,
  cameraX,
  cameraY,
  zoom,
}: LogosOverlayProps) {
  // Memoize logo size based on zoom and config
  const logoSize = useMemo(() => {
    return LOGO_CONFIG.baseSize * LOGO_CONFIG.sizeMultiplier * zoom;
  }, [zoom]);

  // Convert world positions to Three.js screen-space coordinates
  // The key insight:
  // - logo.screenX/Y are in Phaser world coordinates
  // - cameraX/Y (scrollX/Y) is the top-left of visible area in world coords
  // - The visible world area is (width/zoom) x (height/zoom)
  // - Camera center in world = scrollX + (width/zoom)/2
  const screenLogos = useMemo(() => {
    // Calculate the center of the visible area in world coordinates
    const visibleWorldWidth = width / zoom;
    const visibleWorldHeight = height / zoom;
    const cameraCenterX = cameraX + visibleWorldWidth / 2;
    const cameraCenterY = cameraY + visibleWorldHeight / 2;

    return logos.map((logo) => {
      // Calculate offset from camera center in world units
      const offsetWorldX = logo.screenX - cameraCenterX;
      const offsetWorldY = logo.screenY - cameraCenterY;

      // Convert to screen pixels (multiply by zoom)
      const screenOffsetX = offsetWorldX * zoom;
      const screenOffsetY = offsetWorldY * zoom;

      // Three.js uses Y-up, so negate Y
      // Apply per-building offsets (scaled by zoom), fallback to global config
      const threeX = screenOffsetX + (logo.logoOffset.x * zoom);
      const threeY = -screenOffsetY + (logo.logoOffset.y * zoom);

      return {
        ...logo,
        threeX,
        threeY,
      };
    });
  }, [logos, cameraX, cameraY, zoom, width, height]);

  if (logos.length === 0 || width === 0 || height === 0) {
    return null;
  }

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex: 20 }}
    >
      <Canvas
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera
          makeDefault
          position={[0, 0, 100]}
          left={-width / 2}
          right={width / 2}
          top={height / 2}
          bottom={-height / 2}
          near={0.1}
          far={1000}
        />
        <ambientLight intensity={1} />
        <Suspense fallback={null}>
          {screenLogos.map((logo) => (
            <BuildingLogo3D
              key={logo.buildingId}
              logoUrl={logo.logoUrl}
              x={logo.threeX}
              y={logo.threeY}
              size={logoSize}
              rotationSpeed={LOGO_CONFIG.rotationSpeed}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}
