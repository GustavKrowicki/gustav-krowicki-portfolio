'use client';

// Live toon view for the avatar builder: the shared base GLB rendered by lib/city/models/avatarToon.ts with
// the same camera, light and outline as the street-zoom sprite bake. Loaded lazily by AvatarSection, so
// three.js only downloads when the Avatar tab opens.
import { useEffect, useRef, useState } from 'react';
import type * as THREE from 'three';
import {
  ToonRenderer,
  applyOutfit,
  builderView,
  loadSharedAvatarBase,
  type AvatarPiece,
} from '@/lib/city/models/avatarToon';

const CSS_HEIGHT = 220; // px on screen; the canvas renders at device pixels

type Props = {
  worn: AvatarPiece[];
  onReady?: () => void;
};

export default function AvatarToonView({ worn, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<ToonRenderer | null>(null);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const [failed, setFailed] = useState(false);
  const readyRef = useRef(onReady);
  useEffect(() => {
    readyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let cancelled = false;
    rendererRef.current = new ToonRenderer(canvasRef.current!);
    loadSharedAvatarBase()
      .then((m) => !cancelled && setModel(m))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      rendererRef.current?.dispose();
      rendererRef.current = null;
    };
  }, []);

  const wornKey = worn.join(',');
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!model || !renderer) return;
    applyOutfit(model, wornKey ? (wornKey.split(',') as AvatarPiece[]) : []);
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    renderer.render(model, builderView(Math.round(CSS_HEIGHT * dpr)));
    readyRef.current?.();
  }, [model, wornKey]);

  const view = builderView(CSS_HEIGHT);
  return (
    <div className="relative" style={{ width: view.width, height: CSS_HEIGHT }}>
      <canvas
        ref={canvasRef}
        aria-label="Your avatar"
        role="img"
        style={{ width: view.width, height: CSS_HEIGHT, opacity: model ? 1 : 0, transition: 'opacity 150ms' }}
      />
      {!model && (
        <span className="absolute inset-0 flex items-center justify-center text-xs text-neutral-400">
          {failed ? 'Could not load the avatar' : 'Loading'}
        </span>
      )}
    </div>
  );
}
