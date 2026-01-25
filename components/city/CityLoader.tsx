'use client';

import { useState, useEffect } from 'react';

interface CityLoaderProps {
  progress?: number;
}

export default function CityLoader({ progress = 0 }: CityLoaderProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-4">
          Loading Gustav&apos;s City{dots}
        </h2>
        <div className="w-64 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-slate-400 mt-4 text-sm">
          Preparing the isometric experience
        </p>
      </div>
    </div>
  );
}
