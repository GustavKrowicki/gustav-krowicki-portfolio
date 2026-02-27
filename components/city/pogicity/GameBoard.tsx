"use client";

import { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import dynamic from "next/dynamic";
import Phaser from "phaser";
import {
  GridCell,
  TileType,
  ToolType,
  Direction,
  GRID_WIDTH,
  GRID_HEIGHT,
  CharacterType,
  PlayerState,
} from "./types";
import {
  getRoadSegmentOrigin,
  getRoadConnections,
  getSegmentType,
  generateRoadPattern,
  canPlaceRoadSegment,
  ROAD_SEGMENT_SIZE,
  getAffectedSegments,
} from "./roadUtils";
import {
  getBuilding,
  getBuildingFootprint,
} from "@/lib/city/buildings";
import { playBuildSound, playBuildRoadSound, playDestructionSound } from "@/lib/city/sounds";

// Dynamically import Phaser components to avoid SSR issues
const PhaserGame = dynamic(() => import("./phaser/PhaserGame"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#3d5560]">
      <div className="text-white font-mono">Loading city...</div>
    </div>
  ),
});

// Dynamically import UI components
const ToolWindow = dynamic(() => import("./ui/ToolWindow"), { ssr: false });

export interface PhaserGameHandle {
  spawnCharacter: () => boolean;
  spawnCar: () => boolean;
  setDrivingState: (isDriving: boolean) => void;
  getPlayerCar: () => any;
  isPlayerDriving: () => boolean;
  getCharacterCount: () => number;
  getCarCount: () => number;
  clearCharacters: () => void;
  clearCars: () => void;
  shakeScreen: (axis?: "x" | "y", intensity?: number, duration?: number) => void;
  zoomAtPoint: (zoom: number, screenX: number, screenY: number) => void;
  panToPosition: (gridX: number, gridY: number) => void;
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
  getCameraState: () => { scrollX: number; scrollY: number; zoom: number; width: number; height: number };
}

// GameBoard handle exposed to parent components
export interface GameBoardHandle {
  spawnCharacter: () => boolean;
  spawnCar: () => boolean;
  panToPosition: (gridX: number, gridY: number) => void;
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
  getCameraState: () => { scrollX: number; scrollY: number; zoom: number; width: number; height: number };
}

export interface GameSaveData {
  grid: GridCell[][];
  characterCount: number;
  carCount: number;
  zoom?: number;
  timestamp: number;
}

interface GameBoardProps {
  editable?: boolean;
  initialGrid?: GridCell[][];
  onBuildingClick?: (buildingId: string, cell: GridCell) => void;
  onSave?: (data: GameSaveData) => void;
}

function createEmptyGrid(): GridCell[][] {
  return Array.from({ length: GRID_HEIGHT }, (_, y) =>
    Array.from({ length: GRID_WIDTH }, (_, x) => ({
      type: TileType.Grass,
      x,
      y,
      isOrigin: true,
    }))
  );
}

const GameBoard = forwardRef<GameBoardHandle, GameBoardProps>(function GameBoard({
  editable = false,
  initialGrid,
  onBuildingClick,
  onSave,
}, ref) {
  const [grid, setGrid] = useState<GridCell[][]>(() => {
    // Check if initialGrid is valid (non-empty array with proper dimensions)
    if (initialGrid && initialGrid.length === GRID_HEIGHT && initialGrid[0]?.length === GRID_WIDTH) {
      return initialGrid;
    }
    return createEmptyGrid();
  });

  // Undo history - stores previous grid states
  const [history, setHistory] = useState<GridCell[][][]>([]);
  const MAX_HISTORY = 50; // Limit history to prevent memory issues

  // Push current grid to history before making changes
  const pushHistory = useCallback(() => {
    setHistory((prev) => {
      const newHistory = [...prev, grid.map((row) => row.map((cell) => ({ ...cell })))];
      // Keep only the last MAX_HISTORY states
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY);
      }
      return newHistory;
    });
  }, [grid]);

  // Undo last action
  const undo = useCallback(() => {
    if (history.length === 0) return;

    setHistory((prev) => {
      const newHistory = [...prev];
      const previousGrid = newHistory.pop();
      if (previousGrid) {
        setGrid(previousGrid);
      }
      return newHistory;
    });
  }, [history]);

  const [selectedTool, setSelectedTool] = useState<ToolType>(
    editable ? ToolType.RoadNetwork : ToolType.None
  );
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [buildingOrientation, setBuildingOrientation] = useState<Direction>(Direction.Down);
  const [zoom, setZoom] = useState(1); // Scale.FIT handles fitting the city to viewport
  const [showToolWindow, setShowToolWindow] = useState(editable);
  const [hoverTile, setHoverTile] = useState<{ x: number; y: number } | null>(null);

  const gameRef = useRef<PhaserGameHandle>(null);

  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    spawnCharacter: () => gameRef.current?.spawnCharacter() ?? false,
    spawnCar: () => gameRef.current?.spawnCar() ?? false,
    panToPosition: (gridX: number, gridY: number) => {
      gameRef.current?.panToPosition(gridX, gridY);
    },
    highlightBuilding: (buildingId: string | null) => {
      gameRef.current?.highlightBuilding(buildingId);
    },
    // Adventure mode methods
    startAdventureMode: (characterType: CharacterType) => {
      gameRef.current?.startAdventureMode(characterType);
    },
    stopAdventureMode: () => {
      gameRef.current?.stopAdventureMode();
    },
    setPlayerInputDirection: (direction: Direction | null) => {
      gameRef.current?.setPlayerInputDirection(direction);
    },
    walkPlayerToBuilding: (buildingId: string) => {
      return gameRef.current?.walkPlayerToBuilding(buildingId) ?? false;
    },
    markBuildingVisited: (buildingId: string) => {
      gameRef.current?.markBuildingVisited(buildingId);
    },
    getVisitedBuildings: () => {
      return gameRef.current?.getVisitedBuildings() ?? new Set<string>();
    },
    isAdventureModeActive: () => {
      return gameRef.current?.isAdventureModeActive() ?? false;
    },
    getPlayerState: () => {
      return gameRef.current?.getPlayerState() ?? null;
    },
    triggerInteraction: () => {
      gameRef.current?.triggerInteraction();
    },
    getGameInstance: () => {
      return gameRef.current?.getGameInstance() ?? null;
    },
    // Logo overlay methods
    getPortfolioBuildingPositions: () => {
      return gameRef.current?.getPortfolioBuildingPositions() ?? [];
    },
    getCameraState: () => {
      return gameRef.current?.getCameraState() ?? { scrollX: 0, scrollY: 0, zoom: 1, width: 0, height: 0 };
    },
  }), []);

  // Load initial grid if provided
  useEffect(() => {
    if (initialGrid) {
      setGrid(initialGrid);
    }
  }, [initialGrid]);

  // Keyboard shortcuts (R to rotate, Ctrl/Cmd+Z to undo)
  useEffect(() => {
    if (!editable) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Rotate building on R key
      if (e.key.toLowerCase() === "r" && selectedTool === ToolType.Building) {
        const orientations = [Direction.Down, Direction.Right, Direction.Up, Direction.Left];
        const currentIndex = orientations.indexOf(buildingOrientation);
        const nextIndex = (currentIndex + 1) % orientations.length;
        setBuildingOrientation(orientations[nextIndex]);
      }

      // Undo on Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editable, selectedTool, buildingOrientation, undo]);

  // Handle tile click
  const handleTileClick = useCallback(
    (x: number, y: number) => {
      const cell = grid[y]?.[x];
      if (!cell) return;

      // In viewer mode, handle building clicks
      if (!editable) {
        if (cell.type === TileType.Building && cell.buildingId) {
          onBuildingClick?.(cell.buildingId, cell);
        }
        return;
      }

      // Editor mode - handle tool actions
      if (selectedTool === ToolType.Building && selectedBuildingId) {
        placeBuilding(x, y, selectedBuildingId, buildingOrientation);
      } else if (selectedTool === ToolType.Eraser) {
        eraseTile(x, y);
      }
    },
    [grid, editable, selectedTool, selectedBuildingId, buildingOrientation, onBuildingClick]
  );

  // Handle tile hover
  const handleTileHover = useCallback((x: number | null, y: number | null) => {
    if (x === null || y === null) {
      setHoverTile(null);
    } else {
      setHoverTile({ x, y });
    }
  }, []);

  // Handle tiles drag (snow/tile placement)
  const handleTilesDrag = useCallback(
    (tiles: Array<{ x: number; y: number }>) => {
      if (!editable) return;

      pushHistory();
      setGrid((prev) => {
        // Ensure grid is properly initialized
        if (!prev || prev.length !== GRID_HEIGHT || !prev[0] || prev[0].length !== GRID_WIDTH) {
          console.warn("Grid not properly initialized, creating empty grid");
          return createEmptyGrid();
        }

        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));

        for (const tile of tiles) {
          const { x, y } = tile;
          if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT && newGrid[y]?.[x]) {
            const cell = newGrid[y][x];

            // Determine target type based on selected tool
            let targetType = TileType.Tile;
            if (selectedTool === ToolType.Snow) targetType = TileType.Snow;
            if (selectedTool === ToolType.Asphalt) targetType = TileType.Asphalt;

            // Check if we can place here
            if (cell.type === TileType.Grass || cell.type === TileType.Snow) {
              newGrid[y][x] = {
                ...cell,
                type: targetType,
                isOrigin: true,
                originX: x,
                originY: y,
              };
            }
          }
        }

        return newGrid;
      });

      playBuildSound();
    },
    [editable, selectedTool, pushHistory]
  );

  // Handle road drag
  const handleRoadDrag = useCallback(
    (segments: Array<{ x: number; y: number }>) => {
      if (!editable) return;

      pushHistory();
      setGrid((prev) => {
        // Ensure grid is properly initialized
        if (!prev || prev.length !== GRID_HEIGHT || !prev[0] || prev[0].length !== GRID_WIDTH) {
          console.warn("Grid not properly initialized, creating empty grid");
          return createEmptyGrid();
        }

        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));

        // Place all segments
        for (const seg of segments) {
          const segmentOrigin = getRoadSegmentOrigin(seg.x, seg.y);
          const canPlace = canPlaceRoadSegment(
            newGrid,
            segmentOrigin.x,
            segmentOrigin.y
          );

          if (canPlace.valid) {
            // Mark all cells in the segment
            for (let dy = 0; dy < ROAD_SEGMENT_SIZE; dy++) {
              for (let dx = 0; dx < ROAD_SEGMENT_SIZE; dx++) {
                const px = segmentOrigin.x + dx;
                const py = segmentOrigin.y + dy;
                if (px >= 0 && px < GRID_WIDTH && py >= 0 && py < GRID_HEIGHT && newGrid[py]?.[px]) {
                  newGrid[py][px] = {
                    ...newGrid[py][px],
                    isOrigin: dx === 0 && dy === 0,
                    originX: segmentOrigin.x,
                    originY: segmentOrigin.y,
                    type: TileType.Road, // Temporarily, will be updated below
                  };
                }
              }
            }
          }
        }

        // Update all affected segments with proper road patterns
        const affectedOrigins = new Set<string>();
        for (const seg of segments) {
          const segmentOrigin = getRoadSegmentOrigin(seg.x, seg.y);
          const affected = getAffectedSegments(segmentOrigin.x, segmentOrigin.y);
          for (const a of affected) {
            affectedOrigins.add(`${a.x},${a.y}`);
          }
        }

        for (const key of affectedOrigins) {
          const [sx, sy] = key.split(",").map(Number);
          const originCell = newGrid[sy]?.[sx];
          if (!originCell || !originCell.isOrigin) continue;
          if (
            originCell.type !== TileType.Road &&
            originCell.type !== TileType.Asphalt
          )
            continue;

          const connections = getRoadConnections(newGrid, sx, sy);
          const segmentType = getSegmentType(connections);
          const pattern = generateRoadPattern(segmentType);

          for (const tile of pattern) {
            const px = sx + tile.dx;
            const py = sy + tile.dy;
            if (px >= 0 && px < GRID_WIDTH && py >= 0 && py < GRID_HEIGHT && newGrid[py]?.[px]) {
              newGrid[py][px] = {
                ...newGrid[py][px],
                type: tile.type,
              };
            }
          }
        }

        return newGrid;
      });

      playBuildRoadSound();
    },
    [editable, pushHistory]
  );

  // Handle eraser drag
  const handleEraserDrag = useCallback(
    (tiles: Array<{ x: number; y: number }>) => {
      if (!editable) return;

      pushHistory();
      setGrid((prev) => {
        // Ensure grid is properly initialized
        if (!prev || prev.length !== GRID_HEIGHT || !prev[0] || prev[0].length !== GRID_WIDTH) {
          console.warn("Grid not properly initialized, creating empty grid");
          return createEmptyGrid();
        }

        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));
        const erasedBuildings = new Set<string>(); // Track erased buildings to avoid duplicates

        for (const tile of tiles) {
          const { x, y } = tile;
          if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT || !newGrid[y]?.[x]) continue;

          const cell = newGrid[y][x];

          // Handle building tiles - erase entire building
          if (cell.type === TileType.Building && cell.originX !== undefined && cell.originY !== undefined) {
            const buildingKey = `${cell.originX},${cell.originY}`;
            if (erasedBuildings.has(buildingKey)) continue; // Already erased this building
            erasedBuildings.add(buildingKey);

            const originX = cell.originX;
            const originY = cell.originY;
            const buildingId = cell.buildingId;

            if (buildingId) {
              const building = getBuilding(buildingId);
              if (building) {
                const footprint = getBuildingFootprint(building, cell.buildingOrientation);
                for (let dy = 0; dy < footprint.height; dy++) {
                  for (let dx = 0; dx < footprint.width; dx++) {
                    const px = originX + dx;
                    const py = originY + dy;
                    if (px >= 0 && px < GRID_WIDTH && py >= 0 && py < GRID_HEIGHT && newGrid[py]?.[px]) {
                      const oldCell = newGrid[py][px];
                      newGrid[py][px] = {
                        type: oldCell.underlyingTileType || TileType.Grass,
                        x: px,
                        y: py,
                        isOrigin: true,
                      };
                    }
                  }
                }
              }
            }
          } else if (cell.type !== TileType.Grass) {
            // Regular tile - just erase it
            newGrid[y][x] = {
              type: TileType.Grass,
              x,
              y,
              isOrigin: true,
            };
          }
        }

        return newGrid;
      });

      playDestructionSound();
    },
    [editable, pushHistory]
  );

  // Place building
  const placeBuilding = useCallback(
    (x: number, y: number, buildingId: string, orientation: Direction) => {
      const building = getBuilding(buildingId);
      if (!building) return;

      const footprint = getBuildingFootprint(building, orientation);

      // Check if placement is valid
      for (let dy = 0; dy < footprint.height; dy++) {
        for (let dx = 0; dx < footprint.width; dx++) {
          const px = x + dx;
          const py = y + dy;
          if (px >= GRID_WIDTH || py >= GRID_HEIGHT) return;
          const cell = grid[py]?.[px];
          if (!cell) return;

          // Allow placement on grass, tile, snow, or road (not asphalt unless decoration)
          const isDecoration = building.isDecoration || building.category === "props";
          if (
            cell.type !== TileType.Grass &&
            cell.type !== TileType.Tile &&
            cell.type !== TileType.Snow &&
            !(cell.type === TileType.Road && isDecoration)
          ) {
            return;
          }
        }
      }

      pushHistory();
      setGrid((prev) => {
        // Ensure grid is properly initialized
        if (!prev || prev.length !== GRID_HEIGHT || !prev[0] || prev[0].length !== GRID_WIDTH) {
          return createEmptyGrid();
        }

        const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));

        for (let dy = 0; dy < footprint.height; dy++) {
          for (let dx = 0; dx < footprint.width; dx++) {
            const px = x + dx;
            const py = y + dy;
            if (!newGrid[py]?.[px]) continue;
            const currentCell = newGrid[py][px];

            newGrid[py][px] = {
              type: TileType.Building,
              x: px,
              y: py,
              isOrigin: dx === 0 && dy === 0,
              originX: x,
              originY: y,
              buildingId: buildingId,
              buildingOrientation: orientation,
              underlyingTileType: currentCell.type !== TileType.Grass ? currentCell.type : undefined,
            };
          }
        }

        return newGrid;
      });

      playBuildSound();
      gameRef.current?.shakeScreen("y", 3, 150);
    },
    [grid, pushHistory]
  );

  // Erase tile
  const eraseTile = useCallback((x: number, y: number) => {
    const cell = grid[y]?.[x];
    if (!cell) return;
    if (cell.type === TileType.Grass) return;

    pushHistory();
    setGrid((prev) => {
      // Ensure grid is properly initialized
      if (!prev || prev.length !== GRID_HEIGHT || !prev[0] || prev[0].length !== GRID_WIDTH) {
        return createEmptyGrid();
      }

      const newGrid = prev.map((row) => row.map((cell) => ({ ...cell })));

      // If it's a building, erase the whole thing
      if (cell.type === TileType.Building && cell.originX !== undefined && cell.originY !== undefined) {
        const originX = cell.originX;
        const originY = cell.originY;
        const buildingId = cell.buildingId;

        if (buildingId) {
          const building = getBuilding(buildingId);
          if (building) {
            const footprint = getBuildingFootprint(building, cell.buildingOrientation);
            for (let dy = 0; dy < footprint.height; dy++) {
              for (let dx = 0; dx < footprint.width; dx++) {
                const px = originX + dx;
                const py = originY + dy;
                if (px >= 0 && px < GRID_WIDTH && py >= 0 && py < GRID_HEIGHT && newGrid[py]?.[px]) {
                  const oldCell = newGrid[py][px];
                  newGrid[py][px] = {
                    type: oldCell.underlyingTileType || TileType.Grass,
                    x: px,
                    y: py,
                    isOrigin: true,
                  };
                }
              }
            }
          }
        }
      } else {
        // Just erase this tile
        if (newGrid[y]?.[x]) {
          newGrid[y][x] = {
            type: TileType.Grass,
            x,
            y,
            isOrigin: true,
          };
        }
      }

      return newGrid;
    });

    playDestructionSound();
  }, [grid, pushHistory]);

  // Spawn character
  const handleSpawnCharacter = useCallback(() => {
    gameRef.current?.spawnCharacter();
  }, []);

  // Spawn car
  const handleSpawnCar = useCallback(() => {
    gameRef.current?.spawnCar();
  }, []);

  // Rotate building
  const handleRotate = useCallback(() => {
    const orientations = [Direction.Down, Direction.Right, Direction.Up, Direction.Left];
    const currentIndex = orientations.indexOf(buildingOrientation);
    const nextIndex = (currentIndex + 1) % orientations.length;
    setBuildingOrientation(orientations[nextIndex]);
  }, [buildingOrientation]);

  // Save game
  const handleSave = useCallback(() => {
    if (!onSave) return;

    const saveData: GameSaveData = {
      grid,
      characterCount: gameRef.current?.getCharacterCount() || 0,
      carCount: gameRef.current?.getCarCount() || 0,
      zoom,
      timestamp: Date.now(),
    };

    onSave(saveData);
  }, [grid, zoom, onSave]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#3d5560]">
      <PhaserGame
        ref={gameRef}
        grid={grid}
        selectedTool={selectedTool}
        selectedBuildingId={selectedBuildingId}
        buildingOrientation={buildingOrientation}
        zoom={zoom}
        onTileClick={handleTileClick}
        onTileHover={handleTileHover}
        onTilesDrag={handleTilesDrag}
        onEraserDrag={handleEraserDrag}
        onRoadDrag={handleRoadDrag}
        onZoomChange={setZoom}
        showStats={editable}
      />

      {/* Tool Window (Editor only) */}
      {editable && (
        <ToolWindow
          selectedTool={selectedTool}
          selectedBuildingId={selectedBuildingId}
          onToolSelect={setSelectedTool}
          onBuildingSelect={setSelectedBuildingId}
          onSpawnCharacter={handleSpawnCharacter}
          onSpawnCar={handleSpawnCar}
          onRotate={handleRotate}
          isVisible={showToolWindow}
          onClose={() => setShowToolWindow(false)}
        />
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-50">
        <button
          onClick={() => setZoom((z) => Math.min(4, z * 2))}
          className="w-10 h-10 bg-black/50 text-white rounded hover:bg-black/70 font-mono text-xl"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.25, z / 2))}
          className="w-10 h-10 bg-black/50 text-white rounded hover:bg-black/70 font-mono text-xl"
        >
          −
        </button>
      </div>

      {/* Editor Controls */}
      {editable && (
        <div className="absolute top-4 left-4 flex gap-2 z-50">
          <button
            onClick={() => setShowToolWindow(!showToolWindow)}
            className="px-4 py-2 bg-black/50 text-white rounded hover:bg-black/70 font-mono"
          >
            {showToolWindow ? "Hide Tools" : "Show Tools"}
          </button>
          <button
            onClick={undo}
            disabled={history.length === 0}
            className="px-4 py-2 bg-yellow-600/80 text-white rounded hover:bg-yellow-700 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo (Ctrl+Z)"
          >
            Undo {history.length > 0 && `(${history.length})`}
          </button>
          {onSave && (
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600/80 text-white rounded hover:bg-green-700 font-mono"
            >
              Save City
            </button>
          )}
        </div>
      )}

    </div>
  );
});

export default GameBoard;
