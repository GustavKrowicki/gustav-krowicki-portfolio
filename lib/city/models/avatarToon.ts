// Avatar builder toon look: ONE camera, light and material setup shared by the builder view (600 px)
// and the street-zoom sprite bake (33 x 62 px frame). Nothing here is view specific except the target
// size and the outline width, so the two can never drift apart.
//
// Look: two-step ramp (lit and shade only), one fixed studio light, orthographic camera at the city
// pitch, and a dark outline (#14100e, the Pogicity sprite line colour) drawn in a post pass: around
// the silhouette and wherever a nearer part overlaps a farther one (arm over torso, leg over leg).
// Base mesh: art/avatar-builder/base/ (Blender script), served as public/game/pogicity/Characters/avatar-builder/base.glb.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const AVATAR_BASE_GLB = '/game/pogicity/Characters/avatar-builder/base.glb';

export const AVATAR_TOON = {
  outline: '#14100e',
  // Shade = flat colour x shadeFactor, tinted a touch cool so whites read as cloth, not grey.
  shadeFactor: 0.66,
  shadeTint: '#cfd6f4',
  // dot(N, L) above this is lit. Low enough that the front faces read lit, the far side shaded.
  threshold: 0.32,
  // Fixed studio light (world space; the camera never moves, the model turns): upper left, in front.
  lightDir: new THREE.Vector3(-0.6, 0.6, 0.52).normalize(),
  // City camera: ortho, 30 degree pitch (same as the shipped avatar3d sheets).
  pitchDeg: 30,
  // Street zoom: 0.9 wu figure = 54 px, frame 33 x 62, feet 4 px above the frame bottom.
  sprite: { width: 33, height: 62, pxPerWu: 60, footPx: 4, outlinePx: 1 },
  // Depth gap (wu) that counts as an overlap edge for the inner outline.
  depthEdgeWu: 0.035,
} as const;

// Base outfit flat colours, keyed by the GLB material names (sRGB hex).
export const AVATAR_BASE_COLORS: Record<string, string> = {
  skin: '#f0c3a0',
  hair: '#c4602a',
  moustache: '#d48a5c',
  eye: '#2a1d18',
  tee: '#f5f2ea',
  denim: '#223680',
  cuff: '#5274bd',
  shoe: '#1e1a1a',
  welt: '#e6c13a',
  sole: '#141212',
  hoodie: '#6e6e73',
  'hoodie-pocket': '#5f5f64',
  string: '#e9e7e1',
  beanie: '#dca528',
  'beanie-cuff': '#c8941f',
  sweater: '#3c5a46',
  'sweater-rib': '#253a2c',
  'club-white': '#fafafa',
  'club-blue': '#0046a0',
  cargo: '#968769',
  'cargo-dark': '#6c5f47',
};

// Swappable pieces in the GLB (node names): one piece per slot, and the base pieces each one covers.
export const AVATAR_PIECES = {
  hoodie: { slot: 'top', covers: ['tee'] },
  sweater: { slot: 'top', covers: ['tee'] },
  clubShirt: { slot: 'top', covers: ['tee'] }, // the football club shirt
  beanie: { slot: 'head', covers: [] },
  cargo: { slot: 'legs', covers: ['jeans'] },
} as const satisfies Record<string, { slot: string; covers: readonly string[] }>;
export type AvatarPiece = keyof typeof AVATAR_PIECES;

// Shows the worn pieces (the last one wins within a slot), hides every other optional piece and
// whatever the worn ones cover.
export function applyOutfit(model: THREE.Object3D, worn: AvatarPiece[]): AvatarPiece[] {
  const bySlot = new Map<string, AvatarPiece>();
  for (const piece of worn) bySlot.set(AVATAR_PIECES[piece].slot, piece);
  const kept = [...bySlot.values()];
  const hidden = new Set<string>();
  for (const piece of Object.keys(AVATAR_PIECES) as AvatarPiece[]) {
    if (kept.includes(piece)) AVATAR_PIECES[piece].covers.forEach((n) => hidden.add(n));
    else hidden.add(piece);
  }
  for (const child of model.children) child.visible = !hidden.has(child.name);
  return kept;
}

const toonVertex = /* glsl */ `
  #include <common>
  #include <skinning_pars_vertex>
  varying vec3 vNormalW;
  void main() {
    #include <beginnormal_vertex>
    #include <skinbase_vertex>
    #include <skinnormal_vertex>
    #include <begin_vertex>
    #include <skinning_vertex>
    vNormalW = normalize(mat3(modelMatrix) * objectNormal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const toonFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uShade;
  uniform vec3 uLightDir;
  uniform float uThreshold;
  varying vec3 vNormalW;
  void main() {
    float lit = step(uThreshold, dot(normalize(vNormalW), uLightDir));
    gl_FragColor = vec4(mix(uShade, uColor, lit), 1.0);
    #include <colorspace_fragment>
  }
`;

export function createToonMaterial(hex: string): THREE.ShaderMaterial {
  const color = new THREE.Color(hex);
  const shade = color.clone().multiply(new THREE.Color(AVATAR_TOON.shadeTint)).multiplyScalar(AVATAR_TOON.shadeFactor);
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color },
      uShade: { value: shade },
      uLightDir: { value: AVATAR_TOON.lightDir.clone() },
      uThreshold: { value: AVATAR_TOON.threshold },
    },
    vertexShader: toonVertex,
    fragmentShader: toonFragment,
  });
}

// Depth pass: linear view depth in r (ortho, so gl_FragCoord.z is already linear), coverage in a.
const depthMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: /* glsl */ `
      #include <common>
      #include <skinning_pars_vertex>
      void main() {
        #include <skinbase_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
      }`,
    fragmentShader: /* glsl */ `void main() { gl_FragColor = vec4(gl_FragCoord.z, 0.0, 0.0, 1.0); }`,
  });

const outlineMaterial = () =>
  new THREE.ShaderMaterial({
    uniforms: {
      tColor: { value: null },
      tDepth: { value: null },
      uTexel: { value: new THREE.Vector2() },
      uRadius: { value: 1 },
      uDepthEdge: { value: 0.01 },
      uOutline: { value: new THREE.Color(AVATAR_TOON.outline) },
    },
    vertexShader: /* glsl */ `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tColor;
      uniform sampler2D tDepth;
      uniform vec2 uTexel;
      uniform int uRadius;
      uniform float uDepthEdge;
      uniform vec3 uOutline;
      varying vec2 vUv;
      void main() {
        vec4 c = texture2D(tColor, vUv);
        vec4 d = texture2D(tDepth, vUv);
        bool covered = d.a > 0.5;
        bool edge = false;
        for (int y = -4; y <= 4; y++) {
          for (int x = -4; x <= 4; x++) {
            if (abs(x) > uRadius || abs(y) > uRadius || (x == 0 && y == 0)) continue;
            if (float(x * x + y * y) > float(uRadius * uRadius) + 0.5) continue;
            vec4 n = texture2D(tDepth, vUv + vec2(float(x), float(y)) * uTexel);
            if (n.a < 0.5) continue;
            // Outside the figure next to it: silhouette line. Inside: this pixel is the FAR side of
            // an overlap, so the line lands on the part behind and the nearer part keeps its shape.
            if (!covered || n.r < d.r - uDepthEdge) edge = true;
          }
        }
        gl_FragColor = edge ? vec4(uOutline, 1.0) : (covered ? c : vec4(0.0));
        #include <colorspace_fragment>
      }`,
    transparent: true,
  });

export type ToonView = {
  width: number;
  height: number;
  pxPerWu: number;
  footPx: number; // ground point under the feet, px above the bottom edge
  outlinePx: number;
  yawDeg?: number; // 0 = facing the camera
};

export function builderView(height = 600): ToonView {
  const k = height / AVATAR_TOON.sprite.height;
  const s = AVATAR_TOON.sprite;
  return {
    width: Math.round(s.width * k),
    height,
    pxPerWu: s.pxPerWu * k,
    footPx: s.footPx * k,
    outlinePx: Math.max(1, Math.round(k * s.outlinePx * 0.4)),
  };
}

export function spriteView(): ToonView {
  return { ...AVATAR_TOON.sprite };
}

// Ortho camera at the city pitch, framed so the ground point under the feet sits footPx above the
// bottom edge at the horizontal centre, at pxPerWu screen pixels per world unit.
export function createToonCamera(view: ToonView): THREE.OrthographicCamera {
  const halfW = view.width / 2 / view.pxPerWu;
  const halfH = view.height / 2 / view.pxPerWu;
  const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.1, 50);
  const pitch = THREE.MathUtils.degToRad(AVATAR_TOON.pitchDeg);
  const dist = 10;
  // Screen-space offset from the ground point to the frame centre, along the camera's up vector.
  const up = (view.height / 2 - view.footPx) / view.pxPerWu;
  // Camera up vector at this pitch is (0, cos, -sin); move the look target along it.
  const target = new THREE.Vector3(0, up * Math.cos(pitch), -up * Math.sin(pitch));
  cam.position.set(target.x, target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(pitch));
  cam.lookAt(target);
  cam.updateProjectionMatrix();
  return cam;
}

export async function loadAvatarBase(url = AVATAR_BASE_GLB): Promise<THREE.Group> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  const cache = new Map<string, THREE.ShaderMaterial>();
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (m: THREE.Material) => {
      const name = m.name;
      if (!cache.has(name)) cache.set(name, createToonMaterial(AVATAR_BASE_COLORS[name] ?? '#ff00ff'));
      return cache.get(name)!;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return model;
}

// Renders one toon frame of `model` into the renderer's canvas (sized to the view). Three passes:
// colour, depth, then the outline composite. Antialiasing is off on purpose: hard pixels at 33 x 62.
export class ToonRenderer {
  readonly renderer: THREE.WebGLRenderer;
  private colorRT = new THREE.WebGLRenderTarget(1, 1, { magFilter: THREE.NearestFilter, minFilter: THREE.NearestFilter });
  private depthRT = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.FloatType,
    magFilter: THREE.NearestFilter,
    minFilter: THREE.NearestFilter,
  });
  private depthMat = depthMaterial();
  private outlineMat = outlineMaterial();
  private quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.outlineMat);
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

  constructor(canvas?: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x000000, 0);
    this.quadScene.add(this.quad);
    this.quad.frustumCulled = false;
  }

  render(model: THREE.Object3D, view: ToonView) {
    const { renderer } = this;
    renderer.setSize(view.width, view.height, false);
    this.colorRT.setSize(view.width, view.height);
    this.depthRT.setSize(view.width, view.height);
    const cam = createToonCamera(view);
    const scene = new THREE.Scene();
    const pivot = new THREE.Group();
    pivot.rotation.y = THREE.MathUtils.degToRad(view.yawDeg ?? 0);
    const parent = model.parent;
    pivot.add(model);
    scene.add(pivot);

    renderer.setRenderTarget(this.colorRT);
    renderer.clear();
    renderer.render(scene, cam);

    scene.overrideMaterial = this.depthMat;
    renderer.setRenderTarget(this.depthRT);
    renderer.clear();
    renderer.render(scene, cam);
    scene.overrideMaterial = null;

    const u = this.outlineMat.uniforms;
    u.tColor.value = this.colorRT.texture;
    u.tDepth.value = this.depthRT.texture;
    u.uTexel.value.set(1 / view.width, 1 / view.height);
    u.uRadius.value = view.outlinePx;
    // Ortho depth buffer is linear over [near, far].
    u.uDepthEdge.value = AVATAR_TOON.depthEdgeWu / (cam.far - cam.near);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCam);

    if (parent) parent.add(model);
    else pivot.remove(model);
  }
}
