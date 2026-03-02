"use client";

import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Mesh, CanvasTexture } from "three";

interface BuildingLogo3DProps {
  logoUrl: string;
  x: number;
  y: number;
  size?: number;
  rotationSpeed?: number;
}

function useSvgTexture(url: string): CanvasTexture | null {
  const [texture, setTexture] = useState<CanvasTexture | null>(null);

  useEffect(() => {
    const createFallbackTexture = () => {
      const canvas = document.createElement("canvas");
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return null;
      }

      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 4, 0, Math.PI * 2);
      ctx.fillStyle = "#6366f1";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;
      ctx.stroke();

      const canvasTexture = new CanvasTexture(canvas);
      canvasTexture.needsUpdate = true;
      return canvasTexture;
    };

    let isDisposed = false;
    let loadedTexture: CanvasTexture | null = null;
    let fallbackTexture: CanvasTexture | null = null;

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (isDisposed) return;

      const canvas = document.createElement("canvas");
      const size = 128;
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return;
      }

      ctx.drawImage(img, 0, 0, size, size);
      loadedTexture = new CanvasTexture(canvas);
      loadedTexture.needsUpdate = true;
      setTexture(loadedTexture);
    };

    img.onerror = () => {
      if (isDisposed) return;

      fallbackTexture = createFallbackTexture();
      if (fallbackTexture) {
        setTexture(fallbackTexture);
      }
    };

    img.src = url;

    return () => {
      isDisposed = true;
      loadedTexture?.dispose();
      fallbackTexture?.dispose();
    };
  }, [url]);

  return texture;
}

export default function BuildingLogo3D({
  logoUrl,
  x,
  y,
  size = 40,
  rotationSpeed = 2,
}: BuildingLogo3DProps) {
  const meshRef = useRef<Mesh>(null);
  const texture = useSvgTexture(logoUrl);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * rotationSpeed;
    }
  });

  const scale = size;

  if (!texture) {
    return (
      <mesh ref={meshRef} position={[x, y, 0]}>
        <circleGeometry args={[scale / 2, 32]} />
        <meshBasicMaterial color="#6366f1" side={DoubleSide} />
      </mesh>
    );
  }

  return (
    <mesh ref={meshRef} position={[x, y, 0]}>
      <circleGeometry args={[scale / 2, 32]} />
      <meshBasicMaterial
        map={texture}
        side={DoubleSide}
        transparent
        depthTest={false}
      />
    </mesh>
  );
}
