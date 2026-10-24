'use client';

// The builder's avatar: stacked SVG layers drawn from the approved model sheet
// (art/avatar-builder/builder-2d/export_layers.py). Every layer shares one viewBox, so stacking them in slot
// order composes the figure; swapping a piece swaps one image. No three.js, no GLB.
import { useEffect, useState } from 'react';
import type { AvatarChoice } from '@/lib/city/models/avatarPieces';

const BASE = '/game/pogicity/Characters/avatar-builder-2d/layers';
const VIEW_W = 400;
const VIEW_H = 1010;

// Option id -> its layer file ('' = nothing drawn for this option, e.g. no hat).
const LAYER_FILES: Record<string, string> = {
  denim: 'legs-denim',
  cargo: 'legs-cargo',
  skiPants: 'legs-ski',
  skiShell: 'top-ski',
  helmet: 'hat-helmet',
  tee: 'top-tee',
  hoodie: 'top-hoodie',
  sweater: 'top-sweater',
  clubShirt: 'top-club',
  beanie: 'hat-beanie',
  none: '',
};

// Parts of a top that sit behind the neck (drawn before it).
const BACK_FILES: Record<string, string> = { hoodie: 'top-hoodie-back' };


type Props = {
  choice: AvatarChoice;
  expression?: 'neutral' | 'smile';
  height?: number;
  onReady?: () => void;
};

export default function AvatarLayerView({ choice, expression = 'neutral', height = 220, onReady }: Props) {
  // Back to front: legs, shoes, arms, the back of the top (a hood), neck, top, head, hat
  const top = LAYER_FILES[choice.top] ?? 'top-tee';
  const layers = [
    LAYER_FILES[choice.legs] ?? 'legs-denim',
    'shoes-base',
    'arms',
    BACK_FILES[choice.top] ?? '',
    'neck',
    top,
    `head-${expression}`,
    LAYER_FILES[choice.head] ?? '',
  ].filter(Boolean);
  // Ready once every layer of the current outfit has loaded (names already loaded stay loaded).
  const [loaded, setLoaded] = useState<ReadonlySet<string>>(() => new Set());
  const ready = layers.every((n) => loaded.has(n));
  useEffect(() => {
    if (ready) onReady?.();
  }, [ready, onReady]);

  const width = Math.round((height * VIEW_W) / VIEW_H);
  return (
    <div className="relative" style={{ width, height }} role="img" aria-label="Your avatar">
      {layers.map((name) => (
        // eslint-disable-next-line @next/next/no-img-element -- static SVG layers stacked on one viewBox
        <img
          key={name}
          src={`${BASE}/${name}.svg`}
          alt=""
          width={width}
          height={height}
          className="absolute inset-0 h-full w-full"
          onLoad={() => setLoaded((prev) => new Set(prev).add(name))}
          // a cached SVG can finish before React attaches onLoad
          ref={(el) => {
            if (el?.complete && el.naturalWidth > 0 && !loaded.has(name)) queueMicrotask(() => setLoaded((prev) => new Set(prev).add(name)));
          }}
        />
      ))}
    </div>
  );
}
