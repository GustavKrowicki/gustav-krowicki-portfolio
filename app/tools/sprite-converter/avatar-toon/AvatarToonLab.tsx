'use client';

// Avatar builder toon lab: the base body in the base outfit, rendered by lib/city/models/avatarToon.ts
// at the builder size and at the street-zoom sprite size, from the same camera and materials.
//   ?yaw=0              model yaw in degrees (0 faces the camera)
//   ?wear=hoodie,beanie  optional pieces to put on (default: the base outfit)
// window.__avatarToon = { builder, sprite } (PNG data URLs) once both are drawn.
import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_PIECES,
  ToonRenderer,
  applyOutfit,
  builderView,
  loadAvatarBase,
  spriteView,
  type AvatarPiece,
} from '@/lib/city/models/avatarToon';

export default function AvatarToonLab() {
  const builderRef = useRef<HTMLCanvasElement>(null);
  const spriteRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const yaw = Number(params.get('yaw') ?? 0);
    const wear = (params.get('wear') ?? '').split(',').filter((p): p is AvatarPiece => p in AVATAR_PIECES);
    (async () => {
      const model = await loadAvatarBase();
      if (cancelled || !builderRef.current || !spriteRef.current) return;
      applyOutfit(model, wear);
      const big = new ToonRenderer(builderRef.current);
      big.render(model, { ...builderView(600), yawDeg: yaw });
      const small = new ToonRenderer(spriteRef.current);
      small.render(model, { ...spriteView(), yawDeg: yaw });
      (window as unknown as { __avatarToon: unknown }).__avatarToon = {
        builder: builderRef.current.toDataURL('image/png'),
        sprite: spriteRef.current.toDataURL('image/png'),
      };
      setStatus('ready');
    })().catch((err) => setStatus(`error: ${String(err)}`));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main style={{ padding: 24, background: '#e9e4da', minHeight: '100vh', fontFamily: 'system-ui' }}>
      <p data-status={status}>{status}</p>
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-end' }}>
        <canvas ref={builderRef} />
        <canvas ref={spriteRef} style={{ width: 33 * 4, height: 62 * 4, imageRendering: 'pixelated' }} />
      </div>
    </main>
  );
}
