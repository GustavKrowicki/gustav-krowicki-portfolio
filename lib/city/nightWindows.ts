// Lit windows for the filler sprites at night (POR-39), found in the sprite itself so every house gets them without hand
// masks: window glass in the pogicity art is a cool blue or blue-grey, in small upright patches. Each patch is one
// window; windows are split at random into groups A and B so a house can be half lit. Food places and the bar also get
// their shopfront: the dark glass in the lower half of the front face.

export interface WindowLayers {
  width: number;
  height: number;
  a: ImageData;
  b: ImageData;
  front: ImageData | null;
}

const LIT: [number, number, number][] = [[255, 204, 118], [255, 214, 140], [255, 196, 104], [255, 226, 168]];
const SHOP: [number, number, number] = [255, 210, 140];

function hsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, max === 0 ? 0 : d / max, max / 255];
}

const isGlass = (r: number, g: number, b: number) => {
  const [h, s, v] = hsv(r, g, b);
  return v > 0.12 && v < 0.92 && h > 0.47 && h < 0.72 && s > 0.06 && b >= r + 6;
};

// shopfront: which half of the sprite holds the front face ("left" for a building facing +y, "right" for +x), or null
export function findWindows(src: ImageData, shopfront: "left" | "right" | null): WindowLayers {
  const { width: w, height: h, data } = src;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 200) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  const a = new ImageData(w, h), b = new ImageData(w, h);
  const front = shopfront ? new ImageData(w, h) : null;
  if (x1 < 0) return { width: w, height: h, a, b, front };

  // Glass pixels, then patches of them (4-connected)
  const glass = new Uint8Array(w * h);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] >= 200 && isGlass(data[i], data[i + 1], data[i + 2])) glass[y * w + x] = 1;
    }
  }
  const seen = new Uint8Array(w * h);
  let n = 0;
  for (let p = 0; p < w * h; p++) {
    if (!glass[p] || seen[p]) continue;
    const patch: number[] = [];
    const stack = [p];
    seen[p] = 1;
    let px0 = w, px1 = 0, py0 = h, py1 = 0;
    while (stack.length) {
      const q = stack.pop()!;
      patch.push(q);
      const qx = q % w, qy = (q - qx) / w;
      px0 = Math.min(px0, qx); px1 = Math.max(px1, qx); py0 = Math.min(py0, qy); py1 = Math.max(py1, qy);
      for (const r of [q - 1, q + 1, q - w, q + w]) {
        if (r < 0 || r >= w * h || seen[r] || !glass[r]) continue;
        if (Math.abs((r % w) - qx) > 1) continue;
        seen[r] = 1;
        stack.push(r);
      }
    }
    // A window is a small upright patch; long thin runs are roof trim, wide flat ones are skylights on a roof
    const bw = px1 - px0 + 1, bh = py1 - py0 + 1;
    if (patch.length < 2 || patch.length > 90 || bw > 14 || bh < 3 || bh > 20 || bw > bh * 1.6) continue;
    n++;
    const target = (n * 2654435761) % 100 < 55 ? a : b;
    const [cr, cg, cb] = LIT[(n * 7) % LIT.length];
    for (const q of patch) {
      const i = q * 4;
      target.data[i] = cr; target.data[i + 1] = cg; target.data[i + 2] = cb; target.data[i + 3] = 255;
    }
  }

  // Shopfront: the dark or grey glass in the lower half of the front face
  if (front) {
    const cx = (x0 + x1) / 2, low = y0 + (y1 - y0) * 0.5;
    for (let y = Math.ceil(low); y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (shopfront === "left" ? x >= cx : x <= cx) continue;
        const i = (y * w + x) * 4;
        if (data[i + 3] < 200 || a.data[i + 3] || b.data[i + 3]) continue;
        const [hue, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
        // Dark or grey-blue glass; not black outlines, not brown wood or brick in shadow
        if (v < 0.08 || (hue < 0.14 && s > 0.35)) continue;
        const shop = (v < 0.32 && data[i + 2] >= data[i] - 8) || (s < 0.18 && v > 0.35 && v < 0.8 && data[i + 2] >= data[i]);
        if (!shop) continue;
        // Keep the art's detail: the light follows the pixel's own brightness (mullions stay darker than the panes)
        const k = 0.55 + 0.45 * Math.min(1, v / 0.6);
        front.data[i] = SHOP[0] * k; front.data[i + 1] = SHOP[1] * k; front.data[i + 2] = SHOP[2] * k;
        front.data[i + 3] = 150 + 40 * k;
      }
    }
  }
  return { width: w, height: h, a, b, front };
}
