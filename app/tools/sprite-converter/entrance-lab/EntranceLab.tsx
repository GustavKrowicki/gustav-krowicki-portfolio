'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as campus from '@/lib/city/models/legoCampus';
import * as main from '@/lib/city/models/legoHqMainEntrance';
import * as avatarFactory from '@/lib/city/models/gustavAvatar';
import { createGustavAvatar, skinnedBounds, type AvatarRig, type AvatarStage, type AvatarBinding } from '@/lib/city/models/gustavAvatarRig';
import * as avatarHarness from '@/lib/city/models/gustavAvatarHarness';

// Review/test bench for the img2threejs reconstructions (?model=main|campus|avatar|avatar-entrance|avatar-campus, or
// krea = the original GLB served by art/img2threejs/tools/static_cors.py on :8766). Generation sources live in
// art/img2threejs/. The avatar models are in wu (0.9 wu tall); avatar-entrance / avatar-campus put it next to the
// LEGO main entrance / campus models at the same wu scale. Avatar-only options: clip ('idle' | 'walk' |
// 'walk-in-place'), t (seconds), and URL params stage / binding (see gustavAvatarRig.ts).
// One page session renders every view through window.__shoot(name, options), so textures
// load once and every capture shares them:
//   view: 'reference' (front, elevated, framed like the model's aerial crop) | 'iso' (converter camera)
//         | 'sprite' (exactly what /tools/sprite-converter exports: its normalisation, camera and size)
//   zoom / voff: sprite-converter zoom and vertical offset (LEGO HQ sprites: 1.0 / 0.31, 384 px)
//   focusNode: sprite view only, aim the converter camera at this runtime node (zoomed door-moment shots)
//   pitch: sprite view camera pitch in degrees (converter: 35.26 true iso; the 2:1 city grid implies 30)
//   yaw: iso yaw in degrees (45 / -45) · fit: crop iso to the model · elev: reference elevation
//   rig: 'lookdev' (generator rig) | 'photo' (sun placed from the photo's shadows) | 'converter' (sprite converter, transparent bg)
//   bg: hex background for lookdev · stripped: flat base colours · open: 0..1 door slide
//   exposure: lookdev tone-mapping exposure (match the photo's exposure)
//   tone: lookdev tone mapping, 'aces' (generator default) | 'neutral' (keeps saturated product colours, like a photo)

type ModelConfig = {
  name: string;
  create: (options: { castShadow?: boolean; receiveShadow?: boolean }) => THREE.Group;
  lights: (mode: 'reference') => THREE.Object3D;
  environment: (renderer: THREE.WebGLRenderer) => THREE.Texture;
  configure: (renderer: THREE.WebGLRenderer) => void;
  // Sliding leaves: node id -> direction along X, and full travel in model units
  leaves: Record<string, number>;
  travel: number;
  // Reference framing: output size, ortho half-width and look-at target matching the aerial crop
  reference: { width: number; height: number; halfW: number; target: [number, number, number] };
  // Sun position read off the reference photo's cast shadows (for the 'photo' rig)
  sun?: { position: [number, number, number]; intensity: number };
  // Sprite view: normalise from the rest-pose bounds captured at load (animated models must not re-frame per pose)
  restBounds?: boolean;
};

const AVATAR_PARAMS = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    stage: (p.get('stage') as AvatarStage) ?? 'bound',
    binding: (p.get('binding') as AvatarBinding) ?? 'transfer',
    laptop: p.get('laptop') !== '0',
  };
};

// One LEGO plate width W in the main-entrance model is ~5.3 m = 2.65 wu; the campus model is 7 tiles across 1.0 unit.
const ENTRANCE_UNITS_PER_WU = 1 / 2.65;
const CAMPUS_UNITS_PER_WU = 1 / 7;

function avatarScene(kind: 'entrance' | 'campus'): THREE.Group {
  const group = new THREE.Group();
  const building = kind === 'entrance' ? main.createLEGOHQMainEntranceModel({ castShadow: true, receiveShadow: true })
    : campus.createLEGOCampusModel({ castShadow: true, receiveShadow: true });
  const avatar = createGustavAvatar({ ...AVATAR_PARAMS(), castShadow: true });
  const unit = kind === 'entrance' ? ENTRANCE_UNITS_PER_WU : CAMPUS_UNITS_PER_WU;
  avatar.scale.setScalar(unit);
  group.add(building, avatar);
  group.updateMatrixWorld(true);
  if (kind === 'entrance') {
    // Doors at z ~ 1.0 W (vestibule depth); stand on the approach in front of the right-hand leaf, facing the camera.
    avatar.position.set(0.3, 0, 1.25);
  } else {
    // In front of the campus door head, on the ground, 1 wu out along the plate's outward axis.
    const runtime = building.userData.sculptRuntime as { nodes: Record<string, THREE.Object3D> };
    const head = runtime.nodes['door-head'];
    const plate = runtime.nodes['entrance-plate'];
    const at = head.getWorldPosition(new THREE.Vector3());
    const out = plate.localToWorld(new THREE.Vector3(0, 0, -1)).sub(plate.getWorldPosition(new THREE.Vector3())).setY(0).normalize();
    const ground = new THREE.Box3().setFromObject(runtime.nodes['root'] ?? building).min.y;
    const floor = (runtime.nodes['vestibule-floor'] ?? head).getWorldPosition(new THREE.Vector3()).y;
    avatar.position.copy(at.add(out.multiplyScalar(0.6 * unit))).setY(Number.isFinite(floor) ? floor : ground);
    avatar.lookAt(avatar.position.clone().add(out));
  }
  group.userData.avatar = avatar.userData.avatar;
  group.userData.avatarGroup = avatar;
  return group;
}


const MODELS: Record<string, ModelConfig> = {
  // Glass vestibule under the giant yellow 2x4 plate (the real main entrance), 435×510 aerial crop
  main: {
    name: 'LEGO HQ Main Entrance',
    create: main.createLEGOHQMainEntranceModel,
    lights: main.createLEGOHQMainEntranceLookDevLights,
    environment: main.createLEGOHQMainEntranceEnvironment,
    configure: main.configureLEGOHQMainEntranceRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.24,
    reference: { width: 435, height: 510, halfW: 1.243, target: [0.029, 0.911, 0] },
    // Stud shadows in the aerial fall ~0.17 W to the right of 0.1 W studs: sun from the left at ~30 deg,
    // slightly in front of the facade (the plate's front face is lit).
    sun: { position: [-6, 4, 3], intensity: 2.4 },
  },
  // Whole campus rebuilt from the AI Studio image; footprints measured from the Krea GLB plan
  campus: {
    name: 'LEGO Campus',
    create: campus.createLEGOCampusModel,
    lights: campus.createLEGOCampusLookDevLights,
    environment: campus.createLEGOCampusEnvironment,
    configure: campus.configureLEGOCampusRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.24 * 0.04,
    reference: { width: 384, height: 384, halfW: 0.6, target: [0, 0, 0] },
  },
  // Gustav's city avatar (img2threejs + character plugin), 0.9 wu tall, feet on y = 0, facing +Z
  avatar: {
    name: 'Gustav avatar',
    create: (options) => createGustavAvatar({ ...AVATAR_PARAMS(), ...options }),
    lights: avatarFactory.createGustavAvatarLookDevLights,
    environment: avatarFactory.createGustavAvatarEnvironment,
    configure: avatarFactory.configureGustavAvatarRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 300, height: 720, halfW: 0.21, target: [0, 0.45, 0] },
    restBounds: true,
  },
  // The avatar at the LEGO HQ main entrance close-up, same wu scale (doors 0.42 W ~ 1.1 wu)
  'avatar-entrance': {
    name: 'Gustav avatar at the LEGO main entrance',
    create: () => avatarScene('entrance'),
    lights: main.createLEGOHQMainEntranceLookDevLights,
    environment: main.createLEGOHQMainEntranceEnvironment,
    configure: main.configureLEGOHQMainEntranceRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.24,
    reference: { width: 435, height: 510, halfW: 1.243, target: [0.029, 0.911, 0] },
    sun: { position: [-6, 4, 3], intensity: 2.4 },
    restBounds: true,
  },
  // The avatar at the campus model's entrance, same wu scale (the campus is 7 tiles = 1.0 model unit)
  'avatar-campus': {
    name: 'Gustav avatar at the LEGO campus',
    create: () => avatarScene('campus'),
    lights: campus.createLEGOCampusLookDevLights,
    environment: campus.createLEGOCampusEnvironment,
    configure: campus.configureLEGOCampusRenderer,
    leaves: { 'door-leaf-left': -1, 'door-leaf-right': 1 },
    travel: 0.24 * 0.04,
    reference: { width: 384, height: 384, halfW: 0.6, target: [0, 0, 0] },
    restBounds: true,
  },
  // The original Krea GLB behind the old sprites, served locally (only used to check 'sprite' parity)
  krea: {
    name: 'LEGO HQ (Krea GLB)',
    create: () => {
      const group = new THREE.Group();
      new GLTFLoader().load('http://localhost:8766/lego-hq-krea.glb', (gltf) => {
        group.add(gltf.scene);
        (window as Window & { __glbReady?: boolean }).__glbReady = true;
      });
      return group;
    },
    lights: campus.createLEGOCampusLookDevLights,
    environment: campus.createLEGOCampusEnvironment,
    configure: campus.configureLEGOCampusRenderer,
    leaves: {},
    travel: 0,
    reference: { width: 384, height: 384, halfW: 0.6, target: [0, 0, 0] },
  },
};

export type ShotOptions = {
  view?: 'reference' | 'iso' | 'sprite';
  zoom?: number;
  voff?: number;
  focusNode?: string;
  pitch?: number;
  yaw?: number;
  fit?: boolean;
  elev?: number;
  rig?: 'lookdev' | 'photo' | 'converter';
  bg?: string;
  stripped?: boolean;
  open?: number;
  size?: number;
  exposure?: number;
  tone?: 'aces' | 'neutral';
  clip?: string;
  t?: number;
  spin?: number; // turntable: model yaw in degrees (reference / sprite views)
  follow?: boolean; // reference view: keep the avatar's hips over the origin (root-motion clips)
};

type Runtime = { nodes: Record<string, THREE.Object3D> };
type LabWindow = Window & {
  __texturesReady?: boolean;
  __shoot?: (name: string, options?: ShotOptions) => Promise<unknown>;
  __apply?: (options?: ShotOptions) => void;
};

function initialOptions(): ShotOptions {
  const p = new URLSearchParams(window.location.search);
  return {
    view: (p.get('view') as ShotOptions['view']) ?? 'reference',
    yaw: Number(p.get('yaw') ?? 45),
    fit: p.get('fit') === '1',
    elev: Number(p.get('elev') ?? 30),
    rig: (p.get('rig') as ShotOptions['rig']) ?? (p.get('view') === 'iso' ? 'converter' : 'lookdev'),
    bg: p.get('bg') ?? '6f6d64',
    stripped: p.get('stripped') === '1',
    open: Number(p.get('open') ?? 0),
    exposure: p.has('exposure') ? Number(p.get('exposure')) : undefined,
    tone: (p.get('tone') as ShotOptions['tone']) ?? undefined,
  };
}

export default function EntranceLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [initial] = useState(initialOptions);
  const [config] = useState(() => MODELS[new URLSearchParams(window.location.search).get('model') ?? 'main'] ?? MODELS.main);
  const [open, setOpen] = useState(initial.open ?? 0);
  const applyRef = useRef<(o: ShotOptions) => void>(() => {});
  const [label, setLabel] = useState(`${initial.view} · ${initial.rig}`);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const w = window as LabWindow;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(1);
    renderer.shadowMap.enabled = true;
    const scene = new THREE.Scene();

    // Two light rigs in one scene; only one is visible per shot.
    config.configure(renderer);
    const lookdevTone = { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure };
    const environment = config.environment(renderer);
    const lookdev = config.lights('reference');
    const converter = new THREE.Group();
    converter.add(new THREE.AmbientLight(0xffffff, 0.6));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(5, 10, 5);
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-5, 5, -5);
    converter.add(key, fill);
    const photo = new THREE.Group();
    photo.add(new THREE.HemisphereLight(0xdfe8ff, 0x6b6455, 0.6));
    if (config.sun) {
      const sun = new THREE.DirectionalLight(0xfff6e8, config.sun.intensity);
      sun.position.set(...config.sun.position);
      sun.castShadow = true;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.normalBias = 0.02;
      sun.shadow.radius = 2;
      Object.assign(sun.shadow.camera, { left: -2.5, right: 2.5, top: 2.5, bottom: -2.5, near: 0.5, far: 30 });
      sun.shadow.camera.updateProjectionMatrix();
      photo.add(sun);
    }
    scene.add(lookdev, photo, converter);

    const model = config.create({ castShadow: true, receiveShadow: true });
    scene.add(model);
    const runtime = model.userData.sculptRuntime as Runtime;
    const restX: Record<string, number> = {};
    for (const id of Object.keys(config.leaves)) {
      const node = runtime?.nodes?.[id];
      if (node) restX[id] = node.position.x;
    }
    const original = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
    const flat = new Map<THREE.Mesh, THREE.Material>();
    model.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      original.set(mesh, mesh.material);
      const src = mesh.material as THREE.MeshStandardMaterial;
      flat.set(mesh, new THREE.MeshBasicMaterial({ color: src.color ?? new THREE.Color(0x888888) }));
    });
    const avatar = model.userData.avatar as AvatarRig | undefined;
    const box = new THREE.Box3().setFromObject(model);
    // Rest-pose bounds in the model's parent frame (skinned vertices, so a posed frame never re-frames the sprite)
    const restBox = config.restBounds
      ? (avatar && !model.userData.avatarGroup ? skinnedBounds(model).applyMatrix4(model.matrix) : box.clone())
      : null;
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);

    const apply = (o: ShotOptions) => {
      const opts = { ...initial, ...o };
      // Lights, tone mapping, background
      const isConverter = opts.rig === 'converter';
      lookdev.visible = opts.rig === 'lookdev';
      photo.visible = opts.rig === 'photo';
      converter.visible = isConverter;
      scene.environment = isConverter ? null : environment;
      renderer.toneMapping = isConverter
        ? THREE.NoToneMapping
        : opts.tone === 'neutral' ? THREE.NeutralToneMapping : opts.tone === 'aces' ? THREE.ACESFilmicToneMapping : lookdevTone.toneMapping;
      renderer.toneMappingExposure = isConverter ? 1 : (opts.exposure ?? lookdevTone.exposure);
      if (isConverter) renderer.setClearColor(0x000000, 0);
      else renderer.setClearColor(new THREE.Color(`#${opts.bg}`), 1);
      // Materials
      for (const [mesh, mat] of original) mesh.material = opts.stripped ? flat.get(mesh)! : mat;
      // Doors
      for (const [id, dir] of Object.entries(config.leaves)) {
        const node = runtime?.nodes?.[id];
        if (node) node.position.x = restX[id] + dir * config.travel * (opts.open ?? 0);
      }
      // Converter normalisation applies only to the 'sprite' view
      model.position.set(0, 0, 0);
      model.scale.set(1, 1, 1);
      model.rotation.set(0, THREE.MathUtils.degToRad(opts.spin ?? 0), 0);
      // Avatar pose: a clip at time t, or the bind pose
      if (avatar) {
        if (opts.clip) avatar.seek(opts.clip, opts.t ?? 0);
        else avatar.rest();
        if (opts.follow) {
          model.updateMatrixWorld(true);
          const hip = avatar.bones.pelvis.getWorldPosition(new THREE.Vector3());
          model.position.x -= hip.x;
          model.position.z -= hip.z;
        }
      }
      // Camera
      if (opts.view === 'sprite') {
        // Same maths as /tools/sprite-converter: base at y = 0 via an UNscaled offset, then
        // scale to 3 / maxDim; ortho frustum 5 / zoom split by the vertical offset; iso camera
        // at distance 10 looking at the origin; square output.
        model.updateMatrixWorld(true);
        const b = restBox ? restBox.clone() : new THREE.Box3().setFromObject(model);
        const centre = b.getCenter(new THREE.Vector3());
        // The avatar's own origin is already the ground point between its feet: keep it as the sprite anchor
        if (avatar && !model.userData.avatarGroup) centre.set(0, centre.y, 0);
        const size = b.getSize(new THREE.Vector3());
        model.position.set(-centre.x, -b.min.y, -centre.z);
        model.scale.setScalar(3 / Math.max(size.x, size.y, size.z));
        const frustum = 5 / (opts.zoom ?? 1);
        const voff = opts.voff ?? 0.31;
        camera.left = -frustum / 2; camera.right = frustum / 2;
        camera.top = frustum * (1 - voff); camera.bottom = -frustum * voff;
        const iso = opts.pitch !== undefined ? THREE.MathUtils.degToRad(opts.pitch) : Math.atan(1 / Math.sqrt(2));
        const yaw = THREE.MathUtils.degToRad(opts.yaw ?? 45);
        const focus = new THREE.Vector3();
        const focusNode = opts.focusNode ? runtime?.nodes?.[opts.focusNode] : undefined;
        if (focusNode) {
          // Aim at the part's bounding-box centre (extruded parts share the model origin as their pivot)
          model.updateMatrixWorld(true);
          new THREE.Box3().setFromObject(focusNode).getCenter(focus);
        }
        camera.position.set(focus.x + 10 * Math.cos(iso) * Math.sin(yaw), focus.y + 10 * Math.sin(iso), focus.z + 10 * Math.cos(iso) * Math.cos(yaw));
        camera.lookAt(focus);
        renderer.setSize(opts.size ?? 384, opts.size ?? 384, false);
      } else if (opts.view === 'iso') {
        const size = box.getSize(new THREE.Vector3());
        const centre = box.getCenter(new THREE.Vector3());
        const half = Math.max(size.x, size.z) * 0.62;
        const iso = Math.atan(1 / Math.sqrt(2));
        const yaw = THREE.MathUtils.degToRad(opts.yaw ?? 45);
        camera.position.set(centre.x + 40 * Math.cos(iso) * Math.sin(yaw), centre.y + 40 * Math.sin(iso), centre.z + 40 * Math.cos(iso) * Math.cos(yaw));
        camera.lookAt(centre);
        camera.left = -half; camera.right = half; camera.top = half; camera.bottom = -half;
        let width = opts.size ?? 512, height = opts.size ?? 512;
        if (opts.fit) {
          // Crop the frustum to the model's projected bounds so area-based gate checks compare
          // like with like (a long wall in a square frame reads as a false collapse).
          camera.updateMatrixWorld();
          const local = [0, 1].flatMap((i) => [0, 1].flatMap((j) => [0, 1].map((k) => new THREE.Vector3(
            i ? box.max.x : box.min.x, j ? box.max.y : box.min.y, k ? box.max.z : box.min.z,
          ).applyMatrix4(camera.matrixWorldInverse))));
          const xs = local.map((v) => v.x), ys = local.map((v) => v.y);
          const m = 0.04 * (Math.max(...xs) - Math.min(...xs));
          camera.left = Math.min(...xs) - m; camera.right = Math.max(...xs) + m;
          camera.bottom = Math.min(...ys) - m; camera.top = Math.max(...ys) + m;
          width = 1024;
          height = Math.round(width * (camera.top - camera.bottom) / (camera.right - camera.left));
        }
        renderer.setSize(width, height, false);
      } else {
        const { width, height, halfW } = config.reference;
        camera.left = -halfW; camera.right = halfW; camera.top = halfW * height / width; camera.bottom = -halfW * height / width;
        const elev = THREE.MathUtils.degToRad(opts.elev ?? 30);
        const target = new THREE.Vector3(...config.reference.target);
        camera.position.set(target.x, target.y + 40 * Math.sin(elev), target.z + 40 * Math.cos(elev));
        camera.lookAt(target);
        renderer.setSize(width, height, false);
      }
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      setLabel(`${opts.view} · ${opts.rig}${opts.stripped ? ' · stripped' : ''} · open ${(opts.open ?? 0).toFixed(2)}`);
    };
    applyRef.current = apply;

    let current: ShotOptions = {};
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      renderer.render(scene, camera);
    };
    apply(current);
    loop();

    w.__texturesReady = false;
    THREE.DefaultLoadingManager.onLoad = () => {
      w.__texturesReady = true;
    };
    w.__apply = (o: ShotOptions = {}) => {
      current = o;
      apply(o);
    };
    (w as LabWindow & { __stats?: () => unknown }).__stats = () => {
      let triangles = 0, meshes = 0;
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        meshes += 1;
        const g = mesh.geometry;
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
      });
      renderer.render(scene, camera);
      return { triangles: Math.round(triangles), meshes, drawCalls: renderer.info.render.calls, textures: renderer.info.memory.textures };
    };
    (w as LabWindow & { __parts?: () => unknown }).__parts = () => {
      // Parts manifest for img2threejs check_part_coverage.py: one entry per named component mesh
      const parts: { name: string; id: string; kind: string; triangles: number }[] = [];
      let unnamedMeshes = 0;
      model.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const comp = mesh.userData.sculptComponent as { id?: string; name?: string } | undefined;
        const g = mesh.geometry;
        const triangles = Math.round((g.index ? g.index.count : g.attributes.position.count) / 3);
        if (comp?.name) parts.push({ name: comp.name, id: comp.id ?? '', kind: 'part', triangles });
        else unnamedMeshes += 1;
      });
      return { model: config.name, parts, unnamedMeshes };
    };
    // Debug handle for probing the scene from the browser console
    (w as LabWindow & { __scene?: unknown }).__scene = { scene, model, renderer, lookdev, photo, converter, camera };
    // Render one shot and hand back the PNG directly (capture scripts; no receiver needed)
    (w as LabWindow & { __render?: unknown }).__render = (o: ShotOptions = {}) => {
      current = o;
      apply(o);
      renderer.render(scene, camera);
      return canvas.toDataURL('image/png');
    };
    if (avatar) {
      const target = (model.userData.avatarGroup as THREE.Object3D | undefined) ?? model;
      (w as LabWindow & { __avatarHarness?: unknown }).__avatarHarness = {
        meshBuffers: () => avatarHarness.meshBuffers(avatar.model),
        sampleClips: (n?: number) => avatarHarness.sampleClips(target, n),
        bindingSamples: (n?: number) => avatarHarness.bindingSamples(target, n),
        deformation: () => avatarHarness.deformation(target),
        bindRestore: () => avatarHarness.bindRestore(target),
        meshVisibility: () => avatarHarness.meshVisibility(target),
        chainAnchors: () => avatarHarness.chainAnchors(target),
        binding: () => avatarHarness.binding(target),
        stats: () => avatarHarness.stats(target),
        hairGeometry: () => avatarHarness.hairGeometry(target),
      };
    }
    (w as LabWindow & { __labReady?: boolean }).__labReady = true;
    w.__shoot = async (name: string, o: ShotOptions = {}) => {
      current = o;
      apply(o);
      // Render synchronously: a hidden pane throttles requestAnimationFrame.
      renderer.render(scene, camera);
      const res = await fetch('http://localhost:8765/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dataUrl: canvas.toDataURL('image/png'), meta: { ...initial, ...o } }),
      });
      return res.json();
    };

    return () => {
      cancelAnimationFrame(raf);
      renderer.dispose();
    };
  }, [initial, config]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6 space-y-4">
      <h1 className="text-xl font-bold">{config.name} lab · {label}</h1>
      <canvas ref={canvasRef} className="max-w-full border border-slate-700" style={{ imageRendering: 'pixelated' }} />
      <label className="block text-sm">
        Doors open: {open.toFixed(2)}
        <input
          type="range" min="0" max="1" step="0.05" value={open}
          onChange={(e) => {
            const v = Number(e.target.value);
            setOpen(v);
            applyRef.current({ open: v });
          }}
          className="w-full"
        />
      </label>
    </div>
  );
}
