// Browser-side measurement harness for the img2 character plugin's rig gate (G1-G12). It only MEASURES the
// real three.js rig; the verdicts come from the plugin's Python gate (tools/gate_rigging.py). Used by the
// entrance lab (?model=avatar) through window.__avatarHarness, driven by art/img2threejs/gustav-avatar/capture.mjs.
import * as THREE from 'three';
import type { AvatarRig } from './gustavAvatarRig';
import { runGateR1 } from './gustavAvatarRuntime';

const LANDMARKS: Record<string, string> = {
  hip: 'pelvis', head: 'head', 'hand.l': 'hand-l', 'hand.r': 'hand-r', 'foot.l': 'foot-l', 'foot.r': 'foot-r',
};

function visible(object: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

function meshesOf(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh && visible(mesh)) out.push(mesh);
  });
  return out;
}

function meshName(mesh: THREE.Mesh): string {
  const id = (mesh.userData.sculptComponent as { id?: string } | undefined)?.id;
  return id ?? mesh.name;
}

const round = (x: number) => Math.round(x * 1e9) / 1e9;

// Geometry buffers for rig_mesh_parity (freeze before binding, verify after). Raw buffer values, no rounding.
export function meshBuffers(root: THREE.Object3D) {
  return {
    meshes: meshesOf(root).map((mesh) => {
      const g = mesh.geometry;
      const attributes: Record<string, number[]> = {};
      for (const key of ['position', 'normal', 'uv', 'skinIndex', 'skinWeight']) {
        const a = g.getAttribute(key);
        if (a) attributes[key] = Array.from(a.array as ArrayLike<number>);
      }
      return { name: meshName(mesh), attributes, index: g.index ? Array.from(g.index.array) : null };
    }),
  };
}

// Seek without letting a LoopRepeat action wrap t = duration back to 0 (which would make poseReturn 0 by
// construction): the sampled clip is evaluated as LoopOnce + clamp, through the same mixer and bindings.
function seekExact(avatar: AvatarRig, clipId: string, t: number): void {
  const controller = avatar.controller!;
  controller.play(clipId);
  const action = controller.getAction(clipId)!;
  action.setLoop(THREE.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.paused = true;
  action.time = t;
  controller.mixer.update(0);
  controller.root.updateMatrixWorld(true);
}

// The authored world frame is the avatar's outer group (wu, feet on y = 0, facing +Z).
function worldOf(object: THREE.Object3D, outer: THREE.Object3D): number[] {
  const p = new THREE.Vector3();
  object.getWorldPosition(p);
  const inv = new THREE.Matrix4().copy(outer.matrixWorld).invert();
  p.applyMatrix4(inv);
  return [round(p.x), round(p.y), round(p.z)];
}

// Sampled-clip payload (CONTRACT_1.5.2): N evenly spaced times INCLUDING t = duration, world landmark
// positions, per-sample joint scale delta, and poseReturn measured on the joint transforms.
export function sampleClips(outer: THREE.Object3D, samples = 25) {
  const avatar = outer.userData.avatar as AvatarRig;
  const clips = avatar.clipData.map((data) => {
    const times = Array.from({ length: samples }, (_, i) => round((data.duration * i) / (samples - 1)));
    const landmarkPositions: Record<string, number[][]> = {};
    for (const name of Object.keys(LANDMARKS)) landmarkPositions[name] = [];
    const jointScaleDelta: number[] = [];
    const firstQ: Record<string, THREE.Quaternion> = {};
    const firstP: Record<string, THREE.Vector3> = {};
    let poseReturnDeg = 0;
    let rootReturn = 0;
    times.forEach((t, i) => {
      seekExact(avatar, data.id, t);
      for (const [name, boneId] of Object.entries(LANDMARKS)) {
        landmarkPositions[name].push(worldOf(avatar.bones[boneId], outer));
      }
      let scaleDelta = 0;
      for (const id of avatar.boneOrder) {
        const b = avatar.bones[id];
        scaleDelta = Math.max(scaleDelta, Math.abs(b.scale.x - 1), Math.abs(b.scale.y - 1), Math.abs(b.scale.z - 1));
        if (i === 0) { firstQ[id] = b.quaternion.clone(); firstP[id] = b.position.clone(); }
        if (i === times.length - 1) {
          poseReturnDeg = Math.max(poseReturnDeg, THREE.MathUtils.radToDeg(b.quaternion.angleTo(firstQ[id])));
          if (id !== 'pelvis') rootReturn = Math.max(rootReturn, b.position.distanceTo(firstP[id]));
        }
      }
      jointScaleDelta.push(scaleDelta);
    });
    avatar.rest();
    return {
      sourceName: data.id, duration: data.duration, sampleTimes: times, landmarkPositions, jointScaleDelta,
      poseReturn: round(poseReturnDeg), poseReturnUnits: 'degrees, max over joints, t=0 vs t=duration',
      nonRootTranslationReturn: round(rootReturn),
      ...(data.stance ? { stance: data.stance } : {}),
    };
  });
  return { figureHeight: avatar.heightWu, landmarks: Object.keys(LANDMARKS), clips };
}

// G1: the plugin runtime's own Gate R1 harness (seek, then compare every node against its interpolant).
export function bindingSamples(outer: THREE.Object3D, samples = 7) {
  const avatar = outer.userData.avatar as AvatarRig;
  if (!avatar.controller) return null;
  const results = runGateR1(avatar.controller, avatar.clips, samples);
  avatar.rest();
  const clips: Record<string, { sampleCount: number; maxSampledBindingDelta: number }> = {};
  let max = 0;
  for (const r of results) {
    clips[r.clipId] = { sampleCount: r.sampleTimes.length, maxSampledBindingDelta: r.maxSampledBindingDelta };
    max = Math.max(max, r.maxSampledBindingDelta);
  }
  return { maxSampledBindingDelta: max, clips };
}

// G2: applyBoneTransform on every vertex of every visible skinned mesh, at 5 times per clip.
export function deformation(outer: THREE.Object3D) {
  const avatar = outer.userData.avatar as AvatarRig;
  const meshes = meshesOf(avatar.model).filter((m) => (m as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh[];
  const per: Record<string, { frames: number; verticesPerFrame: number[] }> = {};
  for (const m of meshes) per[meshName(m)] = { frames: 0, verticesPerFrame: [] };
  let nonFinite = 0;
  const v = new THREE.Vector3();
  for (const data of avatar.clipData) {
    for (let i = 0; i < 5; i++) {
      avatar.seek(data.id, (data.duration * i) / 4);
      for (const m of meshes) {
        const pos = m.geometry.getAttribute('position');
        for (let k = 0; k < pos.count; k++) {
          v.fromBufferAttribute(pos, k);
          m.applyBoneTransform(k, v);
          if (!Number.isFinite(v.x) || !Number.isFinite(v.y) || !Number.isFinite(v.z)) nonFinite += 1;
        }
        per[meshName(m)].frames += 1;
        per[meshName(m)].verticesPerFrame.push(pos.count);
      }
    }
  }
  avatar.rest();
  return { nonFiniteCount: nonFinite, allFinite: nonFinite === 0, meshes: per };
}

// G3: play each clip part-way, stop(), then compare every node with the pose captured before any clip ran.
export function bindRestore(outer: THREE.Object3D) {
  const avatar = outer.userData.avatar as AvatarRig;
  const controller = avatar.controller;
  if (!controller) return null;
  const before = new Map<THREE.Object3D, { p: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 }>();
  avatar.model.traverse((o) => before.set(o, { p: o.position.clone(), q: o.quaternion.clone(), s: o.scale.clone() }));
  let max = 0;
  for (const data of avatar.clipData) {
    controller.play(data.id);
    controller.advance(data.duration * 0.37);
    controller.stop();
    for (const [o, ref] of before) {
      max = Math.max(max,
        Math.abs(o.position.x - ref.p.x), Math.abs(o.position.y - ref.p.y), Math.abs(o.position.z - ref.p.z),
        Math.abs(o.quaternion.x - ref.q.x), Math.abs(o.quaternion.y - ref.q.y), Math.abs(o.quaternion.z - ref.q.z),
        Math.abs(o.quaternion.w - ref.q.w),
        Math.abs(o.scale.x - ref.s.x), Math.abs(o.scale.y - ref.s.y), Math.abs(o.scale.z - ref.s.z));
    }
  }
  outer.updateMatrixWorld(true);
  return { maxBindRestoreDelta: max, clips: avatar.clipData.map((c) => c.id) };
}

// G6: visible meshes vs visible skinned meshes, walked over the whole avatar.
export function meshVisibility(outer: THREE.Object3D) {
  const meshes = meshesOf(outer);
  const skinned = meshes.filter((m) => (m as THREE.SkinnedMesh).isSkinnedMesh && (m as THREE.SkinnedMesh).skeleton);
  return {
    visibleMeshCount: meshes.length,
    visibleSkinnedMeshCount: skinned.length,
    unboundMeshes: meshes.filter((m) => !skinned.includes(m)).map(meshName),
  };
}

// G7: the joint hierarchy (rest local positions) plus the side labels the bone names claim.
export function chainAnchors(outer: THREE.Object3D) {
  const avatar = outer.userData.avatar as AvatarRig;
  avatar.rest();
  const joints = avatar.boneOrder.map((id) => {
    const b = avatar.bones[id];
    const parent = b.parent && (b.parent as THREE.Bone).isBone ? b.parent.name : null;
    return { id, parent, localPosition: b.position.toArray().map(round) };
  });
  const sideLabels: Record<string, string> = {};
  for (const id of avatar.boneOrder) {
    if (id.endsWith('-l')) sideLabels[id] = 'l';
    else if (id.endsWith('-r')) sideLabels[id] = 'r';
  }
  return { joints, sideLabels, sideLabelSource: 'bone names (spec rig ids, -l = character left)' };
}

// G4/G5: every skinned vertex with its part id, packed 4-slot indices and weights (Float32 values as stored).
export function binding(outer: THREE.Object3D) {
  const avatar = outer.userData.avatar as AvatarRig;
  const positions: number[][] = [];
  const partIds: string[] = [];
  const skinIndices: number[] = [];
  const skinWeights: number[] = [];
  for (const m of meshesOf(avatar.model)) {
    const si = m.geometry.getAttribute('skinIndex');
    const sw = m.geometry.getAttribute('skinWeight');
    const pos = m.geometry.getAttribute('position');
    if (!si || !sw) continue;
    for (let k = 0; k < pos.count; k++) {
      positions.push([round(pos.getX(k)), round(pos.getY(k)), round(pos.getZ(k))]);
      partIds.push(meshName(m));
      skinIndices.push(si.getX(k), si.getY(k), si.getZ(k), si.getW(k));
      skinWeights.push(sw.getX(k), sw.getY(k), sw.getZ(k), sw.getW(k));
    }
  }
  return { positions, partIds, skinIndices, skinWeights, jointCount: avatar.boneOrder.length };
}

// Scalp-exposure input: hair vertices and the skull ellipsoid, both in the generated model frame (rest pose).
export function hairGeometry(outer: THREE.Object3D) {
  const avatar = outer.userData.avatar as AvatarRig;
  avatar.rest();
  const byId = (id: string) => meshesOf(avatar.model).find((m) => meshName(m) === id);
  const hair = byId('hair');
  const head = byId('head');
  if (!hair || !head) return null;
  const pos = hair.geometry.getAttribute('position');
  const points: number[][] = [];
  for (let k = 0; k < pos.count; k++) points.push([round(pos.getX(k)), round(pos.getY(k)), round(pos.getZ(k))]);
  head.geometry.computeBoundingBox();
  const box = head.geometry.boundingBox!;
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const index = hair.geometry.index ? Array.from(hair.geometry.index.array) : null;
  return { hairPoints: points, hairIndex: index, standProud: hair.geometry.userData.standProud ?? null,
           skull: { centre: centre.toArray().map(round), radii: size.multiplyScalar(0.5).toArray().map(round) } };
}

export function stats(outer: THREE.Object3D) {
  let triangles = 0;
  const meshes = meshesOf(outer);
  for (const m of meshes) {
    const g = m.geometry;
    triangles += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
  }
  const avatar = outer.userData.avatar as AvatarRig;
  return { meshes: meshes.length, triangles: Math.round(triangles), bones: avatar.boneOrder.length, scale: avatar.scale,
           heightWu: avatar.heightWu, rigidParts: avatar.rigidParts };
}
