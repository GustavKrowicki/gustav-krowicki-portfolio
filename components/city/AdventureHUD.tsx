"use client";

import { useCallback } from "react";
import { motion } from "framer-motion";
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
  onExitAdventure: () => void;
  isAutoWalking: boolean;
}

export default function AdventureHUD({
  isMobile,
  visitedBuildings,
  onNextStop,
  onExitAdventure,
  isAutoWalking,
}: AdventureHUDProps) {
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
      <div
        className={`${pixelPanelOuterClass} overflow-hidden ${isMobile ? "w-full" : "min-w-[240px]"}`}
        style={PIXEL_PANEL_CLIP}
      >
            <div className={pixelPanelInnerClass} style={PIXEL_INSET_CLIP}>
              <div className="flex items-center justify-between border-b-[3px] border-[#0f1214] bg-[#504d42] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={pixelChipClass}>Adventure</span>
                  <span className="font-mono text-xs uppercase tracking-[0.08em] text-[#f5ecd2]">
                    {visitedCount}/{totalLandmarks}
                  </span>
                </div>
                <button
                  onClick={onExitAdventure}
                  className="border-[2px] border-[#111518] bg-[#692f2a] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#f5ecd2] shadow-[inset_0_-2px_0_#3d1a17] transition-transform duration-100 active:translate-y-px"
                  data-testid="city-exit-adventure"
                >
                  Exit
                </button>
              </div>

              <div className="border-t-[3px] border-[#474438] bg-[#7a7567] px-3 pb-3 pt-3">
                {isComplete ? (
                  <div className="border-[3px] border-[#22311e] bg-[#7f9465] px-3 py-3 text-center">
                    <p className="font-mono text-sm uppercase tracking-[0.08em] text-[#11160f]">
                      All landmarks visited
                    </p>
                  </div>
                ) : nextStop ? (
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
                ) : null}
              </div>

              <div className="border-t-[3px] border-[#474438] bg-[#5d584b] px-3 py-2">
                <p className={`mx-auto w-fit ${pixelHintClass}`}>
                  {isMobile ? "Joystick to move • Tap Talk" : "Arrow keys to move • E to interact"}
                </p>
              </div>
            </div>
      </div>
    </motion.div>
  );
}
