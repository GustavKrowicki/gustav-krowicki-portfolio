// Roof-on / roof-off states of the Valtech office (art/img2threejs/valtech-office, street-level interior grey box,
// Figma board 597-3604). Same idea as legoHqAvatarStates.ts: the building stays itself and opens only when the avatar
// walks in through the gate. Roof off hides the upper storeys and the cafe front, keeps the walls of the view's two far
// sides full height and cuts the others to "lowcap-<side>". Interior parts ("int-", "side-<side>-") are always in the
// model; "open-" and "lowcap-" parts show only with the roof off.
import type * as THREE from 'three';
import { createValtechOfficeModel, type ProceduralModelOptions } from './valtechOffice';
import { FAR_SIDES, type CampusView } from './legoHqAvatarStates';

// Upper storeys: slabs, louvre bands, parapets, roof deck, glass top floor
const UPPER = ['slab-', 'louvre-', 'parapet-', 'roof-deck', 'top-'];
// Cafe front and the gate pieces above or beside the walk-in path
const FRONT = ['shop-core', 'col-S-', 'shop-glass-S-', 'shop-light-S-', 'awning-', 'gate-lintel', 'gate-soffit', 'gate-back',
  'gate-brick-w', 'gate-door', 'gate-art', 'gate-sign'];
// Full-height shell walls per side (cut to lowcap-<side> when that side faces the camera)
const WALLS: Record<string, string[]> = {
  N: ['wall-N', 'side-N-'],
  W: ['wall-W', 'side-W-'],
  E: ['gate-east-wall', 'wall-E', 'gate-brick-e', 'side-E-'],
};

const starts = (id: string, list: string[]) => list.some((p) => id.startsWith(p));

export function setValtechOfficeState(model: THREE.Object3D, open: boolean, view: CampusView = 'south'): void {
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  const far = FAR_SIDES[view];
  for (const [id, node] of Object.entries(nodes)) {
    if (id.startsWith('open-')) node.visible = open;
    else if (id.startsWith('lowcap-')) node.visible = open && !far.includes(id.split('-')[1]);
    else if (starts(id, UPPER) || starts(id, FRONT)) node.visible = !open;
    else {
      const side = Object.keys(WALLS).find((s) => starts(id, WALLS[s]));
      if (side) node.visible = !open || far.includes(side);
    }
  }
}

export function createValtechOfficeRoofOnModel(options: ProceduralModelOptions = {}): THREE.Group {
  const model = createValtechOfficeModel(options);
  setValtechOfficeState(model, false);
  return model;
}

export function createValtechOfficeRoofOffModel(options: ProceduralModelOptions = {}, view: CampusView = 'south'): THREE.Group {
  const model = createValtechOfficeModel(options);
  setValtechOfficeState(model, true, view);
  model.userData.campusView = view;
  return model;
}
