"use client";

import { useState, useRef, useCallback, useEffect, MouseEvent } from "react";
import { ToolType, StreetLampType } from "../types";
import {
  CATEGORY_NAMES,
  BuildingCategory,
  getBuildingsByCategory,
  getCategories,
  getBuilding,
  BuildingDefinition,
} from "@/lib/city/buildings";
import { playDoubleClickSound, playClickSound } from "@/lib/city/sounds";

interface ToolWindowProps {
  selectedTool: ToolType;
  selectedBuildingId: string | null;
  onToolSelect: (tool: ToolType) => void;
  onBuildingSelect: (buildingId: string) => void;
  onSpawnCharacter: () => void;
  onSpawnCar: () => void;
  onRotate?: () => void;
  isVisible: boolean;
  onClose: () => void;
}

// Street lamps for the city at night. With the lamp tool the selected id is the lamp type
const STREET_LAMP_TOOLS: Array<{ type: StreetLampType; name: string; sprite: string; where: string }> = [
  { type: "wire", name: "Wire lamp", sprite: "/game/pogicity/Props/night/wire_day.png", where: "Hangs over a road" },
  { type: "post", name: "Slim post", sprite: "/game/pogicity/Props/night/post_day.png", where: "Squares and paths" },
  { type: "lantern", name: "Old lantern", sprite: "/game/pogicity/Props/night/lantern_day.png", where: "Old streets" },
  { type: "bollard", name: "Bollard", sprite: "/game/pogicity/Props/night/bollard_day.png", where: "Decks and terraces" },
];

// Get the preview sprite for a building (prefer south, fall back to first available)
function getBuildingPreviewSprite(building: BuildingDefinition): string {
  return building.sprites.south || Object.values(building.sprites)[0] || "";
}

// Calculate zoom level based on building footprint size
function getBuildingPreviewZoom(building: BuildingDefinition): number {
  const footprintSize = Math.max(
    building.footprint.width,
    building.footprint.height
  );
  if (footprintSize === 1) return 950;
  if (footprintSize === 2) return 500;
  const zoom = Math.max(150, 450 - footprintSize * 40);
  return zoom;
}

export default function ToolWindow({
  selectedTool,
  selectedBuildingId,
  onToolSelect,
  onBuildingSelect,
  onSpawnCharacter,
  onSpawnCar,
  onRotate,
  isVisible,
  onClose,
}: ToolWindowProps) {
  const [position, setPosition] = useState(() => {
    if (typeof window === "undefined") {
      return { x: 10, y: 50 };
    }
    return {
      x: Math.max(10, window.innerWidth - 530),
      y: 50,
    };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [activeTab, setActiveTab] = useState<"tools" | "lamps" | BuildingCategory>("tools");
  const [hoveredBuilding, setHoveredBuilding] = useState<string | null>(null);
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== "undefined" ? window.innerWidth : 1000,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
    },
    [position]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.current.x,
          y: e.clientY - dragOffset.current.y,
        });
      }
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  if (!isVisible) return null;

  const categories = getCategories();
  const getTabTitle = () => {
    if (activeTab === "tools") return "Tools";
    if (activeTab === "lamps") return "Street lamps";
    return CATEGORY_NAMES[activeTab];
  };

  const baseWidth = 520;
  const responsiveWidth = Math.min(baseWidth, windowSize.width - 20, windowSize.height);

  return (
    <div
      className="fixed bg-[#4a5568] border-2 border-[#2d3748] rounded shadow-lg"
      style={{
        left: Math.min(position.x, windowSize.width - responsiveWidth - 10),
        top: position.y,
        width: responsiveWidth,
        maxHeight: Math.min(400, windowSize.height - 100),
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        userSelect: "none",
        overflow: "hidden",
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* Title bar */}
      <div
        className="flex justify-between items-center px-3 py-2 bg-[#2d3748] text-white font-mono text-sm cursor-move"
        onMouseDown={handleMouseDown}
      >
        <span>{getTabTitle()}</span>
        <button
          className="w-6 h-6 flex items-center justify-center hover:bg-[#4a5568] rounded"
          onClick={() => {
            onClose();
            playDoubleClickSound();
          }}
        >
          ×
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 p-1 bg-[#374151] border-b border-[#2d3748]">
        {/* Tools tab */}
        <button
          onClick={() => {
            if (activeTab !== "tools") {
              setActiveTab("tools");
              playDoubleClickSound();
            }
          }}
          className={`px-3 py-1 rounded text-sm font-mono ${
            activeTab === "tools"
              ? "bg-[#4a5568] text-white"
              : "bg-[#2d3748] text-gray-300 hover:bg-[#4a5568]"
          }`}
        >
          🔧
        </button>

        {/* Street lamps tab */}
        <button
          onClick={() => {
            if (activeTab !== "lamps") {
              setActiveTab("lamps");
              playDoubleClickSound();
            }
          }}
          className={`px-3 py-1 rounded text-sm font-mono ${
            activeTab === "lamps"
              ? "bg-[#4a5568] text-white"
              : "bg-[#2d3748] text-gray-300 hover:bg-[#4a5568]"
          }`}
          title="Street lamps"
        >
          💡
        </button>

        {/* Category tabs */}
        {categories.map((category) => {
          const buildings = getBuildingsByCategory(category);
          if (buildings.length === 0) return null;

          return (
            <button
              key={category}
              onClick={() => {
                if (activeTab !== category) {
                  setActiveTab(category);
                  playDoubleClickSound();
                }
              }}
              className={`px-3 py-1 rounded text-sm font-mono ${
                activeTab === category
                  ? "bg-[#4a5568] text-white"
                  : "bg-[#2d3748] text-gray-300 hover:bg-[#4a5568]"
              }`}
              title={CATEGORY_NAMES[category]}
            >
              {category === "portfolio" ? "⭐" :
               category === "residential" ? "🏠" :
               category === "commercial" ? "🏪" :
               category === "props" ? "🌳" :
               category === "christmas" ? "🎄" :
               category === "landmark" ? "🏰" : "🏛️"}
            </button>
          );
        })}
      </div>

      {/* Content panel */}
      <div className="p-2 flex-1 overflow-y-auto overflow-x-hidden bg-[#374151]">
        {/* Tools Tab Content */}
        {activeTab === "tools" && (
          <div>
            <div className="grid grid-cols-4 gap-2 mb-3">
              <button
                onClick={() => {
                  onToolSelect(ToolType.RoadNetwork);
                  playClickSound();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  selectedTool === ToolType.RoadNetwork
                    ? "bg-[#4a5568] border-white"
                    : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                }`}
              >
                <img
                  src="/game/pogicity/Tiles/1x1asphalt_tile.png"
                  alt="Road"
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-xs text-white mt-1">Road</span>
              </button>
              <button
                onClick={() => {
                  onToolSelect(ToolType.Tile);
                  playClickSound();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  selectedTool === ToolType.Tile
                    ? "bg-[#4a5568] border-white"
                    : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                }`}
              >
                <img
                  src="/game/pogicity/Tiles/1x1square_tile.png"
                  alt="Tile"
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-xs text-white mt-1">Tile</span>
              </button>
              <button
                onClick={() => {
                  onToolSelect(ToolType.Snow);
                  playClickSound();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  selectedTool === ToolType.Snow
                    ? "bg-[#4a5568] border-white"
                    : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                }`}
              >
                <img
                  src="/game/pogicity/Tiles/1x1snow_tile_1.png"
                  alt="Snow"
                  className="w-10 h-10 object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <span className="text-xs text-white mt-1">Snow</span>
              </button>
              <button
                onClick={() => {
                  onToolSelect(ToolType.Eraser);
                  playClickSound();
                }}
                className={`flex flex-col items-center justify-center p-2 rounded border ${
                  selectedTool === ToolType.Eraser
                    ? "bg-[#4a5568] border-white"
                    : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                }`}
              >
                <span className="text-2xl">🗑️</span>
                <span className="text-xs text-white mt-1">Eraser</span>
              </button>
            </div>

            {/* Divider */}
            <div className="h-px bg-[#2d3748] my-2" />

            {/* Spawn buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  onSpawnCharacter();
                  playClickSound();
                }}
                className="flex-1 py-2 px-3 bg-[#2d3748] text-white rounded hover:bg-[#4a5568] font-mono text-sm flex items-center justify-center gap-2"
              >
                <span>🍌</span>
                <span>Spawn Citizen</span>
              </button>
              <button
                onClick={() => {
                  onSpawnCar();
                  playClickSound();
                }}
                className="flex-1 py-2 px-3 bg-[#2d3748] text-white rounded hover:bg-[#4a5568] font-mono text-sm flex items-center justify-center gap-2"
              >
                <span>🚗</span>
                <span>Spawn Car</span>
              </button>
            </div>
          </div>
        )}

        {/* Street lamps: click a cell to place, eraser removes the lamp first */}
        {activeTab === "lamps" && (
          <div>
            <div className="grid grid-cols-3 gap-2">
              {STREET_LAMP_TOOLS.map((lamp) => {
                const isSelected = selectedTool === ToolType.StreetLamp && selectedBuildingId === lamp.type;
                return (
                  <button
                    key={lamp.type}
                    onClick={() => {
                      onToolSelect(ToolType.StreetLamp);
                      onBuildingSelect(lamp.type);
                      playClickSound();
                    }}
                    className={`flex flex-col items-center justify-end p-2 rounded border min-h-[96px] ${
                      isSelected
                        ? "bg-[#4a5568] border-white"
                        : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                    }`}
                  >
                    <img
                      src={lamp.sprite}
                      alt={lamp.name}
                      className="h-14 object-contain"
                      style={{ imageRendering: "pixelated" }}
                    />
                    <span className="text-xs text-white mt-1">{lamp.name}</span>
                    <span className="text-[10px] text-gray-300">{lamp.where}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-300 font-mono mt-2">
              Click a cell to place. The wire runs across the road by itself. Eraser removes a lamp. Night shows them lit.
            </p>
          </div>
        )}

        {/* Building Category Content */}
        {activeTab !== "tools" && activeTab !== "lamps" && (
          <div className="grid grid-cols-6 gap-1">
            {getBuildingsByCategory(activeTab).map((building) => {
              const previewSprite = getBuildingPreviewSprite(building);
              const previewZoom = getBuildingPreviewZoom(building);
              const isSelected =
                selectedTool === ToolType.Building &&
                selectedBuildingId === building.id;

              return (
                <button
                  key={building.id}
                  onClick={() => {
                    onToolSelect(ToolType.Building);
                    onBuildingSelect(building.id);
                    playClickSound();
                  }}
                  onMouseEnter={() => setHoveredBuilding(building.name)}
                  onMouseLeave={() => setHoveredBuilding(null)}
                  className={`flex flex-col items-center justify-center p-1 rounded border min-h-[60px] overflow-hidden ${
                    isSelected
                      ? "bg-[#4a5568] border-white"
                      : "bg-[#2d3748] border-[#4a5568] hover:border-gray-400"
                  }`}
                >
                  <div className="w-14 h-12 flex items-end justify-center overflow-hidden">
                    <img
                      src={previewSprite}
                      alt={building.name}
                      style={{
                        width: `${previewZoom / 2}%`,
                        height: `${previewZoom / 2}%`,
                        objectFit: "cover",
                        objectPosition: "center bottom",
                        imageRendering: "pixelated",
                        transform: "scale(2)",
                        transformOrigin: "center bottom",
                      }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {activeTab !== "tools" && activeTab !== "lamps" && (
        <div className="flex justify-between items-center px-3 py-2 bg-[#2d3748] text-white text-sm font-mono">
          <span>
            {hoveredBuilding ||
              (selectedBuildingId && selectedTool === ToolType.Building
                ? getBuilding(selectedBuildingId)?.name
                : "") ||
              ""}
          </span>
          {selectedTool === ToolType.Building && selectedBuildingId && (
            <button
              onClick={() => {
                onRotate?.();
                playClickSound();
              }}
              className="px-2 py-1 bg-[#4a5568] rounded hover:bg-[#5a6578] text-xs"
            >
              Rotate (R)
            </button>
          )}
        </div>
      )}
    </div>
  );
}
