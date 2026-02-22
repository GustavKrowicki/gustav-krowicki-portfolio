"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TourStop, CATEGORY_STYLES, TOUR_STOPS } from "@/lib/city/tourStops";

interface AdventureHUDProps {
  visitedBuildings: Set<string>;
  currentTourStopIndex: number;
  onNextStop: () => void;
  isAutoWalking: boolean;
}

export default function AdventureHUD({
  visitedBuildings,
  currentTourStopIndex,
  onNextStop,
  isAutoWalking,
}: AdventureHUDProps) {
  const [isMinimized, setIsMinimized] = useState(false);

  // Count visited landmarks (excluding welcome and outro)
  const landmarkStops = TOUR_STOPS.filter((stop) => stop.buildingId);
  const visitedCount = landmarkStops.filter((stop) =>
    stop.buildingId && visitedBuildings.has(stop.buildingId)
  ).length;
  const totalLandmarks = landmarkStops.length;

  // Find next unvisited stop
  const getNextStop = useCallback((): TourStop | null => {
    for (const stop of TOUR_STOPS) {
      if (stop.buildingId && !visitedBuildings.has(stop.buildingId)) {
        return stop;
      }
    }
    return null;
  }, [visitedBuildings]);

  const nextStop = getNextStop();
  const isComplete = visitedCount >= totalLandmarks;

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed top-4 left-4 z-40"
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="w-12 h-12 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          >
            <span className="text-lg">🗺️</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 overflow-hidden min-w-[200px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-white text-sm font-medium">Adventure</span>
              <button
                onClick={() => setIsMinimized(true)}
                className="text-gray-400 hover:text-white transition-colors text-xs"
              >
                −
              </button>
            </div>

            {/* Progress */}
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400 text-xs">Progress</span>
                <span className="text-white text-sm font-mono">
                  {visitedCount}/{totalLandmarks}
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(visitedCount / totalLandmarks) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>

            {/* Next stop or completion */}
            <div className="px-3 pb-3">
              {isComplete ? (
                <div className="text-center py-2">
                  <span className="text-2xl">🎉</span>
                  <p className="text-green-400 text-sm font-medium mt-1">
                    All landmarks visited!
                  </p>
                </div>
              ) : nextStop ? (
                <>
                  <div className="mb-2">
                    <span className="text-gray-400 text-xs">Next:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-white text-sm font-medium truncate">
                        {nextStop.title}
                      </span>
                      {nextStop.category && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${CATEGORY_STYLES[nextStop.category].bgColor} ${CATEGORY_STYLES[nextStop.category].color}`}
                        >
                          {CATEGORY_STYLES[nextStop.category].label.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={onNextStop}
                    disabled={isAutoWalking}
                    className={`w-full px-3 py-2 rounded text-white text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      isAutoWalking
                        ? "bg-gray-600 cursor-not-allowed"
                        : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
                    }`}
                  >
                    {isAutoWalking ? (
                      <>
                        <span className="animate-spin">↻</span>
                        Walking...
                      </>
                    ) : (
                      <>
                        Next Stop
                        <span>→</span>
                      </>
                    )}
                  </button>
                </>
              ) : null}
            </div>

            {/* Controls hint */}
            <div className="px-3 pb-2 border-t border-white/10 pt-2">
              <p className="text-gray-500 text-[10px] text-center">
                WASD to move • E to interact
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
