'use client';

import dynamic from 'next/dynamic';
import Container from '@/components/ui/Container';

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
  pdfUrl: string;
}

interface RecommendationsSectionProps {
  recommendations: Recommendation[];
  title?: React.ReactNode;
}

export default function RecommendationsSection({
  recommendations,
  title = 'Recommendations',
}: RecommendationsSectionProps) {
  return (
    <section className="py-16 md:py-24 bg-neutral-50">
      <Container maxWidth="container">
        <h2 className="text-3xl md:text-4xl font-bold mb-12">{title}</h2>
        <div className="grid md:grid-cols-2 gap-8">
          {recommendations.map((rec) => (
            <div key={rec.name} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-1">{rec.name}</h3>
              {rec.role && (
                <p className="text-sm text-neutral-500 mb-4">{rec.role}</p>
              )}
              {!rec.role && <div className="mb-4" />}
              <PDFViewer url={rec.pdfUrl} />
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
