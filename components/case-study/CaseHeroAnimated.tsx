'use client';

import Image from 'next/image';
import { useEffect, useState, useRef } from 'react';

interface CaseHeroAnimatedProps {
  coverImage: string;
  alt: string;
}

export default function CaseHeroAnimated({
  coverImage,
  alt
}: CaseHeroAnimatedProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Find the scrollable parent (the fixed container from template.tsx)
    const findScrollableParent = (element: HTMLElement | null): HTMLElement | null => {
      if (!element) return null;

      const parent = element.parentElement;
      if (!parent) return null;

      const overflowY = window.getComputedStyle(parent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        return parent;
      }

      return findScrollableParent(parent);
    };

    const scrollContainer = findScrollableParent(heroRef.current);

    const handleScroll = () => {
      if (!scrollContainer) return;

      const scrollY = scrollContainer.scrollTop;
      // Animation completes after scrolling 500px
      const progress = Math.min(scrollY / 500, 1);

      // Use RAF for smooth updates
      requestAnimationFrame(() => {
        setScrollProgress(progress);
      });
    };

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

  // Calculate values based on scroll progress
  const scale = 1 - (scrollProgress * 0.15); // 1 to 0.85
  const paddingX = scrollProgress * 48; // 0px to 48px
  const borderRadius = scrollProgress * 12; // 0px to 12px

  return (
    <div ref={heroRef}>
      {/* Hero Image - Full Width with Scroll Animation */}
      <div
        className="sticky top-0 z-0 transition-all duration-100 ease-out"
        style={{
          paddingLeft: `${paddingX}px`,
          paddingRight: `${paddingX}px`,
        }}
      >
        <div
          className="relative aspect-[16/9] bg-neutral-200 overflow-hidden transition-all duration-100 ease-out"
          style={{
            transform: `scale(${scale})`,
            borderRadius: `${borderRadius}px`,
          }}
        >
          <Image
            src={coverImage}
            alt={alt}
            fill
            className="object-cover"
            priority
          />
        </div>
      </div>
    </div>
  );
}
