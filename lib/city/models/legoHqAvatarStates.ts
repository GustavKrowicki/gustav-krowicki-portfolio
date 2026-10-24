// Roof-on / roof-off states of the LEGO HQ at avatar scale (art/img2threejs/lego-hq-avatar): the grey box on the real
// campus outline (plan.py), five rooms on the route from Figma board node 651:3604.
// The spec tags node ids: "roof-" = upper storeys and roofs; the ground storey walls are split into "wall-<side>-"
// (low, always shown) and "upper-<side>-" (the rest), with "lowcap-" / "topcap-" caps; side N/S/E/W faces outward,
// I is between rooms. Roof off keeps the walls of the two far sides of the view high and cuts all others.
import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { createLEGOHQAvatarScaleModel, type ProceduralModelOptions } from './legoHqAvatar';
import { applyLEGOHQSurfaces } from './legoHqSurfaces';
import { paintLEGOHQAILab, paintLEGOHQMap, paintLEGOHQTeamClip, paintLEGOHQTestMoment } from './legoHqMoments';

// Surface pass (textures, wear, contact darkening) on the outside only; the inside stays a flat grey box for now
// (room floors and hero places keep their flat colours). The test room's screen and bubble show moment frame 0.
function createSurfacedModel(options: ProceduralModelOptions): THREE.Group {
  const model = createLEGOHQAvatarScaleModel(options);
  applyLEGOHQSurfaces(model, (id) => !/-floor(-\d+)?$/.test(id) && !id.startsWith('hero-') && !/^(test-screen|test-bubble|team-screen|map-panel-\d+|ai-screen|ai-sign)$/.test(id));
  paintLEGOHQTestMoment(model, 0);
  paintLEGOHQTeamClip(model, 0);
  paintLEGOHQMap(model, 0);
  paintLEGOHQAILab(model, 0);
  addHqSign(model);
  return model;
}

// Wayfinding (board H, Work = headquarters sign): the logo as a sign standing on the giant yellow brick over the
// entrance, between its two rows of studs. It replaces the small placeholder square on the atrium front. The face is
// the city badge's svg, its layers (white, yellow, red, black) extruded to stepped depths, on a thin red back. The face
// glows at night (win-a), and the sign is a "roof-" node, so it hides with the roof.
const HQ_SIGN = { size: 1.15, depth: 0.04, back: 0.06, x: 1.0, y: 2.15, z: 4.97 };
const LOGO_SVG = '/game/pogicity/Building/logos/lego-hq.svg';

function addHqSign(model: THREE.Group): void {
  if (typeof XMLHttpRequest === 'undefined') return;
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  nodes['roof-logo-sign']?.removeFromParent();
  delete nodes['roof-logo-sign'];
  // read synchronously, so the sign is in the model when the entrance lab records its meshes
  const xhr = new XMLHttpRequest();
  xhr.open('GET', LOGO_SVG, false);
  xhr.send();
  const group = new THREE.Group();
  group.name = 'roof-hq-sign';
  // svg order: white square, yellow, red, then the black frame and letter outlines (fill inherited: currentColor)
  new SVGLoader().parse(xhr.responseText).paths.forEach((path, i) => {
    const fill = path.userData?.style?.fill;
    if (fill === 'none') return;
    const geo = new THREE.ExtrudeGeometry(SVGLoader.createShapes(path), { depth: 1, bevelEnabled: false, curveSegments: 6 });
    const s = HQ_SIGN.size / 177.6;   // the svg's square is 177.6 units wide
    geo.translate(-90, -90, 0);
    geo.scale(s, -s, HQ_SIGN.depth * (1 + i * 0.15));   // each layer stands a little in front of the one below
    const color = new THREE.Color(!fill || fill === 'currentColor' ? '#1b1b1b' : fill);
    const face = new THREE.Mesh(geo, [
      new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: color.clone().multiplyScalar(0.8), roughness: 0.5, side: THREE.DoubleSide }),
    ]);
    face.castShadow = face.receiveShadow = true;
    face.userData.sculptComponent = { id: 'roof-hq-sign-face' };
    face.userData.selfLit = true;
    group.add(face);
  });
  const back = new THREE.Mesh(new THREE.BoxGeometry(HQ_SIGN.size, HQ_SIGN.size, HQ_SIGN.back), new THREE.MeshStandardMaterial({ color: '#c8000a', roughness: 0.45 }));
  back.position.z = -HQ_SIGN.back / 2 + 0.001;
  back.castShadow = back.receiveShadow = true;
  group.add(back);
  group.position.set(HQ_SIGN.x, HQ_SIGN.y + HQ_SIGN.size / 2, HQ_SIGN.z - HQ_SIGN.depth);
  model.add(group);
  nodes['roof-hq-sign'] = group;
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
    else if (id.startsWith('door-leaf-')) node.visible = !open || far.includes('S');
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

// Door frames for the city's door animation: the roof-on model with both leaves slid open by `open` (0..1) into the
// wall pockets (0.45 wu each). The lab reads ?door=<open> (model hqAvatarDoor).
export function createLEGOHQAvatarDoorModel(options: ProceduralModelOptions = {}, open = 0): THREE.Group {
  const model = createLEGOHQAvatarRoofOnModel(options);
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  for (const [id, dir] of [['door-leaf-left', -1], ['door-leaf-right', 1]] as const) {
    if (nodes[id]) nodes[id].position.x += dir * 0.45 * open;
  }
  return model;
}

// Moment frames for the city (roof off, south view): the test room's screen and bubble at `frame`
// (0..TEST_MOMENT_FRAMES-1), the team room's clip at `clip`, the map room's map at `map`. The lab reads
// ?moment=<frame>&clip=<k>&map=<k>&ai=<k> (hqAvatarMoment); `ai` = the AI lab's template screen.
export function createLEGOHQAvatarMomentModel(options: ProceduralModelOptions = {}, frame = 0, clip = 0, map = 0, ai = 0): THREE.Group {
  const model = createLEGOHQAvatarRoofOffModel(options, 'south');
  paintLEGOHQTestMoment(model, frame);
  paintLEGOHQTeamClip(model, clip);
  paintLEGOHQMap(model, map);
  paintLEGOHQAILab(model, ai);
  return model;
}
