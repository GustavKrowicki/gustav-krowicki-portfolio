import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { generateColorFromTitle } from '@/lib/utils/bookCoverFetcher';
import type { BookData } from '@/lib/utils/csvParser';

interface Book3DProps {
  book: BookData;
  position: [number, number, number];
  coverUrl: string | null;
  onClick: () => void;
}

export default function Book3D({ book, position, coverUrl, onClick }: Book3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const fallbackColor = generateColorFromTitle(book.title);

  const targetY = useRef(0);
  const targetEmissive = useRef(0);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return;

    targetY.current = hovered ? 0.3 : 0;
    targetEmissive.current = hovered ? 0.3 : 0;

    // Animate group position for hover lift (affects mesh and text)
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY.current,
      0.1
    );

    // Animate emissive glow on the mesh material
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      const currentEmissive = meshRef.current.material.emissiveIntensity || 0;
      meshRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(
        currentEmissive,
        targetEmissive.current,
        0.1
      );
    }
  });

  // Truncate text if too long
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onClick={onClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
        position={[0, 0, 0]}
      >
        <boxGeometry args={[0.4, 2, 1.3]} />
        <meshStandardMaterial
          color={fallbackColor}
          emissive="#2563eb"
          emissiveIntensity={0}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Title text on spine */}
      <Text
        position={[0, 0.2, 0.66]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.1}
        color="white"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.6}
      >
        {truncateText(book.title, 45)}
      </Text>

      {/* Author text on spine */}
      <Text
        position={[0, -0.5, 0.66]}
        rotation={[0, 0, Math.PI / 2]}
        fontSize={0.07}
        color="rgba(255, 255, 255, 0.85)"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.6}
      >
        {truncateText(book.author, 35)}
      </Text>
    </group>
  );
}
