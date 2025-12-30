import { Metadata } from 'next';
import Container from '@/components/ui/Container';
import ProjectGrid from '@/components/work/ProjectGrid';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Selected projects showcasing product design, research, and strategic thinking.',
};

export default function WorkPage() {
  return (
    <div className="py-24">
      <Container maxWidth="container">
        <div className="mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">Work</h1>
          <p className="text-xl text-neutral-600 max-w-3xl leading-relaxed">
            A selection of projects spanning product design, user research, and strategic
            thinking—from ML-powered tools to entrepreneurial ventures.
          </p>
        </div>

        <ProjectGrid />
      </Container>
    </div>
  );
}
