'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';

interface UsePhaserGameOptions {
  config: Phaser.Types.Core.GameConfig;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface UsePhaserGameReturn {
  game: Phaser.Game | null;
  isLoading: boolean;
  loadProgress: number;
  error: Error | null;
}

export function usePhaserGame({ config, containerRef }: UsePhaserGameOptions): UsePhaserGameReturn {
  const gameRef = useRef<Phaser.Game | null>(null);
  const configRef = useRef(config);
  const isInitializedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadProgress, setLoadProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);
  const [game, setGame] = useState<Phaser.Game | null>(null);

  const handleLoadProgress = useCallback((progress: number) => {
    setLoadProgress(progress);
  }, []);

  const handleLoadComplete = useCallback(() => {
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Prevent multiple initializations
    if (!containerRef.current || isInitializedRef.current) return;
    isInitializedRef.current = true;

    try {
      // Create game config with parent
      const gameConfig: Phaser.Types.Core.GameConfig = {
        ...configRef.current,
        parent: containerRef.current,
        callbacks: {
          preBoot: (game) => {
            game.registry.set('onLoadProgress', handleLoadProgress);
            game.registry.set('onLoadComplete', handleLoadComplete);
          },
        },
      };

      const newGame = new Phaser.Game(gameConfig);
      gameRef.current = newGame;
      setGame(newGame);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to initialize Phaser'));
      setIsLoading(false);
    }

    return () => {
      if (gameRef.current) {
        // Properly destroy the game and clean up WebGL context
        gameRef.current.destroy(true, false);
        gameRef.current = null;
        setGame(null);
        isInitializedRef.current = false;
      }
    };
  }, [containerRef, handleLoadProgress, handleLoadComplete]);

  return {
    game,
    isLoading,
    loadProgress,
    error,
  };
}
