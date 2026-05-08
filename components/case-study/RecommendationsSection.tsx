'use client';

import dynamic from 'next/dynamic';
import Container from '@/components/ui/Container';

const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96 bg-neutral-50">
      <p className="text-neutral-500 italic">Loading…</p>
    </div>
  ),
});

interface Recommendation {
  name: string;
  role?: string;
  pdfUrl: string;
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  eyebrow?: string;
  title?: React.ReactNode;
}

export default function RecommendationsSection({
  recommendations,
  eyebrow = 'References',
  title,
}: RecommendationsSectionProps) {
  return (
    <section className="py-24 md:py-32 border-t border-neutral-200">
      <Container maxWidth="container">
        <div className="grid grid-cols-12 gap-6 md:gap-8 mb-16 md:mb-20">
          <div className="col-span-12 md:col-span-2 mb-4 md:mb-0">
            <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">
              {eyebrow}
            </span>
          </div>
          <div className="col-span-12 md:col-span-9">
            <h2 className="text-4xl md:text-6xl font-light leading-[1.05] tracking-tight text-neutral-900">
              {title ?? (
                <>
                  Letters of{' '}
                  <em className="italic font-light text-neutral-500">recommendation</em>.
                </>
              )}
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-12 md:gap-16">
          {recommendations.map((rec) => (
            <figure key={rec.name} className="space-y-5">
              <div className="bg-white border border-neutral-200">
                <PDFViewer url={rec.pdfUrl} />
              </div>
              <figcaption className="flex items-baseline gap-3 pt-1">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500 shrink-0">
                  From
                </span>
                <span className="text-base text-neutral-900">
                  <em className="italic font-light">{rec.name}</em>
                  {rec.role && (
                    <span className="text-neutral-500"> — {rec.role}</span>
                  )}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Container>
    </section>
  );
}
