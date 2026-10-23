'use client';

// The intro lab's controls (/tools/intro-lab): a floating card over the real page. Picks a look, replays the load
// at a chosen length, scrubs the timeline, edits the shader live, and reads the stage marks. Plain web style, as
// the panel: the city's pixel look stays inside the canvas.
import { useEffect, useMemo, useRef, useState } from 'react';
import { labStore, loadCurve, saveGlsl, shareSearch, useLabState } from '@/lib/intro/labState';
import { getCityLoad, getIntroLog, INTRO_DONE_EVENT, introLogText } from '@/lib/intro/progress';
import { INTRO_PRESETS, presetById } from '@/lib/intro/presets';
import { SNAPSHOT, fnv1a } from '@/lib/intro/snapshot';
import cityGrid from '@/lib/city/cityGrid.json';

const WAITS = [2000, 5000, 10000];
const RES = [0.25, 0.5, 1];
// what the city does after the hand-over (MainScene.landWalking): hold, glide, then the walk ring
const AFTER = [
  { id: 'hold', label: 'Close-up', ms: 1000 },
  { id: 'glide', label: 'Glide out', ms: 1200 },
  { id: 'ring', label: 'Ring', ms: 300 },
];

function fmt(ms: number) { return `${(ms / 1000).toFixed(2)} s`; }

export default function IntroLabDrawer() {
  const lab = useLabState();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<'play' | 'edit' | 'measure'>('play');
  const preset = presetById(lab.preset);
  const text = lab.glsl[preset.id] ?? preset.glsl;

  const total = lab.waitMs + lab.settleMs + lab.revealMs + AFTER.reduce((a, s) => a + s.ms, 0);
  const segments = useMemo(() => [
    { id: 'load', label: 'Load', ms: lab.waitMs, tone: 'bg-amber-300' },
    { id: 'settle', label: 'Settle', ms: lab.settleMs, tone: 'bg-amber-500' },
    { id: 'reveal', label: 'Reveal', ms: lab.revealMs, tone: 'bg-emerald-400' },
    ...AFTER.map((s) => ({ ...s, tone: 'bg-neutral-300' })),
  ], [lab.waitMs, lab.settleMs, lab.revealMs]);

  // the editor keeps its own text while typing (keyed to the look, so a new look shows its own text); the look
  // recompiles 300 ms after the last key
  const textKey = `${preset.id}\u0000${text}`;
  const [draftState, setDraftState] = useState({ key: textKey, text });
  const draft = draftState.key === textKey ? draftState.text : text;
  const timer = useRef<number>(0);
  const onEdit = (value: string) => {
    setDraftState({ key: textKey, text: value });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => saveGlsl(preset.id, value === preset.glsl ? null : value), 300);
  };

  // On a phone the card covers most of the city, so a replay steps aside: the card closes and comes back once the
  // replayed intro has handed over and the landing has glided out (the "Intro lab" pill brings it back sooner)
  const stepAside = useRef<{ onDone: () => void; timer: number } | null>(null);
  const replayAside = () => {
    if (window.innerWidth >= 768) return;
    if (stepAside.current) { window.removeEventListener(INTRO_DONE_EVENT, stepAside.current.onDone); window.clearTimeout(stepAside.current.timer); }
    const back = () => { stepAside.current = null; setOpen(true); };
    const onDone = () => {
      window.removeEventListener(INTRO_DONE_EVENT, onDone);
      if (stepAside.current) { window.clearTimeout(stepAside.current.timer); stepAside.current.timer = window.setTimeout(back, 2600); }
    };
    stepAside.current = { onDone, timer: window.setTimeout(back, 30_000) };
    window.addEventListener(INTRO_DONE_EVENT, onDone);
    setOpen(false);
  };
  useEffect(() => () => { if (stepAside.current) { window.removeEventListener(INTRO_DONE_EVENT, stepAside.current.onDone); window.clearTimeout(stepAside.current.timer); } }, []);
  const replay = (patch: Partial<typeof lab> = {}) => { labStore.set((s) => ({ mode: 'replay', scrubMs: null, run: s.run + 1, ...patch })); replayAside(); };
  const scrubTo = (ms: number) => labStore.set({ mode: 'replay', scrubMs: Math.min(total, Math.max(0, ms)) });
  // a look picked once the city has loaded replays (a real-mode run over a loaded city is a 0.8 s flash, not the look)
  const pick = (id: string) => {
    const replayNow = getCityLoad().phase === 'ready';
    labStore.set((s) => ({ preset: id, run: s.run + 1, scrubMs: s.scrubMs, mode: s.scrubMs !== null || replayNow ? 'replay' : s.mode }));
    if (replayNow) replayAside();
  };
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); } catch { window.prompt('Copy', value); } };
  const siteLink = () => `${window.location.origin}/new${shareSearch(lab)}`;
  const labLink = () => `${window.location.origin}/tools/intro-lab${shareSearch(lab)}`;

  const [marks, setMarks] = useState<{ name: string; t: number }[]>([]);
  const [report, setReport] = useState('');
  useEffect(() => {
    if (tab !== 'measure') return;
    const read = () => {
      setMarks(performance.getEntriesByType('mark').filter((m) => /^(city-|intro-)/.test(m.name)).map((m) => ({ name: m.name, t: m.startTime })));
      setReport(introLogText());
    };
    read();
    const id = window.setInterval(read, 1000);
    return () => window.clearInterval(id);
  }, [tab]);

  const progressNow = lab.scrubMs !== null ? loadCurve(lab.curve, Math.min(1, lab.scrubMs / Math.max(1, lab.waitMs))) : null;
  // the snapshot of the real city is taken by hand (art/intro/snapshot.mjs); say so when the grid has moved on since
  const gridNow = useMemo(() => fnv1a(JSON.stringify(cityGrid)), []);
  const snapshotStale = gridNow !== SNAPSHOT.gridHash;
  const kb = (n: number) => `${Math.round(n / 1024)} KB`;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => { if (stepAside.current) { window.removeEventListener(INTRO_DONE_EVENT, stepAside.current.onDone); window.clearTimeout(stepAside.current.timer); stepAside.current = null; } setOpen(true); }}
        className="fixed right-4 top-[max(1rem,env(safe-area-inset-top))] z-50 rounded-full bg-white/95 px-3 py-1.5 text-sm font-medium text-neutral-900 shadow-md ring-1 ring-black/10"
      >
        Intro lab
      </button>
    );
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 flex max-h-[70dvh] flex-col rounded-t-2xl bg-white text-neutral-900 shadow-2xl ring-1 ring-black/10 md:inset-auto md:right-4 md:top-4 md:max-h-[calc(100dvh-2rem)] md:w-[380px] md:rounded-2xl"
      data-testid="intro-lab"
    >
      <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-2.5">
        <span className={`h-2.5 w-2.5 rounded-full ${lab.compile ? (lab.compile.ok ? 'bg-emerald-500' : 'bg-red-500') : 'bg-neutral-300'}`} title={lab.compile?.ok ? 'Shader compiled' : lab.compile?.error ?? 'Not compiled yet'} />
        <strong className="text-sm">Intro lab</strong>
        <span className="ml-auto font-mono text-[11px] tabular-nums text-neutral-500">
          {lab.stats ? `${lab.stats.fps} fps · ${lab.stats.ms} ms · worst ${lab.stats.worst}` : 'no frames yet'}
        </span>
        <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-sm text-neutral-500 hover:bg-neutral-100" aria-label="Hide the lab">Hide</button>
      </div>
      <div className="flex gap-1 border-b border-neutral-200 px-2 pt-2">
        {(['play', 'edit', 'measure'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`rounded-t-md px-3 py-1.5 text-sm capitalize ${tab === t ? 'bg-neutral-100 font-medium' : 'text-neutral-500 hover:text-neutral-900'}`}>{t}</button>
        ))}
      </div>
      <div className="min-h-0 overflow-y-auto px-4 py-3 text-sm">
        {tab === 'play' && (
          <div className="space-y-4">
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Look</h3>
              <div className="flex flex-wrap gap-1.5">
                {INTRO_PRESETS.map((p) => (
                  <button key={p.id} type="button" onClick={() => pick(p.id)} title={p.blurb} className={`rounded-full px-2.5 py-1 text-[13px] ring-1 ${p.id === lab.preset ? 'bg-neutral-900 text-white ring-neutral-900' : 'bg-white ring-neutral-300 hover:bg-neutral-50'}`}>{p.name}</button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-500">{preset.blurb}</p>
            </section>
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Play</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                <button type="button" onClick={() => replay()} className="rounded-md bg-neutral-900 px-3 py-1.5 text-white">Replay</button>
                <span className="text-neutral-500">wait</span>
                {WAITS.map((w) => (
                  <button key={w} type="button" onClick={() => replay({ waitMs: w })} className={`rounded-md px-2 py-1 ring-1 ${lab.waitMs === w ? 'bg-neutral-100 ring-neutral-400' : 'ring-neutral-300'}`}>{w / 1000} s</button>
                ))}
                <input id="lab-wait" type="number" min={0.5} max={60} step={0.5} value={lab.waitMs / 1000} onChange={(e) => labStore.set({ waitMs: Number(e.target.value) * 1000 })} className="w-16 rounded-md border border-neutral-300 px-1.5 py-1" aria-label="Wait in seconds" />
                <select id="lab-curve" value={lab.curve} onChange={(e) => labStore.set({ curve: e.target.value as 'linear' | 'realistic' })} className="rounded-md border border-neutral-300 px-1.5 py-1" aria-label="Load curve">
                  <option value="realistic">realistic load</option>
                  <option value="linear">linear</option>
                </select>
                <button type="button" onClick={() => { window.location.href = `/tools/intro-lab${shareSearch({ ...lab, mode: 'real', scrubMs: null })}`; }} className="rounded-md px-2 py-1 ring-1 ring-neutral-300" title="Reload the page: the look plays over the real load">Real load</button>
              </div>
            </section>
            <section>
              <div className="mb-1.5 flex items-baseline justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Timeline</h3>
                <span className="font-mono text-[11px] tabular-nums text-neutral-500">
                  {lab.scrubMs !== null ? `${fmt(lab.scrubMs)} · load ${Math.round((progressNow ?? 0) * 100)}%` : lab.mode === 'real' ? 'real load' : 'playing'}
                </span>
              </div>
              <div className="flex h-5 w-full overflow-hidden rounded-md ring-1 ring-neutral-200">
                {segments.map((s) => (
                  <div key={s.id} className={`${s.tone} relative min-w-0 overflow-hidden text-[10px] leading-5 text-neutral-900/80`} style={{ width: `${(s.ms / total) * 100}%` }} title={`${s.label} ${s.ms} ms`}>
                    <span className="px-1">{s.label}</span>
                  </div>
                ))}
              </div>
              <input id="lab-scrub" type="range" min={0} max={total} step={10} value={lab.scrubMs ?? 0} onChange={(e) => scrubTo(Number(e.target.value))} className="mt-1 w-full" aria-label="Scrub the timeline" />
              <div className="mt-1 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => replay()} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Play from start</button>
                <button type="button" onClick={() => scrubTo(lab.waitMs * 0.5)} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Half loaded</button>
                <button type="button" onClick={() => scrubTo(lab.waitMs + lab.settleMs + lab.revealMs * 0.5)} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Mid reveal</button>
              </div>
            </section>
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Visitor</h3>
              <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2">
                <label htmlFor="lab-hour" className="text-neutral-600">Hour</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => labStore.set({ hour: null })} className={`rounded-md px-2 py-1 ring-1 ${lab.hour === null ? 'bg-neutral-100 ring-neutral-400' : 'ring-neutral-300'}`}>Now</button>
                  <input id="lab-hour" type="range" min={0} max={23.5} step={0.5} value={lab.hour ?? new Date().getHours()} onChange={(e) => labStore.set({ hour: Number(e.target.value) })} className="w-full" />
                  <span className="w-10 font-mono text-[11px] tabular-nums">{lab.hour === null ? 'now' : `${Math.floor(lab.hour)}:${lab.hour % 1 ? '30' : '00'}`}</span>
                </div>
                <span className="text-neutral-600">Motion</span>
                <div className="flex gap-1.5">
                  {([null, false, true] as const).map((v) => (
                    <button key={String(v)} type="button" onClick={() => labStore.set({ reduced: v })} className={`rounded-md px-2 py-1 ring-1 ${lab.reduced === v ? 'bg-neutral-100 ring-neutral-400' : 'ring-neutral-300'}`}>{v === null ? 'Visitor’s setting' : v ? 'Reduced' : 'Full'}</button>
                  ))}
                </div>
                <span className="text-neutral-600">Pixels</span>
                <div className="flex gap-1.5">
                  {RES.map((r) => (
                    <button key={r} type="button" onClick={() => labStore.set({ resScale: r })} className={`rounded-md px-2 py-1 ring-1 ${lab.resScale === r ? 'bg-neutral-100 ring-neutral-400' : 'ring-neutral-300'}`}>{r === 1 ? '1 per px' : r === 0.5 ? '1 per 2 px' : '1 per 4 px'}</button>
                  ))}
                </div>
                <label htmlFor="lab-settle" className="text-neutral-600">Settle</label>
                <div className="flex items-center gap-2"><input id="lab-settle" type="number" min={0} max={2000} step={50} value={lab.settleMs} onChange={(e) => labStore.set({ settleMs: Number(e.target.value) })} className="w-20 rounded-md border border-neutral-300 px-1.5 py-1" /> ms, the load bar eases to 100%</div>
                <label htmlFor="lab-reveal" className="text-neutral-600">Reveal</label>
                <div className="flex items-center gap-2"><input id="lab-reveal" type="number" min={0} max={3000} step={50} value={lab.revealMs} onChange={(e) => labStore.set({ revealMs: Number(e.target.value) })} className="w-20 rounded-md border border-neutral-300 px-1.5 py-1" /> ms, the hand-over to the real city</div>
              </div>
            </section>
            <section>
              <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-neutral-500">Share</h3>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => copy(siteLink())} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Copy link for /new</button>
                <button type="button" onClick={() => copy(labLink())} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Copy lab link</button>
              </div>
              <p className="mt-1.5 text-[12px] text-neutral-500">The /new link plays this look over the real load, once, on a phone.</p>
            </section>
          </div>
        )}
        {tab === 'edit' && (
          <div className="space-y-2">
            <p className="text-[12px] text-neutral-500">GLSL for <strong>{preset.name}</strong>. Write <code>vec4 intro(vec2 px)</code>; helpers and uniforms are in lib/intro/glsl.ts. Saved in this browser.</p>
            <textarea
              id="lab-glsl"
              value={draft}
              onChange={(e) => onEdit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Tab') return;
                e.preventDefault();
                const el = e.currentTarget;
                const v = `${el.value.slice(0, el.selectionStart)}  ${el.value.slice(el.selectionEnd)}`;
                const at = el.selectionStart + 2;
                onEdit(v);
                requestAnimationFrame(() => el.setSelectionRange(at, at));
              }}
              spellCheck={false}
              className="h-[46dvh] w-full resize-y rounded-md border border-neutral-300 bg-neutral-50 p-2 font-mono text-[12px] leading-[1.45] text-neutral-900 md:h-[52dvh]"
            />
            {lab.compile && !lab.compile.ok && <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-2 font-mono text-[11px] text-red-700">{lab.compile.error}</pre>}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => saveGlsl(preset.id, null)} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Reset to the preset</button>
              <button type="button" onClick={() => copy(draft)} className="rounded-md px-2 py-1 ring-1 ring-neutral-300">Copy GLSL</button>
            </div>
          </div>
        )}
        {tab === 'measure' && (
          <div className="space-y-2">
            <p className="text-[12px] text-neutral-500">Stage marks from this page load (performance.mark), from navigation start. Reload with Real load for a fresh set; throttle the network in DevTools for a phone&apos;s numbers.</p>
            <table className="w-full text-[13px]">
              <tbody>
                {marks.map((m) => (
                  <tr key={m.name} className="border-t border-neutral-200">
                    <td className="py-1 font-mono text-[12px]">{m.name}</td>
                    <td className="py-1 text-right font-mono tabular-nums">{(m.t / 1000).toFixed(2)} s</td>
                  </tr>
                ))}
                {marks.length === 0 && <tr><td className="py-2 text-neutral-500">No marks yet.</td></tr>}
              </tbody>
            </table>
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12px] text-neutral-600">
              <dt className="font-mono">city-boot</dt><dd>the city&apos;s script starts downloading</dd>
              <dt className="font-mono">intro-city</dt><dd>the real city&apos;s image is in: the look draws real buildings from here</dd>
              <dt className="font-mono">intro-city-exact</dt><dd>the lossless image has replaced it: the hand-over is pixel for pixel</dd>
              <dt className="font-mono">city-assets</dt><dd>every image has arrived</dd>
              <dt className="font-mono">city-scene</dt><dd>the scene is up and drawn</dd>
              <dt className="font-mono">city-ready</dt><dd>the avatar stands and the camera is close on it: the intro settles and hands over from here</dd>
              <dt className="font-mono">intro-done</dt><dd>the overlay is gone; the landing hold and glide start</dd>
            </dl>
            <section className="rounded-md bg-neutral-50 p-2 text-[12px] text-neutral-600">
              <div className="mb-1 flex items-baseline justify-between">
                <h3 className="text-xs font-medium uppercase tracking-wide text-neutral-500">Hand-over report</h3>
                <button type="button" onClick={() => copy(introLogText())} className="rounded-md px-2 py-0.5 ring-1 ring-neutral-300">Copy</button>
              </div>
              <p className="mb-1">Seconds from city-ready: the camera and the avatar at the marks, every tap, touch and key on the page, and each entry point that moves the avatar. Closes 20 s after city-ready.</p>
              <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-neutral-800">{report || (getIntroLog().length ? introLogText() : 'Nothing yet.')}</pre>
            </section>
            <section className="rounded-md bg-neutral-50 p-2 text-[12px] text-neutral-600">
              <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-neutral-500">The real city&apos;s image</h3>
              <p>
                {SNAPSHOT.w} × {SNAPSHOT.h} px of the scene by day: small {kb(SNAPSHOT.bytes.preview)}, lossless {kb(SNAPSHOT.bytes.exact)}, ids {kb(SNAPSHOT.bytes.ids)}.
                {' '}Now showing: {lab.city === 'exact' ? 'the lossless one' : lab.city === 'preview' ? 'the small one' : 'blocks (none in yet)'}.
              </p>
              {snapshotStale
                ? <p className="mt-1 font-medium text-amber-700">The city grid has changed since this image was taken. Run <code>node art/intro/build-lots.mjs</code> and <code>node art/intro/snapshot.mjs</code> against a running dev server.</p>
                : <p className="mt-1">Taken from the current city grid.</p>}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
