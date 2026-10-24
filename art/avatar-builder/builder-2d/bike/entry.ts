import * as THREE from 'three';
import { createCityBikeModel } from '@/lib/city/models/cityBike';

// Bake the city bike for the riding avatar: ortho city camera (pitch 30, yaw per facing), converter light rig,
// cranks and pedals turned per frame. Returns PNGs at SS x and the projected rider points in frame px.
(window as any).bake = (o: { FW: number; FH: number; GROUND: number; K: number; SS: number; yaws: number[]; n: number; pitch: number }) => {
  const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(o.FW * o.SS, o.FH * o.SS, false);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NoToneMapping;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 0.8); key.position.set(5, 10, 5);
  const fill = new THREE.DirectionalLight(0xffffff, 0.3); fill.position.set(-5, 5, -5);
  scene.add(key, fill);
  const bike = createCityBikeModel({});
  scene.add(bike);
  bike.updateMatrixWorld(true);
  const byName = (n: string) => { let f: THREE.Object3D | undefined; bike.traverse((x) => { if (x.name === n) f = x; }); if (!f) throw new Error(n); return f; };
  const centre = (n: string) => new THREE.Box3().setFromObject(byName(n)).getCenter(new THREE.Vector3());
  const BB = centre('Bottom bracket');
  const turn = ['Crank L', 'Crank R', 'Pedal L', 'Pedal R'].map((n) => { const node = byName(n + '__pivot'); return { n, node, pos: node.position.clone(), q: node.quaternion.clone() }; });
  const cam = new THREE.OrthographicCamera(-o.FW / 2 / o.K, o.FW / 2 / o.K, o.GROUND / o.K, -(o.FH - o.GROUND) / o.K, 0.1, 100);
  const pitch = THREE.MathUtils.degToRad(o.pitch);
  const out: any = {};
  for (const yawDeg of o.yaws) {
    const yaw = THREE.MathUtils.degToRad(yawDeg);
    cam.position.set(10 * Math.cos(pitch) * Math.sin(yaw), 10 * Math.sin(pitch), 10 * Math.cos(pitch) * Math.cos(yaw));
    cam.lookAt(0, 0, 0); cam.updateProjectionMatrix(); cam.updateMatrixWorld(true);
    const proj = (v: THREE.Vector3) => { const p = v.clone().project(cam); return [(p.x + 1) / 2 * o.FW, (1 - p.y) / 2 * o.FH, p.z]; };
    const frames: any[] = [];
    for (let i = 0; i < o.n; i++) {
      const th = -i * 2 * Math.PI / o.n;
      const rz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), th);
      for (const t of turn) {
        t.node.position.copy(t.pos.clone().sub(BB).applyQuaternion(rz).add(BB));
        t.node.quaternion.copy(t.n.startsWith('Crank') ? rz.clone().multiply(t.q) : t.q);
      }
      bike.updateMatrixWorld(true);
      renderer.render(scene, cam);
      const saddle = new THREE.Box3().setFromObject(byName('Sprung saddle'));
      const seat = new THREE.Vector3((saddle.min.x * 0.6 + saddle.max.x * 0.4), saddle.max.y, (saddle.min.z + saddle.max.z) / 2);
      frames.push({ png: renderer.domElement.toDataURL('image/png'), saddle: proj(seat), bb: proj(BB),
        pedalL: proj(centre('Pedal L')), pedalR: proj(centre('Pedal R')), gripL: proj(centre('Grip L')), gripR: proj(centre('Grip R')),
        front: proj(centre('Front hub')), rear: proj(centre('Rear hub')) });
    }
    out[yawDeg] = frames;
  }
  return out;
};
