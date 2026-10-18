// The test room's moment (board 651:3604, "Hands on, not shown."): the tester's speech bubble shows "?" over a screen
// full of numbers; as the avatar comes near, the big screen plays a short animation of what the model does (sets go onto
// the shelf, one at a time) and the "?" turns into "!". Frame 0 is the resting state, painted into every sprite; the
// city plays frames 0..TEST_MOMENT_FRAMES-1 from a strip (lab model hqAvatarMoment&moment=<k>, export_moment.sh).
import * as THREE from 'three';

export const TEST_MOMENT_FRAMES = 8;
const BANG_FROM = 5; // the frame where "?" becomes "!"

const SETS = ['#f2c200', '#d01012', '#0a6dc2', '#2f9e44', '#f08a00', '#7a4fb5'];

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d') as CanvasRenderingContext2D];
}

// Big screen: frame 0 = a wall of numbers (what the sellers saw); 1.. = the model explained in a short animation
function paintScreen(frame: number): HTMLCanvasElement {
  const [c, g] = canvas(256, 152);
  g.fillStyle = '#16212c'; g.fillRect(0, 0, 256, 152);
  if (frame === 0) {
    for (let r = 0; r < 9; r += 1) {
      for (let k = 0; k < 6; k += 1) {
        g.fillStyle = (r * 7 + k * 3) % 5 === 0 ? '#5d6b78' : '#3a4753';
        g.fillRect(14 + k * 39, 12 + r * 15, 26 + ((r + k) % 3) * 3, 7);
      }
    }
    return c;
  }
  // the shelf on the right: 2 rows of 3 slots
  g.fillStyle = '#e9e7e1';
  g.fillRect(140, 20, 104, 6); g.fillRect(140, 74, 104, 6); g.fillRect(140, 128, 104, 6);
  g.fillRect(140, 20, 5, 114); g.fillRect(239, 20, 5, 114);
  const placed = Math.min(SETS.length, Math.round((frame / (BANG_FROM)) * SETS.length));
  for (let i = 0; i < SETS.length; i += 1) {
    const sx = 150 + (i % 3) * 30, sy = i < 3 ? 34 : 88;
    if (i < placed) {
      g.fillStyle = SETS[i]; g.fillRect(sx, sy, 26, 38);
      g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(sx + 3, sy + 6, 20, 6);
    } else {
      g.strokeStyle = '#5d6b78'; g.lineWidth = 2; g.setLineDash([4, 3]); g.strokeRect(sx + 1, sy + 1, 24, 36); g.setLineDash([]);
    }
  }
  // the sets still to place, on the left, and the arrow into the shelf
  for (let i = placed; i < SETS.length; i += 1) {
    const j = i - placed;
    g.fillStyle = SETS[i]; g.fillRect(16 + (j % 2) * 34, 22 + Math.floor(j / 2) * 44, 28, 38);
  }
  if (placed < SETS.length) {
    g.fillStyle = '#f2c200';
    g.fillRect(96, 70, 28, 12);
    g.beginPath(); g.moveTo(122, 60); g.lineTo(136, 76); g.lineTo(122, 92); g.fill();
  } else {
    g.strokeStyle = '#3ccf6b'; g.lineWidth = 12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(34, 78); g.lineTo(62, 104); g.lineTo(110, 44); g.stroke();
  }
  return c;
}

function paintBubble(frame: number): HTMLCanvasElement {
  const [c, g] = canvas(128, 112);
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 128, 112);
  const bang = frame >= BANG_FROM;
  g.fillStyle = bang ? '#d01012' : '#1f3b70';
  g.font = 'bold 96px Arial, Helvetica, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(bang ? '!' : '?', 64, 60);
  return c;
}

function unlit(image: HTMLCanvasElement): THREE.MeshBasicMaterial {
  const map = new THREE.CanvasTexture(image);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  return new THREE.MeshBasicMaterial({ map, toneMapped: false });
}

/** Paint the test room's screen and speech bubble with moment frame `frame` (0 = at rest). */
export function paintLEGOHQTestMoment(model: THREE.Object3D, frame = 0): void {
  if (typeof document === 'undefined') return;
  const k = Math.max(0, Math.min(TEST_MOMENT_FRAMES - 1, Math.round(frame)));
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  const set = (id: string, material: THREE.Material) => nodes[id]?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material;
  });
  set('test-screen', unlit(paintScreen(k)));
  set('test-bubble', unlit(paintBubble(k)));
}
