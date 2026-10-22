'use client';

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// The PDF.js worker ships with the site, so the viewer does not depend on a CDN.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

interface PDFViewerProps {
  url: string;
  // Page width in px. Without it, the pages fill the width of their container.
  width?: number;
  // Show a "Page 1 of 3" counter that follows the scroll (long documents such as the CV).
  showPageCounter?: boolean;
  // Draw the first page as the top of a small paper stack, with something pinned to it (the CV's "Take one" note).
  firstPageStack?: boolean;
  firstPageOverlay?: ReactNode;
}

// Draws every page of a PDF in one column, with the text layer (select, copy, search) and the link layer on.
export default function PDFViewer({ url, width, showPageCounter = false, firstPageStack = false, firstPageOverlay }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageWidth = width ?? measured;

  useEffect(() => {
    if (width !== undefined) return;
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setMeasured(Math.floor(entry.contentRect.width)));
    observer.observe(element);
    return () => observer.disconnect();
  }, [width]);

  // The counter shows the page that fills most of the view.
  useEffect(() => {
    const element = containerRef.current;
    if (!showPageCounter || !element || numPages < 2) return;
    const ratios = new Map<number, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) ratios.set(Number((entry.target as HTMLElement).dataset.page), entry.intersectionRatio);
        let best = 1;
        for (const [page, ratio] of ratios) if (ratio > (ratios.get(best) ?? 0)) best = page;
        setCurrentPage(best);
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1] }
    );
    element.querySelectorAll('[data-page]').forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [showPageCounter, numPages, pageWidth]);

  return (
    <div ref={containerRef} className="relative">
      {pageWidth > 0 && (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          externalLinkTarget="_blank"
          loading={
            <div className="flex h-96 items-center justify-center">
              <p className="text-neutral-500">Loading PDF...</p>
            </div>
          }
          error={
            <div className="flex h-96 items-center justify-center">
              <p className="text-red-500">Failed to load PDF</p>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            {Array.from({ length: numPages }, (_, i) => (
              <div key={i} data-page={i + 1} className="relative">
                {i === 0 && firstPageStack && (
                  <>
                    <div aria-hidden className="absolute inset-0 translate-x-[5px] translate-y-[6px] rotate-[0.8deg] rounded bg-white shadow-sm" />
                    <div aria-hidden className="absolute inset-0 translate-x-[2px] translate-y-[3px] -rotate-[0.5deg] rounded bg-white shadow-sm" />
                  </>
                )}
                <div className="relative overflow-hidden rounded bg-white shadow-sm">
                  <Page pageNumber={i + 1} width={pageWidth} />
                </div>
                {i === 0 && firstPageOverlay}
              </div>
            ))}
          </div>
        </Document>
      )}

      {showPageCounter && numPages > 1 && (
        <div className="pointer-events-none sticky bottom-4 mt-4 flex justify-center">
          <span className="rounded-full bg-neutral-900/90 px-3.5 py-1.5 text-[13px] font-medium text-white">
            Page {currentPage} of {numPages}
          </span>
        </div>
      )}
    </div>
  );
}
