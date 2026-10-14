'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { Post } from '@/components/home/LinkedInPosts';

// react-pdf needs the browser and is large, so it loads when the letter slide is reached.
const PDFViewer = dynamic(() => import('@/components/home/PDFViewer'), { ssr: false });

// LinkedIn embeds cannot report their height, so it was measured (2026-10-14, document posts, ?collapsed=1):
// 581px at 318px wide and 547px from 494px wide; all three posts are the same. LinkedIn's cookie banner adds
// about 256px on top until a visitor answers it. It is left out, so visitors who answered see no empty space;
// before that, the post's bottom row scrolls inside the frame.
function embedHeight(width: number) {
  return width < 494 ? 585 : 550;
}

// Uni work, one item at a time: the LinkedIn posts, then the recommendation letter. Swipe (phones) or the arrows.
// All slides stay mounted, so switching back does not reload a post.
export default function UniWorkCarousel({ items }: { items: Post[] }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(track);
    const handleScroll = () => {
      const next = Math.round(track.scrollLeft / track.clientWidth);
      setIndex(next);
      setFurthest((current) => Math.max(current, next));
    };
    track.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      observer.disconnect();
      track.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const goTo = (next: number) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: next * track.clientWidth, behavior: 'smooth' });
  };

  return (
    <div>
      <ul
        ref={trackRef}
        aria-label="Uni work"
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item, i) => (
          <li
            key={item.embedUrl}
            aria-label={`${i + 1} of ${items.length}`}
            className="w-full shrink-0 snap-start overflow-hidden rounded-lg border border-neutral-200 bg-white"
          >
            {item.type === 'pdf' ? (
              <div className="flex h-full flex-col">
                {/* Load the viewer once the visitor is one slide away. */}
                {furthest >= i - 1 && width > 0 && <PDFViewer url={item.embedUrl} width={Math.floor(width) - 2} />}
                <a
                  href={item.embedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto px-4 py-3 text-sm font-medium text-neutral-900 underline underline-offset-4"
                >
                  Open letter (PDF)
                </a>
              </div>
            ) : (
              <iframe
                src={item.embedUrl}
                title={item.title ?? 'LinkedIn post'}
                loading="lazy"
                height={embedHeight(width)}
                className="w-full border-0"
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => goTo(index - 1)}
          disabled={index === 0}
          aria-label="Previous"
          className="rounded-full p-1.5 text-neutral-700 hover:bg-white disabled:opacity-30"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="min-w-0 truncate text-sm text-neutral-600" aria-live="polite">
          {items[index]?.title} · {index + 1} / {items.length}
        </p>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          disabled={index === items.length - 1}
          aria-label="Next"
          className="rounded-full p-1.5 text-neutral-700 hover:bg-white disabled:opacity-30"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
