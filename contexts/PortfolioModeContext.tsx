'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type PortfolioMode = 'classic' | 'city';

interface PortfolioModeContextType {
  mode: PortfolioMode;
  setMode: (mode: PortfolioMode) => void;
  toggleMode: () => void;
  isTransitioning: boolean;
  isHydrated: boolean;
}

const PortfolioModeContext = createContext<PortfolioModeContextType | undefined>(undefined);

const STORAGE_KEY = 'portfolio-mode';
const DEFAULT_MODE: PortfolioMode = 'classic';

interface PortfolioModeProviderProps {
  children: ReactNode;
}

export function PortfolioModeProvider({ children }: PortfolioModeProviderProps) {
  // Start with default mode for SSR
  const [mode, setModeState] = useState<PortfolioMode>(DEFAULT_MODE);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate from localStorage after mount (SSR-safe)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'classic' || stored === 'city') {
      setModeState(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist mode changes to localStorage
  const setMode = useCallback((newMode: PortfolioMode) => {
    setIsTransitioning(true);
    setModeState(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);

    // Reset transitioning state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
    }, 300);
  }, []);

  const toggleMode = useCallback(() => {
    setMode(mode === 'classic' ? 'city' : 'classic');
  }, [mode, setMode]);

  return (
    <PortfolioModeContext.Provider
      value={{
        mode,
        setMode,
        toggleMode,
        isTransitioning,
        isHydrated,
      }}
    >
      {children}
    </PortfolioModeContext.Provider>
  );
}

export function usePortfolioMode(): PortfolioModeContextType {
  const context = useContext(PortfolioModeContext);
  if (context === undefined) {
    throw new Error('usePortfolioMode must be used within a PortfolioModeProvider');
  }
  return context;
}

export { PortfolioModeContext };
