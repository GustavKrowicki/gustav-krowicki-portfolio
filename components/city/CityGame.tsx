'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { usePhaserGame } from '@/hooks/usePhaserGame';
import { createGameConfig } from './game/config';
import CityLoader from './CityLoader';
import ControlsHint from './CityUI/ControlsHint';
import MiniMap from './CityUI/MiniMap';
import BuildingModal from './CityUI/BuildingModal';
import TouchControls from './CityUI/TouchControls';
import WelcomeBanner from './CityUI/WelcomeBanner';
import DistrictIndicator from './CityUI/DistrictIndicator';
import { CityDistrict } from '@/lib/types';

interface BuildingClickEvent {
  id: string;
  name: string;
  projectSlug?: string;
  description?: string;
  district: CityDistrict;
}

interface ProximityEvent {
  id: string;
  name: string;
  distance: number;
}

interface DistrictEvent {
  id: string;
  name: string;
  color: string;
}

interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

function CityGameInner() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingClickEvent | null>(null);
  const [nearbyBuilding, setNearbyBuilding] = useState<{ name: string } | null>(null);
  const [playerPosition, setPlayerPosition] = useState({ x: 0, y: 0 });
  const [worldBounds, setWorldBounds] = useState<WorldBounds | null>(null);
  const [currentDistrict, setCurrentDistrict] = useState<DistrictEvent | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Memoize config to prevent unnecessary re-renders
  const config = useMemo(() => createGameConfig(), []);

  const { game, isLoading, loadProgress, error } = usePhaserGame({
    config,
    containerRef,
  });

  // Detect mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Listen for Phaser events
  useEffect(() => {
    if (!game) return;

    const handleBuildingClick = (data: BuildingClickEvent) => {
      setSelectedBuilding(data);
    };

    const handleProximity = (data: ProximityEvent | null) => {
      setNearbyBuilding(data ? { name: data.name } : null);
    };

    const handleDistrictChange = (data: DistrictEvent | null) => {
      setCurrentDistrict(data);
    };

    game.events.on('buildingClick', handleBuildingClick);
    game.events.on('buildingProximity', handleProximity);
    game.events.on('districtChange', handleDistrictChange);

    // Track player position and world bounds for mini-map
    const updatePosition = () => {
      const mainScene = game.scene.getScene('MainScene') as {
        player?: { getPosition: () => { x: number; y: number } };
        getWorldBounds?: () => WorldBounds;
      } | null;

      if (mainScene?.player) {
        setPlayerPosition(mainScene.player.getPosition());
      }
      if (mainScene?.getWorldBounds && !worldBounds) {
        setWorldBounds(mainScene.getWorldBounds());
      }
    };

    const positionInterval = setInterval(updatePosition, 100);

    return () => {
      game.events.off('buildingClick', handleBuildingClick);
      game.events.off('buildingProximity', handleProximity);
      game.events.off('districtChange', handleDistrictChange);
      clearInterval(positionInterval);
    };
  }, [game]);

  const handleCloseModal = useCallback(() => {
    setSelectedBuilding(null);
  }, []);

  // Touch control handlers
  const handleTouchMove = useCallback((dx: number, dy: number) => {
    if (!game) return;
    game.events.emit('touchMove', { dx, dy });
  }, [game]);

  const handleTouchInteract = useCallback(() => {
    if (!game) return;
    game.events.emit('touchInteract');
  }, [game]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Failed to load game</h2>
          <p className="text-slate-400">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      {isLoading && <CityLoader progress={loadProgress} />}

      <div className="flex gap-8 items-start max-w-6xl w-full">
        {/* Left Panel - Info */}
        <div className="hidden lg:block w-64 space-y-6">
          <WelcomeBanner inline />
          <DistrictIndicator district={currentDistrict} inline />
        </div>

        {/* Center - Game Canvas (responsive) */}
        <div className="flex-1 lg:flex-none">
          <div
            ref={containerRef}
            className="w-full max-w-[870px] aspect-[870/535] rounded-xl overflow-hidden border-2 border-slate-700 shadow-2xl mx-auto"
          />
          {/* Mobile info below canvas */}
          <div className="lg:hidden mt-4 space-y-4">
            <DistrictIndicator district={currentDistrict} inline />
          </div>
        </div>

        {/* Right Panel - Navigation & Controls */}
        <div className="hidden lg:block w-64 space-y-6">
          <MiniMap
            playerPosition={playerPosition}
            worldBounds={worldBounds}
            inline
          />
          {!isMobile && <ControlsHint nearbyBuilding={nearbyBuilding} inline />}
        </div>
      </div>

      {/* Mobile Touch Controls */}
      {isMobile && !isLoading && (
        <TouchControls
          onMove={handleTouchMove}
          onInteract={handleTouchInteract}
        />
      )}

      {/* Building Modal */}
      {selectedBuilding && (
        <BuildingModal
          building={selectedBuilding}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

// Export as dynamic component with SSR disabled
const CityGame = dynamic(() => Promise.resolve(CityGameInner), {
  ssr: false,
  loading: () => <CityLoader progress={0} />,
});

export default CityGame;
