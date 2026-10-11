'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Same models the static converter is fed; served from public/game/models.
const MODELS = [
  'LEGO HQ',
  'New valtech',
  'Aarhus stadium',
  'Aerogust',
  'Berlin Uni',
  'Business academy aarhus',
  'Melmbourne Uni',
  'concert stage northside',
  'dokk1 library',
  'ski chute 1',
  'ski chute 2',
  'ski moguls',
  'tree skiing new',
];

const DIRECTIONS = [
  { name: 'south', angle: 45 },
  { name: 'west', angle: 135 },
  { name: 'north', angle: 225 },
  { name: 'east', angle: 315 },
];

type PresetId = 'sun' | 'night' | 'bounce' | 'turntable';

const PRESETS: { id: PresetId; label: string; hint: string }[] = [
  { id: 'sun', label: 'Sun sweep', hint: 'Key light circles the building, so shading moves across the walls. Loops.' },
  { id: 'night', label: 'Day → night', hint: 'Light cools and dims, a warm fill comes up. Ping-pongs back to day.' },
  { id: 'bounce', label: 'Hover bounce', hint: 'Squash and stretch from the base. For hover or click states.' },
  { id: 'turntable', label: 'Turntable', hint: 'Full 360° spin. For a showcase view, not for the grid.' },
];

interface Rig {
  ambient: THREE.AmbientLight;
  key: THREE.DirectionalLight;
  fill: THREE.DirectionalLight;
  pivot: THREE.Group;
}

const DAY = { key: new THREE.Color(0xfff4e0), ambient: new THREE.Color(0xffffff), fill: new THREE.Color(0xffffff) };
const NIGHT = { key: new THREE.Color(0x3a4f8a), ambient: new THREE.Color(0x6070a0), fill: new THREE.Color(0xffa860) };

// Puts the rig into the state for time t in [0, 1). Frame N and frame 0 match,
// so every preset loops without a visible seam.
function applyPreset(rig: Rig, preset: PresetId, t: number) {
  const { ambient, key, fill, pivot } = rig;
  const turn = t * Math.PI * 2;

  // Defaults, matching the static converter's lighting
  ambient.color.copy(DAY.ambient);
  ambient.intensity = 0.6;
  key.color.copy(DAY.key);
  key.intensity = 0.8;
  key.position.set(5, 10, 5);
  fill.color.copy(DAY.fill);
  fill.intensity = 0.3;
  fill.position.set(-5, 5, -5);
  pivot.scale.set(1, 1, 1);
  pivot.rotation.y = 0;

  if (preset === 'sun') {
    ambient.intensity = 0.45;
    key.intensity = 1.0;
    key.position.set(Math.cos(turn) * 9, 7, Math.sin(turn) * 9);
  } else if (preset === 'night') {
    const p = 0.5 - 0.5 * Math.cos(turn); // 0 → 1 → 0
    key.color.copy(DAY.key).lerp(NIGHT.key, p);
    key.intensity = THREE.MathUtils.lerp(0.9, 0.25, p);
    ambient.color.copy(DAY.ambient).lerp(NIGHT.ambient, p);
    ambient.intensity = THREE.MathUtils.lerp(0.6, 0.25, p);
    fill.color.copy(DAY.fill).lerp(NIGHT.fill, p);
    fill.intensity = THREE.MathUtils.lerp(0.3, 0.7, p);
    fill.position.set(3, 1.5, 6); // low and in front, like a street light
  } else if (preset === 'bounce') {
    const s = Math.sin(turn);
    pivot.scale.set(1 - 0.04 * s, 1 + 0.08 * s, 1 - 0.04 * s);
  } else if (preset === 'turntable') {
    pivot.rotation.y = turn;
  }
}

function placeCamera(camera: THREE.OrthographicCamera, zoom: number, verticalOffset: number, angle: number) {
  const frustumSize = 5 / zoom;
  camera.left = -frustumSize / 2;
  camera.right = frustumSize / 2;
  camera.top = frustumSize * (1 - verticalOffset);
  camera.bottom = -frustumSize * verticalOffset;

  const isoAngle = Math.atan(1 / Math.sqrt(2));
  const distance = 10;
  camera.position.set(
    distance * Math.cos(isoAngle) * Math.sin(THREE.MathUtils.degToRad(angle)),
    distance * Math.sin(isoAngle),
    distance * Math.cos(isoAngle) * Math.cos(THREE.MathUtils.degToRad(angle))
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

export default function AnimatedSpriteConverterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const playerRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rigRef = useRef<Rig | null>(null);
  const sheetRef = useRef<HTMLCanvasElement | null>(null);

  const [modelName, setModelName] = useState('LEGO HQ');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'rendering'>('loading');
  const [preset, setPreset] = useState<PresetId>('night');
  const [direction, setDirection] = useState(45);
  const [frames, setFrames] = useState(24);
  const [fps, setFps] = useState(12);
  const [spriteSize, setSpriteSize] = useState(256);
  const [zoom, setZoom] = useState(0.5);
  const [verticalOffset, setVerticalOffset] = useState(0.5);
  const [sheet, setSheet] = useState<{ url: string; columns: number; rows: number; frames: number; size: number } | null>(null);

  // Three.js setup: one scene, live preview of the current preset at t=0
  useEffect(() => {
    if (!canvasRef.current) return;

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true, alpha: true });
    renderer.setSize(400, 400);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    cameraRef.current = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 1000);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    // Scaling and spinning happen on this pivot, which sits at the building's base
    const pivot = new THREE.Group();
    scene.add(ambient, key, fill, pivot);
    rigRef.current = { ambient, key, fill, pivot };

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (cameraRef.current) renderer.render(scene, cameraRef.current);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, []);

  // Load the selected model, normalised so its base sits at y=0 and it is centred
  useEffect(() => {
    const rig = rigRef.current;
    if (!rig) return;

    let cancelled = false;
    rig.pivot.clear();

    new GLTFLoader().load(
      encodeURI(`/game/models/${modelName}.glb`),
      (gltf) => {
        if (cancelled) return;
        const model = gltf.scene;
        const raw = new THREE.Box3().setFromObject(model);
        const size = raw.getSize(new THREE.Vector3());
        model.scale.multiplyScalar(3 / Math.max(size.x, size.y, size.z));

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.set(-center.x, -box.min.y, -center.z);

        rig.pivot.add(model);
        setStatus('ready');
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
        if (!cancelled) setStatus('idle');
      }
    );

    return () => {
      cancelled = true;
    };
  }, [modelName]);

  // Keep the live preview in sync with the settings
  useEffect(() => {
    if (cameraRef.current) placeCamera(cameraRef.current, zoom, verticalOffset, direction);
    if (rigRef.current) applyPreset(rigRef.current, preset, 0);
  }, [zoom, verticalOffset, direction, preset]);

  // Render every frame of the preset into one sprite sheet (grid, max 8 columns)
  const renderSheet = useCallback(() => {
    const scene = sceneRef.current;
    const rig = rigRef.current;
    if (!scene || !rig || status !== 'ready') return;
    setStatus('rendering');

    const frameCanvas = document.createElement('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas: frameCanvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.setSize(spriteSize, spriteSize, false);
    renderer.setClearColor(0x000000, 0);

    const camera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 1000);
    placeCamera(camera, zoom, verticalOffset, direction);

    const columns = Math.min(frames, 8);
    const rows = Math.ceil(frames / columns);
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = columns * spriteSize;
    sheetCanvas.height = rows * spriteSize;
    const ctx = sheetCanvas.getContext('2d')!;

    for (let i = 0; i < frames; i++) {
      applyPreset(rig, preset, i / frames);
      renderer.render(scene, camera);
      ctx.drawImage(frameCanvas, (i % columns) * spriteSize, Math.floor(i / columns) * spriteSize);
    }

    applyPreset(rig, preset, 0);
    renderer.dispose();
    sheetRef.current = sheetCanvas;
    setSheet({ url: sheetCanvas.toDataURL('image/png'), columns, rows, frames, size: spriteSize });
    setStatus('ready');
  }, [status, spriteSize, zoom, verticalOffset, direction, frames, preset]);

  // Play the rendered sheet back the way Phaser would
  useEffect(() => {
    const player = playerRef.current;
    const sheetCanvas = sheetRef.current;
    if (!player || !sheetCanvas || !sheet) return;

    const ctx = player.getContext('2d')!;
    let frame = 0;
    const timer = setInterval(() => {
      ctx.clearRect(0, 0, player.width, player.height);
      ctx.drawImage(
        sheetCanvas,
        (frame % sheet.columns) * sheet.size,
        Math.floor(frame / sheet.columns) * sheet.size,
        sheet.size,
        sheet.size,
        0,
        0,
        player.width,
        player.height
      );
      frame = (frame + 1) % sheet.frames;
    }, 1000 / fps);

    return () => clearInterval(timer);
  }, [sheet, fps]);

  const dirName = DIRECTIONS.find((d) => d.angle === direction)?.name ?? 'south';
  const fileBase = `${modelName.toLowerCase().replace(/\s+/g, '-')}_${dirName}_${preset}`;

  const download = () => {
    if (!sheet) return;
    const png = document.createElement('a');
    png.download = `${fileBase}.png`;
    png.href = sheet.url;
    png.click();

    const meta = { frameWidth: sheet.size, frameHeight: sheet.size, frames: sheet.frames, columns: sheet.columns, fps, preset, direction: dirName };
    const json = document.createElement('a');
    json.download = `${fileBase}.json`;
    json.href = URL.createObjectURL(new Blob([JSON.stringify(meta, null, 2)], { type: 'application/json' }));
    json.click();
  };

  const button = (active: boolean) =>
    `px-3 py-2 text-sm rounded ${active ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Animated Isometric Sprites</h1>
        <p className="text-slate-400 mb-8">
          Renders a GLB from the same isometric camera as the static converter, once per frame, and packs the frames
          into a sprite sheet Phaser can play.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="bg-slate-800 rounded-lg aspect-square flex items-center justify-center">
              <canvas ref={canvasRef} width={400} height={400} className="max-w-full max-h-full" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              {status === 'loading' ? 'Loading model…' : 'Setup view (frame 1)'}
            </p>
          </div>

          <div className="space-y-2">
            <div className="bg-slate-800 rounded-lg aspect-square flex items-center justify-center">
              <canvas ref={playerRef} width={400} height={400} className="max-w-full max-h-full" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              {sheet ? `Playback: ${sheet.frames} frames at ${fps} fps` : 'Render to see the animation'}
            </p>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium mb-2">Building</label>
              <select
                value={modelName}
                onChange={(e) => {
                  setStatus('loading');
                  setSheet(null);
                  setModelName(e.target.value);
                }}
                className="w-full px-3 py-2 rounded bg-slate-700 text-white border border-slate-600"
              >
                {MODELS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Animation</label>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button key={p.id} onClick={() => setPreset(p.id)} className={button(preset === p.id)}>
                    {p.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-2">{PRESETS.find((p) => p.id === preset)?.hint}</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Direction</label>
              <div className="flex gap-2">
                {DIRECTIONS.map((d) => (
                  <button key={d.angle} onClick={() => setDirection(d.angle)} className={button(direction === d.angle)}>
                    {d.name[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Frames: {frames} · {fps} fps</label>
              <input type="range" min="8" max="48" step="4" value={frames} onChange={(e) => setFrames(Number(e.target.value))} className="w-full" />
              <input type="range" min="4" max="24" step="1" value={fps} onChange={(e) => setFps(Number(e.target.value))} className="w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Size {spriteSize}px · zoom {zoom.toFixed(2)} · base {(verticalOffset * 100).toFixed(0)}%
              </label>
              <div className="flex gap-2 mb-2">
                {[128, 256, 384].map((s) => (
                  <button key={s} onClick={() => setSpriteSize(s)} className={button(spriteSize === s)}>{s}</button>
                ))}
              </div>
              <input type="range" min="0.2" max="1" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full" />
              <input type="range" min="0.05" max="0.55" step="0.01" value={verticalOffset} onChange={(e) => setVerticalOffset(Number(e.target.value))} className="w-full" />
            </div>

            <div className="space-y-2">
              <button
                onClick={renderSheet}
                disabled={status !== 'ready'}
                className="w-full py-3 bg-blue-600 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {status === 'rendering' ? 'Rendering…' : 'Render sprite sheet'}
              </button>
              <button
                onClick={download}
                disabled={!sheet}
                className="w-full py-3 bg-slate-700 rounded-lg font-medium hover:bg-slate-600 disabled:opacity-50"
              >
                Download PNG + JSON
              </button>
            </div>
          </div>
        </div>

        {sheet && (
          <div className="mt-10 space-y-4">
            <h2 className="text-lg font-bold">
              Sprite sheet · {sheet.columns}×{sheet.rows} grid of {sheet.size}px frames
            </h2>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={sheet.url} alt="Rendered sprite sheet" className="w-full rounded-lg bg-slate-800" />
            <pre className="p-4 bg-slate-800 rounded-lg text-sm text-slate-300 overflow-x-auto">{`// Phaser: load once, then play on the building's sprite
this.load.spritesheet('${fileBase}', '/game/pogicity/Building/landmark/${fileBase}.png', {
  frameWidth: ${sheet.size}, frameHeight: ${sheet.size},
});
this.anims.create({
  key: '${fileBase}',
  frames: this.anims.generateFrameNumbers('${fileBase}'),
  frameRate: ${fps},
  repeat: -1,
});
buildingSprite.play('${fileBase}');`}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
