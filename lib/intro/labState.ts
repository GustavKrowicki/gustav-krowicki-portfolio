// Settings for the load intro, shared by the overlay on the site and the lab's controls (/tools/intro-lab). A tiny
// external store: the overlay reads it, the lab writes it, the URL seeds it so a look can be sent to a phone as a link.
import { useSyncExternalStore } from "react";
import { DEFAULT_PRESET_ID, presetById } from "./presets";
import { setIntroActive } from "./progress";

export type LoadCurve = "linear" | "realistic";

export interface LabStats { fps: number; ms: number; worst: number }

export interface LabState {
  // whether the overlay is on the page at all (first visit, ?intro=, or the lab)
  showIntro: boolean;
  preset: string;
  // edited shader text per preset (the lab's editor); missing = the preset's own
  glsl: Record<string, string>;
  // real: the city's own load; replay: a pretend load of waitMs over a city that is already there
  mode: "real" | "replay";
  waitMs: number;
  curve: LoadCurve;
  // a pinned moment on the timeline (ms), for scrubbing and for screenshots; null = playing
  scrubMs: number | null;
  hour: number | null;          // null: the visitor's clock
  reduced: boolean | null;      // null: the visitor's setting
  settleMs: number;
  revealMs: number;
  resScale: number;             // canvas pixels per CSS pixel: 0.25, 0.5, 1
  run: number;                  // bumps to start over
  lab: boolean;                 // the lab page is showing its controls
  stats: LabStats | null;
  compile: { ok: boolean; error?: string } | null;
}

// The look the site plays on a first visit. null until Gustav picks one: then only ?intro=<look> shows it.
export const INTRO_DEFAULT: string | null = null;
export const INTRO_SEEN_KEY = "city.introSeen";

const DEFAULTS: LabState = {
  showIntro: false,
  preset: DEFAULT_PRESET_ID,
  glsl: {},
  mode: "real",
  waitMs: 5000,
  curve: "realistic",
  scrubMs: null,
  hour: null,
  reduced: null,
  settleMs: 350,
  revealMs: 450,
  resScale: 0.5,
  run: 0,
  lab: false,
  stats: null,
  compile: null,
};

let state: LabState = DEFAULTS;
let seeded = false;
const listeners = new Set<() => void>();

function emit() { for (const l of listeners) l(); }

export const labStore = {
  get(): LabState {
    if (!seeded && typeof window !== "undefined") seedFromPage();
    return state;
  },
  set(patch: Partial<LabState> | ((s: LabState) => Partial<LabState>)) {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    if ("showIntro" in p) setIntroActive(state.showIntro);
    emit();
  },
  subscribe(l: () => void) { listeners.add(l); return () => { listeners.delete(l); }; },
};

export function useLabState(): LabState {
  return useSyncExternalStore(labStore.subscribe, labStore.get, () => DEFAULTS);
}

// Deep links open a place or a tab; they skip the welcome
const DEEP_LINK_KEYS = ["place", "case", "s"];

function seedFromPage() {
  seeded = true;
  const search = new URLSearchParams(window.location.search);
  const lab = window.location.pathname.startsWith("/tools/intro-lab");
  const intro = search.get("intro");
  let showIntro = false;
  let preset = DEFAULT_PRESET_ID;
  if (intro === "0") showIntro = false;
  else if (intro) { showIntro = true; preset = presetById(intro === "1" ? INTRO_DEFAULT ?? DEFAULT_PRESET_ID : intro).id; }
  else if (lab) { showIntro = true; }
  else if (INTRO_DEFAULT) {
    const deep = DEEP_LINK_KEYS.some((k) => search.has(k));
    let seen = false;
    try { seen = !!window.localStorage.getItem(INTRO_SEEN_KEY); } catch { /* no storage: show it */ }
    showIntro = !deep && !seen;
    preset = INTRO_DEFAULT;
  }
  const num = (k: string) => { const v = search.get(k); return v !== null && v !== "" && !Number.isNaN(Number(v)) ? Number(v) : null; };
  const wait = num("wait");
  const t = num("t");
  const hour = num("hour");
  const res = num("res");
  const settle = num("settle");
  const reveal = num("reveal");
  const glsl: Record<string, string> = {};
  if (lab) {
    try {
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key?.startsWith("intro-lab.glsl.")) glsl[key.slice("intro-lab.glsl.".length)] = window.localStorage.getItem(key) ?? "";
      }
    } catch { /* no storage */ }
  }
  state = {
    ...DEFAULTS,
    showIntro,
    preset,
    glsl,
    lab,
    mode: search.get("mode") === "replay" || t !== null ? "replay" : "real",
    waitMs: wait !== null ? wait * 1000 : DEFAULTS.waitMs,
    curve: search.get("curve") === "linear" ? "linear" : "realistic",
    scrubMs: t !== null ? t * 1000 : null,
    hour,
    reduced: search.get("reduced") === "1" ? true : search.get("reduced") === "0" ? false : null,
    resScale: res !== null ? res : DEFAULTS.resScale,
    settleMs: settle ?? DEFAULTS.settleMs,
    revealMs: reveal ?? DEFAULTS.revealMs,
  };
  setIntroActive(showIntro);
}

export function markIntroSeen() {
  try { window.localStorage.setItem(INTRO_SEEN_KEY, String(Date.now())); } catch { /* private window */ }
}

export function saveGlsl(presetId: string, text: string | null) {
  labStore.set((s) => {
    const glsl = { ...s.glsl };
    if (text === null) delete glsl[presetId]; else glsl[presetId] = text;
    return { glsl };
  });
  try {
    if (text === null) window.localStorage.removeItem(`intro-lab.glsl.${presetId}`);
    else window.localStorage.setItem(`intro-lab.glsl.${presetId}`, text);
  } catch { /* no storage */ }
}

// A link that opens this very moment of this look (the lab's "Copy link")
export function shareSearch(s: LabState, base: URLSearchParams = new URLSearchParams()): string {
  const q = new URLSearchParams(base);
  q.set("intro", s.preset);
  if (s.mode === "replay") q.set("mode", "replay");
  q.set("wait", String(s.waitMs / 1000));
  if (s.curve !== "realistic") q.set("curve", s.curve);
  if (s.scrubMs !== null) q.set("t", (s.scrubMs / 1000).toFixed(2));
  if (s.hour !== null) q.set("hour", String(s.hour));
  if (s.reduced !== null) q.set("reduced", s.reduced ? "1" : "0");
  if (s.resScale !== DEFAULTS.resScale) q.set("res", String(s.resScale));
  if (s.settleMs !== DEFAULTS.settleMs) q.set("settle", String(s.settleMs));
  if (s.revealMs !== DEFAULTS.revealMs) q.set("reveal", String(s.revealMs));
  return `?${q.toString()}`;
}

// A pretend load: how far along it is after `u` (0..1) of the wait
export function loadCurve(curve: LoadCurve, u: number): number {
  u = Math.min(1, Math.max(0, u));
  if (curve === "linear") return u;
  // the boot share creeps, the images come in steps with a stall around the big sheets
  const boot = 0.15 * (1 - Math.exp(-u * 12));
  const a = Math.min(1, u / 0.45);
  const stall = u > 0.45 && u < 0.62 ? 0 : Math.min(1, Math.max(0, (u - 0.62) / 0.38));
  const assets = 0.55 * a + 0.45 * stall;
  return Math.min(1, boot + 0.85 * assets);
}
