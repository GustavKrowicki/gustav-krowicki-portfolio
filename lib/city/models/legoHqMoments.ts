// The test room's moment (board 651:3604, "Hands on, not shown."): the tester's speech bubble shows "?" over a screen
// full of numbers; as the avatar comes near, the big screen plays a short animation of what the model does (sets go onto
// the shelf, one at a time) and the "?" turns into "!". Frame 0 is the resting state, painted into every sprite; the
// city plays frames 0..TEST_MOMENT_FRAMES-1 from a strip (lab model hqAvatarMoment&moment=<k>, export_moment.sh).
// The team room's big screen loops a clip from the tests (a user at a laptop), TEAM_CLIP_FRAMES long (&clip=<k>).
// The map room's round wall is one long map over MAP_PANELS panels: at rest its lines are pale; as the avatar comes near,
// the lines colour in from left to right, sticky notes appear at the crossings, and the one line on the right lights up
// (MAP_FRAMES long, &map=<k>).
import * as THREE from 'three';

export const TEST_MOMENT_FRAMES = 8;
export const TEAM_CLIP_FRAMES = 8;
export const MAP_FRAMES = 8;
export const MAP_PANELS = 18; // build_spec.py MAP_PANELS
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

// Team screen: a clip from the tests. A user at a laptop leans in, a hand goes to the head, a "?" pops up; the play bar runs
function paintClip(frame: number): HTMLCanvasElement {
  const [c, g] = canvas(256, 150);
  g.fillStyle = '#dfe4ea'; g.fillRect(0, 0, 256, 150);
  g.fillStyle = '#c9d1da'; g.fillRect(0, 96, 256, 54);                       // the desk in the clip
  const lean = frame % 4 < 2 ? 0 : 3;
  const puzzled = frame >= 2 && frame <= 5;
  // the user: torso, head, hair
  g.fillStyle = '#3aa0a0'; g.fillRect(96 + lean, 58, 64, 46);
  g.fillStyle = '#d9a77f'; g.fillRect(110 + lean, 22 + lean, 36, 36);
  g.fillStyle = '#3b2a20'; g.fillRect(108 + lean, 18 + lean, 40, 12);
  // arm: on the laptop, or up at the head when puzzled
  g.fillStyle = '#3aa0a0';
  if (puzzled) { g.fillRect(150 + lean, 30, 14, 40); g.fillStyle = '#d9a77f'; g.fillRect(146 + lean, 24, 16, 14); }
  else g.fillRect(150 + lean, 70, 30, 14);
  // laptop, back to the camera of the clip
  g.fillStyle = '#9aa0a8'; g.fillRect(60, 70, 70, 40);
  g.fillStyle = '#7d838b'; g.fillRect(56, 108, 80, 6);
  if (puzzled) {
    g.fillStyle = '#ffffff'; g.fillRect(178, 8, 40, 40);
    g.fillStyle = '#1f3b70'; g.font = 'bold 36px Arial, Helvetica, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 198, 30);
  }
  // play bar
  g.fillStyle = '#16212c'; g.fillRect(0, 132, 256, 18);
  g.fillStyle = '#e8eef3'; g.beginPath(); g.moveTo(8, 135); g.lineTo(20, 141); g.lineTo(8, 147); g.fill();
  g.fillStyle = '#5d6b78'; g.fillRect(28, 139, 220, 4);
  g.fillStyle = '#d01012'; g.fillRect(28, 139, Math.round(220 * (frame + 1) / TEAM_CLIP_FRAMES), 4);
  return c;
}

// The systems map: many coloured lines (the ways sellers planned) come together into one line on the right; the other
// system runs along the bottom, with links between the two. Frame 0 = at rest (pale), MAP_FRAMES - 1 = all shown.
const MAP_W = MAP_PANELS * 90, MAP_H = 256, MERGE_Y = 100;
const FLOWS = ['#d01012', '#0a6dc2', '#2f9e44', '#f08a00', '#7a4fb5', '#00a3da'];
const MAP_NOTES: [number, number, string][] = [
  [330, 70, '#ffe066'], [520, 128, '#ff9cc0'], [700, 84, '#8fd3ff'], [880, 118, '#a8e68a'], [1060, 92, '#ffe066'],
  [1250, 180, '#ff9cc0'], [1450, 180, '#8fd3ff'],
];

function flowY(i: number, x: number): number {
  const y0 = 36 + i * 26;
  const t = Math.min(1, Math.max(0, (x - 120) / 1050));
  const e = t * t * (3 - 2 * t);
  return y0 + (MERGE_Y - y0) * e + 12 * Math.sin(x / 64 + i * 1.7) * (1 - e);
}

function paintMap(frame: number): HTMLCanvasElement {
  const [c, g] = canvas(MAP_W, MAP_H);
  g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, MAP_W, MAP_H);
  g.strokeStyle = 'rgba(40,60,90,0.07)'; g.lineWidth = 1;
  for (let x = 0; x < MAP_W; x += 30) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, MAP_H); g.stroke(); }
  for (let y = 0; y < MAP_H; y += 30) { g.beginPath(); g.moveTo(0, y); g.lineTo(MAP_W, y); g.stroke(); }
  const shown = frame >= MAP_FRAMES - 1 ? MAP_W : (MAP_W * frame) / (MAP_FRAMES - 2);
  const pale = '#c4c8ce';
  g.lineCap = 'round'; g.lineJoin = 'round';
  // the other system along the bottom, and the links into it
  g.strokeStyle = frame > 0 ? '#5d6b78' : pale; g.lineWidth = 18;
  g.beginPath(); g.moveTo(260, 216); g.lineTo(MAP_W - 20, 216); g.stroke();
  g.setLineDash([8, 8]); g.lineWidth = 4;
  for (const [x, i] of [[480, 4], [820, 2], [1250, -1], [1450, -1]] as const) {
    const y = i < 0 ? MERGE_Y : flowY(i, x);
    g.strokeStyle = x <= shown ? '#5d6b78' : pale;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x, 216); g.stroke();
  }
  g.setLineDash([]);
  // the flows: pale everywhere, coloured up to `shown`
  for (let i = 0; i < FLOWS.length; i++) {
    for (const [colour, x1] of [[pale, MAP_W], [FLOWS[i], Math.min(shown, 1180)]] as const) {
      if (x1 <= 20) continue;
      g.strokeStyle = colour; g.lineWidth = 12;
      g.beginPath(); g.moveTo(20, flowY(i, 20));
      for (let x = 30; x <= Math.min(x1, 1180); x += 10) g.lineTo(x, flowY(i, x));
      g.stroke();
    }
  }
  // the one line on the right
  const last = frame >= MAP_FRAMES - 1;
  g.strokeStyle = last ? '#1d1f22' : shown > 1180 ? '#3a4753' : pale; g.lineWidth = last ? 36 : 28;
  g.beginPath(); g.moveTo(1170, MERGE_Y); g.lineTo(MAP_W - 30, MERGE_Y); g.stroke();
  if (last) {
    g.strokeStyle = '#f2c200'; g.lineWidth = 24;
    g.beginPath(); g.moveTo(1170, MERGE_Y); g.lineTo(MAP_W - 30, MERGE_Y); g.stroke();
  }
  g.fillStyle = last ? '#f2c200' : pale;
  g.beginPath(); g.moveTo(MAP_W - 34, MERGE_Y - 26); g.lineTo(MAP_W - 6, MERGE_Y); g.lineTo(MAP_W - 34, MERGE_Y + 26); g.fill();
  // sticky notes at the crossings, once the colour has reached them
  for (const [x, y, colour] of MAP_NOTES) {
    if (x > shown) continue;
    g.fillStyle = 'rgba(0,0,0,0.15)'; g.fillRect(x - 20, y - 18, 44, 44);
    g.fillStyle = colour; g.fillRect(x - 22, y - 22, 44, 44);
  }
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

/** Paint the team room's big screen with clip frame `frame` (0 = at rest). */
export function paintLEGOHQTeamClip(model: THREE.Object3D, frame = 0): void {
  if (typeof document === 'undefined') return;
  const k = ((Math.round(frame) % TEAM_CLIP_FRAMES) + TEAM_CLIP_FRAMES) % TEAM_CLIP_FRAMES;
  const node = (model.userData.sculptRuntime?.nodes ?? {})['team-screen'] as THREE.Object3D | undefined;
  const material = unlit(paintClip(k));
  node?.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material;
  });
}

/** Paint the map room's round wall (panels map-panel-0..MAP_PANELS-1) with map frame `frame` (0 = at rest). */
export function paintLEGOHQMap(model: THREE.Object3D, frame = 0): void {
  if (typeof document === 'undefined') return;
  const k = Math.max(0, Math.min(MAP_FRAMES - 1, Math.round(frame)));
  const map = paintMap(k);
  const nodes: Record<string, THREE.Object3D> = model.userData.sculptRuntime?.nodes ?? {};
  const pw = MAP_W / MAP_PANELS;
  for (let p = 0; p < MAP_PANELS; p++) {
    const [slice, g] = canvas(pw, MAP_H);
    g.drawImage(map, p * pw, 0, pw, MAP_H, 0, 0, pw, MAP_H);
    const material = unlit(slice);
    nodes[`map-panel-${p}`]?.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).material = material;
    });
  }
}
