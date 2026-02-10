"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { GridCell } from "./pogicity/types";
import { getBuilding, BuildingDefinition } from "@/lib/city/buildings";
import { TourStop, findBuildingPosition, TOUR_STOPS } from "@/lib/city/tourStops";
import WelcomeOverlay from "./WelcomeOverlay";
import TourGuide from "./TourGuide";
import BuildingModal from "./BuildingModal";

// Dynamically import GameBoard to avoid SSR issues
const GameBoard = dynamic(() => import("./pogicity/GameBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#3d5560]">
      <div className="text-white font-mono text-xl">Loading Gustav's City...</div>
    </div>
  ),
});

interface CityViewerProps {
  initialGrid: GridCell[][];
  onProjectClick?: (projectSlug: string) => void;
  onBackToPortfolio?: () => void;
}

export interface GameBoardHandle {
  spawnCharacter: () => boolean;
  spawnCar: () => boolean;
  panToPosition: (x: number, y: number) => void;
  highlightBuilding: (buildingId: string | null) => void;
}

export default function CityViewer({ initialGrid, onProjectClick, onBackToPortfolio }: CityViewerProps) {
  // Tour state
  const [showWelcome, setShowWelcome] = useState(true);
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStop, setCurrentTourStop] = useState(0);

  // Building modal state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Refs
  const gameBoardRef = useRef<GameBoardHandle>(null);
  const hasSpawnedAmbientLife = useRef(false);

  // Spawn ambient city life on load
  useEffect(() => {
    if (hasSpawnedAmbientLife.current) return;

    const spawnAmbientLife = () => {
      const gameBoard = gameBoardRef.current;
      if (!gameBoard) {
        // Retry if game not ready
        setTimeout(spawnAmbientLife, 500);
        return;
      }

      // Spawn 3-5 walking characters
      const characterCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < characterCount; i++) {
        gameBoard.spawnCharacter();
      }

      // Spawn 2-3 cars
      const carCount = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < carCount; i++) {
        gameBoard.spawnCar();
      }

      hasSpawnedAmbientLife.current = true;
    };

    // Delay to allow game to initialize
    const timer = setTimeout(spawnAmbientLife, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle welcome overlay actions
  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setIsTourActive(true);
    setCurrentTourStop(0);
  }, []);

  const handleExploreFreely = useCallback(() => {
    setShowWelcome(false);
    setIsTourActive(false);
  }, []);

  // Tour navigation
  const handleNextStop = useCallback(() => {
    if (currentTourStop < TOUR_STOPS.length - 1) {
      setCurrentTourStop((prev) => prev + 1);
    }
  }, [currentTourStop]);

  const handlePreviousStop = useCallback(() => {
    if (currentTourStop > 0) {
      setCurrentTourStop((prev) => prev - 1);
    }
  }, [currentTourStop]);

  const handleEndTour = useCallback(() => {
    setIsTourActive(false);
    setCurrentTourStop(0);
  }, []);

  // Handle tour stop changes - pan camera to building
  // Skip zoom/pan for the Welcome step (first stop) - only start panning from step 2 onwards
  const handleStopChange = useCallback(
    (stop: TourStop) => {
      const gameBoard = gameBoardRef.current;
      if (!gameBoard) return;

      // Skip zoom/pan for the Welcome step - keep showing whole city
      if (stop.id === "welcome") {
        return;
      }

      let position: { x: number; y: number } | null = null;

      if (stop.buildingId) {
        position = findBuildingPosition(initialGrid, stop.buildingId);
      } else if (stop.gridPosition) {
        position = stop.gridPosition;
      }

      if (position) {
        gameBoard.panToPosition(position.x, position.y);
      }

      // Highlight the building if it exists
      gameBoard.highlightBuilding(stop.buildingId || null);
    },
    [initialGrid]
  );

  // Handle building click
  const handleBuildingClick = useCallback(
    (buildingId: string, cell: GridCell) => {
      const building = getBuilding(buildingId);
      if (!building) return;

      // If in tour mode, don't show modal
      if (isTourActive) return;

      if (building.interactable && building.projectSlug) {
        // Navigate to project page
        onProjectClick?.(building.projectSlug);
      } else {
        // Show building info modal
        setSelectedBuilding(building);
        setIsModalOpen(true);
      }
    },
    [onProjectClick, isTourActive]
  );

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedBuilding(null);
  }, []);

  // Handle view project from modal
  const handleViewProject = useCallback(
    (projectSlug: string) => {
      setIsModalOpen(false);
      setSelectedBuilding(null);
      onProjectClick?.(projectSlug);
    },
    [onProjectClick]
  );

  return (
    <div className="relative w-full h-full">
      <GameBoard
        ref={gameBoardRef}
        editable={false}
        initialGrid={initialGrid}
        onBuildingClick={handleBuildingClick}
      />

      {/* Welcome Overlay */}
      <WelcomeOverlay
        isVisible={showWelcome}
        onStartTour={handleStartTour}
        onExploreFreely={handleExploreFreely}
      />

      {/* Tour Guide */}
      <TourGuide
        isActive={isTourActive}
        currentStopIndex={currentTourStop}
        onNext={handleNextStop}
        onPrevious={handlePreviousStop}
        onEnd={handleEndTour}
        onStopChange={handleStopChange}
      />

      {/* Building Modal */}
      <BuildingModal
        building={selectedBuilding}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onViewProject={handleViewProject}
        onBackToPortfolio={onBackToPortfolio}
      />

      {/* Tour restart button (when not in tour and welcome dismissed) */}
      {!showWelcome && !isTourActive && (
        <button
          onClick={() => {
            setIsTourActive(true);
            setCurrentTourStop(0);
          }}
          className="absolute bottom-4 left-4 z-30 px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/10 text-sm flex items-center gap-2"
        >
          <span>🗺️</span>
          Take Tour
        </button>
      )}
    </div>
  );
}
