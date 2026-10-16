'use client';

import dynamic from 'next/dynamic';
import { Download, SquareArrowOutUpRight } from 'lucide-react';
import { trackCvDownloaded, trackPdfOpened } from '@/lib/analytics';

// react-pdf needs the browser and is large, so it loads only when the CV section opens.
const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), { ssr: false });

const CV_URL = '/cv/CV-Gustav-Krowicki.pdf';

function CvButtons({ className = '' }: { className?: string }) {
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
        onClick={() => trackCvDownloaded('panel')}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700 md:flex-none"
      >
        <Download className="h-4 w-4" />
        Download
      </a>
    </div>
  );
}

// The real CV PDF, with selectable text and live links. The shell widens the panel to reading width for it.
export default function CvSection() {
  return (
    <div className="relative">
      <div className="px-6 py-6">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-neutral-900">Resume</h2>
          <CvButtons className="hidden md:flex" />
        </div>
        <div className="mt-6">
          <PDFViewer url={CV_URL} showPageCounter />
        </div>
      </div>
      {/* Phones: the buttons stay in reach above the tab bar. */}
      <div className="sticky bottom-0 border-t border-neutral-200 bg-[#F3F0EC] px-6 py-3 md:hidden">
        <CvButtons />
      </div>
    </div>
  );
}
