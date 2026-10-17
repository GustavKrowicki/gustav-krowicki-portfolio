'use client';

import dynamic from 'next/dynamic';

// Client-only: WebGL.
const AvatarToonLab = dynamic(() => import('./AvatarToonLab'), { ssr: false });

export default function AvatarToonPage() {
  return <AvatarToonLab />;
}
