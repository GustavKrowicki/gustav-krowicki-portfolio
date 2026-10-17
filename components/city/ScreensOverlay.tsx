"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { InteriorBeat } from "@/lib/city/interiorBeats";
import { PIXEL_PANEL_CLIP, pixelButtonClass, pixelPanelOuterClass } from "./pixelModalStyles";

interface ScreensOverlayProps {
  /** The beat the avatar sits at (it has a seat with screens), or null when nobody sits */
  beat: InteriorBeat | null;
  beatKey: string | null;
  /** Stand up: the overlay closes and the avatar gets up (MainScene.standUp) */
  onClose: () => void;
}

// The sit-and-look moment: the screens the avatar looks at, large and readable over the city, with the beat's card text
// under them. Two black monitors side by side on a desktop, stacked on a phone; each screen scrolls its full image.
// Closes on the close button, a tap outside the monitors, Escape, or any move in the city (the scene stands up first).
export default function ScreensOverlay({ beat, beatKey, onClose }: ScreensOverlayProps) {
  const reduced = useReducedMotion();
  const screens = beat?.seat?.screens ?? [];

  useEffect(() => {
    if (!beat) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [beat, onClose]);

  return (
    <AnimatePresence>
      {beat && screens.length > 0 && (
        <motion.div
          key={beatKey}
          className="absolute inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[rgba(18,20,22,0.62)] px-3 pb-6 pt-[max(0.75rem,env(safe-area-inset-top))] md:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0 : 0.2 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={beat.kicker}
          data-testid="screens-overlay"
        >
          <motion.div
            className="w-full max-w-[980px]"
            initial={reduced ? false : { y: 12, scale: 0.98 }}
            animate={{ y: 0, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid gap-3 md:grid-cols-2 md:gap-4">
              {screens.map((s) => (
                <figure key={s.src} className="m-0">
                  {/* the monitor: black bezel, a 16:10 screen that scrolls the full case image */}
                  <div className="rounded-[6px] bg-[#16171a] p-[7px] shadow-[0_10px_0_rgba(8,9,10,0.45)]">
                    <div className="aspect-[16/10] overflow-y-auto overscroll-contain rounded-[2px] bg-[#e9e9e7]">
                      {/* eslint-disable-next-line @next/next/no-img-element -- full-size case image inside a scrolling screen */}
                      <img src={s.src} alt={s.alt} className="block h-auto w-full" draggable={false} />
                    </div>
                  </div>
                  <div className="mx-auto h-[10px] w-[18%] bg-[#26282b]" aria-hidden />
                  <div className="mx-auto h-[5px] w-[34%] rounded-[2px] bg-[#26282b]" aria-hidden />
                  <figcaption className="mt-1.5 text-center font-mono text-[11px] uppercase tracking-[0.1em] text-[#f0ead6]">{s.caption}</figcaption>
                </figure>
              ))}
            </div>
            <div className={`${pixelPanelOuterClass} mt-4`} style={PIXEL_PANEL_CLIP}>
              <div className="flex items-start gap-3 border-[3px] border-[#0f1214] border-l-[8px] border-l-[#c9a93f] bg-[#f4f1e8] px-3 py-2.5 text-[#1d1f22]">
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b5a1e]">{beat.kicker}</p>
                  <p className="mt-1 text-[15px] font-semibold leading-snug">{beat.lead}</p>
                  {beat.items && (
                    <ul className="mt-1.5 space-y-1">
                      {beat.items.map((item) => (
                        <li key={item.label} className="text-[14px] leading-snug">
                          <span className="font-semibold">{item.label}:</span> {item.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button onClick={onClose} className={`${pixelButtonClass("ghost")} shrink-0`} data-testid="screens-overlay-close">
                  Stand up
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
