'use client';

import { usePortfolioMode } from '@/contexts/PortfolioModeContext';
import { cn } from '@/lib/utils';

export default function ModeToggle() {
  const { mode, setMode, isTransitioning, isHydrated } = usePortfolioMode();

  // Don't render anything until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="flex items-center bg-gray-100 rounded-full p-1">
        <span className="px-3 py-1.5 text-sm rounded-full bg-white shadow-sm">
          Classic
        </span>
        <span className="px-3 py-1.5 text-sm rounded-full">
          City
        </span>
      </div>
    );
  }

  const isCityMode = mode === 'city';

  return (
    <div
      className={cn(
        "flex items-center rounded-full p-1 transition-all duration-200",
        isCityMode ? "bg-slate-700" : "bg-gray-100",
        isTransitioning && "opacity-70"
      )}
      role="tablist"
      aria-label="Portfolio mode"
    >
      <button
        role="tab"
        aria-selected={mode === 'classic'}
        onClick={() => setMode('classic')}
        className={cn(
          "px-3 py-1.5 text-sm rounded-full transition-all duration-200",
          mode === 'classic'
            ? isCityMode
              ? "bg-slate-600 text-white shadow-sm font-medium"
              : "bg-white shadow-sm font-medium"
            : isCityMode
              ? "text-slate-400 hover:text-white"
              : "hover:bg-gray-200/50"
        )}
      >
        Classic
      </button>
      <button
        role="tab"
        aria-selected={mode === 'city'}
        onClick={() => setMode('city')}
        className={cn(
          "px-3 py-1.5 text-sm rounded-full transition-all duration-200",
          mode === 'city'
            ? "bg-blue-500 text-white shadow-sm font-medium"
            : "hover:bg-gray-200/50"
        )}
      >
        City
      </button>
    </div>
  );
}
