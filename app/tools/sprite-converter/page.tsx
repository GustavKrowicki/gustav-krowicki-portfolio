'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export default function SpriteConverterPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const modelDataRef = useRef<{ center: THREE.Vector3; minY: number; scale: number } | null>(null);

  const [hasModel, setHasModel] = useState(false);
  const [spriteSize, setSpriteSize] = useState(256);
  const [zoom, setZoom] = useState(0.5);
  const [verticalOffset, setVerticalOffset] = useState(0.5);
  const [rotation, setRotation] = useState(45);
  const [transparentBg, setTransparentBg] = useState(true);
  const [fileName, setFileName] = useState('sprite');

  // Update camera based on zoom, vertical offset, and rotation
  const updateCamera = useCallback(() => {
    const camera = cameraRef.current;
    if (!camera) return;

    const frustumSize = 5 / zoom;
    camera.left = -frustumSize / 2;
    camera.right = frustumSize / 2;
    camera.top = frustumSize * (1 - verticalOffset);
    camera.bottom = -frustumSize * verticalOffset;

    const isoAngle = Math.atan(1 / Math.sqrt(2));
    const distance = 10;
    camera.position.set(
      distance * Math.cos(isoAngle) * Math.sin(THREE.MathUtils.degToRad(rotation)),
      distance * Math.sin(isoAngle),
      distance * Math.cos(isoAngle) * Math.cos(THREE.MathUtils.degToRad(rotation))
    );
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [zoom, verticalOffset, rotation]);

  // Initialize Three.js
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    renderer.setSize(400, 400);
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.OrthographicCamera(-2.5, 2.5, 2.5, -2.5, 0.1, 1000);
    cameraRef.current = camera;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      renderer.dispose();
    };
  }, []);

  // Update camera when parameters change
  useEffect(() => {
    updateCamera();
  }, [updateCamera]);

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const scene = sceneRef.current;
    if (!file || !scene) return;

    setFileName(file.name.replace(/\.[^/.]+$/, ''));

    const url = URL.createObjectURL(file);
    const loader = new GLTFLoader();

    loader.load(
      url,
      (gltf) => {
        // Remove existing model
        if (modelRef.current) {
          scene.remove(modelRef.current);
        }

        const newModel = gltf.scene;

        // Get bounding box
        const box = new THREE.Box3().setFromObject(newModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;

        // Position model so its BASE is at y=0 (not centered)
        newModel.position.x = -center.x;
        newModel.position.y = -box.min.y;
        newModel.position.z = -center.z;
        newModel.scale.multiplyScalar(scale);

        // Store model data for reference
        modelDataRef.current = { center, minY: box.min.y, scale };

        scene.add(newModel);
        modelRef.current = newModel;
        setHasModel(true);

        URL.revokeObjectURL(url);
      },
      undefined,
      (error) => {
        console.error('Error loading model:', error);
        alert('Failed to load model. Make sure it\'s a valid GLB/GLTF file.');
      }
    );
  };

  // Export sprite
  const exportSprite = () => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    if (!scene || !camera || !hasModel) return;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = spriteSize;
    exportCanvas.height = spriteSize;

    const exportRenderer = new THREE.WebGLRenderer({
      canvas: exportCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    exportRenderer.setSize(spriteSize, spriteSize);
    exportRenderer.setClearColor(0x000000, transparentBg ? 0 : 1);

    // Create export camera with same settings
    const frustumSize = 5 / zoom;
    const exportCamera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize * (1 - verticalOffset),
      -frustumSize * verticalOffset,
      0.1,
      1000
    );

    const isoAngle = Math.atan(1 / Math.sqrt(2));
    const distance = 10;
    exportCamera.position.set(
      distance * Math.cos(isoAngle) * Math.sin(THREE.MathUtils.degToRad(rotation)),
      distance * Math.sin(isoAngle),
      distance * Math.cos(isoAngle) * Math.cos(THREE.MathUtils.degToRad(rotation))
    );
    exportCamera.lookAt(0, 0, 0);

    exportRenderer.render(scene, exportCamera);

    const link = document.createElement('a');
    const dirName = rotation === 45 ? 'south' : rotation === 135 ? 'west' : rotation === 225 ? 'north' : 'east';
    link.download = `${fileName}_${dirName}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();

    exportRenderer.dispose();
  };

  // Export all 4 directions
  const exportAllDirections = () => {
    const scene = sceneRef.current;
    if (!scene || !hasModel) return;

    const directions = [
      { name: 'south', angle: 45 },
      { name: 'west', angle: 135 },
      { name: 'north', angle: 225 },
      { name: 'east', angle: 315 },
    ];

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = spriteSize;
    exportCanvas.height = spriteSize;

    const exportRenderer = new THREE.WebGLRenderer({
      canvas: exportCanvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true,
    });
    exportRenderer.setSize(spriteSize, spriteSize);
    exportRenderer.setClearColor(0x000000, transparentBg ? 0 : 1);

    const frustumSize = 5 / zoom;
    const exportCamera = new THREE.OrthographicCamera(
      -frustumSize / 2,
      frustumSize / 2,
      frustumSize * (1 - verticalOffset),
      -frustumSize * verticalOffset,
      0.1,
      1000
    );

    const isoAngle = Math.atan(1 / Math.sqrt(2));
    const distance = 10;

    directions.forEach(({ name, angle }) => {
      exportCamera.position.set(
        distance * Math.cos(isoAngle) * Math.sin(THREE.MathUtils.degToRad(angle)),
        distance * Math.sin(isoAngle),
        distance * Math.cos(isoAngle) * Math.cos(THREE.MathUtils.degToRad(angle))
      );
      exportCamera.lookAt(0, 0, 0);

      exportRenderer.render(scene, exportCamera);

      const link = document.createElement('a');
      link.download = `${fileName}_${name}.png`;
      link.href = exportCanvas.toDataURL('image/png');
      link.click();
    });

    exportRenderer.dispose();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">GLB to Isometric Sprite Converter</h1>
        <p className="text-slate-400 mb-8">
          Upload a GLB file and export it as an isometric sprite for the city game.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Preview */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              <canvas ref={canvasRef} width={400} height={400} className="max-w-full max-h-full" />
            </div>
            <p className="text-sm text-slate-500 text-center">
              Preview updates in real-time as you adjust settings
            </p>
          </div>

          {/* Controls */}
          <div className="space-y-5">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload GLB File</label>
              <input
                type="file"
                accept=".glb,.gltf"
                onChange={handleFileUpload}
                className="block w-full text-sm text-slate-400
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-600 file:text-white
                  hover:file:bg-blue-700
                  cursor-pointer"
              />
            </div>

            {/* Sprite Size */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Sprite Size: {spriteSize}px
              </label>
              <div className="flex gap-2">
                {[128, 256, 512].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSpriteSize(size)}
                    className={`px-4 py-2 text-sm rounded ${
                      spriteSize === size
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {size}px
                  </button>
                ))}
              </div>
            </div>

            {/* Zoom */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Zoom: {zoom.toFixed(2)}x <span className="text-slate-400">(smaller = smaller building)</span>
              </label>
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2 mt-2">
                {[0.3, 0.4, 0.5, 0.6].map((z) => (
                  <button
                    key={z}
                    onClick={() => setZoom(z)}
                    className={`px-3 py-1 text-xs rounded ${
                      Math.abs(zoom - z) < 0.01
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {z}x
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Offset */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Vertical Position: {(verticalOffset * 100).toFixed(0)}% <span className="text-slate-400">(50% = at bottom)</span>
              </label>
              <input
                type="range"
                min="0.05"
                max="0.55"
                step="0.01"
                value={verticalOffset}
                onChange={(e) => setVerticalOffset(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex gap-2 mt-2">
                {[0.45, 0.48, 0.5, 0.52].map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerticalOffset(v)}
                    className={`px-3 py-1 text-xs rounded ${
                      Math.abs(verticalOffset - v) < 0.01
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {(v * 100).toFixed(0)}%
                  </button>
                ))}
              </div>
            </div>

            {/* Rotation */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Direction: {rotation === 45 ? 'South' : rotation === 135 ? 'West' : rotation === 225 ? 'North' : 'East'}
              </label>
              <div className="flex gap-2">
                {[
                  { angle: 45, label: 'S' },
                  { angle: 135, label: 'W' },
                  { angle: 225, label: 'N' },
                  { angle: 315, label: 'E' },
                ].map(({ angle, label }) => (
                  <button
                    key={angle}
                    onClick={() => setRotation(angle)}
                    className={`px-4 py-2 text-sm rounded ${
                      rotation === angle
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Buttons */}
            <div className="space-y-3 pt-4">
              <button
                onClick={exportSprite}
                disabled={!hasModel}
                className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export Current View
              </button>
              <button
                onClick={exportAllDirections}
                disabled={!hasModel}
                className="w-full py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Export All 4 Directions
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-slate-800 rounded-lg">
          <h2 className="text-lg font-bold mb-3">Tips for Pogicity-style sprites</h2>
          <ul className="list-disc list-inside space-y-2 text-slate-300">
            <li><strong>Zoom 0.4-0.5</strong> matches typical Pogicity building sizes</li>
            <li><strong>Vertical Position 48-52%</strong> puts building base at canvas bottom (required!)</li>
            <li>The building's bottom edge must touch the bottom of the image or it will "float"</li>
            <li>After export, move PNGs to <code className="bg-slate-700 px-2 py-0.5 rounded text-sm">public/game/pogicity/Building/landmark/</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
