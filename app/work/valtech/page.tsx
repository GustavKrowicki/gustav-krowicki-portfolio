import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import ValtechCase from '@/components/cases/ValtechCase';

export const metadata: Metadata = {
  title: 'Valtech Internship — UX Design',
  description: 'UX design internship at Valtech working on Vestas customer-facing digital solutions',
};

export default function ValtechPage() {
  return (
    <CaseStudyWrapper>
      <ValtechCase />
    </CaseStudyWrapper>
  );
}
