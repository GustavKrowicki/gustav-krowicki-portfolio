'use client';

import { useState, useEffect } from 'react';

interface ControlsHintProps {
  nearbyBuilding?: { name: string } | null;
}

export default function ControlsHint({ nearbyBuilding }: ControlsHintProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
      {/* Movement controls */}
      <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm pointer-events-auto">
        <p className="text-slate-400 text-xs mb-2">Movement</p>
        {isMobile ? (
          <div className="flex items-center gap-2">
            <div className="text-slate-300 text-sm">
              Tap to walk
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">W</kbd>
            </div>
            <div className="flex gap-1">
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">A</kbd>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">S</kbd>
              <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">D</kbd>
            </div>
            <p className="text-slate-500 text-[10px] mt-1">or click to walk</p>
          </div>
        )}
      </div>

      {/* Interaction hint */}
      {nearbyBuilding && (
        <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm pointer-events-auto animate-pulse">
          <p className="text-white text-sm font-medium">{nearbyBuilding.name}</p>
          {isMobile ? (
            <p className="text-slate-400 text-xs">Tap building to interact</p>
          ) : (
            <p className="text-slate-400 text-xs">
              Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px]">E</kbd> or click to interact
            </p>
          )}
        </div>
      )}
    </div>
  );
}
