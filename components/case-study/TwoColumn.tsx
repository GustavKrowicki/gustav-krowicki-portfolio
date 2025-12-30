import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TwoColumnProps {
  left: ReactNode;
  right: ReactNode;
  reverse?: boolean;
  className?: string;
}

export default function TwoColumn({ left, right, reverse = false, className }: TwoColumnProps) {
  return (
    <div className={cn(
      'grid md:grid-cols-2 gap-8 lg:gap-12 items-center',
      reverse && 'md:grid-flow-dense',
      className
    )}>
      <div className={reverse ? 'md:col-start-2' : ''}>
        {left}
      </div>
      <div className={reverse ? 'md:col-start-1 md:row-start-1' : ''}>
        {right}
      </div>
    </div>
  );
}
