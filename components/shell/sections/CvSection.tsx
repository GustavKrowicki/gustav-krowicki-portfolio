'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Check, Download, SquareArrowOutUpRight } from 'lucide-react';
import { trackCvDownloaded, trackPdfOpened } from '@/lib/analytics';
import { flyCvToDownloads } from '@/lib/cvTake';

// react-pdf needs the browser and is large, so it loads only when the CV section opens.
const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), { ssr: false });

const CV_URL = '/cv/CV-Gustav-Krowicki.pdf';
const SAVED_MS = 2000;

function CvButtons({ className = '', saved, onDownload }: { className?: string; saved: boolean; onDownload: (event: MouseEvent<HTMLAnchorElement>) => void }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <a
        href={CV_URL}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => trackPdfOpened('cv')}
        className="flex flex-1 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50 md:flex-none"
      >
        <SquareArrowOutUpRight className="h-4 w-4" />
        Open PDF
      </a>
      <a
        href={CV_URL}
        download
        data-cv-download
        onClick={onDownload}
        className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium text-white transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] md:flex-none ${
          saved ? 'bg-emerald-700' : 'bg-neutral-900 hover:bg-neutral-700'
        }`}
      >
        {saved ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
        <span aria-live="polite">{saved ? 'Saved' : 'Download'}</span>
      </a>
    </div>
  );
}

// The real CV PDF, with selectable text and live links. The shell widens the panel to reading width for it.
// The first page lies on a small stack with a "Take one" note: taking it downloads the CV, and the copy flies to
// the browser's own downloads (lib/cvTake.ts) while the next copy stays underneath.
export default function CvSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  // The link's own download runs as normal; the motion only plays alongside it.
  const take = useCallback((source: 'panel' | 'note') => (event: MouseEvent<HTMLAnchorElement>) => {
    trackCvDownloaded(source);
    const root = rootRef.current;
    const page = root?.querySelector<HTMLElement>('[data-page="1"]') ?? null;
    const visibleButton = Array.from(root?.querySelectorAll<HTMLElement>('[data-cv-download]') ?? []).find((b) => b.offsetParent !== null);
    const button = source === 'panel' ? event.currentTarget : visibleButton ?? null;
    clearTimeout(savedTimer.current);
    setSaved(false);
    flyCvToDownloads(page, button, () => {
      setSaved(true);
      savedTimer.current = setTimeout(() => setSaved(false), SAVED_MS);
    });
  }, []);

  const note = (
    <a
      href={CV_URL}
      download
      onClick={take('note')}
      aria-label="Take one: download the CV"
      className="absolute -right-3 -top-3 z-10 flex h-16 w-[72px] rotate-[4deg] items-center justify-center bg-[#F7E8A4] text-center text-[15px] font-medium leading-tight text-[#4A3F14] shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:rotate-[2deg]"
    >
      Take
      <br />
      one
    </a>
  );

  return (
    <div ref={rootRef} className="relative">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-neutral-900">Resume</h2>
          <CvButtons className="hidden md:flex" saved={saved} onDownload={take('panel')} />
        </div>
        <div className="mt-6 pr-1">
          <PDFViewer url={CV_URL} showPageCounter firstPageStack firstPageOverlay={note} />
        </div>
      </div>
      {/* Phones: the buttons stay in reach above the tab bar. */}
      <div className="sticky bottom-0 border-t border-neutral-200 bg-[#F3F0EC] px-6 py-3 md:hidden">
        <CvButtons saved={saved} onDownload={take('panel')} />
      </div>
    </div>
  );
}
