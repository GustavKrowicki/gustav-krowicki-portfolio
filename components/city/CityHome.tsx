'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import CityLoader from './CityLoader';

// Dynamically import CityGame with no SSR
const CityGame = dynamic(() => import('./CityGame'), {
  ssr: false,
  loading: () => <CityLoader progress={0} />,
});

// Flag to enable/disable the game (set to true when assets are ready)
const GAME_ENABLED = true;

export default function CityHome() {
  const [gameReady, setGameReady] = useState(GAME_ENABLED);

  if (!gameReady) {
    // Show placeholder until game is ready
    const CityPlaceholder = dynamic(() => import('./CityPlaceholder'), { ssr: false });
    return <CityPlaceholder />;
  }

  return <CityGame />;
}
