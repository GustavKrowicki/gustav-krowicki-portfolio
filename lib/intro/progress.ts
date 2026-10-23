// How far the city has loaded, for the load intro (POR-40). The city reports here from four places: CityViewer when
// the Phaser chunk starts downloading (boot), MainScene.preload as the images arrive (assets), MainScene.create when
// the scene is up (scene), CityViewer once the avatar has spawned and the camera is close on it (ready). The intro
// overlay (components/city/IntroOverlay.tsx) reads one number from it, 0 to 1, and hands over on ready.

export type CityLoadPhase = "idle" | "boot" | "assets" | "ready";

export interface CityLoadState {
  phase: CityLoadPhase;
  // the Phaser loader's own 0..1 (assets phase)
  assets: number;
  startedAt: number;
  readyAt: number | null;
}

// Share of the bar each phase gets. The boot phase has no real progress (a script download), so the overlay creeps
// through its share on time; the images then take the rest.
export const BOOT_SHARE = 0.15;
export const ASSETS_SHARE = 0.8;

let state: CityLoadState = { phase: "idle", assets: 0, startedAt: 0, readyAt: null };
const listeners = new Set<(s: CityLoadState) => void>();

function emit() {
  for (const l of listeners) l(state);
}

export function getCityLoad(): CityLoadState {
  return state;
}

export function subscribeCityLoad(listener: (s: CityLoadState) => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function reportCityBoot(): void {
  if (state.phase !== "idle") return;
  state = { ...state, phase: "boot", startedAt: performance.now() };
  mark("city-boot");
  emit();
}

export function reportCityAssets(progress: number): void {
  if (state.phase === "ready") return;
  const p = Math.max(state.assets, Math.min(1, Math.max(0, progress)));
  if (state.phase === "assets" && p === state.assets) return;
  if (state.phase === "idle") state = { ...state, startedAt: performance.now() };
  state = { ...state, phase: "assets", assets: p };
  if (p >= 1) mark("city-assets");
  emit();
}

// The scene is up (MainScene.create): every image is in, the grid is drawn. Not yet ready for the intro's hand-over:
// the avatar has not spawned and the camera is not where a first visit starts
export function reportCityScene(): void {
  if (state.phase === "ready") return;
  state = { ...state, phase: "assets", assets: 1 };
  mark("city-scene");
  emit();
}

// The first frame a visitor sees is in place (CityViewer: the avatar spawned, the camera close on it): the intro may
// hand over now. Measured: the scene reports up to 0.7 s before this on a phone, and the close-up came a frame later
// still, so a hand-over on "scene up" showed the whole city at zoom 1 and then snapped to the avatar
export function reportCityReady(): void {
  if (state.phase === "ready") return;
  state = { ...state, phase: "ready", assets: 1, readyAt: performance.now() };
  mark("city-ready");
  emit();
}

// Overall 0..1 for an overlay that has been showing for `elapsedMs`. The boot share creeps up on time so the bar
// never sits still; the assets share is the loader's own number.
export function overallProgress(s: CityLoadState, elapsedMs: number): number {
  if (s.phase === "ready") return 1;
  const creep = BOOT_SHARE * (1 - Math.exp(-elapsedMs / 1500));
  if (s.phase === "idle" || s.phase === "boot") return creep;
  return BOOT_SHARE + ASSETS_SHARE * s.assets;
}

// Stage marks for the Performance panel and for measuring (the brief's "stage table")
export function mark(name: string): void {
  try { performance.mark(name); } catch { /* old browser */ }
}

// The intro tells the city when its reveal has ended, so the landing glide starts from a city the visitor can see
export const INTRO_DONE_EVENT = "city:intro-done";
// The lab's Replay: the city goes back to the close-up on the spawn and runs its landing again after the hand-over
export const INTRO_REPLAY_EVENT = "city:intro-replay";

let introActiveFlag = false;
export function setIntroActive(active: boolean): void { introActiveFlag = active; }
export function isIntroActive(): boolean { return introActiveFlag; }

// Where the city's camera really is, read each frame by the overlay for its hand-over (CityViewer registers the
// reader). The overlay computes the first frame on its own (lib/intro/camera.ts) while the city loads, but the frame
// it fades into is the one the camera is on: an avatar that has moved, or a camera moved by hand, is followed, not
// guessed. Null until the landing camera is in place.
export interface CityFraming { scrollX: number; scrollY: number; zoom: number }
let framingReader: (() => CityFraming | null) | null = null;
export function setCityFramingReader(reader: (() => CityFraming | null) | null): void { framingReader = reader; }
export function getCityFraming(): CityFraming | null {
  try { return framingReader?.() ?? null; } catch { return null; }
}

// The hand-over report: what the city did around the hand-over, written by CityViewer (camera and avatar at
// city-ready, at intro-done and 3 s later; taps, touches and keys on the page; the avatar's first moves) and by
// PlayerController (every entry point that moves the avatar). The lab's Measure tab shows it with a Copy button, so a
// phone can tell what moved the avatar or the camera; window.__introLog for the tests. Capped, and closed by
// closeIntroLog 20 s after city-ready.
export interface IntroLogEntry { t: number; what: string; detail?: string }
const introLog: IntroLogEntry[] = [];
let introLogOpen = true;
export function logIntro(what: string, detail?: string): void {
  if (!introLogOpen || introLog.length >= 80) return;
  introLog.push({ t: Math.round(performance.now()), what, detail });
  try { (window as unknown as { __introLog?: IntroLogEntry[] }).__introLog = introLog; } catch { /* no window */ }
}
export function getIntroLog(): IntroLogEntry[] { return introLog; }
export function closeIntroLog(): void { introLogOpen = false; }
export function introLogText(): string {
  const ready = introLog.find((e) => e.what === "city-ready")?.t ?? introLog[0]?.t ?? 0;
  return introLog.map((e) => `${((e.t - ready) / 1000).toFixed(2).padStart(7)} s  ${e.what}${e.detail ? "  " + e.detail : ""}`).join("\n");
}

// Test and lab hook: start over as if nothing had loaded (the lab replays the intro over a loaded city instead)
export function resetCityLoadForTests(): void {
  state = { phase: "idle", assets: 0, startedAt: 0, readyAt: null };
  emit();
}
