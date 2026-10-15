// Roof-on / roof-off states of the generated LEGO HQ Rooms model (art/img2threejs/lego-campus-rooms, board 02b card B3).
// The spec marks every closed block mass and roof with an id that starts with "roof-": hide those and the rooms show.
import type * as THREE from 'three';
import { createLEGOHQRoomsModel, type ProceduralModelOptions } from './legoHqRooms';

export function setLEGOHQRoomsRoofOff(model: THREE.Object3D, roofOff: boolean): void {
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  for (const [id, node] of Object.entries(nodes)) if (id.startsWith('roof-')) node.visible = !roofOff;
}

export function createLEGOHQRoomsRoofOffModel(options: ProceduralModelOptions = {}): THREE.Group {
  const model = createLEGOHQRoomsModel(options);
  setLEGOHQRoomsRoofOff(model, true);
  return model;
}
