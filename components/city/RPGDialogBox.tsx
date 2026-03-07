"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TourStop, CATEGORY_STYLES } from "@/lib/city/tourStops";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
  pixelSpriteFrameClass,
} from "./pixelModalStyles";

interface RPGDialogBoxProps {
  isMobile: boolean;
  tourStop: TourStop | null;
  isVisible: boolean;
  onClose: () => void;
  onViewCaseStudy?: (projectSlug: string) => void;
  disableTypingAnimation?: boolean;
}

export default function RPGDialogBox({
  isMobile,
  tourStop,
  isVisible,
  onClose,
  onViewCaseStudy,
  disableTypingAnimation = false,
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

    if (disableTypingAnimation) {
      setDisplayedText(tourStop.dialogue);
      setIsTyping(false);
      setShowContinueIndicator(true);
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
  }, [disableTypingAnimation, isVisible, tourStop]);

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
  const categoryClassMap: Record<TourStop["category"], string> = {
    work: "border-[#20333d] bg-[#6c8790] text-[#10181b]",
    education: "border-[#22311e] bg-[#7f9465] text-[#11160f]",
    startup: "border-[#5b2918] bg-[#bb6b3c] text-[#1f120b]",
    interests: "border-[#66460c] bg-[#d2a23c] text-[#221706]",
    contact: "border-[#692f2a] bg-[#c36d5e] text-[#210f0d]",
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-4 pb-[max(2rem,env(safe-area-inset-bottom))] pointer-events-none"
          data-testid="city-rpg-dialog"
        >
          {/* Dialog Box */}
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={skipTyping}
            className={`relative w-full pointer-events-auto cursor-pointer ${isMobile ? "max-w-none" : "max-w-2xl"}`}
            data-testid="city-rpg-dialog-panel"
          >
            <div className={pixelPanelOuterClass} style={PIXEL_PANEL_CLIP}>
              <div className={`${pixelPanelInnerClass} p-4`} style={PIXEL_INSET_CLIP}>
                <div className={`flex gap-4 ${isMobile ? "items-start" : ""}`}>
                  <div className="flex-shrink-0">
                    <div
                      className={`${pixelSpriteFrameClass} ${isMobile ? "h-16 w-16" : "h-20 w-20"} flex items-center justify-center`}
                      style={PIXEL_INSET_CLIP}
                    >
                      <div
                        className={`${isMobile ? "h-10 w-10 text-lg" : "h-12 w-12 text-xl"} flex items-center justify-center border-[3px] border-[#17201d] bg-[#88a07e] font-mono text-[#112117]`}
                      >
                        G
                      </div>
                    </div>
                    <p className="mt-1 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-[#d8cfb6]">
                      Gustav
                    </p>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className={`mb-3 ${isMobile ? "space-y-2" : "flex items-center gap-2"}`}>
                      <h3 className="truncate font-mono text-lg uppercase tracking-[0.08em] text-[#f5ecd2]">
                        {tourStop.title}
                      </h3>
                      <span
                        className={`inline-flex border-2 px-2 py-1 font-mono text-[11px] uppercase tracking-[0.1em] ${categoryClassMap[tourStop.category]}`}
                      >
                        {categoryStyle.label}
                      </span>
                    </div>

                    <div className="min-h-[72px] border-[3px] border-[#171a1d] bg-[#77715f] px-3 py-3 shadow-[inset_0_3px_0_#98917c]">
                      <p className="font-mono text-sm leading-relaxed text-[#171411]">
                        <span>&ldquo;</span>
                        {displayedText}
                        <span>&rdquo;</span>
                        {isTyping && (
                          <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-[#171411]" />
                        )}
                      </p>
                    </div>

                    {showContinueIndicator && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-2 flex justify-end"
                      >
                        <motion.span
                          animate={{ y: [0, 4, 0] }}
                          transition={{ duration: 0.6, repeat: Infinity }}
                          className="font-mono text-lg text-[#e7bb56]"
                        >
                          ▼
                        </motion.span>
                      </motion.div>
                    )}
                  </div>
                </div>

                {!isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={`mt-4 border-t-[3px] border-[#474438] pt-4 ${isMobile ? "grid gap-3" : "flex justify-end gap-3"}`}
                  >
                    {tourStop.projectSlug && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCaseStudy?.(tourStop.projectSlug!);
                        }}
                        className={pixelButtonClass("primary")}
                      >
                        View Case Study
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                      }}
                      className={pixelButtonClass("ghost")}
                    >
                      Continue
                    </button>
                  </motion.div>
                )}
              </div>
            </div>

            <p className={`mx-auto mt-2 w-fit ${pixelHintClass}`}>
              {isMobile ? "Tap to continue" : "Press Space/Enter to continue • ESC to close"}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
