import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import LegoCase from '@/components/cases/LegoCase';

export const metadata: Metadata = {
  title: 'Designing for Autonomy in a Supervised System - LEGO',
  description: 'Designing an ML-assisted recommendation tool that protects user expertise while satisfying organizational oversight needs.',
};

export default function LegoPage() {
  return (
    <CaseStudyWrapper>
      <LegoCase />
    </CaseStudyWrapper>
  );
}
