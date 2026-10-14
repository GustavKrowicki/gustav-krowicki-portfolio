import { Metadata } from 'next';
import CaseStudyWrapper from '@/components/case-study/CaseStudyWrapper';
import CateItCase from '@/components/cases/CateItCase';

export const metadata: Metadata = {
  title: 'Building a Two-Sided Marketplace - Cate it',
  description: 'Co-founded and designed a platform connecting event planners with food trucks',
};

export default function CateItPage() {
  return (
    <CaseStudyWrapper>
      <CateItCase />
    </CaseStudyWrapper>
  );
}
