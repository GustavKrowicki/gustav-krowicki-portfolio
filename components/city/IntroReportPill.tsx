'use client';

// The hand-over report on the real site: /?report=1 shows a small pill after the load; it opens the report
// (lib/intro/progress.ts logIntro) with a Copy button, so a phone can send what happened at the hand-over on the
// real page, not only in the lab. Off without the parameter.
import { useEffect, useState } from 'react';
import { getIntroLog, introLogText } from '@/lib/intro/progress';

export default function IntroReportPill() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  useEffect(() => {
    if (!open) return;
    const tick = () => setText(getIntroLog().length ? introLogText() : 'Nothing yet.');
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open]);
  const copy = async () => { try { await navigator.clipboard.writeText(introLogText()); } catch { window.prompt('Copy', introLogText()); } };
  return (
    <div className="pointer-events-none fixed inset-x-3 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-start gap-2 md:bottom-4 md:left-auto md:right-4 md:max-w-md" data-testid="intro-report">
      {open && (
        <div className="pointer-events-auto w-full rounded-lg bg-white/95 p-2 text-neutral-800 shadow-lg ring-1 ring-neutral-300">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Hand-over report</span>
            <span className="flex gap-1">
              <button type="button" onClick={copy} className="rounded-md px-2 py-0.5 text-xs ring-1 ring-neutral-300">Copy</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-0.5 text-xs ring-1 ring-neutral-300">Close</button>
            </span>
          </div>
          <pre className="max-h-[40vh] overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug">{text}</pre>
        </div>
      )}
      <button type="button" onClick={() => setOpen((v) => !v)} className="pointer-events-auto rounded-full bg-white/90 px-3 py-1 font-mono text-xs text-neutral-800 shadow ring-1 ring-neutral-300">
        {open ? 'Hide report' : 'Report'}
      </button>
    </div>
  );
}
