import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { generateColorFromTitle, fetchBookCover } from '@/lib/utils/bookCoverFetcher';
import type { BookData } from '@/lib/utils/csvParser';

type AnimationState = 'idle' | 'pulling' | 'rotating' | 'displayed' | 'returning';

interface Book3DProps {
  book: BookData;
  position: [number, number, number];
  isExpanded: boolean;
  offsetX: number;
  onClick: () => void;
}

export default function Book3D({ book, position, isExpanded, offsetX, onClick }: Book3DProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [animationState, setAnimationState] = useState<AnimationState>('idle');
  const [coverTexture, setCoverTexture] = useState<THREE.Texture | null>(null);
  const [coverLoading, setCoverLoading] = useState(false);
  const fallbackColor = generateColorFromTitle(book.title);
  const [spineColor, setSpineColor] = useState(fallbackColor);

  // Store the base position
  const basePosition = useRef(position);

  // Generate deterministic height variation (min: 2, max: 2.6)
  const bookHeight = (() => {
    const hash = book.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const variation = (hash % 60) / 100; // 0 to 0.6
    return 2 + variation; // 2.0 to 2.6
  })();

  // Extract dominant color from texture
  const extractDominantColor = (texture: THREE.Texture): string => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const image = texture.image as HTMLImageElement;

      if (!ctx || !image || !image.width || !image.height) return fallbackColor;

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      // Sample from the edge of the cover (spine area simulation)
      const imageData = ctx.getImageData(0, canvas.height / 2, 20, canvas.height / 4);
      const data = imageData.data;

      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }

      r = Math.floor(r / count);
      g = Math.floor(g / count);
      b = Math.floor(b / count);

      return `rgb(${r}, ${g}, ${b})`;
    } catch (error) {
      console.warn('Failed to extract color from texture:', error);
      return fallbackColor;
    }
  };

  const targetY = useRef(0);
  const targetZ = useRef(0);
  const targetRotationY = useRef(0);
  const targetEmissive = useRef(0);
  const targetOffsetX = useRef(0);

  // Handle isExpanded state changes
  useEffect(() => {
    if (isExpanded && animationState === 'idle') {
      setAnimationState('pulling');
    } else if (!isExpanded && animationState === 'displayed') {
      setAnimationState('returning');
    }
  }, [isExpanded, animationState]);

  // Load cover texture immediately on mount
  useEffect(() => {
    if (!coverTexture && !coverLoading && book.isbn13) {
      setCoverLoading(true);

      fetchBookCover(book.isbn13).then((url) => {
        if (url) {
          const img = new Image();
          img.crossOrigin = 'anonymous';

          // Timeout fallback in case image loading hangs
          const timeout = setTimeout(() => {
            setCoverLoading(false);
          }, 5000);

          img.onload = () => {
            clearTimeout(timeout);

            // Check if image has valid dimensions (not a 1x1 placeholder)
            if (img.naturalWidth > 10 && img.naturalHeight > 10) {
              console.log(`✅ Cover loaded for "${book.title}" (${img.naturalWidth}x${img.naturalHeight})`);
              const texture = new THREE.Texture(img);
              texture.needsUpdate = true;
              texture.minFilter = THREE.LinearFilter;
              texture.magFilter = THREE.LinearFilter;

              setCoverTexture(texture);

              // Extract and set spine color from the texture
              const dominantColor = extractDominantColor(texture);
              setSpineColor(dominantColor);

              setCoverLoading(false);
            } else {
              console.warn(`⚠️ Cover image too small for "${book.title}" (${img.naturalWidth}x${img.naturalHeight}) - using fallback`);
              setCoverLoading(false);
            }
          };

          img.onerror = () => {
            clearTimeout(timeout);
            console.warn(`❌ Failed to load cover for "${book.title}" - using fallback`);
            setCoverLoading(false);
          };

          img.src = url;
        } else {
          setCoverLoading(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.isbn13]);

  // Clean up texture on unmount
  useEffect(() => {
    return () => {
      if (coverTexture) {
        coverTexture.dispose();
      }
    };
  }, [coverTexture]);

  useFrame(() => {
    if (!groupRef.current || !meshRef.current) return;

    // Set targets based on state
    targetY.current = hovered && !isExpanded ? 0.3 : 0;
    // Add loading pulse effect (no hover glow)
    const loadingPulse = coverLoading ? Math.sin(Date.now() * 0.003) * 0.1 + 0.1 : 0;
    targetEmissive.current = loadingPulse;
    targetOffsetX.current = offsetX;

    // Z-axis pull forward animation
    if (animationState === 'pulling' || animationState === 'rotating' || animationState === 'displayed') {
      targetZ.current = 2.5; // Pull toward camera
    } else if (animationState === 'returning' || animationState === 'idle') {
      targetZ.current = 0; // Return to shelf
    }

    // Y-axis rotation animation
    if (animationState === 'rotating' || animationState === 'displayed') {
      targetRotationY.current = -Math.PI / 2; // -90 degrees - show front cover
    } else {
      targetRotationY.current = 0; // Show spine
    }

    // Animate horizontal offset for book spacing (base position + offset)
    groupRef.current.position.x = THREE.MathUtils.lerp(
      groupRef.current.position.x,
      basePosition.current[0] + targetOffsetX.current,
      0.1
    );

    // Animate group position for hover lift (affects mesh and text)
    groupRef.current.position.y = THREE.MathUtils.lerp(
      groupRef.current.position.y,
      targetY.current,
      0.1
    );

    // Animate Z position (pull forward/return)
    const zLerpSpeed = animationState === 'pulling' || animationState === 'returning' ? 0.15 : 0.1;
    groupRef.current.position.z = THREE.MathUtils.lerp(
      groupRef.current.position.z,
      targetZ.current,
      zLerpSpeed
    );

    // Animate rotation (slower for smooth effect)
    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetRotationY.current,
      0.12
    );

    // Check for state transitions based on position and rotation
    const distanceToTargetZ = Math.abs(groupRef.current.position.z - targetZ.current);
    const distanceToTargetRotation = Math.abs(groupRef.current.rotation.y - targetRotationY.current);

    if (animationState === 'pulling' && distanceToTargetZ < 0.1) {
      setAnimationState('rotating');
    } else if (animationState === 'rotating' && distanceToTargetRotation < 0.05) {
      setAnimationState('displayed');
    } else if (animationState === 'returning' && distanceToTargetZ < 0.05 && distanceToTargetRotation < 0.05) {
      setAnimationState('idle');
    }

    // Animate emissive glow on spine material only (front face)
    if (Array.isArray(meshRef.current.material)) {
      // Update front spine material (index 4)
      const spineMaterial = meshRef.current.material[4];
      if (spineMaterial instanceof THREE.MeshStandardMaterial) {
        const currentEmissive = spineMaterial.emissiveIntensity || 0;
        spineMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          currentEmissive,
          targetEmissive.current,
          0.1
        );
      }
      // Also update cover material for loading pulse
      const coverMaterial = meshRef.current.material[0];
      if (coverMaterial instanceof THREE.MeshStandardMaterial) {
        const currentEmissive = coverMaterial.emissiveIntensity || 0;
        coverMaterial.emissiveIntensity = THREE.MathUtils.lerp(
          currentEmissive,
          targetEmissive.current,
          0.1
        );
      }
    }
  });

  // Truncate text if too long
  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  // Create materials array for different box faces - memoized to prevent recreation
  const materials = useMemo(() => {
    console.log(`🎨 Creating materials for "${book.title}" - has texture: ${!!coverTexture}, spine color: ${spineColor}`);
    return [
      // Right side (+X) - front cover (shows after -90° rotation)
      new THREE.MeshStandardMaterial({
        map: coverTexture || null,
        color: coverTexture ? '#ffffff' : spineColor,
        roughness: 0.3,
        metalness: 0.0,
      }),
      // Left side (-X) - back cover
      new THREE.MeshStandardMaterial({
        color: spineColor,
        roughness: 0.7,
        metalness: 0.1
      }),
      // Top (+Y) - page edges
      new THREE.MeshStandardMaterial({
        color: '#e5e5e5',
        roughness: 0.8,
        metalness: 0.1
      }),
      // Bottom (-Y) - page edges
      new THREE.MeshStandardMaterial({
        color: '#e5e5e5',
        roughness: 0.8,
        metalness: 0.1
      }),
      // Front (+Z) - spine (visible when not rotated)
      new THREE.MeshStandardMaterial({
        color: spineColor,
        emissive: '#2563eb',
        emissiveIntensity: 0,
        roughness: 0.7,
        metalness: 0.1,
      }),
      // Back (-Z) - spine back
      new THREE.MeshStandardMaterial({
        color: spineColor,
        roughness: 0.7,
        metalness: 0.1,
      }),
    ];
  }, [coverTexture, spineColor]);

  // Handle click with debouncing (only allow clicks in idle or displayed states)
  const handleClick = () => {
    if (animationState === 'idle' || animationState === 'displayed') {
      onClick();
    }
  };

  return (
    <group ref={groupRef} position={position}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
        position={[0, (bookHeight - 2) / 2, 0]}
        material={materials}
      >
        <boxGeometry args={[0.4, bookHeight, 1.3]} />
      </mesh>

      {/* Title text on spine - hide when book is rotated */}
      {animationState !== 'rotating' && animationState !== 'displayed' && (
        <>
          <Text
            position={[0, (bookHeight - 2) / 2 + 0.2, 0.66]}
            rotation={[0, 0, Math.PI / 2]}
            fontSize={0.1}
            color="white"
            anchorX="center"
            anchorY="middle"
            maxWidth={bookHeight - 0.4}
          >
            {truncateText(book.title, 45)}
          </Text>

          {/* Author text on spine */}
          <Text
            position={[0, (bookHeight - 2) / 2 - 0.5, 0.66]}
            rotation={[0, 0, Math.PI / 2]}
            fontSize={0.07}
            color="rgba(255, 255, 255, 0.85)"
            anchorX="center"
            anchorY="middle"
            maxWidth={bookHeight - 0.4}
          >
            {truncateText(book.author, 35)}
          </Text>
        </>
      )}

      {/* Fallback cover when no texture is available */}
      {!coverTexture && (animationState === 'rotating' || animationState === 'displayed') && (
          <group position={[0.21, (bookHeight - 2) / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
            {/* Dark semi-transparent overlay for contrast */}
            <mesh position={[0, 0, 0]}>
              <planeGeometry args={[1.28, bookHeight]} />
              <meshStandardMaterial
                color="#000000"
                transparent={true}
                opacity={0.3}
              />
            </mesh>

            {/* Title - at the top */}
            <Text
              position={[0, bookHeight / 2 - 0.2, 0.01]}
              fontSize={0.18}
              color="#ffffff"
              anchorX="center"
              anchorY="top"
              maxWidth={1.1}
            >
              {book.title}
            </Text>

            {/* Author - at the bottom */}
            <Text
              position={[0, -bookHeight / 2 + 0.15, 0.01]}
              fontSize={0.11}
              color="#ffffff"
              anchorX="center"
              anchorY="bottom"
              maxWidth={1.1}
            >
              by {truncateText(book.author, 35)}
            </Text>
          </group>
      )}

      {/* Information display when book is expanded */}
      {isExpanded && animationState === 'displayed' && (
        <group position={[0, (bookHeight - 2) / 2 + 2.5, 0]}>
          {/* Title */}
          <Text
            fontSize={0.15}
            color="#1a1a1a"
            anchorX="center"
            anchorY="middle"
            maxWidth={3}
          >
            {book.title}
          </Text>

          {/* Author */}
          <Text
            position={[0, -0.3, 0]}
            fontSize={0.1}
            color="#666"
            anchorX="center"
            anchorY="middle"
            maxWidth={3}
          >
            by {book.author}
          </Text>

          {/* Rating */}
          {book.myRating > 0 && (
            <Text
              position={[0, -0.55, 0]}
              fontSize={0.08}
              color="#ea580c"
              anchorX="center"
              anchorY="middle"
            >
              {'★'.repeat(book.myRating)}{'☆'.repeat(5 - book.myRating)}
            </Text>
          )}
        </group>
      )}
    </group>
  );
}
