"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CharacterType } from "./pogicity/types";

interface WelcomeOverlayProps {
  isMobile: boolean;
  onStartTour: () => void;
  onExploreFreely: () => void;
  onStartAdventure?: (characterType: CharacterType) => void;
  isVisible: boolean;
}

export default function WelcomeOverlay({
  isMobile,
  onStartTour,
  onExploreFreely,
  onStartAdventure,
  isVisible,
}: WelcomeOverlayProps) {
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  const handleAdventureClick = () => {
    if (onStartAdventure) {
      setShowCharacterSelect(true);
    }
  };

  const handleCharacterSelect = (characterType: CharacterType) => {
    onStartAdventure?.(characterType);
    setShowCharacterSelect(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

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
                <div className={`bg-[#1a1f2e]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl max-h-[calc(100dvh-2rem)] overflow-y-auto ${isMobile ? "p-5" : "p-8"}`}>
                  {/* Avatar/Icon */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className={`${isMobile ? "w-14 h-14 mb-4 text-3xl" : "w-20 h-20 mb-6 text-4xl"} mx-auto rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg`}
                  >
                    <span role="img" aria-label="waving hand">
                      👋
                    </span>
                  </motion.div>

                  {/* Title */}
                  <motion.h2
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-white text-2xl font-bold text-center mb-2"
                  >
                    Welcome to Gustav&apos;s City!
                  </motion.h2>

                  {/* Subtitle */}
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-gray-400 text-center mb-6"
                  >
                    I&apos;m a product designer who builds digital experiences.
                    <br />
                    Explore my portfolio in this isometric city!
                  </motion.p>

                  {/* Speech bubble style message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5"
                  >
                    <p className="text-gray-300 text-sm italic text-center">
                      &ldquo;Each building tells a story - from my work at LEGO to my
                      education across 3 countries. Want me to show you around?&rdquo;
                    </p>
                  </motion.div>

                  {/* Buttons */}
                  <AnimatePresence mode="wait">
                    {!showCharacterSelect ? (
                      <motion.div
                        key="main-buttons"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ delay: 0.6 }}
                        className="flex flex-col gap-3"
                      >
                        <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
                          <button
                            onClick={onStartTour}
                            className="px-4 py-3 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-200 border border-white/10 text-sm"
                          >
                            <span className="mr-1">🗺️</span>
                            Guided Tour
                          </button>
                          {onStartAdventure && (
                            <button
                              onClick={handleAdventureClick}
                              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                              <span className="mr-2">🎮</span>
                              Start Adventure
                            </button>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={onExploreFreely}
                            className="flex-1 px-4 py-2.5 bg-white/10 text-white rounded-xl font-medium hover:bg-white/20 transition-all duration-200 border border-white/10 text-sm"
                          >
                            <span className="mr-1">🔍</span>
                            Free Explore
                          </button>
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="character-select"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-3"
                      >
                        <p className="text-gray-400 text-sm text-center">Choose your character:</p>
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => handleCharacterSelect(CharacterType.Banana)}
                            className="w-24 h-24 rounded-xl bg-yellow-500/20 border-2 border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-500/30 transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <span className="text-3xl">🍌</span>
                            <span className="text-white text-xs">Banana</span>
                          </button>
                          <button
                            onClick={() => handleCharacterSelect(CharacterType.Apple)}
                            className="w-24 h-24 rounded-xl bg-red-500/20 border-2 border-red-500/50 hover:border-red-400 hover:bg-red-500/30 transition-all flex flex-col items-center justify-center gap-1"
                          >
                            <span className="text-3xl">🍎</span>
                            <span className="text-white text-xs">Apple</span>
                          </button>
                        </div>
                        <button
                          onClick={() => setShowCharacterSelect(false)}
                          className="w-full text-gray-500 text-sm hover:text-gray-400 transition-colors"
                        >
                          ← Back
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hint text */}
                  {!showCharacterSelect && (
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.8 }}
                      className="text-gray-500 text-xs text-center mt-4"
                    >
                      {onStartAdventure
                        ? "Walk around and discover my portfolio."
                        : "Tip: Tap buildings to learn more about each project."}
                    </motion.p>
                  )}
                </div>
              </motion.div>
            }
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
