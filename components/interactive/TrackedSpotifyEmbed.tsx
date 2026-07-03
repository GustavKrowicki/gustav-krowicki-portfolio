'use client';

import { useEffect, useRef } from 'react';
import { trackSpotifyInteracted } from '@/lib/analytics';

interface TrackedSpotifyEmbedProps {
  src: string;
  source: 'about_playlist_1' | 'about_playlist_2';
  height?: number;
}

// Cross-origin iframes swallow clicks, so the page never sees them. When the
// user clicks into the embed the window loses focus and the iframe becomes
// document.activeElement — that combination is the only reliable signal.
export default function TrackedSpotifyEmbed({ src, source, height = 352 }: TrackedSpotifyEmbedProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const armedRef = useRef(true);

  useEffect(() => {
    const onBlur = () => {
      if (armedRef.current && document.activeElement === iframeRef.current) {
        armedRef.current = false;
        trackSpotifyInteracted('embed_click', source);
      }
    };
    const onFocus = () => {
      armedRef.current = true;
    };
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, [source]);

  return (
    <iframe
      ref={iframeRef}
      style={{ borderRadius: '12px' }}
      src={src}
      width="100%"
      height={height}
      frameBorder="0"
      allowFullScreen
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
    />
  );
}
