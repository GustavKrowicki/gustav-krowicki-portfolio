'use client';

import type { ImageLoaderProps } from 'next/image';

// next/image loader for Cloudflare image transformations (docs/hosting-cloudflare.md).
// next.config.ts uses it only when CF_IMAGE_TRANSFORMS=1, i.e. for the build that goes live on
// www.gustavkrowicki.com, because /cdn-cgi/image only exists on a Cloudflare zone, not on workers.dev or locally.
// onerror=redirect serves the original if a transformation fails, so a misconfigured zone never breaks images.
const DEFAULT_QUALITY = 75;

export default function cloudflareImageLoader({ src, width, quality }: ImageLoaderProps): string {
  // Absolute URLs need an allowed origin on the zone, and SVGs are vectors already: serve both unchanged.
  if (/^https?:\/\//.test(src) || /\.svg$/i.test(src)) return src;

  const options = [`width=${width}`, `quality=${quality ?? DEFAULT_QUALITY}`, 'format=auto', 'onerror=redirect'];
  return `/cdn-cgi/image/${options.join(',')}/${encodePath(src)}`;
}

// File names in public/ contain spaces ("vestas drawer.png"), which would split a srcset entry.
// Decode first so an already encoded path is not encoded twice.
function encodePath(src: string): string {
  return src
    .replace(/^\//, '')
    .split('/')
    .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
    .join('/');
}
