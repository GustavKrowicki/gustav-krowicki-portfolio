"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TourStop, CATEGORY_STYLES } from "@/lib/city/tourStops";

interface RPGDialogBoxProps {
  tourStop: TourStop | null;
  isVisible: boolean;
  onClose: () => void;
  onViewCaseStudy?: (projectSlug: string) => void;
}

export default function RPGDialogBox({
  tourStop,
  isVisible,
  onClose,
  onViewCaseStudy,
}: RPGDialogBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [showContinueIndicator, setShowContinueIndicator] = useState(false);

  // Typewriter effect
  useEffect(() => {
    if (!isVisible || !tourStop) {
      setDisplayedText("");
      setIsTyping(true);
      return;
    }

    const text = tourStop.dialogue;
    let index = 0;
    setDisplayedText("");
    setIsTyping(true);
    setShowContinueIndicator(false);

    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        setShowContinueIndicator(true);
      }
    }, 20); // 20ms per character

    return () => clearInterval(interval);
  }, [isVisible, tourStop]);

  // Skip typing animation on click/keypress
  const skipTyping = useCallback(() => {
    if (isTyping && tourStop) {
      setDisplayedText(tourStop.dialogue);
      setIsTyping(false);
      setShowContinueIndicator(true);
    }
  }, [isTyping, tourStop]);

  // Handle keyboard input
  useEffect(() => {
    if (!isVisible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === " " || e.key === "Enter" || e.key === "e" || e.key === "E") {
        e.preventDefault();
        if (isTyping) {
          skipTyping();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, isTyping, skipTyping, onClose]);

  if (!tourStop) return null;

  const categoryStyle = CATEGORY_STYLES[tourStop.category];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-8 pointer-events-none"
        >
          {/* Dialog Box */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={skipTyping}
            className="relative w-full max-w-2xl pointer-events-auto cursor-pointer"
          >
            {/* Pixel art border effect using CSS */}
            <div className="relative">
              {/* Outer border (pixel effect) */}
              <div
                className="absolute inset-0 bg-gradient-to-b from-gray-600 to-gray-800"
                style={{
                  clipPath: `polygon(
                    0 4px, 4px 4px, 4px 0,
                    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
                    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
                    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
                  )`,
                }}
              />

              {/* Inner content area */}
              <div
                className="relative bg-[#1a1a2e] m-[4px] p-4"
                style={{
                  clipPath: `polygon(
                    0 4px, 4px 4px, 4px 0,
                    calc(100% - 4px) 0, calc(100% - 4px) 4px, 100% 4px,
                    100% calc(100% - 4px), calc(100% - 4px) calc(100% - 4px), calc(100% - 4px) 100%,
                    4px 100%, 4px calc(100% - 4px), 0 calc(100% - 4px)
                  )`,
                }}
              >
                <div className="flex gap-4">
                  {/* Portrait */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-600/30 border-2 border-gray-600 overflow-hidden flex items-center justify-center">
                      {/* Placeholder portrait - Gustav silhouette */}
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-2xl font-bold">
                        G
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-400 mt-1 font-mono">
                      Gustav
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Title and Category */}
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-white font-bold text-lg font-mono truncate">
                        {tourStop.title}
                      </h3>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${categoryStyle.bgColor} ${categoryStyle.color}`}
                      >
                        {categoryStyle.label}
                      </span>
                    </div>

                    {/* Dialogue */}
                    <div className="min-h-[60px]">
                      <p className="text-gray-200 text-sm leading-relaxed font-mono">
                        "{displayedText}"
                        {isTyping && (
                          <span className="inline-block w-2 h-4 bg-white ml-1 animate-pulse" />
                        )}
                      </p>
                    </div>

                    {/* Continue indicator */}
                    {showContinueIndicator && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex justify-end mt-2"
                      >
                        <motion.span
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="text-white text-lg"
                        >
                          ▼
                        </motion.span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                {!isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="flex justify-end gap-3 mt-4 pt-3 border-t border-gray-700"
                  >
                    {tourStop.projectSlug && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCaseStudy?.(tourStop.projectSlug!);
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded font-mono text-sm hover:from-blue-600 hover:to-purple-700 transition-all"
                      >
                        View Case Study
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className="px-4 py-2 bg-gray-700 text-white rounded font-mono text-sm hover:bg-gray-600 transition-colors"
                    >
                      Continue
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Hint text */}
            <p className="text-center text-gray-500 text-xs mt-2 font-mono">
              Press Space/Enter to continue • ESC to close
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
