'use client';

import dynamic from 'next/dynamic';
import { usePortfolioMode } from '@/contexts/PortfolioModeContext';
import ClassicHome from '@/components/classic/ClassicHome';

// Lazy load CityHome to avoid loading Phaser for classic users
const CityHome = dynamic(() => import('@/components/city/CityHome'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-white">Loading Gustav&apos;s City...</div>
    </div>
  ),
});

export default function Home() {
  const { mode, isHydrated, isTransitioning } = usePortfolioMode();

  // During SSR and initial hydration, always show classic
  if (!isHydrated) {
    return <ClassicHome />;
  }

  return (
    <div
      className={`transition-opacity duration-200 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}
    >
      {mode === 'classic' ? <ClassicHome /> : <CityHome />}
    </div>
  );
}
