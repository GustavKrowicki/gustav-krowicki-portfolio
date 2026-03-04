"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Phaser from "phaser";
import { GridCell, CharacterType, Direction, PlayerState, PlayerData, GameMode } from "./pogicity/types";
import { getBuilding, BuildingDefinition } from "@/lib/city/buildings";
import { TourStop, findBuildingPosition, TOUR_STOPS } from "@/lib/city/tourStops";
import WelcomeOverlay from "./WelcomeOverlay";
import TourGuide from "./TourGuide";
import BuildingModal from "./BuildingModal";
import RPGDialogBox from "./RPGDialogBox";
import VirtualJoystick from "./VirtualJoystick";
import AdventureHUD from "./AdventureHUD";
import DirectionalCompass from "./DirectionalCompass";
import LogosOverlay, { LogoPosition } from "./LogosOverlay";

// Dynamically import GameBoard to avoid SSR issues
const GameBoard = dynamic(() => import("./pogicity/GameBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#3d5560]">
      <div className="text-white font-mono text-xl">Loading Gustav&apos;s City...</div>
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
  zoomAtPoint: (zoom: number, screenX: number, screenY: number) => void;
  fitCityView: () => void;
  panToPosition: (x: number, y: number) => void;
  highlightBuilding: (buildingId: string | null) => void;
  // Adventure mode methods
  startAdventureMode: (characterType: CharacterType) => void;
  stopAdventureMode: () => void;
  setPlayerInputDirection: (direction: Direction | null) => void;
  walkPlayerToBuilding: (buildingId: string) => boolean;
  markBuildingVisited: (buildingId: string) => void;
  getVisitedBuildings: () => Set<string>;
  isAdventureModeActive: () => boolean;
  getPlayerState: () => PlayerState | null;
  triggerInteraction: () => void;
  getGameInstance: () => Phaser.Game | null;
  // Logo overlay methods
  getPortfolioBuildingPositions: () => Array<{
    buildingId: string;
    screenX: number;
    screenY: number;
    logoUrl: string;
    logoOffset: { x: number; y: number };
  }>;
  getCameraState: () => {
    scrollX: number;
    scrollY: number;
    zoom: number;
    worldWidth: number;
    worldHeight: number;
  };
}

export default function CityViewer({ initialGrid, onProjectClick, onBackToPortfolio }: CityViewerProps) {
  // Mode state
  const [showWelcome, setShowWelcome] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Viewer);

  // Tour state (classic tour mode)
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentTourStop, setCurrentTourStop] = useState(0);

  // Adventure mode state
  const [isAdventureActive, setIsAdventureActive] = useState(false);
  const [visitedBuildings, setVisitedBuildings] = useState<Set<string>>(new Set());
  const [currentEncounter, setCurrentEncounter] = useState<TourStop | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAutoWalking, setIsAutoWalking] = useState(false);
  const [walkableDirections, setWalkableDirections] = useState<Direction[]>([]);
  // Building modal state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingDefinition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Logo overlay state
  const [logoPositions, setLogoPositions] = useState<LogoPosition[]>([]);
  const [cameraState, setCameraState] = useState({
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
    worldWidth: 0,
    worldHeight: 0,
  });
  const [viewportRect, setViewportRect] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [isMobile, setIsMobile] = useState(false);

  // Refs
  const viewerRootRef = useRef<HTMLDivElement>(null);
  const gameBoardRef = useRef<GameBoardHandle>(null);
  const hasSpawnedAmbientLife = useRef(false);
  const hasManualViewportInteraction = useRef(false);
  const updateLogosAndCameraRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(
        window.matchMedia("(max-width: 767px)").matches ||
        navigator.maxTouchPoints > 0
      );
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);

    return () => {
      window.removeEventListener("resize", checkIsMobile);
    };
  }, []);

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

  // Update logo positions and camera state for 3D overlay
  // Use refs to track previous values and avoid unnecessary state updates
  const lastCameraRef = useRef({
    scrollX: 0,
    scrollY: 0,
    zoom: 1,
    worldWidth: 0,
    worldHeight: 0,
  });
  const lastViewportRef = useRef({ left: 0, top: 0, width: 0, height: 0 });

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const updateLogosAndCamera = () => {
      const gameBoard = gameBoardRef.current;
      const root = viewerRootRef.current;
      if (!gameBoard || !root) return;

      try {
        const camera = gameBoard.getCameraState();
        const canvas = root.querySelector("canvas");
        if (!canvas) return;
        const rootRect = root.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();
        const nextViewport = {
          left: canvasRect.left - rootRect.left,
          top: canvasRect.top - rootRect.top,
          width: canvasRect.width,
          height: canvasRect.height,
        };

        const lastCamera = lastCameraRef.current;
        const hasCameraChanged =
          Math.abs(camera.scrollX - lastCamera.scrollX) > 0.5 ||
          Math.abs(camera.scrollY - lastCamera.scrollY) > 0.5 ||
          Math.abs(camera.zoom - lastCamera.zoom) > 0.01 ||
          camera.worldWidth !== lastCamera.worldWidth ||
          camera.worldHeight !== lastCamera.worldHeight;

        const lastViewport = lastViewportRef.current;
        const hasViewportChanged =
          Math.abs(nextViewport.left - lastViewport.left) > 0.5 ||
          Math.abs(nextViewport.top - lastViewport.top) > 0.5 ||
          Math.abs(nextViewport.width - lastViewport.width) > 0.5 ||
          Math.abs(nextViewport.height - lastViewport.height) > 0.5;

        if (hasCameraChanged || hasViewportChanged) {
          lastCameraRef.current = {
            scrollX: camera.scrollX,
            scrollY: camera.scrollY,
            zoom: camera.zoom,
            worldWidth: camera.worldWidth,
            worldHeight: camera.worldHeight,
          };
          lastViewportRef.current = nextViewport;
          const positions = gameBoard.getPortfolioBuildingPositions();
          setLogoPositions(positions);
          setCameraState(camera);
          setViewportRect(nextViewport);
        }
      } catch {
        // Methods may not be available yet
      }
    };
    updateLogosAndCameraRef.current = updateLogosAndCamera;

    const handleResize = () => {
      updateLogosAndCamera();
    };

    // Initial update after game loads
    const initialTimer = setTimeout(() => {
      updateLogosAndCamera();
      // Phaser may update the fitted canvas on a later frame after resize; polling is the correctness fallback.
      intervalId = setInterval(updateLogosAndCamera, 33);
    }, 1500);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(initialTimer);
      if (intervalId) {
        clearInterval(intervalId);
      }
      updateLogosAndCameraRef.current = null;
    };
  }, []); // Empty dependency - run once on mount

  useEffect(() => {
    const handleOrientationChange = () => {
      window.setTimeout(() => {
        updateLogosAndCameraRef.current?.();

        if (showWelcome || !hasManualViewportInteraction.current) {
          gameBoardRef.current?.fitCityView();
        }
      }, 300);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [showWelcome]);

  // Handle welcome overlay actions
  const handleStartTour = useCallback(() => {
    setShowWelcome(false);
    setGameMode(GameMode.Viewer);
    setIsTourActive(true);
    setCurrentTourStop(0);
  }, []);

  const handleExploreFreely = useCallback(() => {
    setShowWelcome(false);
    setGameMode(GameMode.Viewer);
    setIsTourActive(false);
  }, []);

  // Start Adventure Mode
  const handleStartAdventure = useCallback((characterType: CharacterType) => {
    setShowWelcome(false);
    setGameMode(GameMode.Adventure);
    setIsAdventureActive(true);
    setVisitedBuildings(new Set());

    // Start adventure mode in Phaser
    const gameBoard = gameBoardRef.current;
    if (gameBoard) {
      gameBoard.startAdventureMode(characterType);

      // Listen for Phaser events
      const game = gameBoard.getGameInstance();
      if (game) {
        const scene = game.scene.getScene("MainScene");
        if (scene) {
          // Player entered trigger zone
          scene.events.on("playerEnteredZone", ({ tourStop }: { buildingId: string; tourStop: TourStop }) => {
            setCurrentEncounter(tourStop);
          });

          // Player exited trigger zone
          scene.events.on("playerExitedZone", () => {
            setCurrentEncounter(null);
          });

          // Interaction triggered (E pressed)
          scene.events.on("interactionTriggered", () => {
            setIsDialogOpen(true);
          });

          // Player position changed (for auto-walk state + walkable directions)
          scene.events.on("playerPositionChanged", (data: PlayerData) => {
            setIsAutoWalking(data.state === PlayerState.AutoWalking);
            setWalkableDirections(data.walkableDirections ?? []);
          });

          // Building visited
          scene.events.on("buildingVisited", ({ buildingId }: { buildingId: string }) => {
            setVisitedBuildings((prev) => new Set([...prev, buildingId]));
          });
        }
      }
    }
  }, []);

  // Stop Adventure Mode
  const handleStopAdventure = useCallback(() => {
    setIsAdventureActive(false);
    setGameMode(GameMode.Viewer);
    setCurrentEncounter(null);
    setIsDialogOpen(false);

    const gameBoard = gameBoardRef.current;
    if (gameBoard) {
      gameBoard.stopAdventureMode();
    }
  }, []);

  // Handle dialog close
  const handleDialogClose = useCallback(() => {
    setIsDialogOpen(false);

    // Mark building as visited
    if (currentEncounter?.buildingId) {
      gameBoardRef.current?.markBuildingVisited(currentEncounter.buildingId);
      setVisitedBuildings((prev) => new Set([...prev, currentEncounter.buildingId!]));
    }
  }, [currentEncounter]);

  // Handle "Next Stop" button in AdventureHUD
  const handleNextStop = useCallback(() => {
    // Find next unvisited building
    for (const stop of TOUR_STOPS) {
      if (stop.buildingId && !visitedBuildings.has(stop.buildingId)) {
        gameBoardRef.current?.walkPlayerToBuilding(stop.buildingId);
        break;
      }
    }
  }, [visitedBuildings]);

  // Handle joystick direction change
  const handleJoystickDirection = useCallback((direction: Direction | null) => {
    gameBoardRef.current?.setPlayerInputDirection(direction);
  }, []);

  // Handle mobile interact button
  const handleMobileInteract = useCallback(() => {
    gameBoardRef.current?.triggerInteraction();
  }, []);

  // Handle view case study from dialog
  const handleViewCaseStudy = useCallback((projectSlug: string) => {
    setIsDialogOpen(false);

    // Mark building as visited
    if (currentEncounter?.buildingId) {
      gameBoardRef.current?.markBuildingVisited(currentEncounter.buildingId);
      setVisitedBuildings((prev) => new Set([...prev, currentEncounter.buildingId!]));
    }

    onProjectClick?.(projectSlug);
  }, [currentEncounter, onProjectClick]);

  // Tour navigation (classic mode)
  const handleTourNextStop = useCallback(() => {
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
        hasManualViewportInteraction.current = true;
      }

      // Highlight the building if it exists
      gameBoard.highlightBuilding(stop.buildingId || null);
    },
    [initialGrid]
  );

  // Handle building click
  const handleBuildingClick = useCallback(
    (buildingId: string) => {
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
    <div ref={viewerRootRef} className="relative w-full h-full">
      <GameBoard
        ref={gameBoardRef}
        editable={false}
        initialGrid={initialGrid}
        onBuildingClick={handleBuildingClick}
      />

      {/* 3D Spinning Logos Overlay */}
      {!showWelcome && viewportRect.width > 0 && viewportRect.height > 0 && (
        <LogosOverlay
          isMobile={isMobile}
          logos={logoPositions}
          viewportLeft={viewportRect.left}
          viewportTop={viewportRect.top}
          viewportWidth={viewportRect.width}
          viewportHeight={viewportRect.height}
          worldWidth={cameraState.worldWidth}
          worldHeight={cameraState.worldHeight}
          cameraX={cameraState.scrollX}
          cameraY={cameraState.scrollY}
          zoom={cameraState.zoom}
        />
      )}

      {/* Welcome Overlay */}
      <WelcomeOverlay
        isMobile={isMobile}
        isVisible={showWelcome}
        onStartTour={handleStartTour}
        onExploreFreely={handleExploreFreely}
        onStartAdventure={handleStartAdventure}
      />

      {/* Tour Guide (classic tour mode) */}
      {gameMode === GameMode.Viewer && (
        <TourGuide
          isMobile={isMobile}
          isActive={isTourActive}
          currentStopIndex={currentTourStop}
          onNext={handleTourNextStop}
          onPrevious={handlePreviousStop}
          onEnd={handleEndTour}
          onStopChange={handleStopChange}
        />
      )}

      {/* Adventure Mode UI */}
      {isAdventureActive && (
        <>
          {/* Adventure HUD */}
          <AdventureHUD
            isMobile={isMobile}
            visitedBuildings={visitedBuildings}
            onNextStop={handleNextStop}
            isAutoWalking={isAutoWalking}
          />

          {/* Directional Compass */}
          <DirectionalCompass isMobile={isMobile} walkableDirections={walkableDirections} />

          {/* Virtual Joystick (mobile) */}
          <VirtualJoystick
            isMobile={isMobile}
            onDirectionChange={handleJoystickDirection}
            onInteract={currentEncounter ? handleMobileInteract : undefined}
          />

          {/* RPG Dialog Box */}
          <RPGDialogBox
            isMobile={isMobile}
            tourStop={currentEncounter}
            isVisible={isDialogOpen}
            onClose={handleDialogClose}
            onViewCaseStudy={handleViewCaseStudy}
          />

          {/* Exit adventure button */}
          <button
            onClick={handleStopAdventure}
            className="fixed top-4 right-4 z-40 px-3 py-1.5 bg-black/50 backdrop-blur-sm text-white rounded-lg text-sm hover:bg-black/70 transition-colors border border-white/10 md:top-4 top-[max(1rem,env(safe-area-inset-top))]"
          >
            Exit Adventure
          </button>
        </>
      )}

      {/* Building Modal */}
      <BuildingModal
        isMobile={isMobile}
        building={selectedBuilding}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onViewProject={handleViewProject}
        onBackToPortfolio={onBackToPortfolio}
      />

      {/* Mode switch buttons (when not in welcome and not in tour/adventure) */}
      {!showWelcome && !isTourActive && !isAdventureActive && (
        <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex gap-2 flex-wrap max-w-[calc(100vw-7rem)] sm:max-w-none">
          <button
            onClick={() => {
              setIsTourActive(true);
              setCurrentTourStop(0);
            }}
            className="px-4 py-2 bg-white/10 backdrop-blur-sm text-white rounded-lg font-medium hover:bg-white/20 transition-colors border border-white/10 text-sm flex items-center gap-2"
          >
            <span>🗺️</span>
            Take Tour
          </button>
          <button
            onClick={() => handleStartAdventure(CharacterType.Banana)}
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-colors text-sm flex items-center gap-2"
          >
            <span>🎮</span>
            Adventure
          </button>
        </div>
      )}

      {isMobile && !showWelcome && !isAdventureActive && !isDialogOpen && !isModalOpen && (
        <div className="fixed right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 flex flex-col gap-2">
          <button
            onClick={() => {
              hasManualViewportInteraction.current = true;
              const nextZoom = Math.min(cameraState.zoom * 1.25, 4);
              gameBoardRef.current?.zoomAtPoint(
                nextZoom,
                viewportRect.width / 2,
                viewportRect.height / 2
              );
            }}
            className="h-12 w-12 rounded-xl bg-black/50 backdrop-blur-sm text-white text-2xl border border-white/10"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            onClick={() => {
              hasManualViewportInteraction.current = true;
              const nextZoom = Math.max(cameraState.zoom / 1.25, 0.25);
              gameBoardRef.current?.zoomAtPoint(
                nextZoom,
                viewportRect.width / 2,
                viewportRect.height / 2
              );
            }}
            className="h-12 w-12 rounded-xl bg-black/50 backdrop-blur-sm text-white text-2xl border border-white/10"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            onClick={() => {
              hasManualViewportInteraction.current = false;
              gameBoardRef.current?.fitCityView();
            }}
            className="h-12 w-12 rounded-xl bg-black/50 backdrop-blur-sm text-white text-sm border border-white/10"
            aria-label="Fit city to view"
          >
            Fit
          </button>
        </div>
      )}
    </div>
  );
}
