"use client";

import { HOUR_OF, TIMES_OF_DAY, isNightHour, lookForHour, type CityLook, type TimeOfDay } from "@/lib/city/nightSchedule";
import TimeOfDayButton from "./TimeOfDayButton";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { GridCell, CharacterType, Direction, PlayerState, PlayerData, GameMode } from "./pogicity/types";
import { getBuilding } from "@/lib/city/buildings";
import { markPlaceFound } from "@/lib/achievements";
import { TourStop, findBuildingPosition, TOUR_STOPS } from "@/lib/city/tourStops";
import RPGDialogBox from "./RPGDialogBox";
import PeekCard from "./PeekCard";
import WalkInCard from "./WalkInCard";
import ScreensOverlay from "./ScreensOverlay";
import { BEAT_CARD_BUILDINGS, INTERIOR_BEATS } from "@/lib/city/interiorBeats";
import VirtualJoystick from "./VirtualJoystick";
import DirectionalCompass from "./DirectionalCompass";
import LogosOverlay, { LogoPosition } from "./LogosOverlay";
import { PIXEL_INSET_CLIP, pixelButtonClass } from "./pixelModalStyles";
import PortfolioModeToggle from "@/components/ui/PortfolioModeToggle";
import type { GameBoardHandle } from "./pogicity/GameBoard";
import type { MainScene } from "./pogicity/phaser/MainScene";
import {
  trackModeSelected,
  trackBuildingInteracted,
  trackProjectOpened,
  trackCityExited,
  trackBeatChoice,
} from "@/lib/analytics";

// Dynamically import GameBoard to avoid SSR issues
const GameBoard = dynamic(() => import("./pogicity/GameBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#73645F]">
      <div className="text-white font-mono text-xl">Loading Gustav&apos;s City...</div>
    </div>
  ),
});

const TIME_OF_DAY_KEY = "city-time-of-day";

function readUrlTime(): { night: boolean | null; hour: number | null } {
  try {
    const search = new URLSearchParams(window.location.search);
    const night = search.get("night");
    const hour = search.get("hour");
    return {
      night: night === "1" ? true : night === "0" ? false : null,
      hour: hour !== null && /^\d{1,2}$/.test(hour) && Number(hour) < 24 ? Number(hour) : null,
    };
  } catch {
    return { night: null, hour: null };
  }
}

interface CityViewerProps {
  initialGrid: GridCell[][];
  onProjectClick?: (projectSlug: string) => void;
  e2eMode?: boolean;
  // "page" is the standalone /city route, with its own mode toggle and a Walk button for the avatar.
  // "shell" sits beside the portfolio panel, which owns the navigation, so the city hides those.
  variant?: "page" | "shell";
  // Shell only: the Avatar tab is showing. The avatar is put in the city and the camera holds it in view, so each
  // outfit change is seen on it; the walk controls wait until the panel closes.
  avatarTabOpen?: boolean;
}


interface CityE2EApi {
  focusBuilding: (buildingId: string) => boolean;
  startAdventure: () => boolean;
  walkToBuilding: (buildingId: string) => Promise<boolean>;
  openEncounter: (stopId: string) => boolean;
  closeEncounter: () => void;
  getPlayerState: () => PlayerState | null;
  getCurrentEncounterId: () => string | null;
  getVisitedBuildings: () => string[];
  setVisitedBuildings: (buildingIds: string[]) => void;
  stopAdventure: () => void;
  pauseGame: () => boolean;
  resumeGame: () => boolean;
  getCameraState: () => CityE2ECameraState | null;
  // The live MainScene, for probing in e2e mode (camera, player, walk-in buildings)
  getScene: () => MainScene | null;
}

interface CityE2ECameraState {
  webgl: boolean;
  zoom: number;
  view: { x: number; y: number; width: number; height: number };
  player: { x: number; y: number } | null;
}

export default function CityViewer({
  initialGrid,
  onProjectClick,
  e2eMode = false,
  variant = "page",
  avatarTabOpen = false,
}: CityViewerProps) {
  const isShell = variant === "shell";

  // Mode state: Viewer pans the camera, Adventure walks the avatar (the shell's walk step reuses it)
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.Viewer);
  const [isAdventureActive, setIsAdventureActive] = useState(false);
  // ?night=1 / ?night=0 and ?hour=0..23 on the URL, for links and screenshots (read once)
  const [urlTime] = useState(() => readUrlTime());
  // The city's hour (the visitor's clock, or ?hour=): which windows are lit and how many people walk
  const [hour, setHour] = useState(() => urlTime.hour ?? new Date().getHours());
  const [visitedBuildings, setVisitedBuildings] = useState<Set<string>>(new Set());
  // Peek card inside a walk-in building (MainScene "interiorBeatChanged")
  const [interiorBeat, setInteriorBeat] = useState<{ buildingId: string; beat: string } | null>(null);
  // A walk-in building opened in place by a tap (roof off, MainScene "walkInPeek"): its card shows
  const [walkInPeek, setWalkInPeek] = useState<string | null>(null);
  // Sit-and-look moment: the beat the avatar sits at (MainScene "interiorSeatChanged"), shown by ScreensOverlay
  const [interiorSeat, setInteriorSeat] = useState<{ buildingId: string; beat: string } | null>(null);
  const seatTimerRef = useRef<number | undefined>(undefined);
  const [isSeated, setIsSeated] = useState(false);
  // A card's button changed the card in place (beat.choices without walk, e.g. "Book for an event"); cleared on the next beat
  const [choiceCard, setChoiceCard] = useState<{ buildingId: string; beat: string } | null>(null);
  useEffect(() => setChoiceCard(null), [interiorBeat]);
  // Door beats (lib/city/interiorBeats.ts "enter" / "leave"): shown for a while after crossing a main door
  const [doorCard, setDoorCard] = useState<{ buildingId: string; beat: string } | null>(null);
  const doorTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(seatTimerRef.current);
    window.clearTimeout(doorTimerRef.current);
  }, []);   // at once; the screens (interiorSeat) follow a moment later
  const [currentEncounter, setCurrentEncounter] = useState<TourStop | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [walkableDirections, setWalkableDirections] = useState<Direction[]>([]);

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
  const autoWalkTargetRef = useRef<string | null>(null);
  const currentEncounterRef = useRef<TourStop | null>(null);
  useEffect(() => {
    currentEncounterRef.current = currentEncounter;
  }, [currentEncounter]);
  const selectedModeRef = useRef<'explore' | 'adventure'>('explore');
  const visitedBuildingsCountRef = useRef(0);
  useEffect(() => {
    visitedBuildingsCountRef.current = visitedBuildings.size;
  }, [visitedBuildings]);

  // Track leaving the city, once: client-side navigation (unmount) or tab close (pagehide)
  useEffect(() => {
    const enteredAt = Date.now();
    let hasTrackedExit = false;
    const trackExit = () => {
      if (hasTrackedExit) return;
      hasTrackedExit = true;
      const duration = Math.round((Date.now() - enteredAt) / 1000);
      trackCityExited(duration, selectedModeRef.current, visitedBuildingsCountRef.current);
    };

    window.addEventListener("pagehide", trackExit);
    return () => {
      window.removeEventListener("pagehide", trackExit);
      trackExit();
    };
  }, []);

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
    if (e2eMode) return;
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
  }, [e2eMode]);

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

        if (!hasManualViewportInteraction.current) {
          gameBoardRef.current?.fitCityView();
        }
      }, 300);
    };

    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, []);

  // Start Adventure Mode
  // (fromAvatarTab: walk mode only to show the avatar while the visitor dresses it, not a mode choice to track)
  const handleStartAdventure = useCallback((options?: { fromAvatarTab?: boolean }) => {
    setGameMode(GameMode.Adventure);
    setIsAdventureActive(true);
    setVisitedBuildings(new Set());
    if (!options?.fromAvatarTab) trackModeSelected('adventure', 'gustav');
    selectedModeRef.current = 'adventure';

    // Start adventure mode in Phaser
    const gameBoard = gameBoardRef.current;
    if (gameBoard) {
      gameBoard.startAdventureMode(CharacterType.Gustav);

      // Listen for Phaser events
      const game = gameBoard.getGameInstance();
      if (game) {
        const scene = game.scene.getScene("MainScene");
        if (scene) {
          // Suppress dialog when passing through zones en route to a different target
          scene.events.on("playerEnteredZone", ({ buildingId, tourStop }: { buildingId: string; tourStop: TourStop }) => {
            setCurrentEncounter(tourStop);
            // buildings told by beat cards never open the tour dialog (it would stay "open" unseen and hide Walk)
            if (BEAT_CARD_BUILDINGS.has(buildingId)) {
              if (autoWalkTargetRef.current === buildingId) autoWalkTargetRef.current = null;
              return;
            }

            if (!autoWalkTargetRef.current) {
              setIsDialogOpen(true);
              if (tourStop.title) {
                trackBuildingInteracted(tourStop.title, 'adventure', 'zone_entry');
              }
            } else if (autoWalkTargetRef.current === buildingId) {
              autoWalkTargetRef.current = null;
              setIsDialogOpen(true);
              if (tourStop.title) {
                trackBuildingInteracted(tourStop.title, 'adventure', 'auto_walk');
              }
            }
          });

          // Walk may be pressed again later: drop the interior listeners from the last time before adding them
          for (const name of ["interiorBeatChanged", "interiorDoorCrossed", "interiorSeatChanged"]) scene.events.off(name);

          // Peek card: the avatar stands on (or leaves) a beat's stand tile inside a walk-in building
          scene.events.on("interiorBeatChanged", (next: { buildingId: string; beat: string } | null) => {
            setInteriorBeat(next);
            if (next) setDoorCard((card) => (card?.beat === "enter" ? null : card));
          });
          // enter card on the way in (until a stand tile opens its own card, or 6 s), leave card on the way out (15 s)
          scene.events.on("interiorDoorCrossed", ({ buildingId, inward }: { buildingId: string; inward: boolean }) => {
            window.clearTimeout(doorTimerRef.current);
            const beat = inward ? "enter" : "leave";
            if (!INTERIOR_BEATS[buildingId]?.[beat]) { setDoorCard(null); return; }
            setDoorCard({ buildingId, beat });
            doorTimerRef.current = window.setTimeout(() => setDoorCard(null), inward ? 6000 : 15000);
          });

          // the screens open a moment after the avatar sits, so the sit itself is seen
          scene.events.on("interiorSeatChanged", (next: { buildingId: string; beat: string } | null) => {
            window.clearTimeout(seatTimerRef.current);
            setIsSeated(!!next);
            if (!next) { setInteriorSeat(null); return; }
            const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
            seatTimerRef.current = window.setTimeout(() => setInteriorSeat(next), reduced ? 150 : 700);
          });

          // Player exited trigger zone
          scene.events.on("playerExitedZone", () => {
            setCurrentEncounter(null);
          });

          // Interaction triggered (E pressed / mobile button)
          scene.events.on("interactionTriggered", ({ tourStop, method }: { tourStop: TourStop; method?: string }) => {
            setIsDialogOpen(true);
            if (tourStop.title) {
              trackBuildingInteracted(tourStop.title, 'adventure', (method as 'keyboard' | 'mobile_button') || 'keyboard');
            }
          });

          // Player position changed (for auto-walk state + walkable directions)
          scene.events.on("playerPositionChanged", (data: PlayerData) => {
            if (data.state === PlayerState.Walking && autoWalkTargetRef.current) {
              autoWalkTargetRef.current = null;
            }
            setWalkableDirections(data.walkableDirections ?? []);
          });

          // Building visited
          scene.events.on("buildingVisited", ({ buildingId }: { buildingId: string }) => {
            setVisitedBuildings((prev) => new Set([...prev, buildingId]));
            markPlaceFound(buildingId);
          });
        }
      }
    }
  }, []);

  const handleLogoClick = useCallback((buildingId: string) => {
    markPlaceFound(buildingId);

    // A logo opens the same thing as its building: the case, when there is one
    const building = getBuilding(buildingId);
    if (building?.interactable && building.projectSlug) {
      trackBuildingInteracted(building.name, gameMode, 'logo_click');
      onProjectClick?.(building.projectSlug);
      return;
    }

    if (isAdventureActive) {
      autoWalkTargetRef.current = buildingId;
      gameBoardRef.current?.walkPlayerToBuilding(buildingId);
      // Player is already here; skip the walk
      if (currentEncounterRef.current?.buildingId === buildingId) {
        autoWalkTargetRef.current = null;
        setIsDialogOpen(true);
      }
      return;
    }

    hasManualViewportInteraction.current = true;
    gameBoardRef.current?.panToBuildingById(buildingId, { dialogVisible: true });

    const stop = TOUR_STOPS.find((s) => s.buildingId === buildingId);
    if (stop) {
      trackBuildingInteracted(stop.title, gameMode, 'logo_click');
      setCurrentEncounter(stop);
      setIsDialogOpen(true);
    }
  }, [gameMode, isAdventureActive, onProjectClick]);

  // The city follows the visitor's own clock in their browser (lookForHour) unless they pick a time of day on
  // the button next to Walk (remembered in this browser). ?night=1 / ?night=0 on the URL forces night or day (for links
  // and screenshots), and ?hour=0..23 stands in for the clock
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(() => {
    try {
      // A link with ?night= or ?hour= shows what the link asks for, whatever this browser picked before
      if (urlTime.night !== null || urlTime.hour !== null) return "auto";
      const saved = window.localStorage.getItem(TIME_OF_DAY_KEY);
      return TIMES_OF_DAY.some((t) => t.id === saved) ? (saved as TimeOfDay) : "auto";
    } catch {
      return "auto"; // Storage blocked: stay on Auto
    }
  });
  const pickTimeOfDay = useCallback((value: TimeOfDay) => {
    setTimeOfDay(value);
    try {
      window.localStorage.setItem(TIME_OF_DAY_KEY, value);
    } catch {
      // Storage blocked: the pick lasts for this visit
    }
  }, []);
  useEffect(() => {
    if (urlTime.hour !== null) return;
    const timer = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(timer);
  }, [urlTime.hour]);

  // Hand the night state to the scene, waiting for it to exist on first load (however long that takes)
  useEffect(() => {
    const apply = () => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { setLook?: (look: CityLook) => void; setHour?: (hour: number) => void } | undefined;
      if (scene?.setLook) {
        // A picked time of day wins; Auto takes the look from the hour, and ?night=1 / ?night=0 forces night or day
        // (night forced in the daytime shows the evening's windows)
        const pickedHour = HOUR_OF[timeOfDay];
        const look: CityLook = timeOfDay !== "auto" ? timeOfDay
          : urlTime.night !== null ? (urlTime.night ? "night" : "day") : lookForHour(hour);
        const sceneHour = pickedHour ?? hour;
        scene.setHour?.(look === "night" && !isNightHour(sceneHour) ? 21 : sceneHour);
        scene.setLook(look);
        return true;
      }
      return false;
    };
    if (apply()) return;
    const timer = window.setInterval(() => { if (apply()) window.clearInterval(timer); }, 250);
    return () => window.clearInterval(timer);
  }, [urlTime.night, hour, timeOfDay]);

  // Stop Adventure Mode
  // Close the screens: the avatar stands up from its chair (the scene then emits interiorSeatChanged null)
  const handleStandUp = useCallback(() => {
    const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as { standUp?: () => void } | undefined;
    scene?.standUp?.();
    window.clearTimeout(seatTimerRef.current);
    setIsSeated(false);
    setInteriorSeat(null);
  }, []);

  const handleStopAdventure = useCallback(() => {
    setIsAdventureActive(false);
    setGameMode(GameMode.Viewer);
    setCurrentEncounter(null);
    setIsDialogOpen(false);
    setInteriorBeat(null);
    setInteriorSeat(null);
    setIsSeated(false);
    setDoorCard(null);
    autoWalkTargetRef.current = null;

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

  // Handle joystick direction change
  const handleJoystickDirection = useCallback((direction: Direction | null) => {
    gameBoardRef.current?.setPlayerInputDirection(direction);
  }, []);

  // Handle view case study from dialog
  const handleViewCaseStudy = useCallback((projectSlug: string) => {
    setIsDialogOpen(false);
    trackProjectOpened(projectSlug, 'city');

    // Mark building as visited
    if (currentEncounter?.buildingId) {
      gameBoardRef.current?.markBuildingVisited(currentEncounter.buildingId);
      setVisitedBuildings((prev) => new Set([...prev, currentEncounter.buildingId!]));
    }

    onProjectClick?.(projectSlug);
  }, [currentEncounter, onProjectClick]);

  // A tap on Valtech or LEGO HQ opens it in place (MainScene openWalkInPeek): follow it here for the card. The scene may
  // still be booting, so wait for it.
  useEffect(() => {
    type PeekListener = (next: { buildingId: string } | null) => void;
    let scene: { events?: { on: (name: string, fn: PeekListener) => void; off: (name: string, fn: PeekListener) => void } } | undefined;
    let timer = 0;
    const onPeek = (next: { buildingId: string } | null) => {
      setWalkInPeek(next?.buildingId ?? null);
      if (!next) return;
      markPlaceFound(next.buildingId);
      const building = getBuilding(next.buildingId);
      if (building) trackBuildingInteracted(building.name, selectedModeRef.current, 'open_in_place');
    };
    const attach = () => {
      scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as typeof scene;
      if (!scene?.events) { timer = window.setTimeout(attach, 200); return; }
      scene.events.on("walkInPeek", onPeek);
    };
    attach();
    return () => {
      window.clearTimeout(timer);
      scene?.events?.off("walkInPeek", onPeek);
    };
  }, []);

  const walkInScene = useCallback(
    () =>
      gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { walkIntoPeek?: () => boolean; closeWalkInPeek?: () => void }
        | undefined,
    []
  );

  // The card's Walk in: start walking first when needed (the avatar spawns), then walk to the open building's door
  const handleWalkInPeek = useCallback(() => {
    if (!isAdventureActive) handleStartAdventure();
    let tries = 0;
    const go = () => {
      if (walkInScene()?.walkIntoPeek?.()) return;
      if (++tries < 30) window.setTimeout(go, 100);
    };
    go();
  }, [isAdventureActive, handleStartAdventure, walkInScene]);

  const handleReadCasePeek = useCallback(() => {
    const slug = walkInPeek ? getBuilding(walkInPeek)?.projectSlug : undefined;
    walkInScene()?.closeWalkInPeek?.();
    if (slug) handleViewCaseStudy(slug);
  }, [walkInPeek, handleViewCaseStudy, walkInScene]);

  // Handle building click
  const handleBuildingClick = useCallback(
    (buildingId: string) => {
      const building = getBuilding(buildingId);
      if (!building) return;

      markPlaceFound(buildingId);
      trackBuildingInteracted(building.name, gameMode, 'click');

      if (building.interactable && building.projectSlug) {
        onProjectClick?.(building.projectSlug);
      } else {
        const tourStop = TOUR_STOPS.find((s) => s.buildingId === buildingId);
        if (tourStop) {
          gameBoardRef.current?.panToBuildingById(buildingId, { dialogVisible: true });
          setCurrentEncounter(tourStop);
          setIsDialogOpen(true);
        }
      }
    },
    [onProjectClick, gameMode]
  );


  // The Avatar tab opened: the avatar stands in the city (walk mode, so it exists) and the camera goes to it
  // and it closed: back to street zoom on the avatar, ready to walk
  const avatarTabWasOpen = useRef(false);
  useEffect(() => {
    const focus = (close = false) => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { focusOnPlayer?: (close?: boolean) => boolean }
        | undefined;
      return scene?.focusOnPlayer?.(close) ?? false;
    };
    if (!avatarTabOpen) {
      if (avatarTabWasOpen.current) {
        avatarTabWasOpen.current = false;
        const t = window.setTimeout(() => focus(true), 250);   // after the canvas grows back
        return () => window.clearTimeout(t);
      }
      return;
    }
    avatarTabWasOpen.current = true;
    // Wait for the scene (a deep link to the tab can arrive before Phaser has booted), start walk mode so the
    // avatar exists, then focus once the player has spawned and the canvas has resized to the open panel.
    let timer = 0;
    let started = isAdventureActive;
    const step = (left: number) => {
      if (left <= 0) return;
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { ready?: boolean; skipNextSpawnFocus?: boolean }
        | undefined;
      if (!started) {
        if (!scene?.ready) {
          timer = window.setTimeout(() => step(left - 1), 150);
          return;
        }
        scene.skipNextSpawnFocus = true;
        handleStartAdventure({ fromAvatarTab: true });
        started = true;
      }
      if (focus()) return;
      timer = window.setTimeout(() => step(left - 1), 150);
    };
    timer = window.setTimeout(() => step(60), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the tab opens or closes
  }, [avatarTabOpen]);

  useEffect(() => {
    if (!e2eMode || typeof window === "undefined") return;

    const startAdventureForTest = () => {
      if (isAdventureActive) {
        return true;
      }

      handleStartAdventure();
      return true;
    };

    const waitForPlayerReadyForTest = async () => {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const playerState = gameBoardRef.current?.getPlayerState();
        if (playerState) {
          return true;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }

      return false;
    };

    (window as any).__CITY_E2E__ = ({
      focusBuilding: (buildingId: string) => {
        const building = getBuilding(buildingId);
        if (!building) return false;

        setGameMode(GameMode.Viewer);
        gameBoardRef.current?.highlightBuilding(buildingId);

        const position = findBuildingPosition(initialGrid, buildingId);
        if (position) {
          gameBoardRef.current?.panToPosition(position.x, position.y);
          hasManualViewportInteraction.current = true;
        }

        return true;
      },
      startAdventure: () => {
        return startAdventureForTest();
      },
      walkToBuilding: async (buildingId: string) => {
        startAdventureForTest();

        const isPlayerReady = await waitForPlayerReadyForTest();
        if (!isPlayerReady) {
          return false;
        }

        for (let attempt = 0; attempt < 20; attempt += 1) {
          const didStartWalking =
            gameBoardRef.current?.walkPlayerToBuilding(buildingId) ?? false;

          if (didStartWalking) {
            return true;
          }

          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }

        return gameBoardRef.current?.movePlayerToBuilding(buildingId) ?? false;
      },
      openEncounter: (stopId: string) => {
        const stop = TOUR_STOPS.find((tourStop) => tourStop.id === stopId);
        if (!stop) return false;

        startAdventureForTest();
        setCurrentEncounter(stop);
        setIsDialogOpen(true);
        return true;
      },
      closeEncounter: () => {
        setIsDialogOpen(false);
        setCurrentEncounter(null);
      },
      getPlayerState: () => {
        return gameBoardRef.current?.getPlayerState() ?? null;
      },
      getCurrentEncounterId: () => {
        return currentEncounter?.id ?? null;
      },
      getVisitedBuildings: () => {
        return Array.from(visitedBuildings);
      },
      setVisitedBuildings: (buildingIds: string[]) => {
        setVisitedBuildings(new Set(buildingIds));
      },
      stopAdventure: () => {
        handleStopAdventure();
      },
      // Freeze the update loop (tweens, anims, movement) so canvas
      // screenshots are deterministic; the renderer keeps drawing the
      // last frame.
      pauseGame: () => {
        const game = gameBoardRef.current?.getGameInstance();
        const scene = game?.scene.getScene("MainScene");
        if (!scene) return false;
        if (!scene.scene.isPaused()) scene.scene.pause();
        return scene.scene.isPaused();
      },
      resumeGame: () => {
        const game = gameBoardRef.current?.getGameInstance();
        const scene = game?.scene.getScene("MainScene");
        if (!scene) return false;
        if (scene.scene.isPaused()) scene.scene.resume();
        return !scene.scene.isPaused();
      },
      getScene: () => {
        const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as MainScene | undefined;
        return scene ?? null;
      },
      // Visible world rectangle (world pixels) and the player's feet, for camera tests
      getCameraState: () => {
        const game = gameBoardRef.current?.getGameInstance();
        const scene = game?.scene.getScene("MainScene") as MainScene | undefined;
        // null until create() has run, so tests can wait for a camera that accepts commands
        if (!game || !scene || !scene.scene.isActive()) return null;
        const { zoom, worldView } = scene.cameras.main;
        return {
          webgl: game.renderer.type === 2, // Phaser.WEBGL
          zoom,
          view: { x: worldView.x, y: worldView.y, width: worldView.width, height: worldView.height },
          player: scene.getPlayerWorldPosition(),
        };
      },
    }) satisfies CityE2EApi;

    return () => {
      delete (window as any).__CITY_E2E__;
    };
  }, [
    e2eMode,
    currentEncounter?.id,
    handleStartAdventure,
    handleStopAdventure,
    initialGrid,
    isAdventureActive,
    visitedBuildings,
  ]);

  // The card on screen: a stand-tile beat first (hidden while seated), else a door beat
  // While seated, the screens overlay replaces the card, unless the seat has no screens (the card stays, e.g. at a table)
  const seatHasScreens = !!(interiorBeat && INTERIOR_BEATS[interiorBeat.buildingId]?.[interiorBeat.beat]?.seat?.screens.length);
  const shownCard = interiorBeat ? (isSeated && seatHasScreens ? null : choiceCard ?? interiorBeat) : doorCard;
  // The tour dialog does not show for buildings told by beat cards (it may still be "open" for them in state)
  const dialogShown = isDialogOpen && !!currentEncounter && !BEAT_CARD_BUILDINGS.has(currentEncounter.buildingId ?? "");

  return (
    <div ref={viewerRootRef} className="relative w-full h-full" data-testid="city-root">
      <GameBoard
        ref={gameBoardRef}
        editable={false}
        initialGrid={initialGrid}
        onBuildingClick={handleBuildingClick}
        testId="city-canvas"
      />

      {/* Portfolio mode toggle */}
      {!isShell && !isAdventureActive && (
        <div className="fixed z-40 md:top-4 top-[max(0.75rem,env(safe-area-inset-top))] left-4 right-4">
          <PortfolioModeToggle activeMode="city" showIdentity />
        </div>
      )}

      {/* 3D Spinning Logos Overlay */}
      {!e2eMode && viewportRect.width > 0 && viewportRect.height > 0 && (
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
          onLogoClick={handleLogoClick}
        />
      )}

      {/* Adventure Mode UI (held back while the Avatar tab is showing: the visitor is dressing, not walking) */}
      {isAdventureActive && !avatarTabOpen && (
        <>
          {/* Directional Compass */}
          <DirectionalCompass isMobile={isMobile} walkableDirections={walkableDirections} />

          {/* Virtual Joystick (mobile) */}
          <VirtualJoystick
            isMobile={isMobile}
            onDirectionChange={handleJoystickDirection}
            contained={isShell}
          />

        </>
      )}

      {/* A walk-in building opened in place by a tap: walk in, or read the case */}
      <WalkInCard
        buildingId={avatarTabOpen ? null : walkInPeek}
        onWalkIn={handleWalkInPeek}
        onReadCase={handleReadCasePeek}
        onClose={() => walkInScene()?.closeWalkInPeek?.()}
      />

      {/* Peek card while the avatar stands on a beat's stand tile inside a walk-in building */}
      {isAdventureActive && (
        <PeekCard
          beat={shownCard ? INTERIOR_BEATS[shownCard.buildingId]?.[shownCard.beat] ?? null : null}
          beatKey={shownCard ? `${shownCard.buildingId}:${shownCard.beat}` : null}
          onViewCaseStudy={() => {
            const slug = shownCard ? getBuilding(shownCard.buildingId)?.projectSlug : undefined;
            if (!slug) return;
            window.clearTimeout(doorTimerRef.current);
            setDoorCard(null);
            handleViewCaseStudy(slug);
          }}
          onChoose={(choice) => {
            if (!shownCard) return;
            if (!choice.walk) {
              trackBeatChoice(shownCard.buildingId, shownCard.beat, choice.id);
              setChoiceCard({ buildingId: shownCard.buildingId, beat: choice.to });
              return;
            }
            const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as MainScene | undefined;
            // A second tap while the cook still serves is ignored, and not counted twice
            if (scene?.serveThenWalk(shownCard.buildingId, shownCard.beat, choice.to)) {
              trackBeatChoice(shownCard.buildingId, shownCard.beat, choice.id);
            }
          }}
        />
      )}
      {isAdventureActive && (
        <ScreensOverlay
          beat={interiorSeat ? INTERIOR_BEATS[interiorSeat.buildingId]?.[interiorSeat.beat] ?? null : null}
          beatKey={interiorSeat ? `${interiorSeat.buildingId}:${interiorSeat.beat}` : null}
          onClose={handleStandUp}
        />
      )}

      {/* Dialog for a building without a case study, on logo click or when the avatar reaches it */}
      <RPGDialogBox
        isMobile={isMobile}
        tourStop={currentEncounter}
        isVisible={dialogShown}
        onClose={handleDialogClose}
        onViewCaseStudy={handleViewCaseStudy}
        disableTypingAnimation={e2eMode}
        logoUrl={currentEncounter?.buildingId ? getBuilding(currentEncounter.buildingId)?.logoUrl : null}
      />

      {/* Walk the avatar. In the shell it sits inside the city view (the panel and its phone sheet own the window's
          edges): bottom-left on a desktop, bottom-right on a phone where the joystick takes the bottom-left */}
      {!dialogShown && !avatarTabOpen && (
        <div className={isShell ? "absolute bottom-3 right-3 z-30 flex gap-2 md:left-3 md:right-auto" : "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex gap-2"}>
          <button
            onClick={isAdventureActive ? handleStopAdventure : () => handleStartAdventure()}
            className={pixelButtonClass(isAdventureActive ? "ghost" : "primary")}
            style={PIXEL_INSET_CLIP}
          >
            {isAdventureActive ? "Stop walking" : "Walk"}
          </button>
          {/* Hidden while walking on a phone, where Stop walking is wider and runs under the joystick */}
          {!(isMobile && isAdventureActive) && <TimeOfDayButton value={timeOfDay} onChange={pickTimeOfDay} />}
        </div>
      )}
    </div>
  );
}
