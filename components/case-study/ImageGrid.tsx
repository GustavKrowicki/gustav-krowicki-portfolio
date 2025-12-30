import Image from 'next/image';
import { cn } from '@/lib/utils';

interface ImageItem {
  src: string;
  alt: string;
  caption?: string;
}

interface ImageGridProps {
  images: ImageItem[];
  columns?: 1 | 2 | 3;
  aspectRatio?: 'square' | 'video' | 'portrait';
  className?: string;
}

export default function ImageGrid({
  images,
  columns = 1,
  aspectRatio = 'video',
  className
}: ImageGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
  };

  const aspectClasses = {
    square: 'aspect-square',
    video: 'aspect-[16/9]',
    portrait: 'aspect-[3/4]'
  };

  return (
    <div className={cn('grid gap-6', gridClasses[columns], className)}>
      {images.map((image, index) => (
        <figure key={index}>
          <div className={cn('relative bg-neutral-200 overflow-hidden rounded-lg', aspectClasses[aspectRatio])}>
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover"
            />
          </div>
          {image.caption && (
            <figcaption className="mt-2 text-sm text-neutral-600">
              {image.caption}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
}
