// Roof-off LEGO HQ skeleton (board 02b, card B2): the campus blocks as simple masses, each block one room.
// roofOff: false = the closed campus seen in the city; true = roofs and upper storeys gone, rooms visible.
// Footprint units as legoCampusRoomsLayout.ts (1.0 = 7 tiles). Both states share the ground slab, so the
// sprite converter normalises them to the same scale and they swap in place.
import * as THREE from 'three';
import { CAMPUS_BLOCKS, type CampusBlock } from './legoCampusRoomsLayout';

export {
  createLEGOCampusLookDevLights as createLEGOCampusRoomsLookDevLights,
  createLEGOCampusEnvironment as createLEGOCampusRoomsEnvironment,
  configureLEGOCampusRenderer as configureLEGOCampusRoomsRenderer,
} from './legoCampus';

const TILE = 1 / 7; // 1 wu in footprint units
const GROUND_STOREY = 1.4 * TILE;
const STOREY = 1.2 * TILE;
const SLAB = 0.008; // ground slab thickness, top at y = 0
const WALL = 0.06 * TILE; // wall thickness
const CUT_WALL = 0.2 * TILE; // wall height with the roof off: a low lip, so the camera sees the whole floor

const COLORS = {
  grass: 0x9cc46b,
  paving: 0xd9d2c5,
  facade: 0x6f7c86,
  facadeLight: 0xe7e2da,
  roof: 0x7fae4e,
  parapet: 0x3a3a3a,
  yellow: 0xffcc00,
  glass: 0xbcd7e6,
  wallCut: 0xf2efe9,
  wallTop: 0x2f2d2b,
};

// Floor colours per room: the board's room-card colours, a little stronger so they read at sprite size
const ROOM_FLOORS: Record<string, number> = {
  workshop: 0x9fd0dc,
  'recommendation-studio': 0xb5dcc8,
  'systems-map-room': 0xd6cfc9,
  'launch-room': 0xf7c9a1,
  'ai-lab': 0xffe680,
  lobby: 0xffffff,
  entrance: 0xffe066,
};

type Options = { roofOff?: boolean; castShadow?: boolean; receiveShadow?: boolean };

// A little self-light keeps the colours readable under the sprite converter's plain rig
function mat(color: number, roughness = 0.85): THREE.MeshStandardMaterial {
  const c = new THREE.Color(color);
  return new THREE.MeshStandardMaterial({ color: c, roughness, metalness: 0, emissive: c.clone().multiplyScalar(0.3) });
}

// Shape in the XY plane with y = -z, so rotateX(-90 deg) lays it flat and extrudes it up +Y
function shapeOf(block: CampusBlock): THREE.Shape {
  const shape = new THREE.Shape(block.outline.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const hole of block.holes) shape.holes.push(new THREE.Path(hole.map(([x, z]) => new THREE.Vector2(x, -z))));
  return shape;
}

function extrude(shape: THREE.Shape, depth: number, y: number, materials: THREE.Material | THREE.Material[]): THREE.Mesh {
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.position.y = y;
  return mesh;
}

function blockHeight(block: CampusBlock, storeys = block.storeys): number {
  return GROUND_STOREY + (storeys - 1) * STOREY;
}

function sideMaterial(block: CampusBlock): THREE.Material {
  if (block.kind === 'yellow') return mat(COLORS.yellow, 0.6);
  if (block.kind === 'glass') return mat(COLORS.glass, 0.3);
  if (block.kind === 'terrace') return mat(COLORS.facadeLight);
  return mat(COLORS.facade);
}

function capMaterial(block: CampusBlock): THREE.Material {
  if (block.kind === 'glass') return mat(0xf4f4f2, 0.5); // white atrium roof
  if (block.kind === 'terrace') return mat(COLORS.paving);
  if (block.kind === 'yellow') return mat(COLORS.parapet);
  return mat(COLORS.roof);
}

// Closed block: full-height mass, roof cap (ExtrudeGeometry groups: 0 = caps, 1 = sides)
function closedBlock(block: CampusBlock, storeys = block.storeys): THREE.Object3D {
  const mesh = extrude(shapeOf(block), blockHeight(block, storeys), 0, [capMaterial(block), sideMaterial(block)]);
  mesh.name = `${block.key}-mass`;
  return mesh;
}

function wallRing(ring: [number, number][], height: number, material: THREE.Material, group: THREE.Group): void {
  for (let i = 0; i < ring.length; i += 1) {
    const [x0, z0] = ring[i];
    const [x1, z1] = ring[(i + 1) % ring.length];
    const length = Math.hypot(x1 - x0, z1 - z0);
    if (length < 1e-4) continue;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(length + WALL, height, WALL), material);
    wall.position.set((x0 + x1) / 2, height / 2, (z0 + z1) / 2);
    wall.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    group.add(wall);
  }
}

// Open block: coloured room floor and walls cut to half a storey with a dark top edge
function openBlock(block: CampusBlock): THREE.Object3D {
  const group = new THREE.Group();
  group.name = `${block.key}-room`;
  const floor = extrude(shapeOf(block), 0.003, 0, mat(ROOM_FLOORS[block.room ?? ''] ?? 0xffffff, 0.9));
  floor.name = `${block.key}-floor`;
  group.add(floor);
  const walls = new THREE.Group();
  walls.name = `${block.key}-walls`;
  const wallMat = block.kind === 'yellow' ? mat(COLORS.yellow, 0.6) : mat(COLORS.wallCut);
  wallRing(block.outline, CUT_WALL, wallMat, walls);
  for (const hole of block.holes) wallRing(hole, CUT_WALL, wallMat, walls);
  const caps = new THREE.Group();
  wallRing(block.outline, 0.002, mat(COLORS.wallTop), caps);
  for (const hole of block.holes) wallRing(hole, 0.002, mat(COLORS.wallTop), caps);
  caps.position.y = CUT_WALL;
  group.add(walls, caps);
  return group;
}

// Giant yellow 2x4 plate over the glass doors (1.0 wu high), on the south face of the entrance block
function doorPlate(): THREE.Object3D {
  const entrance = CAMPUS_BLOCKS.find((b) => b.key === 'entrance-block')!;
  const xs = entrance.outline.map(([x]) => x);
  const zs = entrance.outline.map(([, z]) => z);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const front = Math.max(...zs);
  const group = new THREE.Group();
  group.name = 'door-plate';
  const w = 1.6 * TILE, d = 0.8 * TILE, h = 0.25 * TILE;
  const plate = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(COLORS.yellow, 0.5));
  plate.position.set(cx, 1.0 * TILE + h / 2, front + d / 2 - WALL);
  group.add(plate);
  const stud = new THREE.CylinderGeometry(0.12 * TILE, 0.12 * TILE, 0.12 * TILE, 16);
  for (let i = 0; i < 4; i += 1) {
    for (let j = 0; j < 2; j += 1) {
      const s = new THREE.Mesh(stud, mat(COLORS.yellow, 0.5));
      s.position.set(cx - w / 2 + (i + 0.5) * (w / 4), 1.0 * TILE + h + 0.06 * TILE, front - WALL + (j + 0.5) * (d / 2));
      group.add(s);
    }
  }
  // Glass doors under the plate
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0 * TILE, 1.0 * TILE, WALL * 1.2), mat(COLORS.glass, 0.2));
  door.position.set(cx, 0.5 * TILE, front);
  group.add(door);
  return group;
}

export function createLEGOCampusRoomsModel(options: Options = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = options.roofOff ? 'LEGO HQ rooms (roof off)' : 'LEGO HQ rooms (roof on)';
  const nodes: Record<string, THREE.Object3D> = {};

  const ground = new THREE.Mesh(new THREE.BoxGeometry(1, SLAB, 1), mat(COLORS.grass, 0.95));
  ground.position.y = -SLAB / 2;
  ground.name = 'ground';
  root.add(ground);

  for (const block of CAMPUS_BLOCKS) {
    // The spare wing has no room yet: with the roof off it keeps a closed ground storey only
    const node = !options.roofOff ? closedBlock(block) : block.room ? openBlock(block) : closedBlock(block, 1);
    nodes[block.key] = node;
    root.add(node);
  }
  const plate = doorPlate();
  nodes['door-plate'] = plate;
  root.add(plate);

  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = options.castShadow ?? true;
    mesh.receiveShadow = options.receiveShadow ?? true;
  });
  root.userData.sculptRuntime = { nodes };
  return root;
}

export function createLEGOCampusRoomsOpenModel(options: Omit<Options, 'roofOff'> = {}): THREE.Group {
  return createLEGOCampusRoomsModel({ ...options, roofOff: true });
}
