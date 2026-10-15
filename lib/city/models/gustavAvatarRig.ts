// Gustav's city avatar: the img2threejs factory (gustavAvatar.ts, generated) plus the rig stage the
// generator leaves open, the authored clips (gustavAvatarClips.ts, generated) and the plugin's R5
// controller (gustavAvatarRuntime.ts, generated). Sources: art/img2threejs/gustav-avatar/.
//
// The generator binds only the body segments that are bones (pelvis, spine, limbs, head). Every other
// visible part -- hair, fringe, face features, glasses, the tee band -- stays an ordinary Mesh under a
// pivot Group that no bone moves, so it would be left behind in bind pose the moment a clip plays
// (plugin gate G6). This module finishes the rig in the plugin's order:
//   1. prepare (mesh repair, BEFORE the freeze): hide the invisible root carrier, bake each rigid part's
//      world matrix into its own geometry copy and re-home it as a SkinnedMesh at the model root;
//   2. bind (after the freeze, ADD only): skinIndex/skinWeight on the rigid parts, then bind at identity.
//      'transfer' copies the weights of the nearest body vertex (proximity conditioning: a part moves
//      exactly like the skin under it, so nothing opens between them); 'rigid' is the blend-off control
//      (weight 1.0 to the part's own bone) used as the G10 baseline.
// Then the figure is scaled to CHARACTER_HEIGHT_WU with its feet on y = 0 (display offset from mesh
// bounds alone, per the plugin's R1 rule).
import * as THREE from 'three';
import { CHARACTER_HEIGHT_WU } from '@/lib/city/units';
import { createGustavAvatarModel } from './gustavAvatar';
import { AVATAR_CLIP_DATA, AVATAR_RIGID_PART_BONES, type AvatarClipData } from './gustavAvatarClips';
import { AnimationController, CLIPS } from './gustavAvatarRuntime';

export type AvatarStage = 'generated' | 'prepared' | 'bound';
export type AvatarBinding = 'transfer' | 'rigid';

export type AvatarOptions = {
  stage?: AvatarStage;
  binding?: AvatarBinding;
  heightWu?: number;
  // The laptop the sprite carries in its left hand (east frames). On by default; false hides it (the mesh stays
  // bound, so toggling never touches the rig).
  laptop?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

export type AvatarRig = {
  model: THREE.Group;
  skeleton: THREE.Skeleton;
  bones: Record<string, THREE.Bone>;
  boneOrder: string[];
  clips: THREE.AnimationClip[];
  clipData: AvatarClipData[];
  controller: AnimationController | null;
  stage: AvatarStage;
  binding: AvatarBinding;
  scale: number;
  heightWu: number;
  rigidParts: string[];
  seek: (clipId: string, t: number) => void;
  rest: () => void;
};

type ComponentData = { id?: string; name?: string };

function componentId(object: THREE.Object3D): string | undefined {
  return (object.userData.sculptComponent as ComponentData | undefined)?.id;
}

function isVisibleInTree(object: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false;
  return true;
}

// Stage 1 -- repair before the freeze. Returns the component ids of the re-homed rigid parts.
function prepareRigidParts(model: THREE.Group, bones: Record<string, THREE.Bone>): string[] {
  model.updateMatrixWorld(true);
  const inverseRoot = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const moved: THREE.Mesh[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || (mesh as THREE.SkinnedMesh).isSkinnedMesh) return;
    const id = componentId(mesh);
    if (id === 'root') {
      mesh.visible = false; // the template's invisible carrier box (material 'hidden', opacity 0)
      return;
    }
    if (!id || bones[id]) return;
    moved.push(mesh);
  });
  const ids: string[] = [];
  for (const mesh of moved) {
    const id = componentId(mesh)!;
    const geometry = mesh.geometry.clone();
    geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverseRoot, mesh.matrixWorld));
    geometry.userData.worldBaked = true;
    // A plain Mesh until the bind stage: a SkinnedMesh without a skeleton cannot render.
    const baked = new THREE.Mesh(geometry, mesh.material);
    baked.name = mesh.name;
    baked.userData = { ...mesh.userData, rigidPart: true };
    baked.castShadow = mesh.castShadow;
    baked.receiveShadow = mesh.receiveShadow;
    mesh.parent?.remove(mesh);
    model.add(baked);
    ids.push(id);
  }
  return ids;
}

// Stage 2 -- bind (adds skinIndex / skinWeight only; positions, normals, uvs and indices are untouched).
function bindRigidParts(
  model: THREE.Group,
  skeleton: THREE.Skeleton,
  boneIndexOf: Map<string, number>,
  mode: AvatarBinding,
): void {
  // Body vertices (already weighted by the generator's envelope function) are the transfer source.
  const source: { p: THREE.Vector3; i: number[]; w: number[] }[] = [];
  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isSkinnedMesh || mesh.userData.rigidPart) return;
    const pos = mesh.geometry.getAttribute('position');
    const si = mesh.geometry.getAttribute('skinIndex');
    const sw = mesh.geometry.getAttribute('skinWeight');
    if (!pos || !si || !sw) return;
    for (let v = 0; v < pos.count; v++) {
      source.push({
        p: new THREE.Vector3().fromBufferAttribute(pos, v),
        i: [si.getX(v), si.getY(v), si.getZ(v), si.getW(v)],
        w: [sw.getX(v), sw.getY(v), sw.getZ(v), sw.getW(v)],
      });
    }
  });
  if (mode === 'rigid') {
    // Blend-off control (G10 baseline): every body segment weighted 1.0 to its own bone, no envelope blend.
    model.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh || mesh.userData.rigidPart) return;
      const own = boneIndexOf.get(componentId(mesh) ?? '');
      const si = mesh.geometry.getAttribute('skinIndex') as THREE.BufferAttribute | undefined;
      const sw = mesh.geometry.getAttribute('skinWeight') as THREE.BufferAttribute | undefined;
      if (own === undefined || !si || !sw) return;
      for (let k = 0; k < si.count; k++) {
        si.setXYZW(k, own, 0, 0, 0);
        sw.setXYZW(k, 1, 0, 0, 0);
      }
      si.needsUpdate = sw.needsUpdate = true;
    });
  }
  const v = new THREE.Vector3();
  const rigid: THREE.Mesh[] = [];
  model.traverse((object) => {
    if ((object as THREE.Mesh).isMesh && object.userData.rigidPart) rigid.push(object as THREE.Mesh);
  });
  for (const baked of rigid) {
    // Same geometry object: binding only ADDS skinIndex / skinWeight to it.
    const mesh = new THREE.SkinnedMesh(baked.geometry, baked.material);
    mesh.name = baked.name;
    mesh.userData = baked.userData;
    mesh.castShadow = baked.castShadow;
    mesh.receiveShadow = baked.receiveShadow;
    mesh.frustumCulled = false;
    model.remove(baked);
    model.add(mesh);
    const id = componentId(mesh)!;
    const owner = boneIndexOf.get(AVATAR_RIGID_PART_BONES[id] ?? 'head') ?? 0;
    const pos = mesh.geometry.getAttribute('position');
    const skinIndex = new Uint16Array(pos.count * 4);
    const skinWeight = new Float32Array(pos.count * 4);
    for (let k = 0; k < pos.count; k++) {
      // Props (the laptop) never bend: weight 1.0 to their own bone in every mode.
      const isProp = (mesh.userData.sculptComponent as { role?: string } | undefined)?.role === 'prop';
      if (mode === 'rigid' || isProp) {
        skinIndex[k * 4] = owner;
        skinWeight[k * 4] = 1;
        continue;
      }
      v.fromBufferAttribute(pos, k);
      let best = 0;
      let bestD = Infinity;
      for (let s = 0; s < source.length; s++) {
        const d = source[s].p.distanceToSquared(v);
        if (d < bestD) { bestD = d; best = s; }
      }
      for (let slot = 0; slot < 4; slot++) {
        skinIndex[k * 4 + slot] = source[best].i[slot];
        skinWeight[k * 4 + slot] = source[best].w[slot];
      }
    }
    mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
    mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
    mesh.bind(skeleton, new THREE.Matrix4()); // identity, always, in attached mode
  }
}

export function buildAvatarClips(data: AvatarClipData[] = AVATAR_CLIP_DATA): THREE.AnimationClip[] {
  return data.map((clip) => new THREE.AnimationClip(clip.id, clip.duration, clip.tracks.map((track) =>
    track.type === 'quaternion'
      ? new THREE.QuaternionKeyframeTrack(track.name, track.times, track.values)
      : new THREE.VectorKeyframeTrack(track.name, track.times, track.values))));
}

// Skinned-vertex bounds of every visible mesh, in the model's own frame (posed or rest).
export function skinnedBounds(model: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const v = new THREE.Vector3();
  const toModel = new THREE.Matrix4();
  model.updateMatrixWorld(true);
  const inverseModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  model.traverse((object) => {
    const mesh = object as THREE.SkinnedMesh;
    if (!mesh.isMesh || !isVisibleInTree(mesh)) return;
    const pos = mesh.geometry.getAttribute('position');
    toModel.multiplyMatrices(inverseModel, mesh.matrixWorld);
    const skinned = mesh.isSkinnedMesh && mesh.skeleton && mesh.geometry.getAttribute('skinIndex');
    for (let k = 0; k < pos.count; k++) {
      v.fromBufferAttribute(pos, k);
      if (skinned) mesh.applyBoneTransform(k, v);
      box.expandByPoint(v.applyMatrix4(toModel));
    }
  });
  return box;
}

export function createGustavAvatar(options: AvatarOptions = {}): THREE.Group {
  const stage = options.stage ?? 'bound';
  const binding = options.binding ?? 'transfer';
  const heightWu = options.heightWu ?? CHARACTER_HEIGHT_WU;
  const model = createGustavAvatarModel({ castShadow: options.castShadow, receiveShadow: options.receiveShadow });
  const rig = model.userData.rig as {
    bones: Record<string, THREE.Bone>;
    skeleton: THREE.Skeleton;
    boneOrder: string[];
    boneIndexOf: Map<string, number>;
  };
  let rigidParts: string[] = [];
  if (stage !== 'generated') rigidParts = prepareRigidParts(model, rig.bones);
  if (stage === 'bound') bindRigidParts(model, rig.skeleton, rig.boneIndexOf, binding);
  if (options.laptop === false) {
    model.traverse((o) => {
      if (componentId(o) === 'laptop' && (o as THREE.Mesh).isMesh) o.visible = false;
    });
  }

  // Display: scale to the city standard height and seat the feet on y = 0 (offset from mesh bounds alone).
  const outer = new THREE.Group();
  outer.name = 'gustav-avatar';
  outer.add(model);
  const rest = skinnedBounds(model);
  const size = rest.getSize(new THREE.Vector3());
  const centre = rest.getCenter(new THREE.Vector3());
  const scale = heightWu / size.y;
  model.scale.setScalar(scale);
  model.position.set(-centre.x * scale, -rest.min.y * scale, -centre.z * scale);
  outer.updateMatrixWorld(true);

  const clips = buildAvatarClips();
  // The controller drives the generated root (bones are its children); scale lives on that root and is
  // never animated, so no joint ever carries scale (G9).
  const controller = stage === 'bound' ? new AnimationController(model, clips, CLIPS) : null;
  const avatar: AvatarRig = {
    model, skeleton: rig.skeleton, bones: rig.bones, boneOrder: rig.boneOrder, clips, clipData: AVATAR_CLIP_DATA,
    controller, stage, binding, scale, heightWu, rigidParts,
    seek: (clipId, t) => {
      if (!controller) return;
      controller.seek(clipId, t);
      outer.updateMatrixWorld(true);
    },
    rest: () => {
      controller?.stop();
      outer.updateMatrixWorld(true);
    },
  };
  outer.userData.avatar = avatar;
  return outer;
}
