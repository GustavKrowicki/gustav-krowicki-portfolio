"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TourStop, CATEGORY_STYLES } from "@/lib/city/tourStops";
import { getBuildingVideo } from "@/lib/city/buildingVideos";
import VideoThumbnail from "./VideoThumbnail";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
} from "./pixelModalStyles";
import SpotifyPlayer, { NORTHSIDE_PLAYLIST_URL } from "./SpotifyPlayer";
import BookShelf from "./BookShelf";

interface RPGDialogBoxProps {
  isMobile: boolean;
  tourStop: TourStop | null;
  isVisible: boolean;
  onClose: () => void;
  onContinue?: () => void;
  onViewCaseStudy?: (projectSlug: string) => void;
  disableTypingAnimation?: boolean;
  logoUrl?: string | null;
}

export default function RPGDialogBox({
  isMobile,
  tourStop,
  isVisible,
  onClose,
  onContinue,
  onViewCaseStudy,
  disableTypingAnimation = false,
  logoUrl,
}: RPGDialogBoxProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(true);

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
            return;
    }

    const text = tourStop.dialogue;
    let index = 0;
    setDisplayedText("");
    setIsTyping(true);
    
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayedText(text.slice(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
              }
    }, 20); // 20ms per character

    return () => clearInterval(interval);
  }, [disableTypingAnimation, isVisible, tourStop]);

  // Skip typing animation on click/keypress
  const skipTyping = useCallback(() => {
    if (isTyping && tourStop) {
      setDisplayedText(tourStop.dialogue);
      setIsTyping(false);
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
          (onContinue ?? onClose)();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isVisible, isTyping, skipTyping, onClose, onContinue]);

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
              <div className={`${pixelPanelInnerClass} p-3`} style={PIXEL_INSET_CLIP}>
                <div className={`mb-2 flex items-center gap-2 ${isMobile ? "flex-wrap" : ""}`}>
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-6 w-6 object-contain"
                    />
                  )}
                  <h3 className="truncate font-mono text-base uppercase tracking-[0.08em] text-[#f5ecd2]">
                    {tourStop.title}
                  </h3>
                  <span
                    className={`inline-flex rounded-sm px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest opacity-70 ${categoryClassMap[tourStop.category]}`}
                    style={{ borderWidth: 0 }}
                  >
                    {categoryStyle.label}
                  </span>
                  <div className={`ml-auto flex items-center gap-1.5 ${isTyping ? "opacity-0" : "opacity-100"} transition-opacity`}>
                    {!isTyping && tourStop.projectSlug && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewCaseStudy?.(tourStop.projectSlug!);
                        }}
                        className="border-[2px] border-[#111518] bg-[#d78432] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#21160a] shadow-[inset_0_-2px_0_#8a4717] transition-transform duration-100 active:translate-y-px"
                      >
                        View Case Study
                      </button>
                    )}
                    {!isTyping && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          (onContinue ?? onClose)();
                        }}
                        className="border-[2px] border-[#111518] bg-[#3f3b31] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-[#d8cfb6] shadow-[inset_0_-2px_0_#26231d] transition-transform duration-100 active:translate-y-px"
                      >
                        Continue
                      </button>
                    )}
                  </div>
                </div>

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

                  {tourStop.buildingId && getBuildingVideo(tourStop.buildingId) && (
                    <div className="h-16 w-16 flex-shrink-0 self-start [&>div]:!h-16 [&>div]:!border-0 [&>div]:!shadow-none [&>div]:!bg-transparent">
                      <VideoThumbnail
                        video={getBuildingVideo(tourStop.buildingId)!}
                        isActive={isVisible}
                        compact
                      />
                    </div>
                  )}
                </div>

                {tourStop.buildingId === "northside-stage" && (
                  <div className="mt-2">
                    <SpotifyPlayer playlistUrl={NORTHSIDE_PLAYLIST_URL} />
                  </div>
                )}

                {tourStop.buildingId === "dokk1-library" && (
                  <div className="mt-2">
                    <BookShelf />
                  </div>
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
