// The real city as an image for the load intro (art/intro/snapshot.mjs writes these). The city is pixel art drawn at
// whole-number zooms, so a snapshot at zoom 1 holds the very pixels the visitor sees after the load; the intro draws
// it from the first second, and the real scene takes over without a seam.
import snapshotJson from "./snapshot.json";

export interface SnapshotMeta {
  x: number; y: number; w: number; h: number;      // the crop, in the city's canvas (world) pixels
  canvas: [number, number];
  gridHash: string;                                // of lib/city/cityGrid.json when it was taken (fnv1a)
  bytes: { preview: number; exact: number; ids: number };
  softEdgePixels: number;
}

export const SNAPSHOT = snapshotJson as SnapshotMeta;

export const SNAPSHOT_URLS = {
  preview: "/intro/city.webp",         // lossy, small: the real city within the first second
  exact: "/intro/city-exact.webp",     // lossless, swapped in when it arrives: the hand-over is then pixel for pixel
  ids: "/intro/city-ids.png",          // which building drew each pixel (placement order), so looks can place them one by one
};

// The same hash art/intro/snapshot.mjs writes, so the lab can tell when the grid has moved on since the snapshot
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
