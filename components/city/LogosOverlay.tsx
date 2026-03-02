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
  viewportLeft: number;
  viewportTop: number;
  viewportWidth: number;
  viewportHeight: number;
  worldWidth: number;
  worldHeight: number;
  cameraX: number;
  cameraY: number;
  zoom: number;
}

export default function LogosOverlay({
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
}: LogosOverlayProps) {
  // Memoize logo size based on zoom and config
  const logoSize = useMemo(() => {
    return LOGO_CONFIG.baseSize * LOGO_CONFIG.sizeMultiplier * zoom;
  }, [zoom]);

  const screenLogos = useMemo(() => {
    const visibleWorldWidth = worldWidth / zoom;
    const visibleWorldHeight = worldHeight / zoom;
    const cameraCenterX = cameraX + visibleWorldWidth / 2;
    const cameraCenterY = cameraY + visibleWorldHeight / 2;
    const displayScaleX = viewportWidth / worldWidth;
    const displayScaleY = viewportHeight / worldHeight;

    return logos.map((logo) => {
      const offsetWorldX = logo.screenX - cameraCenterX;
      const offsetWorldY = logo.screenY - cameraCenterY;
      const screenOffsetX = offsetWorldX * zoom;
      const screenOffsetY = offsetWorldY * zoom;
      const displayOffsetX = screenOffsetX * displayScaleX;
      const displayOffsetY = screenOffsetY * displayScaleY;
      const threeX = displayOffsetX + (logo.logoOffset.x * zoom * displayScaleX);
      const threeY = -displayOffsetY + (logo.logoOffset.y * zoom * displayScaleY);

      return {
        ...logo,
        threeX,
        threeY,
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
      }}
    >
      <Canvas
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <OrthographicCamera
          makeDefault
          position={[0, 0, 100]}
          left={-viewportWidth / 2}
          right={viewportWidth / 2}
          top={viewportHeight / 2}
          bottom={-viewportHeight / 2}
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
