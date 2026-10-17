// A seated pose for Gustav's avatar (the desk "sit and look" moment): from the rest pose, thighs forward, shins down,
// hands forward on the desk, then the whole avatar lowered so the hip joints sit on the seat. Rendered once per view
// into a seated sprite (art/img2threejs/gustav-avatar/render_sit.mjs); the city never poses live.
import * as THREE from 'three';
import type { AvatarRig } from './gustavAvatarRig';

// Bone turns in radians about each bone's local x (the rig's limbs bend about x; signs found in the entrance lab)
export const SIT_POSE: Record<string, number> = {
  'thigh-l': -1.45, 'thigh-r': -1.45,
  'shin-l': 1.35, 'shin-r': 1.35,
  'upper-arm-l': -0.55, 'upper-arm-r': -0.55,
  'forearm-l': -0.9, 'forearm-r': -0.9,
  chest: 0.06,
};

/** Pose the rig seated and lower the rig's root so the hip joints sit `seatTop` above the avatar's ground (the point
 *  under its feet in the rest pose). Returns the drop (wu). standAvatar() undoes it. */
export function poseAvatarSit(rig: AvatarRig, seatTop: number): number {
  const root = rig.model;
  const base = (root.userData.sitBaseY ??= root.position.y) as number;
  root.position.y = base;
  rig.rest();
  root.updateMatrixWorld(true);
  const ground = root.parent ? root.parent.localToWorld(new THREE.Vector3(0, 0, 0)).y : 0;
  for (const [id, angle] of Object.entries(SIT_POSE)) rig.bones[id]?.rotateX(angle);
  setLaptop(rig, false);   // the carried laptop would float by the shoulder
  root.updateMatrixWorld(true);
  const hips = ['thigh-l', 'thigh-r'].map((id) => rig.bones[id]?.getWorldPosition(new THREE.Vector3()).y ?? 0);
  const scale = root.parent ? root.parent.getWorldScale(new THREE.Vector3()).y : 1;
  const drop = ((hips[0] + hips[1]) / 2 - ground) / scale - (seatTop + 0.04);
  root.position.y = base - drop;
  root.updateMatrixWorld(true);
  return drop;
}

export function standAvatar(rig: AvatarRig): void {
  const base = rig.model.userData.sitBaseY as number | undefined;
  if (base !== undefined) rig.model.position.y = base;
  setLaptop(rig, true);
}

// Hide the laptop while seated; standing restores what it was (it may be off for good: createGustavAvatar laptop false)
function setLaptop(rig: AvatarRig, standing: boolean): void {
  rig.model.traverse((o) => {
    if ((o.userData.sculptComponent as { id?: string } | undefined)?.id !== 'laptop' || !(o as THREE.Mesh).isMesh) return;
    if (standing) {
      if (o.userData.sitWasVisible !== undefined) o.visible = o.userData.sitWasVisible as boolean;
      delete o.userData.sitWasVisible;
    } else {
      if (o.userData.sitWasVisible === undefined) o.userData.sitWasVisible = o.visible;
      o.visible = false;
    }
  });
}
