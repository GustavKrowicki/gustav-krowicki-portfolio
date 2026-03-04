"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TOUR_STOPS, CATEGORY_STYLES, TourStop } from "@/lib/city/tourStops";
import { useRouter } from "next/navigation";

interface TourGuideProps {
  isMobile: boolean;
  isActive: boolean;
  currentStopIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onEnd: () => void;
  onStopChange?: (stop: TourStop) => void;
}

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
        initial={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, x: 50 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
        exit={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, x: 50 }}
        transition={{ duration: 0.3 }}
        className={`fixed z-40 ${isMobile ? "bottom-0 left-0 right-0" : "top-4 right-4"}`}
      >
        <div className={isMobile ? "w-full" : "w-[400px]"}>
          <div className={`bg-[#1a1f2e]/95 backdrop-blur-md border border-white/10 shadow-2xl overflow-hidden ${isMobile ? "rounded-t-2xl max-h-[min(52dvh,30rem)]" : "rounded-2xl"}`}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                {/* Category badge */}
                {categoryStyle && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryStyle.bgColor} ${categoryStyle.color} hidden sm:inline-flex`}
                  >
                    {categoryStyle.label}
                  </span>
                )}
                {/* Title */}
                <h3 className="text-white font-bold text-base sm:text-lg">
                  {currentStop.title}
                </h3>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <span>
                  {currentStopIndex + 1} / {TOUR_STOPS.length}
                </span>
                <button
                  onClick={onEnd}
                  className="ml-2 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                  title="End tour (Esc)"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div
              className={`px-4 sm:px-5 py-4 min-h-[100px] cursor-pointer ${isMobile ? "max-h-40 overflow-y-auto" : ""}`}
              onClick={handleSkipTyping}
            >
              <p className="text-gray-300 leading-relaxed">
                {displayedText}
                {isTyping && (
                  <span className="inline-block w-0.5 h-4 bg-blue-400 ml-0.5 animate-pulse" />
                )}
              </p>
            </div>

            {/* Actions */}
            <div className={`px-4 sm:px-5 py-3 border-t border-white/5 bg-white/[0.02] ${isMobile ? "space-y-3" : "flex items-center justify-between"}`}>
              {/* Left actions */}
              <div className={`flex items-center gap-2 ${isMobile ? "flex-wrap" : ""}`}>
                {currentStop.projectSlug && (
                  <button
                    onClick={handleViewProject}
                    className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                  >
                    View Case Study
                  </button>
                )}
                {isLastStop && (
                  <button
                    onClick={handleContact}
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-600 hover:to-purple-700 transition-colors"
                  >
                    Let&apos;s Connect
                  </button>
                )}
              </div>

              {/* Navigation */}
              <div className={`flex items-center gap-2 ${isMobile ? "justify-between" : ""}`}>
                {!isFirstStop && (
                  <button
                    onClick={onPrevious}
                    className={`px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-1 ${isMobile ? "flex-1 justify-center" : ""}`}
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                    Back
                  </button>
                )}
                {!isLastStop ? (
                  <button
                    onClick={() => (isTyping ? handleSkipTyping() : onNext())}
                    className={`px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors flex items-center gap-1 ${isMobile ? "flex-1 justify-center" : ""}`}
                  >
                    Next
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={onEnd}
                    className={`px-4 py-2 bg-white/10 text-white rounded-lg text-sm font-medium hover:bg-white/20 transition-colors ${isMobile ? "flex-1" : ""}`}
                  >
                    Finish Tour
                  </button>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-white/5">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{
                  width: `${((currentStopIndex + 1) / TOUR_STOPS.length) * 100}%`,
                }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Keyboard hints */}
          <div className={`justify-end gap-3 mt-2 text-gray-500 text-xs px-2 ${isMobile ? "hidden" : "flex"}`}>
            <span>← →</span>
            <span>Space</span>
            <span>Esc</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
