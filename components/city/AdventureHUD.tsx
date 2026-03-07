"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TourStop, CATEGORY_STYLES, TOUR_STOPS } from "@/lib/city/tourStops";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelChipClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
} from "./pixelModalStyles";

interface AdventureHUDProps {
  isMobile: boolean;
  visitedBuildings: Set<string>;
  onNextStop: () => void;
  isAutoWalking: boolean;
}

export default function AdventureHUD({
  isMobile,
  visitedBuildings,
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
  const categoryClassMap: Record<NonNullable<TourStop["category"]>, string> = {
    work: "border-[#20333d] bg-[#6c8790] text-[#10181b]",
    education: "border-[#22311e] bg-[#7f9465] text-[#11160f]",
    startup: "border-[#5b2918] bg-[#bb6b3c] text-[#1f120b]",
    interests: "border-[#66460c] bg-[#d2a23c] text-[#221706]",
    contact: "border-[#692f2a] bg-[#c36d5e] text-[#210f0d]",
  };

  return (
    <motion.div
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className={`fixed z-40 ${isMobile ? "top-[max(1rem,env(safe-area-inset-top))] left-3 right-20" : "top-4 left-4"}`}
      data-testid="city-adventure-hud"
    >
      <AnimatePresence mode="wait">
        {isMinimized ? (
          <motion.button
            key="minimized"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsMinimized(false)}
            className="flex h-12 w-12 items-center justify-center border-[3px] border-[#111518] bg-[#3f3b31] font-mono text-[#f5ecd2] shadow-[inset_0_-3px_0_#26231d] transition-transform duration-100 active:translate-y-px"
            style={PIXEL_INSET_CLIP}
          >
            <span className="text-xs uppercase">Map</span>
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className={`${pixelPanelOuterClass} overflow-hidden ${isMobile ? "w-full" : "min-w-[240px]"}`}
            style={PIXEL_PANEL_CLIP}
          >
            <div className={pixelPanelInnerClass} style={PIXEL_INSET_CLIP}>
              <div className="flex items-center justify-between border-b-[3px] border-[#0f1214] bg-[#504d42] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={pixelChipClass}>Adventure</span>
                  <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#f5ecd2]">
                    Progress
                  </span>
                </div>
                <button
                  onClick={() => setIsMinimized(true)}
                  className="flex h-8 w-8 items-center justify-center border-[3px] border-[#111518] bg-[#3f3b31] font-mono text-[#f5ecd2] shadow-[inset_0_-3px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                  style={PIXEL_INSET_CLIP}
                  aria-label="Minimize adventure panel"
                >
                  −
                </button>
              </div>

              <div className="bg-[#6d6b5f] px-3 py-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#2e2a22]">
                    Route Progress
                  </span>
                  <span className="font-mono text-sm text-[#181511]">
                    {visitedCount}/{totalLandmarks}
                  </span>
                </div>

                <div className="border-[3px] border-[#14181b] bg-[#49453b] p-1">
                  <div className="h-3 overflow-hidden bg-[#2c2922]">
                    <motion.div
                      className="h-full bg-[#d78432]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(visitedCount / totalLandmarks) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t-[3px] border-[#474438] bg-[#7a7567] px-3 pb-3 pt-3">
                {isComplete ? (
                  <div className="border-[3px] border-[#22311e] bg-[#7f9465] px-3 py-3 text-center">
                    <p className="font-mono text-sm uppercase tracking-[0.08em] text-[#11160f]">
                      All landmarks visited
                    </p>
                  </div>
                ) : nextStop ? (
                  <>
                    <div className="mb-3 border-[3px] border-[#171a1d] bg-[#88816d] px-3 py-3 shadow-[inset_0_3px_0_#a09882]">
                      <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#2e2a22]">
                        Next Stop
                      </span>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="truncate font-mono text-base uppercase tracking-[0.06em] text-[#181511]">
                          {nextStop.title}
                        </span>
                        {nextStop.category && (
                          <span
                            className={`inline-flex border-2 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] ${categoryClassMap[nextStop.category]}`}
                          >
                            {CATEGORY_STYLES[nextStop.category].label.split(" ")[0]}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={onNextStop}
                      disabled={isAutoWalking}
                      className={`flex w-full items-center justify-center gap-2 ${pixelButtonClass(isAutoWalking ? "ghost" : "primary")} ${isAutoWalking ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      {isAutoWalking ? (
                        <>
                          <span className="animate-spin">↻</span>
                          Walking
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

              <div className="border-t-[3px] border-[#474438] bg-[#5d584b] px-3 py-2">
                <p className={`mx-auto w-fit ${pixelHintClass}`}>
                  {isMobile ? "Joystick to move • Tap Talk" : "WASD to move • E to interact"}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
