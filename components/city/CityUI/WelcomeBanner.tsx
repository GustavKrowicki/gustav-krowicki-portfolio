'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'city-welcome-dismissed';

interface WelcomeBannerProps {
  inline?: boolean;
}

function getInitialVisibility(): boolean {
  if (typeof window === 'undefined') return false;
  return !localStorage.getItem(STORAGE_KEY);
}

export default function WelcomeBanner({ inline = false }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(getInitialVisibility);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible && !inline) return null;

  const content = (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white mb-1">
            Gustav&apos;s City
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            Explore my career journey through this interactive city.
            Use <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">WASD</kbd> or click to move.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Corporate</span>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Education</span>
            <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">Startup</span>
            <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Personal</span>
          </div>
        </div>
        {!inline && (
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        )}
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
      {content}
    </div>
  );
}
