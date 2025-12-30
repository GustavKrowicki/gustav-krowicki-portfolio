import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  className?: string;
  maxWidth?: 'content' | 'container' | 'full';
}

export default function Container({
  children,
  className,
  maxWidth = 'container'
}: ContainerProps) {
  const maxWidthClasses = {
    content: 'max-w-[65ch]',
    container: 'max-w-[1280px]',
    full: 'max-w-full'
  };

  return (
    <div className={cn(
      'mx-auto px-6 md:px-8 lg:px-12',
      maxWidthClasses[maxWidth],
      className
    )}>
      {children}
    </div>
  );
}
