'use client';

import dynamic from 'next/dynamic';
import { Download, SquareArrowOutUpRight } from 'lucide-react';
import Container from '@/components/ui/Container';
import { trackPdfOpened } from '@/lib/analytics';

const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-neutral-50 rounded-lg">
      <p className="text-neutral-500">Loading PDF...</p>
    </div>
  ),
});

interface Recommendation {
  name: string;
  role?: string;
  // One line copied word for word from the letter, for visitors who skim.
  quote?: string;
  pdfUrl: string;
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  title?: React.ReactNode;
}

// Each letter: the quote and who wrote it on top, then the real PDF with selectable text.
export default function RecommendationsSection({
  recommendations,
  title = 'Recommendations',
}: RecommendationsSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <Container maxWidth="container">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">{title}</h2>
        <div className="mx-auto flex max-w-3xl flex-col gap-8">
          {recommendations.map((rec) => (
            <figure key={rec.name} className="bg-white rounded-2xl p-5 md:p-7 shadow-sm">
              {rec.quote && (
                <blockquote className="border-l-[3px] border-neutral-900 pl-4 text-lg md:text-xl font-medium leading-snug text-neutral-900">
                  “{rec.quote}”
                </blockquote>
              )}
              <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
                <figcaption>
                  <span className="block font-semibold text-neutral-900">{rec.name}</span>
                  {rec.role && <span className="block text-sm text-neutral-500">{rec.role}</span>}
                </figcaption>
                <div className="flex items-center gap-2">
                  <a
                    href={rec.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => trackPdfOpened('recommendation', rec.name)}
                    className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-3.5 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-50"
                  >
                    <SquareArrowOutUpRight className="h-4 w-4" />
                    Open PDF
                  </a>
                  <a
                    href={rec.pdfUrl}
                    download
                    className="flex items-center gap-2 rounded-full bg-neutral-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-neutral-700"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </a>
                </div>
              </div>
              <div className="mt-6">
                <PDFViewer url={rec.pdfUrl} />
              </div>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
