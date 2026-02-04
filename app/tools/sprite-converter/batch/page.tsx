'use client';

import { useRef, useState, useEffect } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const GLB_FILES = [
  { file: 'LEGO HQ.glb', name: 'lego-hq' },
  { file: 'New valtech.glb', name: 'valtech-office' },
  { file: 'Berlin Uni.glb', name: 'berlin-uni' },
  { file: 'Melmbourne Uni.glb', name: 'melbourne-uni' },
  { file: 'Business academy aarhus.glb', name: 'business-academy' },
  { file: 'dokk1 library.glb', name: 'dokk1-library' },
  { file: 'Aarhus stadium.glb', name: 'aarhus-stadium' },
  { file: 'Aerogust.glb', name: 'aeroguest' },
  { file: 'concert stage northside.glb', name: 'northside-stage' },
  { file: 'ski chute 1.glb', name: 'ski-chute-1' },
  { file: 'ski chute 2.glb', name: 'ski-chute-2' },
  { file: 'ski moguls.glb', name: 'ski-moguls' },
  { file: 'tree skiing new.glb', name: 'tree-skiing' },
];

const DIRECTIONS = [
  { name: 'south', angle: 45 },
  { name: 'west', angle: 135 },
  { name: 'north', angle: 225 },
  { name: 'east', angle: 315 },
];

interface ProcessingStatus {
  file: string;
  status: 'pending' | 'loading' | 'exporting' | 'done' | 'error';
  error?: string;
}

export default function BatchConverterPage() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [statuses, setStatuses] = useState<ProcessingStatus[]>(
    GLB_FILES.map(f => ({ file: f.file, status: 'pending' }))
  );
  const [spriteSize, setSpriteSize] = useState(512);
  const [zoom, setZoom] = useState(0.5); // Smaller zoom to match Pogicity scale
  const [verticalOffset, setVerticalOffset] = useState(0.5); // Building at bottom of frame
  const [currentPreview, setCurrentPreview] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateStatus = (file: string, status: ProcessingStatus['status'], error?: string) => {
    setStatuses(prev => prev.map(s =>
      s.file === file ? { ...s, status, error } : s
    ));
  };

  const processAllFiles = async () => {
    if (!canvasRef.current) return;

    setIsProcessing(true);

    // Setup Three.js
    const canvas = canvasRef.current;
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(spriteSize, spriteSize);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();

    // Orthographic camera for isometric view
    // Use asymmetric frustum to position building at bottom of frame
    const frustumSize = 5 / zoom;
    const camera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize * (1 - verticalOffset), // More space above
      -frustumSize * verticalOffset,       // Less space below
      0.1,
      1000
    );

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    const loader = new GLTFLoader();
    const isoAngle = Math.atan(1 / Math.sqrt(2));
    const distance = 10;

    for (const glbFile of GLB_FILES) {
      updateStatus(glbFile.file, 'loading');
      setCurrentPreview(glbFile.name);

      try {
        // Load GLB
        const gltf = await new Promise<any>((resolve, reject) => {
          loader.load(
            `/game/models/${encodeURIComponent(glbFile.file)}`,
            resolve,
            undefined,
            reject
          );
        });

        const model = gltf.scene;

        // Get bounding box
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;

        // Position model so its BASE is at y=0 (not centered)
        model.position.x = -center.x;
        model.position.y = -box.min.y; // Move up so bottom is at y=0
        model.position.z = -center.z;
        model.scale.multiplyScalar(scale);

        scene.add(model);

        updateStatus(glbFile.file, 'exporting');

        // Export all 4 directions
        for (const dir of DIRECTIONS) {
          camera.position.set(
            distance * Math.cos(isoAngle) * Math.sin(THREE.MathUtils.degToRad(dir.angle)),
            distance * Math.sin(isoAngle),
            distance * Math.cos(isoAngle) * Math.cos(THREE.MathUtils.degToRad(dir.angle))
          );
          camera.lookAt(0, 0, 0);

          renderer.render(scene, camera);

          // Download
          const link = document.createElement('a');
          link.download = `${glbFile.name}_${dir.name}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();

          // Small delay between downloads
          await new Promise(r => setTimeout(r, 300));
        }

        // Remove model for next iteration
        scene.remove(model);
        model.traverse((child: any) => {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((m: any) => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        });

        updateStatus(glbFile.file, 'done');
      } catch (error) {
        console.error(`Error processing ${glbFile.file}:`, error);
        updateStatus(glbFile.file, 'error', String(error));
      }

      // Delay between files
      await new Promise(r => setTimeout(r, 500));
    }

    renderer.dispose();
    setIsProcessing(false);
    setCurrentPreview(null);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Batch Sprite Converter</h1>
        <p className="text-slate-400 mb-8">
          Convert all GLB models to isometric sprites (Pogicity-compatible).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Preview & Controls */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <canvas
                ref={canvasRef}
                width={spriteSize}
                height={spriteSize}
                className="max-w-full max-h-full bg-slate-700"
              />
            </div>
            {currentPreview && (
              <p className="text-center text-slate-400">
                Processing: <span className="text-white font-medium">{currentPreview}</span>
              </p>
            )}

            {/* Settings */}
            <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sprite Size: {spriteSize}px
                </label>
                <div className="flex gap-2">
                  {[256, 512].map((size) => (
                    <button
                      key={size}
                      onClick={() => setSpriteSize(size)}
                      disabled={isProcessing}
                      className={`px-4 py-2 text-sm rounded ${
                        spriteSize === size
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {size}px
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Zoom: {zoom.toFixed(2)}x <span className="text-slate-400">(smaller = smaller buildings)</span>
                </label>
                <input
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full"
                />
                <div className="flex gap-2 mt-2">
                  {[0.3, 0.4, 0.5, 0.6].map((z) => (
                    <button
                      key={z}
                      onClick={() => setZoom(z)}
                      disabled={isProcessing}
                      className={`px-3 py-1 text-xs rounded ${
                        Math.abs(zoom - z) < 0.01
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {z}x
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Vertical Position: {(verticalOffset * 100).toFixed(0)}% <span className="text-slate-400">(50% = building at bottom)</span>
                </label>
                <input
                  type="range"
                  min="0.05"
                  max="0.55"
                  step="0.01"
                  value={verticalOffset}
                  onChange={(e) => setVerticalOffset(Number(e.target.value))}
                  disabled={isProcessing}
                  className="w-full"
                />
                <div className="flex gap-2 mt-2">
                  {[0.45, 0.48, 0.5, 0.52].map((v) => (
                    <button
                      key={v}
                      onClick={() => setVerticalOffset(v)}
                      disabled={isProcessing}
                      className={`px-3 py-1 text-xs rounded ${
                        Math.abs(verticalOffset - v) < 0.01
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      } disabled:opacity-50`}
                    >
                      {(v * 100).toFixed(0)}%
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={processAllFiles}
                disabled={isProcessing}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? 'Processing...' : 'Convert All GLB Files'}
              </button>
            </div>
          </div>

          {/* Status List */}
          <div className="space-y-2">
            <h3 className="font-medium mb-3">Files ({GLB_FILES.length})</h3>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {statuses.map((status) => (
                <div
                  key={status.file}
                  className={`p-3 rounded-lg flex items-center gap-3 ${
                    status.status === 'done'
                      ? 'bg-green-900/30 border border-green-700'
                      : status.status === 'error'
                      ? 'bg-red-900/30 border border-red-700'
                      : status.status === 'loading' || status.status === 'exporting'
                      ? 'bg-blue-900/30 border border-blue-700'
                      : 'bg-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{status.file}</p>
                    {status.error && (
                      <p className="text-red-400 text-sm truncate">{status.error}</p>
                    )}
                  </div>
                  <div className="text-sm">
                    {status.status === 'pending' && <span className="text-slate-500">Pending</span>}
                    {status.status === 'loading' && <span className="text-blue-400">Loading...</span>}
                    {status.status === 'exporting' && <span className="text-blue-400">Exporting...</span>}
                    {status.status === 'done' && <span className="text-green-400">✓ Done</span>}
                    {status.status === 'error' && <span className="text-red-400">✗ Error</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 p-6 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-bold mb-3">Tips for Pogicity-style sprites</h2>
          <ul className="text-slate-300 space-y-2">
            <li>• <strong>Zoom 0.4-0.5</strong> matches typical Pogicity building sizes</li>
            <li>• <strong>Vertical Position 48-52%</strong> puts building base at canvas bottom (required!)</li>
            <li>• The building's bottom edge must touch the bottom of the image or it will "float"</li>
            <li>• After export, move PNGs to <code className="bg-slate-700 px-2 py-0.5 rounded text-sm">public/game/pogicity/Building/landmark/</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
