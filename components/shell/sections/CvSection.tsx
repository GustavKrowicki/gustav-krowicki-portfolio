'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Download } from 'lucide-react';
import { trackCvDownloaded } from '@/lib/analytics';

// react-pdf needs the browser and is large, so it loads only when the CV section opens.
const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), { ssr: false });

const CV_URL = '/cv/CV-Gustav-Krowicki.pdf';

export default function CvSection() {
  // The PDF page is drawn at a fixed pixel width, so follow the width of the panel.
  const previewRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="px-6 py-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-neutral-900">Resume</h2>
        <a
          href={CV_URL}
          download
          onClick={() => trackCvDownloaded('panel')}
          className="flex items-center gap-2 text-sm font-medium text-neutral-900 underline underline-offset-4"
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </div>
      <div ref={previewRef} className="mt-6 overflow-hidden rounded-lg bg-white">
        {width > 0 && <PDFViewer url={CV_URL} width={width} />}
      </div>
    </div>
  );
}
