import * as THREE from 'three';
import { createStadionhallerneModel } from './stadionHall';

// The red hall (Stadionhallerne) with its ambient loop: a Danish flag on a pole on the lobby roof, waving.
// `phase` 0..1 is one wave cycle; art/img2threejs/aarhus-stadium/export_flag.sh renders the frames for the city's
// ambient strip (lib/city/buildings.ts `ambient`). Model units are wu (the hall's frame: X along the hall, +Z south).
type Options = Parameters<typeof createStadionhallerneModel>[0];

const POLE_H = 0.95;      // above the lobby roof
const ROOF_Y = 1.82;      // lobby roof top (pavement 0.04 + 1.75 + roof 0.03)
const FLAG_W = 0.5;
const FLAG_H = 0.33;

function flagTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 74; c.height = 56;
  const g = c.getContext('2d');
  if (g) {
    g.fillStyle = '#c8102e';
    g.fillRect(0, 0, 74, 56);
    g.fillStyle = '#ffffff';
    g.fillRect(24, 0, 8, 56);   // Dannebrog: the cross sits towards the hoist
    g.fillRect(0, 24, 74, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  return t;
}

export function createStadionhallFlagModel(options: Options = {}, phase = 0): THREE.Group {
  const model = createStadionhallerneModel(options);
  const flag = new THREE.Group();
  flag.name = 'flag';

  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.022, POLE_H, 8),
    new THREE.MeshStandardMaterial({ color: '#f2f2ef', roughness: 0.6, emissive: '#f2f2ef', emissiveIntensity: 0.4 }),
  );
  pole.position.set(0, ROOF_Y + POLE_H / 2, 0);
  pole.castShadow = !!options.castShadow;
  flag.add(pole);

  // Cloth: a strip of quads along +X from the pole; each column swings in Z, more towards the fly end
  const geo = new THREE.PlaneGeometry(FLAG_W, FLAG_H, 12, 1);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = (pos.getX(i) + FLAG_W / 2) / FLAG_W;   // 0 at the pole, 1 at the fly end
    const a = 2 * Math.PI * (phase - u * 0.9);
    pos.setZ(i, 0.07 * u * Math.sin(a));
    pos.setY(i, pos.getY(i) - 0.03 * u * u);           // a slight droop
  }
  geo.computeVertexNormals();
  const tex = flagTexture();
  const cloth = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: '#ffffff', emissiveIntensity: 0.3, side: THREE.DoubleSide, roughness: 0.8 }),
  );
  cloth.position.set(FLAG_W / 2 + 0.02, ROOF_Y + POLE_H - FLAG_H / 2 - 0.02, 0);
  cloth.castShadow = !!options.castShadow;
  flag.add(cloth);

  model.add(flag);
  return model;
}
