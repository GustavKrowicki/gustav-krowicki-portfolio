// Roof-on / roof-off states of the LEGO HQ at avatar scale (art/img2threejs/lego-hq-avatar): the grey box on the real
// campus outline (plan.py), five rooms on the route from Figma board node 651:3604.
// The spec tags node ids: "roof-" = upper storeys and roofs; the ground storey walls are split into "wall-<side>-"
// (low, always shown) and "upper-<side>-" (the rest), with "lowcap-" / "topcap-" caps; side N/S/E/W faces outward,
// I is between rooms. Roof off keeps the walls of the two far sides of the view high and cuts all others.
import type * as THREE from 'three';
import { createLEGOHQAvatarScaleModel, type ProceduralModelOptions } from './legoHqAvatar';

// Grey box: flat colours only. The surface pass (legoHqSurfaces.ts) comes back with the detail pass.
function createSurfacedModel(options: ProceduralModelOptions): THREE.Group {
  return createLEGOHQAvatarScaleModel(options);
}

export type CampusView = 'south' | 'west' | 'north' | 'east';

// Sprite view -> the two plot sides that face away from the camera (lab yaws: south 45, west 135, north 225, east 315).
export const FAR_SIDES: Record<CampusView, readonly string[]> = {
  south: ['N', 'W'],
  west: ['S', 'W'],
  north: ['S', 'E'],
  east: ['N', 'E'],
};

const sideOf = (id: string): string => id.split('-')[1] ?? '';

export function setLEGOHQAvatarState(model: THREE.Object3D, open: boolean, view: CampusView = 'south'): void {
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  const far = FAR_SIDES[view];
  for (const [id, node] of Object.entries(nodes)) {
    if (id.startsWith('roof-')) node.visible = !open;
    else if (id.startsWith('lowcap-')) node.visible = open && !far.includes(sideOf(id));
    else if (id.startsWith('topcap-')) node.visible = open && far.includes(sideOf(id));
    else if (id.startsWith('upper-')) node.visible = !open || far.includes(sideOf(id));
    else if (id.startsWith('door-leaf-')) node.visible = !open || far.includes('E');   // the main door is in an east-facing wall
  }
}

export function createLEGOHQAvatarRoofOnModel(options: ProceduralModelOptions = {}): THREE.Group {
  const model = createSurfacedModel(options);
  setLEGOHQAvatarState(model, false);
  return model;
}

export function createLEGOHQAvatarRoofOffModel(options: ProceduralModelOptions = {}, view: CampusView = 'south'): THREE.Group {
  const model = createSurfacedModel(options);
  setLEGOHQAvatarState(model, true, view);
  model.userData.campusView = view;
  return model;
}

// Door frames for the city's door animation: the roof-on model with both leaves slid open by `open` (0..1) along the
// wall (z) into the pockets (0.45 wu each). The lab reads ?door=<open> (model hqAvatarDoor).
export function createLEGOHQAvatarDoorModel(options: ProceduralModelOptions = {}, open = 0): THREE.Group {
  const model = createLEGOHQAvatarRoofOnModel(options);
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  for (const [id, dir] of [['door-leaf-left', -1], ['door-leaf-right', 1]] as const) {
    if (nodes[id]) nodes[id].position.z += dir * 0.45 * open;
  }
  return model;
}
