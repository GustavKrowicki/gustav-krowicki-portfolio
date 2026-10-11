'use client';

import dynamic from 'next/dynamic';

// Client-only: the lab reads URL parameters and drives WebGL directly, so server rendering
// only produced a hydration mismatch (and a rebuilt tree that dropped textures).
const EntranceLab = dynamic(() => import('./EntranceLab'), { ssr: false });

export default function EntranceLabPage() {
  return <EntranceLab />;
}
