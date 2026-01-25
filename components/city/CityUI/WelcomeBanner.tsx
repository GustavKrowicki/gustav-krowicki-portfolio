'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const STORAGE_KEY = 'city-welcome-dismissed';

export default function WelcomeBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full px-4">
      <div className="bg-slate-800/95 backdrop-blur-sm rounded-xl p-4 shadow-xl border border-slate-700">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white mb-1">
              Welcome to Gustav&apos;s City
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              Explore my career journey through this interactive city.
              Walk around with <kbd className="px-1 py-0.5 bg-slate-700 rounded text-xs">WASD</kbd> or click to move,
              and interact with buildings to learn about my work.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded">Corporate</span>
              <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded">Education</span>
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded">Startup</span>
              <span className="text-xs px-2 py-1 bg-purple-500/20 text-purple-400 rounded">Personal</span>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-slate-700 rounded transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
