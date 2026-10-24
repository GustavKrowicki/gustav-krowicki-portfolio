'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react';
import { ArrowUpRight, Check, Download } from 'lucide-react';
import { trackCvDownloaded, trackPdfOpened } from '@/lib/analytics';
import { flyCvToDownloads, isAppleTouch } from '@/lib/cvTake';

// react-pdf needs the browser and is large, so it loads only when the CV section opens.
const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), { ssr: false });

const CV_URL = '/cv/CV-Gustav-Krowicki.pdf';
const CV_FILE_NAME = 'CV-Gustav-Krowicki.pdf';
const SAVED_MS = 2000;

// The real CV PDF, with selectable text and live links. The shell widens the panel to reading width for it.
// The first page lies on a small stack with a "Take one" note, the one way to download: taking it starts the
// download (or the share sheet on iPhone), and a copy flies to the browser's own downloads (lib/cvTake.ts) while
// the next copy stays underneath.
export default function CvSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const noteRef = useRef<HTMLAnchorElement>(null);
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // The PDF as a file for the share sheet on iPhone and iPad. It is fetched up front, because the share
  // sheet only opens straight from the tap.
  const fileRef = useRef<File | null>(null);
  useEffect(() => {
    if (!isAppleTouch() || typeof navigator.canShare !== 'function') return;
    let cancelled = false;
    fetch(CV_URL)
      .then((response) => response.blob())
      .then((blob) => {
        const file = new File([blob], CV_FILE_NAME, { type: 'application/pdf' });
        if (!cancelled && navigator.canShare({ files: [file] })) fileRef.current = file;
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const showSaved = useCallback(() => {
    setSaved(true);
    savedTimer.current = setTimeout(() => setSaved(false), SAVED_MS);
  }, []);

  // Elsewhere the link's own download runs as normal, and the motion plays alongside it. On iPhone and iPad the
  // share sheet opens instead ("Save to Files", Mail, AirDrop), so the visitor stays in the city; the sheet drops
  // into it, and the note says "Saved" only if they saved or sent it.
  const take = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      trackCvDownloaded('note');
      const page = rootRef.current?.querySelector<HTMLElement>('[data-page="1"]') ?? null;
      clearTimeout(savedTimer.current);
      setSaved(false);
      const file = fileRef.current;
      if (file) {
        event.preventDefault();
        navigator.share({ files: [file] }).then(showSaved, () => {});
        flyCvToDownloads(page, noteRef.current, () => {});
        return;
      }
      flyCvToDownloads(page, noteRef.current, showSaved);
    },
    [showSaved]
  );

  const note = (
    <a
      ref={noteRef}
      href={CV_URL}
      download
      onClick={take}
      aria-label={saved ? 'CV saved' : 'Take one: download the CV'}
      className="absolute -right-3 -top-3 z-10 flex h-[76px] w-[80px] rotate-[4deg] flex-col items-center justify-center gap-1 bg-[#F7E8A4] text-center text-[14px] font-medium leading-tight text-[#4A3F14] shadow-[0_2px_6px_rgba(0,0,0,0.16)] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] [@media(hover:hover)_and_(pointer:fine)]:hover:rotate-[2deg]"
    >
      {saved ? <Check className="h-4 w-4" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
      <span aria-live="polite">{saved ? 'Saved' : 'Take one'}</span>
    </a>
  );

  return (
    <div ref={rootRef} className="relative px-6 py-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-2xl font-semibold text-neutral-900">Resume</h2>
        <a
          href={CV_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackPdfOpened('cv')}
          className="inline-flex items-center gap-1 text-sm font-medium text-neutral-600 underline decoration-neutral-300 underline-offset-4 hover:text-neutral-900 hover:decoration-neutral-500"
        >
          Open PDF
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
        </a>
      </div>
      <div className="mt-6 pr-1">
        <PDFViewer url={CV_URL} showPageCounter firstPageStack firstPageOverlay={note} />
      </div>
    </div>
  );
}
