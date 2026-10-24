"use client";

import { HOUR_OF, TIMES_OF_DAY, isNightHour, lookForHour, type CityLook, type TimeOfDay } from "@/lib/city/nightSchedule";
import TimeOfDayButton from "./TimeOfDayButton";
import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import { GridCell, CharacterType, Direction, PlayerState, PlayerData, GameMode } from "./pogicity/types";
import { getBuilding } from "@/lib/city/buildings";
import { BOUNCE_RATE_SECONDS, FINDS, FIND_WALK_EVENT, addCitySeconds, isFound, markFound, onFound, type Find, type FindWalkTarget } from "@/lib/achievements";
import FoundToast from "./FoundToast";
import { TourStop, findBuildingPosition, TOUR_STOPS } from "@/lib/city/tourStops";
import RPGDialogBox from "./RPGDialogBox";
import PlaceSheet from "./PlaceSheet";
import FindPill from "./FindPill";
import PeekCard from "./PeekCard";
import WalkInCard from "./WalkInCard";
import ScreensOverlay from "./ScreensOverlay";
import { BEAT_CARD_BUILDINGS, INTERIOR_BEATS } from "@/lib/city/interiorBeats";
import { getPlace } from "@/lib/city/places";
import { PLACE_WALK_IN_EVENT } from "@/lib/popupMode";
import VirtualJoystick from "./VirtualJoystick";
import DirectionalCompass from "./DirectionalCompass";
import LogosOverlay, { LogoPosition } from "./LogosOverlay";
import IntroReportPill from "./IntroReportPill";
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
  trackFind,
} from "@/lib/analytics";
import { closeIntroLog, getIntroFrame, INTRO_DONE_EVENT, INTRO_REPLAY_EVENT, isIntroActive, logIntro, reportCityBoot, reportCityReady, setCityFramingReader } from "@/lib/intro/progress";
import { worldFromContainer } from "@/lib/intro/camera";

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
const FIND_TOTAL = FINDS.length;

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
  // Shell only: the panel (on phones, the bottom sheet) is open. On a phone a place's card takes the sheet's spot, so the
  // shell closes the panel when a place opens (onPlaceOpen), and an opening panel closes the place.
  panelOpen?: boolean;
  onPlaceOpen?: () => void;
  // Shell only. "slot" (Figma board F): a tap on any building (or its logo) opens its place in the shell's
  // panel instead of a card in the city (onOpenPlace); the shell's open place comes back as openPlace, and a walk-in
  // building's roof follows it. Finds are a pill on every screen, beat cards plain, and the old tour dialog never shows.
  popups?: "cards" | "slot";
  openPlace?: string | null;
  onOpenPlace?: (buildingId: string) => void;
  onClosePlace?: () => void;
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
  panelOpen = false,
  onPlaceOpen,
  popups = "cards",
  openPlace = null,
  onOpenPlace,
  onClosePlace,
}: CityViewerProps) {
  const isShell = variant === "shell";
  const slot = isShell && popups === "slot";
  // For the Phaser event handlers, which are set up once
  const slotRef = useRef(slot);
  slotRef.current = slot;
  const onOpenPlaceRef = useRef(onOpenPlace);
  onOpenPlaceRef.current = onOpenPlace;
  const onClosePlaceRef = useRef(onClosePlace);
  onClosePlaceRef.current = onClosePlace;
  const openPlaceRef = useRef(openPlace);
  // The walk-in building whose roof is off for the shell's place (slot), so a closing roof closes that place only
  const peekedPlaceRef = useRef<string | null>(null);
  // Phone width in the shell (the panel's md breakpoint): place cards open as a bottom sheet, peek cards sit at the
  // bottom, finds show as a small pill (POR-23, modeled on tomjohn.design)
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 767px)");
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  const phoneShell = isShell && isPhone;

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
  // slot: the avatar stood still after a door card showed, so its next walk closes the card
  const doorStoppedRef = useRef(false);
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
  const adventureOnRef = useRef(false);
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
  // (fromAvatarTab: walk mode only to show the avatar while the visitor dresses it, not a mode choice to track;
  // onLoad: the new site starts walking by itself, also not a choice)
  const handleStartAdventure = useCallback((options?: { fromAvatarTab?: boolean; onLoad?: boolean }) => {
    // Once only: the load, the Avatar tab and a card's Walk in can all ask at the same moment
    if (adventureOnRef.current) return;
    adventureOnRef.current = true;
    setGameMode(GameMode.Adventure);
    setIsAdventureActive(true);
    setVisitedBuildings(new Set());
    if (!options?.fromAvatarTab && !options?.onLoad) trackModeSelected('adventure', 'gustav');
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
            markFound(`zone:${buildingId}`);
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
              // slot: arriving where Walk there pointed opens the place in the panel
              if (slotRef.current) onOpenPlaceRef.current?.(buildingId);
              else setIsDialogOpen(true);
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
            if (next) markFound(`${next.buildingId}:${next.beat}`);
            if (next) setDoorCard((card) => (card?.beat === "enter" ? null : card));
          });
          // enter card on the way in (until a stand tile opens its own card, or 6 s), leave card on the way out (15 s)
          scene.events.on("interiorDoorCrossed", ({ buildingId, inward }: { buildingId: string; inward: boolean }) => {
            if (inward && walkHintRef.current === buildingId) showWalkHint(buildingId);
            walkHintRef.current = null;
            window.clearTimeout(doorTimerRef.current);
            const beat = inward ? "enter" : "leave";
            if (!INTERIOR_BEATS[buildingId]?.[beat]) { setDoorCard(null); return; }
            setDoorCard({ buildingId, beat });
            // slot: no timer, the card stays until the avatar walks on (playerPositionChanged)
            doorStoppedRef.current = false;
            if (!slotRef.current) doorTimerRef.current = window.setTimeout(() => setDoorCard(null), inward ? 6000 : 15000);
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
            if (moveLogLeftRef.current > 0) { moveLogLeftRef.current--; logIntro("avatar.at", `${data.gridX},${data.gridY} ${data.state}`); }
            if (data.state === PlayerState.Walking && autoWalkTargetRef.current) {
              autoWalkTargetRef.current = null;
            }
            if (slotRef.current) {
              if (data.state !== PlayerState.Walking) doorStoppedRef.current = true;
              else if (doorStoppedRef.current) setDoorCard(null);
            }
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

  const handleLogoClick = useCallback((buildingId: string) => {
    // slot: a logo opens the same thing as its building, its place
    if (slotRef.current) {
      if (!getPlace(buildingId)) return;
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as MainScene | undefined;
      if (!scene?.openInPlace(buildingId)) gameBoardRef.current?.panToBuildingById(buildingId);
      onOpenPlaceRef.current?.(buildingId);
      return;
    }
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
  // A picked time of day wins; Auto takes the look from the hour, and ?night=1 / ?night=0 forces night or day
  const look: CityLook = timeOfDay !== "auto" ? timeOfDay
    : urlTime.night !== null ? (urlTime.night ? "night" : "day") : lookForHour(hour);
  useEffect(() => {
    if (urlTime.hour !== null) return;
    const timer = window.setInterval(() => setHour(new Date().getHours()), 60_000);
    return () => window.clearInterval(timer);
  }, [urlTime.hour]);

  // Finds (lib/achievements.ts). A beat card shows its own "Found" tag; every other find gets a short toast.
  const [freshFinds, setFreshFinds] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ find: Find; count: number } | null>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const off = onFound((find, count) => {
      trackFind(find.id, find.group, count);
      if (find.onCard) {
        setFreshFinds((prev) => ({ ...prev, [find.id]: `Found · ${count} of ${FIND_TOTAL}` }));
        return;
      }
      window.clearTimeout(toastTimerRef.current);
      setToast({ find, count });
      toastTimerRef.current = window.setTimeout(() => setToast(null), 5000);
    });
    return () => {
      off();
      window.clearTimeout(toastTimerRef.current);
    };
  }, []);
  // After a hidden find's "Walk me close": in through the door, say how many finds still hide in these rooms
  const [walkHint, setWalkHint] = useState<string | null>(null);
  const walkHintTimerRef = useRef<number | undefined>(undefined);
  const showWalkHint = (buildingId: string) => {
    const left = FINDS.filter((find) => find.id.startsWith(`${buildingId}:`) && !isFound(find.id)).length;
    if (left === 0) return;
    window.clearTimeout(walkHintTimerRef.current);
    setWalkHint(`${left} ${left === 1 ? "find hides" : "finds hide"} in here. Tap a room to walk in and look.`);
    walkHintTimerRef.current = window.setTimeout(() => setWalkHint(null), 7000);
  };
  useEffect(() => () => window.clearTimeout(walkHintTimerRef.current), []);
  // Night owl: the city after midnight, on the visitor's own clock (or ?hour=0..4)
  useEffect(() => {
    if (hour < 5) markFound("night-owl");
  }, [hour]);
  // Bounce rate: five minutes in the city, counted across every visit while the tab is in view
  useEffect(() => {
    const step = 15;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      if (addCitySeconds(step) >= BOUNCE_RATE_SECONDS) markFound("bounce-rate");
    }, step * 1000);
    return () => window.clearInterval(timer);
  }, []);

  // Hand the night state to the scene, waiting for it to exist on first load (however long that takes)
  useEffect(() => {
    const apply = () => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { setLook?: (look: CityLook) => void; setHour?: (hour: number) => void } | undefined;
      if (scene?.setLook) {
        // (night forced in the daytime shows the evening's windows)
        const pickedHour = HOUR_OF[timeOfDay];
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
  }, [look, hour, timeOfDay]);

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
    adventureOnRef.current = false;
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

  // A tap on a walk-in building opens it in place (MainScene openWalkInPeek): follow it here for the card. The scene may
  // still be booting, so wait for it.
  useEffect(() => {
    type PeekListener = (next: { buildingId: string } | null) => void;
    let scene: { events?: { on: (name: string, fn: PeekListener) => void; off: (name: string, fn: PeekListener) => void } } | undefined;
    let timer = 0;
    const onPeek = (next: { buildingId: string } | null) => {
      setWalkInPeek(next?.buildingId ?? null);
      // slot: the roof is the place's. Opening it opens the place in the panel; closing it (a tap elsewhere, walking in)
      // closes that place, unless the shell has moved on to another one
      if (slotRef.current) {
        const was = peekedPlaceRef.current;
        peekedPlaceRef.current = next?.buildingId ?? null;
        if (next) onOpenPlaceRef.current?.(next.buildingId);
        else if (was && openPlaceRef.current === was) onClosePlaceRef.current?.();
      }
      if (!next) return;
      const building = getBuilding(next.buildingId);
      if (building) trackBuildingInteracted(building.name, selectedModeRef.current, 'open_in_place');
    };
    const attach = () => {
      scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as typeof scene;
      if (!scene?.events) { timer = window.setTimeout(attach, 200); return; }
      // slot: the page's Esc goes one step back (case, place); the roof follows the place
      (scene as { peekEscCloses?: boolean }).peekEscCloses = !slotRef.current;
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
        | { walkIntoPeek?: () => boolean; closeWalkInPeek?: () => void; openInPlace?: (buildingId: string) => boolean }
        | undefined,
    []
  );

  // slot: the shell's open place drives the city. A new place takes the roof off its walk-in building (a link that
  // opens on it, or a place opened from the panel) or moves the camera to it; no place puts the last roof back.
  useEffect(() => {
    openPlaceRef.current = openPlace;
    if (!slot) return;
    const peeked = peekedPlaceRef.current;
    if (peeked && peeked !== openPlace) walkInScene()?.closeWalkInPeek?.();
    if (!openPlace || openPlace === peeked) return;
    let tries = 0, timer = 0;
    const go = () => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as { ready?: boolean } | undefined;
      if (!scene?.ready) {
        if (++tries < 100) timer = window.setTimeout(go, 150);
        return;
      }
      if (!walkInScene()?.openInPlace?.(openPlace)) gameBoardRef.current?.panToBuildingById(openPlace);
    };
    go();
    return () => window.clearTimeout(timer);
  }, [slot, openPlace, walkInScene]);

  // slot: the place's Walk in, from the panel
  useEffect(() => {
    if (!slot) return;
    const onWalkIn = () => handleWalkInPeekRef.current();
    window.addEventListener(PLACE_WALK_IN_EVENT, onWalkIn);
    return () => window.removeEventListener(PLACE_WALK_IN_EVENT, onWalkIn);
  }, [slot]);

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
  const handleWalkInPeekRef = useRef(handleWalkInPeek);
  handleWalkInPeekRef.current = handleWalkInPeek;

  // A find's "Walk there" in the panel: start walking when needed (the avatar spawns), then run to the room's spot, in
  // through a building's door (a hidden room), or to the place. Zones passed on the way stay quiet; the place itself
  // greets the avatar as a logo walk does.
  const walkHintRef = useRef<string | null>(null);
  useEffect(() => {
    const onFindWalk = (e: Event) => {
      const { buildingId, beat, inside } = (e as CustomEvent<FindWalkTarget>).detail;
      if (!isAdventureActive) handleStartAdventure();
      walkInScene()?.closeWalkInPeek?.();
      walkHintRef.current = inside ? buildingId : null;
      let tries = 0;
      const go = () => {
        const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as MainScene | undefined;
        let started = beat ? !!scene?.walkPlayerToBeat(buildingId, beat) : inside ? !!scene?.walkPlayerIntoBuilding(buildingId) : false;
        if (!started && !beat && !inside) {
          if (!BEAT_CARD_BUILDINGS.has(buildingId)) autoWalkTargetRef.current = buildingId;
          started = !!gameBoardRef.current?.walkPlayerToBuilding(buildingId);
          if (!started) autoWalkTargetRef.current = null;
        }
        if (started) { scene?.runPlayer(); return; }
        if (++tries < 30) window.setTimeout(go, 100);
      };
      go();
    };
    window.addEventListener(FIND_WALK_EVENT, onFindWalk);
    return () => window.removeEventListener(FIND_WALK_EVENT, onFindWalk);
  }, [isAdventureActive, handleStartAdventure, walkInScene]);

  // Phones: a place opened in place takes the sheet's spot, so the panel closes; a panel opened from the tab bar
  // closes the place again
  useEffect(() => {
    if (phoneShell && !slot && walkInPeek) onPlaceOpen?.();
  }, [phoneShell, slot, walkInPeek, onPlaceOpen]);
  const walkInPeekRef = useRef(walkInPeek);
  useEffect(() => {
    walkInPeekRef.current = walkInPeek;
  }, [walkInPeek]);
  useEffect(() => {
    if (panelOpen && phoneShell && !slot && walkInPeekRef.current) walkInScene()?.closeWalkInPeek?.();
  }, [panelOpen, phoneShell, slot, walkInScene]);

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

      trackBuildingInteracted(building.name, gameMode, 'click');

      // slot: every building with a place opens it in the panel (walk-in buildings come through walkInPeek instead)
      if (slot) {
        if (!getPlace(buildingId)) return;
        gameBoardRef.current?.panToBuildingById(buildingId);
        onOpenPlace?.(buildingId);
        return;
      }

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
    [onProjectClick, gameMode, slot, onOpenPlace]
  );


  // The new site lands walking (POR-47): once the scene is up the avatar spawns by Valtech, the camera starts close on
  // it and after a moment zooms out to street zoom (straight to street zoom with reduced motion). The Avatar tab, when
  // a link opens on it, does its own focus.
  const avatarTabOpenRef = useRef(avatarTabOpen);
  avatarTabOpenRef.current = avatarTabOpen;
  // true once the landing camera is set, so the overlay reads a camera that is where a first visit starts
  const landedRef = useRef(false);
  // /new?report=1: the hand-over report pill on the real page (components/city/IntroReportPill.tsx)
  const [reportPill, setReportPill] = useState(false);
  useEffect(() => { if (isShell && /[?&]report=1(&|$)/.test(window.location.search)) setReportPill(true); }, [isShell]);
  // the hand-over report (lib/intro/progress.ts logIntro): the avatar's first moves after it stands
  const moveLogLeftRef = useRef(0);
  useEffect(() => {
    if (!isShell) return;
    let timer = 0;
    const timers: number[] = [];
    type ReportScene = {
      playerController?: { getPosition(): { gridX: number; gridY: number; worldX: number; worldY: number }; getState(): string } | null;
      cameras?: { main: { scrollX: number; scrollY: number; zoom: number; width: number; height: number } };
      events?: { on(name: string, fn: () => void): unknown; off(name: string, fn: () => void): unknown };
      time?: { now: number };
    };
    const reportScene = () => gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as ReportScene | undefined;
    const r1 = (n: number) => Math.round(n * 10) / 10;
    const where = () => {
      const cam = gameBoardRef.current?.getCameraState();
      const sc = reportScene();
      const real = sc?.cameras?.main;
      const pc = sc?.playerController;
      const p = pc?.getPosition();
      const box = viewerRootRef.current?.getBoundingClientRect();
      // the camera the overlay is told about (the scene's base scroll) and, when it differs, the one Phaser draws with
      const drift = cam && real && (Math.abs(cam.scrollX - real.scrollX) > 0.5 || Math.abs(cam.scrollY - real.scrollY) > 0.5) ? ` (drawn at ${r1(real.scrollX)},${r1(real.scrollY)})` : "";
      return `camera ${cam ? `${cam.scrollX},${cam.scrollY} zoom ${cam.zoom}` : "none"}${drift}; avatar ${p ? `${p.gridX},${p.gridY} ${pc?.getState()}` : "none"}; city ${Math.round(box?.width ?? 0)}x${Math.round(box?.height ?? 0)} of ${window.innerWidth}x${window.innerHeight}`;
    };
    // the geometry check: where the city's canvas puts the spawn tile on the page against where the intro draws it,
    // with everything both of them computed that from (a phone that shows the two frames in different places tells
    // here which side is off, and by how much)
    const geometry = () => {
      const game = gameBoardRef.current?.getGameInstance() as
        | { canvas?: HTMLCanvasElement; scale?: { displaySize: { width: number; height: number }; parentSize: { width: number; height: number } }; loop?: { frame: number; actualFps: number; inFocus?: boolean; delta?: number; rawDelta?: number; _coolDown?: number } }
        | undefined;
      const sc = reportScene();
      const cam = sc?.cameras?.main;
      const p = sc?.playerController?.getPosition();
      const box = viewerRootRef.current?.getBoundingClientRect();
      const cr = game?.canvas?.getBoundingClientRect();
      if (!cam || !p || !box || !cr) return "no city yet";
      // Phaser: internal px = (world - scroll - mid) * zoom + mid, and the canvas is scaled into its box
      const cityX = cr.left - box.left + ((p.worldX - cam.scrollX - cam.width / 2) * cam.zoom + cam.width / 2) * (cr.width / cam.width);
      const cityY = cr.top - box.top + ((p.worldY - cam.scrollY - cam.height / 2) * cam.zoom + cam.height / 2) * (cr.height / cam.height);
      const f = getIntroFrame();
      let intro = "intro gone";
      if (f && f.root.width > 0) {
        const w2s = worldFromContainer(f.framing, f.stage);
        const introX = f.root.left - box.left + (p.worldX - w2s.offX) / w2s.scale;
        const introY = f.root.top - box.top + (p.worldY - w2s.offY) / w2s.scale;
        intro = `intro ${r1(introX)},${r1(introY)} (gap ${r1(introX - cityX)},${r1(introY - cityY)}); intro root ${r1(f.root.width)}x${r1(f.root.height)} at ${r1(f.root.left - box.left)},${r1(f.root.top - box.top)}, canvas ${f.canvas.width}x${f.canvas.height} @${f.dpr}, drawing ${Math.round(f.framing.scrollX)},${Math.round(f.framing.scrollY)} zoom ${Number(f.framing.zoom.toFixed(3))}, stage ${f.stage.scale.toFixed(4)} ${r1(f.stage.offX)},${r1(f.stage.offY)}, reveal ${f.reveal.toFixed(2)}`;
      }
      const vv = window.visualViewport;
      const sz = game?.scale;
      return `spawn on the page: city ${r1(cityX)},${r1(cityY)}; ${intro}; city canvas ${r1(cr.width)}x${r1(cr.height)} at ${r1(cr.left - box.left)},${r1(cr.top - box.top)} (phaser display ${sz ? `${r1(sz.displaySize.width)}x${r1(sz.displaySize.height)} in ${r1(sz.parentSize.width)}x${r1(sz.parentSize.height)}` : "?"}, internal ${cam.width}x${cam.height}); drawn camera ${r1(cam.scrollX)},${r1(cam.scrollY)} zoom ${Number(cam.zoom.toFixed(3))}; viewport ${vv ? `${r1(vv.width)}x${r1(vv.height)} scale ${vv.scale} at ${r1(vv.offsetLeft)},${r1(vv.offsetTop)}` : "none"}, dpr ${window.devicePixelRatio}; phaser frame ${game?.loop?.frame ?? "?"} fps ${Math.round(game?.loop?.actualFps ?? 0)} (delta ${r1(game?.loop?.delta ?? 0)} of ${r1(game?.loop?.rawDelta ?? 0)} ms, ${game?.loop?.inFocus === false ? "not in focus" : "in focus"}, cool down ${game?.loop?._coolDown ?? "?"}), scene clock ${sc?.time ? (sc.time.now / 1000).toFixed(2) : "?"} s`;
    };
    // the city's first frames drawn after it stands: when they came, and with which camera
    let renderOff: (() => void) | null = null;
    const watchRenders = () => {
      const sc = reportScene();
      const game = gameBoardRef.current?.getGameInstance() as { loop?: { frame: number } } | undefined;
      if (!sc?.events) return;
      renderOff?.();
      let n = 0;
      const onRender = () => {
        n++;
        const real = sc.cameras?.main;
        logIntro(`render#${n}`, `phaser frame ${game?.loop?.frame ?? "?"}; drawn camera ${real ? `${r1(real.scrollX)},${r1(real.scrollY)} zoom ${Number(real.zoom.toFixed(3))}` : "none"}`);
        if (n >= 3) renderOff?.();
      };
      sc.events.on("render", onRender);
      renderOff = () => { sc.events?.off("render", onRender); renderOff = null; };
    };
    const landed = (how: string) => {
      landedRef.current = true;
      moveLogLeftRef.current = 12;
      logIntro("city-ready", `${how}; ${where()}`);
      logIntro("geometry", geometry());
      watchRenders();
      timers.push(window.setTimeout(() => { logIntro("city-ready+3s", where()); logIntro("geometry", geometry()); }, 3000));
      timers.push(window.setTimeout(() => { logIntro("city-ready+20s", where()); closeIntroLog(); }, 20_000));
    };
    // taps, touches and keys on the page around the hand-over: where, and on what
    const onInput = (e: Event) => {
      const t = e.target as HTMLElement | null;
      const root = viewerRootRef.current?.getBoundingClientRect();
      const pt = e as PointerEvent;
      const at = typeof pt.clientX === "number" && root ? ` at ${Math.round(pt.clientX - root.left)},${Math.round(pt.clientY - root.top)} in the city box (${pt.pointerType ?? e.type})` : "";
      const name = t ? `${t.tagName.toLowerCase()}${t.getAttribute?.("data-testid") ? "[" + t.getAttribute("data-testid") + "]" : ""}${t.textContent ? " '" + t.textContent.trim().slice(0, 24) + "'" : ""}` : "?";
      logIntro(`input.${e.type}`, `${name}${at}`);
    };
    const inputs = ["pointerdown", "pointerup", "touchstart", "keydown", "click"] as const;
    for (const n of inputs) window.addEventListener(n, onInput, { capture: true, passive: true });
    // the window's focus and the page's visibility: Phaser clamps its clock after a focus and while blurred
    const onWindowState = (e: Event) => { logIntro(`window.${e.type}`, e.type === "visibilitychange" ? document.visibilityState : document.hasFocus() ? "has focus" : "no focus"); };
    const windowStates = ["focus", "blur", "visibilitychange", "pageshow", "pagehide"] as const;
    for (const n of windowStates) window.addEventListener(n, onWindowState);
    const onDone = () => { logIntro("intro-done", where()); logIntro("geometry", geometry()); };
    window.addEventListener(INTRO_DONE_EVENT, onDone);
    const start = (left: number) => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { ready?: boolean; keepFramingOnSpawn?: boolean; landWalking?: (delayMs: number, glideMs: number, afterEvent?: string) => void }
        | undefined;
      if (!scene?.ready) {
        if (left > 0) timer = window.setTimeout(() => start(left - 1), 150);
        else reportCityReady(); // a scene that never comes up still ends the load intro
        return;
      }
      if (adventureOnRef.current) { landed("walking already"); reportCityReady(); return; }
      scene.keepFramingOnSpawn = true;
      handleStartAdventure({ onLoad: true });
      if (avatarTabOpenRef.current) { landed("avatar tab open"); reportCityReady(); return; }
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      // with the load intro over the city, the hold and glide wait for its hand-over
      scene.landWalking?.(reduced ? 0 : 1000, reduced ? 1 : 1200, isIntroActive() ? INTRO_DONE_EVENT : undefined);
      landed(isIntroActive() ? "landing, hand-over from the intro" : "landing, no intro");
      // the first frame a visitor sees is in place: the load intro may hand over to it (lib/intro/progress.ts)
      reportCityReady();
    };
    // the intro lab's Replay: a landing again, from the close-up on the spawn (the ready poll covers a city still loading)
    const onReplay = () => {
      const scene = gameBoardRef.current?.getGameInstance()?.scene.getScene("MainScene") as
        | { ready?: boolean; replayLanding?: (delayMs: number, glideMs: number, afterEvent?: string) => boolean }
        | undefined;
      if (!scene?.ready || !adventureOnRef.current) return;
      const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      if (scene.replayLanding?.(reduced ? 0 : 1000, reduced ? 1 : 1200, INTRO_DONE_EVENT)) { landedRef.current = true; logIntro("replay", where()); }
    };
    window.addEventListener(INTRO_REPLAY_EVENT, onReplay);
    // the overlay fades into the frame the camera is really on (lib/intro/progress.ts getCityFraming)
    setCityFramingReader(() => {
      if (!landedRef.current) return null;
      const cam = gameBoardRef.current?.getCameraState();
      return cam ? { scrollX: cam.scrollX, scrollY: cam.scrollY, zoom: cam.zoom } : null;
    });
    reportCityBoot();
    start(200);
    return () => {
      window.clearTimeout(timer);
      for (const t of timers) window.clearTimeout(t);
      for (const n of inputs) window.removeEventListener(n, onInput, { capture: true });
      for (const n of windowStates) window.removeEventListener(n, onWindowState);
      window.removeEventListener(INTRO_DONE_EVENT, onDone);
      window.removeEventListener(INTRO_REPLAY_EVENT, onReplay);
      renderOff?.();
      setCityFramingReader(null);
    };
  }, [isShell, handleStartAdventure]);

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
    walkInScene()?.closeWalkInPeek?.(); // the tab hides the card, so put the roof back too
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
  const dialogShown = !slot && isDialogOpen && !!currentEncounter && !BEAT_CARD_BUILDINGS.has(currentEncounter.buildingId ?? "");

  return (
    <div ref={viewerRootRef} className="relative w-full h-full" data-testid="city-root">
      <GameBoard
        ref={gameBoardRef}
        editable={false}
        initialGrid={initialGrid}
        onBuildingClick={handleBuildingClick}
        testId="city-canvas"
      />
      {reportPill && <IntroReportPill />}

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

          {/* Virtual Joystick (mobile; the new site walks by tapping a spot instead) */}
          {!isShell && (
            <VirtualJoystick
              isMobile={isMobile}
              onDirectionChange={handleJoystickDirection}
              contained={isShell}
            />
          )}

        </>
      )}

      {/* A walk-in building opened in place by a tap: walk in, or read the case (a bottom sheet on phones) */}
      {slot ? null : phoneShell ? (
        <PlaceSheet
          buildingId={avatarTabOpen ? null : walkInPeek}
          onWalkIn={handleWalkInPeek}
          onReadCase={handleReadCasePeek}
          onClose={() => walkInScene()?.closeWalkInPeek?.()}
        />
      ) : (
        <WalkInCard
          buildingId={avatarTabOpen ? null : walkInPeek}
          onWalkIn={handleWalkInPeek}
          onReadCase={handleReadCasePeek}
          onClose={() => walkInScene()?.closeWalkInPeek?.()}
        />
      )}

      {/* Peek card while the avatar stands on a beat's stand tile inside a walk-in building */}
      {isAdventureActive && (
        <PeekCard
          beat={shownCard ? INTERIOR_BEATS[shownCard.buildingId]?.[shownCard.beat] ?? null : null}
          beatKey={shownCard ? `${shownCard.buildingId}:${shownCard.beat}` : null}
          foundTag={shownCard ? freshFinds[`${shownCard.buildingId}:${shownCard.beat}`] : undefined}
          atBottom={phoneShell}
          plain={phoneShell || slot}
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
              markFound(`${shownCard.buildingId}:${choice.to}`);
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

      {/* A find away from the beat cards (a place, the night, the minutes): a short note in the city */}
      {phoneShell || slot ? (
        <FindPill find={toast?.find ?? null} count={toast?.count ?? 0} hint={toast ? null : walkHint} />
      ) : (
        <FoundToast find={toast?.find ?? null} count={toast?.count ?? 0} hint={toast ? null : walkHint} />
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

      {/* Walk the avatar (the /city page; the new site is always walking, the yellow marker shows where). In the shell
          the time of day button sits inside the city view (the panel and its phone sheet own the window's edges):
          bottom-left on a desktop, bottom-right on a phone */}
      {!dialogShown && !avatarTabOpen && !(phoneShell && !slot && walkInPeek) && (
        <div className={isShell ? "absolute bottom-3 right-3 z-30 flex gap-2 md:left-3 md:right-auto" : "fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-30 flex gap-2"}>
          {!isShell && (
            <button
              onClick={isAdventureActive ? handleStopAdventure : () => handleStartAdventure()}
              className={pixelButtonClass(isAdventureActive ? "ghost" : "primary")}
              style={PIXEL_INSET_CLIP}
            >
              {isAdventureActive ? "Stop walking" : "Walk"}
            </button>
          )}
          {/* Hidden while walking on a phone on /city, where Stop walking is wider and runs under the joystick */}
          {(isShell || !(isMobile && isAdventureActive)) && <TimeOfDayButton value={timeOfDay} look={look} onChange={pickTimeOfDay} />}
        </div>
      )}
    </div>
  );
}
