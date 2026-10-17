// Rig for the avatar builder base mesh, used by the sprite bake. It reuses the shipped city avatar's clips
// (gustavAvatarClips.ts): same bone names and hierarchy, joints moved onto the builder mesh. Every rest
// rotation is identity in both rigs, so the clips' local quaternions transfer unchanged; only the pelvis
// position track is rescaled (rig units to this figure's leg length).
//
// Weights are automatic: each vertex goes to its nearest bone segments (distance past the segment's radius,
// soft falloff, two influences), with a few per-piece rules (head pieces follow the head, shoes the feet).
import * as THREE from 'three';
import { AVATAR_CLIP_DATA } from './gustavAvatarClips';

type V3 = [number, number, number];
type BoneDef = { name: string; parent: string | null; at: V3; end: V3; radius: number };

// World positions (wu, y up, front +z) taken from art/avatar-builder/base/build_base.py.
const ARM = Math.sin(THREE.MathUtils.degToRad(15));
const ARM_DOWN = Math.cos(THREE.MathUtils.degToRad(15));
const armAt = (side: number, t: number): V3 => [side * (0.098 + ARM * t), 0.632 - ARM_DOWN * t, 0];

function sideBones(s: 'l' | 'r'): BoneDef[] {
  const k = s === 'l' ? 1 : -1;
  return [
    { name: `clavicle-${s}`, parent: 'chest', at: [k * 0.02, 0.625, 0], end: armAt(k, 0), radius: 0.04 },
    { name: `upper-arm-${s}`, parent: `clavicle-${s}`, at: armAt(k, 0), end: armAt(k, 0.14), radius: 0.036 },
    { name: `forearm-${s}`, parent: `upper-arm-${s}`, at: armAt(k, 0.14), end: armAt(k, 0.255), radius: 0.03 },
    { name: `hand-${s}`, parent: `forearm-${s}`, at: armAt(k, 0.255), end: armAt(k, 0.32), radius: 0.028 },
    { name: `thigh-${s}`, parent: 'pelvis', at: [k * 0.052, 0.36, 0], end: [k * 0.052, 0.205, 0], radius: 0.045 },
    { name: `shin-${s}`, parent: `thigh-${s}`, at: [k * 0.052, 0.205, 0], end: [k * 0.052, 0.075, 0], radius: 0.04 },
    { name: `foot-${s}`, parent: `shin-${s}`, at: [k * 0.052, 0.075, 0], end: [k * 0.052, 0.02, 0.11], radius: 0.035 },
  ];
}

const BONES: BoneDef[] = [
  { name: 'pelvis', parent: null, at: [0, 0.38, 0], end: [0, 0.44, 0], radius: 0.085 },
  { name: 'abdomen', parent: 'pelvis', at: [0, 0.44, 0], end: [0, 0.54, 0], radius: 0.085 },
  { name: 'chest', parent: 'abdomen', at: [0, 0.54, 0], end: [0, 0.665, 0], radius: 0.09 },
  { name: 'neck', parent: 'chest', at: [0, 0.665, -0.004], end: [0, 0.705, -0.004], radius: 0.03 },
  { name: 'head', parent: 'neck', at: [0, 0.705, -0.004], end: [0, 0.9, -0.004], radius: 0.09 },
  ...sideBones('l'),
  ...sideBones('r'),
];

const HEAD_PIECES = new Set(['face', 'hair', 'beanie']);
const FALLOFF_WU = 0.006;

// The shipped rig's rest pelvis and leg length (both in its model units). Its pelvis track moves in those
// units; scaling by leg length keeps the bob and sway in proportion to this figure's stride.
const RIG_PELVIS_REST = new THREE.Vector3(0, -0.02184, 0);
const RIG_LEG = 0.15671 + 0.15297;
const OUR_LEG = 0.36 - 0.075;
const PELVIS_SCALE = OUR_LEG / RIG_LEG;

export type BuilderRig = {
  root: THREE.Group;
  seek: (clipId: string, t: number) => void;
  rest: () => void;
  clipDuration: (clipId: string) => number;
};

function segmentDistance(p: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): number {
  const ab = b.clone().sub(a);
  const t = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / ab.lengthSq(), 0, 1);
  return p.distanceTo(a.clone().addScaledVector(ab, t));
}

function allowed(piece: string, bone: BoneDef, p: THREE.Vector3): boolean {
  if (HEAD_PIECES.has(piece)) return bone.name === 'head';
  if (piece === 'shoes') return bone.name.startsWith('foot') || bone.name.startsWith('shin');
  if (bone.name === 'head') return p.y > 0.68;
  return true;
}

// Takes the loaded base model (loadAvatarBase) and returns a skinned copy driven by the shipped clips.
export function rigAvatarBase(base: THREE.Object3D): BuilderRig {
  const root = new THREE.Group();
  root.name = 'avatar-builder-rig';
  const bones = new Map<string, THREE.Bone>();
  for (const def of BONES) {
    const bone = new THREE.Bone();
    bone.name = def.name;
    const parent = def.parent ? BONES.find((b) => b.name === def.parent)! : null;
    bone.position.set(...def.at);
    if (parent) bone.position.sub(new THREE.Vector3(...parent.at));
    (def.parent ? bones.get(def.parent)! : root).add(bone);
    bones.set(def.name, bone);
  }
  root.updateMatrixWorld(true);
  const order = BONES.map((b) => bones.get(b.name)!);
  const skeleton = new THREE.Skeleton(order);
  const segs = BONES.map((b) => ({ a: new THREE.Vector3(...b.at), b: new THREE.Vector3(...b.end) }));

  base.updateMatrixWorld(true);
  // Each top-level child of the GLB scene is one piece (body, tee, hoodie ...); keep its name on the copy.
  for (const piece of base.children) {
    const holder = new THREE.Group();
    holder.name = piece.name;
    holder.visible = piece.visible;
    piece.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const geometry = mesh.geometry.clone();
      geometry.applyMatrix4(mesh.matrixWorld);
      const pos = geometry.attributes.position;
      const index = new Uint16Array(pos.count * 4);
      const weight = new Float32Array(pos.count * 4);
      const p = new THREE.Vector3();
      for (let i = 0; i < pos.count; i += 1) {
        p.fromBufferAttribute(pos, i);
        const scored = BONES.map((def, bi) => ({
          bi,
          ok: allowed(piece.name, def, p),
          d: Math.max(0, segmentDistance(p, segs[bi].a, segs[bi].b) - def.radius),
        }))
          .filter((s) => s.ok)
          .sort((x, y) => x.d - y.d)
          .slice(0, 2);
        const w = scored.map((s) => Math.exp(-(s.d - scored[0].d) / FALLOFF_WU));
        const sum = w.reduce((a, b) => a + b, 0);
        scored.forEach((s, k) => {
          index[i * 4 + k] = s.bi;
          weight[i * 4 + k] = w[k] / sum;
        });
      }
      geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(index, 4));
      geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weight, 4));
      const skinned = new THREE.SkinnedMesh(geometry, mesh.material);
      skinned.name = mesh.name;
      skinned.frustumCulled = false;
      skinned.bind(skeleton, new THREE.Matrix4());
      holder.add(skinned);
    });
    root.add(holder);
  }

  const pelvisRest = bones.get('pelvis')!.position.clone();
  const clips = new Map<string, THREE.AnimationClip>();
  for (const data of AVATAR_CLIP_DATA) {
    const tracks = data.tracks.map((t) => {
      if (t.name === 'pelvis.position') {
        const values = t.values.map((v, i) => {
          const axis = i % 3;
          const rest = RIG_PELVIS_REST.getComponent(axis);
          return pelvisRest.getComponent(axis) + (v - rest) * PELVIS_SCALE;
        });
        return new THREE.VectorKeyframeTrack(t.name, t.times, values);
      }
      return t.type === 'quaternion'
        ? new THREE.QuaternionKeyframeTrack(t.name, t.times, t.values)
        : new THREE.VectorKeyframeTrack(t.name, t.times, t.values);
    });
    clips.set(data.id, new THREE.AnimationClip(data.id, data.duration, tracks));
  }
  const mixer = new THREE.AnimationMixer(root);

  const rest = () => {
    mixer.stopAllAction();
    for (const def of BONES) {
      const bone = bones.get(def.name)!;
      bone.quaternion.identity();
      bone.position.set(...def.at);
      if (def.parent) bone.position.sub(new THREE.Vector3(...BONES.find((b) => b.name === def.parent)!.at));
    }
    root.updateMatrixWorld(true);
  };

  return {
    root,
    rest,
    clipDuration: (id) => clips.get(id)?.duration ?? 0,
    seek: (id, t) => {
      const clip = clips.get(id);
      if (!clip) throw new Error(`no clip ${id}`);
      rest();
      const action = mixer.clipAction(clip);
      action.play();
      action.paused = true;
      action.time = t;
      mixer.update(0);
      root.updateMatrixWorld(true);
    },
  };
}
