import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import VizGeneratorCase from '@/components/cases/VizGeneratorCase';

export const metadata: Metadata = {
  title: 'Visual asset generator',
  description: 'Built a tool to generate custom visual assets for cate it branding',
};

export default function VizGeneratorPage() {
  return (
    <CaseStudyWrapper>
      <VizGeneratorCase />
    </CaseStudyWrapper>
  );
}
