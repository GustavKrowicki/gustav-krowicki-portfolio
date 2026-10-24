'use client';

import dynamic from 'next/dynamic';

// The intro lab: the real portfolio page with the load intro forced on, plus a floating card of controls
// (components/intro/IntroLabDrawer.tsx). Client only: it reads the URL and drives WebGL.
const IntroLab = dynamic(() => import('./IntroLab'), { ssr: false });

export default function IntroLabPage() {
  return <IntroLab />;
}
