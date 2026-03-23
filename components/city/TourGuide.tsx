"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOUR_STOPS, CATEGORY_STYLES, TourStop } from "@/lib/city/tourStops";
import { getBuildingVideo } from "@/lib/city/buildingVideos";
import VideoThumbnail from "./VideoThumbnail";
import { useRouter } from "next/navigation";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
} from "./pixelModalStyles";

interface TourGuideProps {
  isMobile: boolean;
  isActive: boolean;
  currentStopIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onEnd: () => void;
  onStopChange?: (stop: TourStop) => void;
}

const categoryClassMap: Record<TourStop["category"], string> = {
  work: "border-[#20333d] bg-[#6c8790] text-[#10181b]",
  education: "border-[#22311e] bg-[#7f9465] text-[#11160f]",
  startup: "border-[#5b2918] bg-[#bb6b3c] text-[#1f120b]",
  interests: "border-[#66460c] bg-[#d2a23c] text-[#221706]",
  contact: "border-[#692f2a] bg-[#c36d5e] text-[#210f0d]",
};

export default function TourGuide({
  isMobile,
  isActive,
  currentStopIndex,
  onNext,
  onPrevious,
  onEnd,
  onStopChange,
}: TourGuideProps) {
  const router = useRouter();
  const [isTyping, setIsTyping] = useState(true);
  const [displayedText, setDisplayedText] = useState("");
  const currentStop = TOUR_STOPS[currentStopIndex];
  const categoryStyle = currentStop
    ? CATEGORY_STYLES[currentStop.category]
    : null;
  const isFirstStop = currentStopIndex === 0;
  const isLastStop = currentStopIndex === TOUR_STOPS.length - 1;

  // Typewriter effect
  useEffect(() => {
    if (!currentStop) return;

    setDisplayedText("");
    setIsTyping(true);

    const text = currentStop.dialogue;
    let index = 0;
    const speed = 20; // ms per character

    const timer = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(timer);
      }
    }, speed);

    return () => clearInterval(timer);
  }, [currentStop]);

  // Notify parent of stop change
  useEffect(() => {
    if (currentStop && onStopChange) {
      onStopChange(currentStop);
    }
  }, [currentStop, onStopChange]);

  // Skip typewriter on click
  const handleSkipTyping = useCallback(() => {
    if (isTyping && currentStop) {
      setDisplayedText(currentStop.dialogue);
      setIsTyping(false);
    }
  }, [isTyping, currentStop]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "Enter") {
        if (isTyping) {
          handleSkipTyping();
        } else if (!isLastStop) {
          onNext();
        }
      } else if (e.key === "ArrowLeft" && !isFirstStop) {
        onPrevious();
      } else if (e.key === "Escape") {
        onEnd();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isActive,
    isTyping,
    isFirstStop,
    isLastStop,
    onNext,
    onPrevious,
    onEnd,
    handleSkipTyping,
  ]);

  const handleViewProject = () => {
    if (currentStop?.projectSlug) {
      router.push(`/work/${currentStop.projectSlug}`);
    }
  };

  const handleContact = () => {
    router.push("/contact");
  };

  if (!isActive || !currentStop) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentStopIndex}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-40 flex items-end justify-center p-4 pb-[max(2rem,env(safe-area-inset-bottom))] pointer-events-none"
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          onClick={handleSkipTyping}
          className={`relative w-full pointer-events-auto cursor-pointer ${isMobile ? "max-w-none" : "max-w-2xl"}`}
        >
          <div className={pixelPanelOuterClass} style={PIXEL_PANEL_CLIP}>
            <div className={`${pixelPanelInnerClass} p-3`} style={PIXEL_INSET_CLIP}>
              {/* Header row */}
              <div className={`mb-2 flex items-center gap-2 ${isMobile ? "flex-wrap" : ""}`}>
                <h3 className="truncate font-mono text-base uppercase tracking-[0.08em] text-[#f5ecd2]">
                  {currentStop.title}
                </h3>
                {categoryStyle && (
                  <span
                    className={`inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest opacity-70 ${categoryClassMap[currentStop.category]}`}
                    style={{ borderWidth: 0 }}
                  >
                    {categoryStyle.label}
                  </span>
                )}

                {/* Progress + close */}
                <div className="ml-auto flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-[#d9d1bb]/60">
                    {currentStopIndex + 1}/{TOUR_STOPS.length}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onEnd(); }}
                    className="border-[2px] border-[#111518] bg-[#3f3b31] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8cfb6] shadow-[inset_0_-2px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                    title="End tour (Esc)"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Dialogue box + optional video */}
              <div className="flex gap-3">
                <div className="flex-1 border-[3px] border-[#171a1d] bg-[#77715f] px-3 py-2 shadow-[inset_0_3px_0_#98917c]">
                  <p className="font-mono text-sm leading-relaxed text-[#171411]">
                    <span>&ldquo;</span>
                    {displayedText}
                    <span>&rdquo;</span>
                    {isTyping && (
                      <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#171411]" />
                    )}
                  </p>
                </div>

                {currentStop.buildingId && getBuildingVideo(currentStop.buildingId) && (
                  <div className="h-16 w-16 flex-shrink-0 self-start [&>div]:!h-16 [&>div]:!border-0 [&>div]:!shadow-none [&>div]:!bg-transparent">
                    <VideoThumbnail
                      video={getBuildingVideo(currentStop.buildingId)!}
                      isActive={isActive}
                      compact
                    />
                  </div>
                )}
              </div>

              {/* Action buttons — shown after typing completes */}
              <div className={`mt-2 flex items-center gap-1.5 ${isTyping ? "opacity-0" : "opacity-100"} transition-opacity`}>
                {/* Navigation */}
                {!isFirstStop && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onPrevious(); }}
                    className="border-[2px] border-[#111518] bg-[#3f3b31] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8cfb6] shadow-[inset_0_-2px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                  >
                    ← Back
                  </button>
                )}

                {currentStop.projectSlug && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleViewProject(); }}
                    className="border-[2px] border-[#111518] bg-[#d78432] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#21160a] shadow-[inset_0_-2px_0_#8a4717] transition-transform duration-100 active:translate-y-px"
                  >
                    View Case Study
                  </button>
                )}

                {isLastStop && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleContact(); }}
                    className="border-[2px] border-[#111518] bg-[#d78432] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#21160a] shadow-[inset_0_-2px_0_#8a4717] transition-transform duration-100 active:translate-y-px"
                  >
                    Let&apos;s Connect
                  </button>
                )}

                <div className="ml-auto">
                  {!isLastStop ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onNext(); }}
                      className="border-[2px] border-[#111518] bg-[#3f3b31] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8cfb6] shadow-[inset_0_-2px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                    >
                      Next →
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEnd(); }}
                      className="border-[2px] border-[#111518] bg-[#3f3b31] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8cfb6] shadow-[inset_0_-2px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                    >
                      Finish Tour
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Keyboard hints */}
          <p className={`mx-auto mt-2 w-fit ${pixelHintClass} ${isMobile ? "hidden" : ""}`}>
            ← → Navigate • Space to skip • Esc to end
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
