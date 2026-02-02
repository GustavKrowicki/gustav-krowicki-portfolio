"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { GridCell } from "./pogicity/types";
import { getBuilding } from "@/lib/city/buildings";

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
}

export default function CityViewer({ initialGrid, onProjectClick }: CityViewerProps) {
  const [selectedBuilding, setSelectedBuilding] = useState<{
    name: string;
    description?: string;
    projectSlug?: string;
  } | null>(null);

  const handleBuildingClick = useCallback(
    (buildingId: string, cell: GridCell) => {
      const building = getBuilding(buildingId);
      if (!building) return;

      if (building.interactable && building.projectSlug) {
        // Navigate to project page
        onProjectClick?.(building.projectSlug);
      } else {
        // Show building info
        setSelectedBuilding({
          name: building.name,
          description: building.description,
          projectSlug: building.projectSlug,
        });
      }
    },
    [onProjectClick]
  );

  return (
    <div className="relative w-full h-full">
      <GameBoard
        editable={false}
        initialGrid={initialGrid}
        onBuildingClick={handleBuildingClick}
      />

      {/* Building Info Modal */}
      {selectedBuilding && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={() => setSelectedBuilding(null)}
        >
          <div
            className="bg-[#2d3748] border-2 border-[#4a5568] rounded-lg p-6 max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-mono text-xl mb-2">
              {selectedBuilding.name}
            </h3>
            {selectedBuilding.description && (
              <p className="text-gray-300 font-mono text-sm mb-4">
                {selectedBuilding.description}
              </p>
            )}
            <div className="flex gap-2">
              {selectedBuilding.projectSlug && (
                <button
                  onClick={() => {
                    onProjectClick?.(selectedBuilding.projectSlug!);
                    setSelectedBuilding(null);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-mono text-sm"
                >
                  View Project
                </button>
              )}
              <button
                onClick={() => setSelectedBuilding(null)}
                className="px-4 py-2 bg-[#4a5568] text-white rounded hover:bg-[#5a6578] font-mono text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
