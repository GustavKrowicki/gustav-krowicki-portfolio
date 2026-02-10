"use client";

import { useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { GridCell } from "./pogicity/types";

// Dynamically import GameBoard to avoid SSR issues
const GameBoard = dynamic(() => import("./pogicity/GameBoard"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#3d5560]">
      <div className="text-white font-mono text-xl">Loading City Editor...</div>
    </div>
  ),
});

interface GameSaveData {
  grid: GridCell[][];
  characterCount: number;
  carCount: number;
  zoom?: number;
  timestamp: number;
}

interface CityEditorProps {
  initialGrid?: GridCell[][];
  onSave?: (data: GameSaveData) => void;
}

export default function CityEditor({ initialGrid, onSave }: CityEditorProps) {
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const handleSave = useCallback(
    (data: GameSaveData) => {
      // Save to localStorage
      const saveName = `gustav_city_${Date.now()}`;
      localStorage.setItem(`pogicity_save_${saveName}`, JSON.stringify(data));

      // Also log the grid for copying to cityGrid.json
      console.log("City Grid JSON:", JSON.stringify(data.grid, null, 2));

      // Download as file
      const blob = new Blob([JSON.stringify(data.grid, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cityGrid.json";
      a.click();
      URL.revokeObjectURL(url);

      setSavedMessage("City saved! Grid JSON downloaded.");
      setTimeout(() => setSavedMessage(null), 3000);

      onSave?.(data);
    },
    [onSave]
  );

  return (
    <div className="relative w-full h-full">
      <GameBoard
        editable={true}
        initialGrid={initialGrid}
        onSave={handleSave}
      />

      {/* Save confirmation message */}
      {savedMessage && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg font-mono z-50 shadow-lg">
          {savedMessage}
        </div>
      )}

      {/* Editor instructions */}
      <div className="absolute top-4 right-4 bg-black/70 text-white p-4 rounded-lg font-mono text-xs max-w-xs z-40">
        <h4 className="font-bold mb-2">Editor Controls:</h4>
        <ul className="space-y-1">
          <li>• Click + drag to place roads/tiles</li>
          <li>• Select building then click to place</li>
          <li>• Press R to rotate buildings</li>
          <li>• Use eraser to remove</li>
          <li>• Ctrl/Cmd+Z to undo</li>
          <li>• Arrow keys / WASD to pan</li>
          <li>• Scroll to zoom</li>
        </ul>
      </div>
    </div>
  );
}
