'use client';

// The load intro (POR-40): a shader over the city area from the first paint until the city is ready, then a short
// hand-over and it is gone. While the city loads it takes the taps on the city area and drops them (a tap on a city
// that is not showing yet would walk the avatar somewhere unseen); from the hand-over on it lets them through. The
// panel beside it is readable and usable the whole time. The frame it fades into is read from the city's own camera
// (lib/intro/progress.ts getCityFraming), not only computed. Settings come from lib/intro/labState.ts; the lab
// (/tools/intro-lab) edits them live.
import { useEffect, useRef, useState } from 'react';
import { HOUR_OF, type TimeOfDay } from '@/lib/city/nightSchedule';
import { GAME_HEIGHT, GAME_WIDTH, closeUpFraming, fitFraming, isPhoneViewport, lerpFraming, stageFor, streetFraming, worldFromContainer } from '@/lib/intro/camera';
import { labStore, loadCurve, markIntroSeen, useLabState } from '@/lib/intro/labState';
import { presetById } from '@/lib/intro/presets';
import { getCityFraming, getCityLoad, INTRO_DONE_EVENT, INTRO_REPLAY_EVENT, mark, overallProgress, subscribeCityLoad } from '@/lib/intro/progress';
import { IntroRenderer } from '@/lib/intro/renderer';

const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoothstep = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// The visitor's hour: the time-of-day button's pick, ?hour=, else the clock (same reading as CityViewer)
function visitorHour(): number {
  try {
    const search = new URLSearchParams(window.location.search);
    const h = search.get('hour');
    if (h !== null && /^\d{1,2}$/.test(h) && Number(h) < 24) return Number(h);
    const saved = window.localStorage.getItem('city-time-of-day') as TimeOfDay | null;
    if (saved && saved in HOUR_OF && HOUR_OF[saved] !== null) return HOUR_OF[saved] as number;
  } catch { /* no storage */ }
  const d = new Date();
  return d.getHours() + d.getMinutes() / 60;
}

// Where on the timeline the overlay is: what the shader gets, whether the load is over (settle and reveal run), and
// whether it is over
interface Moment { progress: number; reveal: number; landed: boolean; after: number; done: boolean; time: number }

export default function IntroOverlay({ onDone }: { onDone?: () => void }) {
  const lab = useLabState();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<IntroRenderer | null>(null);
  const [done, setDone] = useState(false);
  const [caption, setCaption] = useState(false);
  const preset = presetById(lab.preset);
  const glsl = lab.glsl[preset.id] ?? preset.glsl;

  // Compile whenever the look or its text changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!rendererRef.current) {
      const renderer = new IntroRenderer(canvas);
      // the real city's image: a stage mark when the small one is in, another when the lossless one has replaced it
      renderer.onCity = (stage) => { mark(stage === 'preview' ? 'intro-city' : 'intro-city-exact'); labStore.set({ city: stage }); };
      rendererRef.current = renderer;
    }
    const result = rendererRef.current.setFragment(glsl);
    labStore.set({ compile: result });
    if (!result.ok && !lab.lab) {
      // a broken look on the live site: step aside at once
      setDone(true);
    }
  }, [glsl, lab.lab]);

  useEffect(() => () => { rendererRef.current?.dispose(); rendererRef.current = null; }, []);

  // The frame loop
  const labRef = useRef(lab);
  labRef.current = lab;
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || done) return;
    const s = labRef.current;
    const phone = isPhoneViewport();
    const reduced = s.reduced ?? (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
    const seed = Math.random();
    // the lab and the e2e tests read the framing the overlay is on (window.__introFraming)
    const debug = s.lab || /[?&]e2e=1(&|$)/.test(window.location.search);
    const startAt = performance.now();
    mark('intro-start');
    let readyAt: number | null = null;
    let progressAtReady = 1;
    let pointer: [number, number] = [-1, -1];
    let frames = 0; let frameMs = 0; let worst = 0; let statsAt = startAt;
    let finished = false;
    let raf = 0;
    // the framing the overlay was on when the load ended: it eases from there onto the city's real camera over the
    // settle, so the reveal fades between two frames of the same place
    let atLanding: { scrollX: number; scrollY: number; zoom: number } | null = null;

    // real mode: the city's own load; it may already be ready (a lab restart while the city is up, or a fast cache)
    const unsubscribe = subscribeCityLoad(() => { /* read each frame */ });
    if (s.mode === 'real' && getCityLoad().phase === 'ready') { readyAt = startAt; progressAtReady = 1; }
    // a replay in the lab: the city goes back to where a first visit starts (the close-up on the spawn) and lands again
    if (s.lab && s.mode === 'replay') window.dispatchEvent(new CustomEvent(INTRO_REPLAY_EVENT));

    const momentAt = (nowMs: number): Moment => {
      const st = labRef.current;
      const t = st.scrubMs !== null ? st.scrubMs : nowMs - startAt;
      let loadEnd: number;
      let pNow: number;
      if (st.mode === 'replay') {
        loadEnd = st.waitMs;
        pNow = loadCurve(st.curve, t / Math.max(1, st.waitMs));
      } else {
        const load = getCityLoad();
        if (load.phase === 'ready' && readyAt === null) { readyAt = nowMs; progressAtReady = overallProgress(load, nowMs - startAt); mark('intro-ready'); }
        loadEnd = readyAt === null ? Infinity : readyAt - startAt;
        pNow = readyAt === null ? overallProgress(load, t) : progressAtReady;
      }
      if (t < loadEnd) return { progress: pNow, reveal: 0, landed: false, after: 0, done: false, time: t / 1000 };
      const after = t - loadEnd;
      const settle = Math.max(1, st.settleMs);
      const pEnd = st.mode === 'replay' ? loadCurve(st.curve, 1) : progressAtReady;
      const progress = pEnd + (1 - pEnd) * easeOut(after / settle);
      const reveal = after < settle ? 0 : easeOut((after - settle) / Math.max(1, st.revealMs));
      return { progress, reveal, landed: true, after, done: after >= settle + st.revealMs, time: t / 1000 };
    };

    const onPointer = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      pointer = [(e.clientX - r.left) * (canvas.width / r.width), (e.clientY - r.top) * (canvas.height / r.height)];
    };
    window.addEventListener('pointermove', onPointer, { passive: true });

    const finish = () => {
      if (finished) return;
      finished = true;
      mark('intro-done');
      if (!labRef.current.lab) markIntroSeen();
      window.dispatchEvent(new CustomEvent(INTRO_DONE_EVENT));
      setDone(true);
      onDone?.();
    };

    const frame = (nowMs: number) => {
      const st = labRef.current;
      const renderer = rendererRef.current;
      const r = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const w = Math.max(1, Math.round(r.width * dpr * st.resScale));
      const h = Math.max(1, Math.round(r.height * dpr * st.resScale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      const m = momentAt(nowMs);
      if (m.done && st.scrubMs === null) { finish(); return; }
      // taps on a city that is not showing yet are dropped here; from the hand-over on they reach the city (the lab
      // keeps its controls reachable throughout)
      root.style.pointerEvents = m.reveal > 0 || st.lab ? 'none' : 'auto';

      // the camera: from the whole city down to where the real city's first frame is
      const stage = stageFor(r.width, r.height, phone);
      const fit = fitFraming(r.width, r.height, phone);
      const landing = reduced ? streetFraming(phone) : closeUpFraming();
      // the whole city holds for the first third of the load, then the camera comes down to the avatar
      const camT = preset.camera === 'fit' ? 0 : preset.camera === 'close' || reduced ? 1 : easeInOut(smoothstep(0.3, 1, m.progress));
      const planned = lerpFraming(fit, landing, camT);
      // once the load is over, the frame to fade into is the one the city's camera is really on (an avatar that has
      // walked off, a camera moved by hand); the planned frame is the same on a plain first visit, so nothing moves
      const live = m.landed ? getCityFraming() : null;
      if (!m.landed) atLanding = planned;
      const framing = live ? lerpFraming(atLanding ?? planned, live, easeOut(m.after / Math.max(1, st.settleMs))) : planned;
      if (debug) (window as unknown as { __introFraming?: typeof framing }).__introFraming = framing;
      const w2s = worldFromContainer(framing, stage);
      const cssPerCanvas = r.width / w;
      renderer?.render({
        time: m.time,
        progress: m.progress,
        reveal: m.reveal,
        hour: st.hour ?? visitorHour(),
        reduced,
        seed,
        pixel: cssPerCanvas,
        w2s: [w2s.scale * cssPerCanvas, w2s.offX, w2s.offY],
        pointer,
        stage: [stage.offX / cssPerCanvas, stage.offY / cssPerCanvas, (GAME_WIDTH * stage.scale) / cssPerCanvas, (GAME_HEIGHT * stage.scale) / cssPerCanvas],
      });
      setCaption(m.progress > 0.25 && m.reveal === 0);

      // frame stats for the lab
      const spent = performance.now() - nowMs;
      frames++; frameMs += spent; worst = Math.max(worst, spent);
      if (nowMs - statsAt > 500) {
        if (st.lab) labStore.set({ stats: { fps: Math.round((frames * 1000) / (nowMs - statsAt)), ms: Number((frameMs / frames).toFixed(1)), worst: Number(worst.toFixed(1)) } });
        frames = 0; frameMs = 0; worst = 0; statsAt = nowMs;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // the intro never holds the city hostage: a real load that takes forever still lands after this
    const safety = window.setTimeout(() => { if (labRef.current.mode === 'real' && labRef.current.scrubMs === null) finish(); }, 45_000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(safety);
      window.removeEventListener('pointermove', onPointer);
      unsubscribe();
    };
    // the loop reads live settings through labRef; only a restart (run) or the look's camera remounts it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done, lab.run, preset.id]);

  if (done) return null;
  const reducedCss = (lab.reduced ?? false) || (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 z-[25]" data-testid="intro-overlay" aria-hidden="true">
      <canvas ref={canvasRef} className="block h-full w-full" style={{ imageRendering: 'pixelated' }} />
      {preset.line && (
        <div
          className="absolute inset-x-0 bottom-[14%] flex justify-center px-4 text-center text-[12px] leading-snug text-[#F4EAD6] [text-shadow:0_1px_0_rgba(0,0,0,0.5)]"
          style={{
            fontFamily: 'var(--font-geist-mono), ui-monospace, monospace',
            opacity: caption ? 1 : 0,
            transform: caption || reducedCss ? 'translateY(0)' : 'translateY(8px)',
            transition: reducedCss ? 'opacity 300ms ease-out' : 'opacity 300ms cubic-bezier(0.23,1,0.32,1), transform 300ms cubic-bezier(0.23,1,0.32,1)',
          }}
        >
          {preset.line}
        </div>
      )}
    </div>
  );
}
