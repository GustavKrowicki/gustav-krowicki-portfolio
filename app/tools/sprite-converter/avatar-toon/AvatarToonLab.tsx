'use client';

// Avatar builder toon lab: the base body in the base outfit, rendered by lib/city/models/avatarToon.ts
// at the builder size and at the street-zoom sprite size, from the same camera and materials.
//   ?yaw=0              model yaw in degrees (0 faces the camera)
//   ?wear=hoodie,beanie  optional pieces to put on (default: the base outfit)
//   ?clip=walk-in-place&t=0.25  pose from the shipped clips (rigged copy, avatarBuilderRig.ts)
// window.__bakeSheet({ wear, yawDeg, clip, frames }) renders one city sheet strip (bakeView frames, 2x);
// art/avatar-builder/base/bake_sheets.mjs drives it.
// window.__avatarToon = { builder, sprite } (PNG data URLs) once both are drawn.
import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_PIECES,
  ToonRenderer,
  applyOutfit,
  bakeView,
  builderView,
  loadAvatarBase,
  spriteView,
  type AvatarPiece,
} from '@/lib/city/models/avatarToon';
import { rigAvatarBase } from '@/lib/city/models/avatarBuilderRig';

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
      const base = await loadAvatarBase();
      if (cancelled || !builderRef.current || !spriteRef.current) return;
      const rig = rigAvatarBase(base);
      const clip = params.get('clip');
      if (clip) rig.seek(clip, Number(params.get('t') ?? 0));
      const model = clip ? rig.root : base;
      applyOutfit(model, wear);
      // One strip per clip and direction: frames side by side, each bakeView frame doubled with nearest
      // neighbour (2 sheet px per street px, drawn at displayScale 0.25 by the city).
      const baker = new ToonRenderer(document.createElement('canvas'));
      (window as unknown as { __bakeSheet: unknown }).__bakeSheet = (o: {
        wear: AvatarPiece[];
        yawDeg: number;
        clip: string;
        frames: number;
      }) => {
        const view = bakeView();
        const strip = document.createElement('canvas');
        strip.width = view.width * 2 * o.frames;
        strip.height = view.height * 2;
        const ctx = strip.getContext('2d')!;
        ctx.imageSmoothingEnabled = false;
        for (let i = 0; i < o.frames; i += 1) {
          rig.seek(o.clip, (rig.clipDuration(o.clip) * i) / o.frames);
          applyOutfit(rig.root, o.wear);
          baker.render(rig.root, { ...view, yawDeg: o.yawDeg });
          ctx.drawImage(baker.renderer.domElement, i * view.width * 2, 0, view.width * 2, view.height * 2);
        }
        return { png: strip.toDataURL('image/png'), frameWidth: view.width * 2, frameHeight: view.height * 2, footPx: view.footPx * 2 };
      };
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
