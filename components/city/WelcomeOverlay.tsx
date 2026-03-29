"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelChipClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
  pixelSpriteFrameClass,
} from "./pixelModalStyles";

interface WelcomeOverlayProps {
  isMobile: boolean;
  onStartTour: () => void;
  onExploreFreely: () => void;
  onStartAdventure?: () => void;
  isVisible: boolean;
}

export default function WelcomeOverlay({
  isMobile,
  onStartTour,
  onExploreFreely,
  onStartAdventure,
  isVisible,
}: WelcomeOverlayProps) {

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          data-testid="city-welcome-overlay"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(14,18,20,0.16)_0%,rgba(14,18,20,0.56)_55%,rgba(7,10,12,0.86)_100%)]" />

          {/* Content card */}
          <AnimatePresence>
            {
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.4, ease: "easeOut", delay: 0.15 }}
                className="relative z-10 max-w-lg mx-4 w-full"
              >
                <div className={pixelPanelOuterClass} style={PIXEL_PANEL_CLIP}>
                  <div
                    className={`${pixelPanelInnerClass} max-h-[calc(100dvh-2rem)] overflow-y-auto`}
                    style={PIXEL_INSET_CLIP}
                  >
                    <div className={`${isMobile ? "p-5" : "p-8"} bg-[#504d42] border-b-[3px] border-[#0f1214]`}>
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                        className={`${pixelSpriteFrameClass} ${isMobile ? "h-16 w-16 mb-4" : "h-20 w-20 mb-6"} mx-auto flex items-center justify-center`}
                        style={PIXEL_INSET_CLIP}
                      >
                        <span
                          role="img"
                          aria-label="waving hand"
                          className={`${isMobile ? "text-3xl" : "text-4xl"} flex h-10 w-10 items-center justify-center border-[3px] border-[#6e2e14] bg-[#d78432]`}
                        >
                          👋
                        </span>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="mb-3 flex justify-center"
                      >
                        <span className={pixelChipClass}>City Entry</span>
                      </motion.div>

                      <motion.h2
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-center font-mono text-2xl uppercase tracking-[0.08em] text-[#f5ecd2]"
                      >
                        Welcome to Gustav&apos;s City
                      </motion.h2>

                      <motion.p
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="mt-3 text-center font-mono text-sm leading-relaxed text-[#d7ceb8]"
                      >
                        I&apos;m a product designer who builds digital experiences.
                        <br />
                        Explore my portfolio in this isometric city.
                      </motion.p>
                    </div>

                    <div className={`${isMobile ? "px-5 pb-5" : "px-8 pb-8"} bg-[#6d6b5f] pt-5`}>
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 }}
                        className="border-[3px] border-[#171a1d] bg-[#7b7462] px-4 py-4 shadow-[inset_0_3px_0_#98917c]"
                      >
                        <p className="text-center font-mono text-sm italic leading-relaxed text-[#181511]">
                          &ldquo;Each building tells a story. From my work at LEGO to my
                          education across 3 countries. Want me to show you around?&rdquo;
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="mt-5 flex flex-col gap-3"
                      >
                        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                          <button
                            onClick={onStartTour}
                            className={pixelButtonClass("ghost")}
                            data-testid="city-welcome-tour"
                          >
                            Map Tour
                          </button>
                          {onStartAdventure && (
                            <button
                              onClick={onStartAdventure}
                              className={pixelButtonClass("primary")}
                              data-testid="city-welcome-adventure"
                            >
                              Start Adventure
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={onExploreFreely}
                            className={`flex-1 ${pixelButtonClass("secondary")}`}
                            data-testid="city-welcome-free-explore"
                          >
                            Free Explore
                          </button>
                        </div>
                      </motion.div>

                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                        className={`mx-auto mt-4 w-fit ${pixelHintClass}`}
                      >
                        {onStartAdventure
                          ? "Walk around and discover my portfolio."
                          : "Tap buildings to learn more about each project."}
                      </motion.p>
                    </div>
                  </div>
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
