import { ReactNode } from 'react';
import Container from '@/components/ui/Container';
import { cn } from '@/lib/utils';

interface CaseSectionProps {
  children: ReactNode;
  title?: string;
  className?: string;
  maxWidth?: 'content' | 'container';
  background?: 'white' | 'gray';
}

export default function CaseSection({
  children,
  title,
  className,
  maxWidth = 'content',
  background = 'white'
}: CaseSectionProps) {
  const bgClass = background === 'gray' ? 'bg-neutral-50' : '';

  return (
    <section className={cn('py-16 md:py-24', bgClass, className)}>
      <Container maxWidth={maxWidth}>
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold mb-8">{title}</h2>
        )}
        <div className="space-y-6 text-lg leading-relaxed text-neutral-700">
          {children}
        </div>
      </Container>
    </section>
  );
}
