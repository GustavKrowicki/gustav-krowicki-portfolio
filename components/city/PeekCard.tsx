"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { InteriorBeat } from "@/lib/city/interiorBeats";
import { PIXEL_PANEL_CLIP, pixelPanelOuterClass } from "./pixelModalStyles";

interface PeekCardProps {
  /** The open beat (lib/city/interiorBeats.ts), or null when the avatar is not on a stand tile */
  beat: InteriorBeat | null;
  /** Remount key, so walking from one beat to the next plays the change */
  beatKey: string | null;
  onViewCaseStudy?: () => void;
}

// A peek card over the top of the city view while the avatar stands on a beat's stand tile inside a walk-in building.
// Real text (sharp on a phone), above the scene so the zone the avatar looks at stays in view below it; it does not
// take pointer events, so walking (joystick, clicks on the map) goes on underneath and closes it.
export default function PeekCard({ beat, beatKey, onViewCaseStudy }: PeekCardProps) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex justify-center px-3">
      <AnimatePresence mode="wait">
        {beat && (
          <motion.div
            key={beatKey}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`${pixelPanelOuterClass} w-full max-w-[360px]`}
            style={PIXEL_PANEL_CLIP}
            role="status"
            aria-live="polite"
            data-testid="peek-card"
          >
            <div className="border-[3px] border-[#0f1214] border-l-[8px] border-l-[#c9a93f] bg-[#f4f1e8] px-3 py-2.5 text-[#1d1f22]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b5a1e]">{beat.kicker}</p>
              <p className="mt-1 text-[15px] font-semibold leading-snug">{beat.lead}</p>
              {beat.text && <p className="mt-1 text-[14px] leading-snug">{beat.text}</p>}
              {beat.items && (
                <ul className="mt-1.5 space-y-1">
                  {beat.items.map((item) => (
                    <li key={item.label} className="text-[14px] leading-snug">
                      <span className="font-semibold">{item.label}:</span> {item.text}
                    </li>
                  ))}
                </ul>
              )}
              {beat.caseStudy && onViewCaseStudy && (
                <button
                  onClick={onViewCaseStudy}
                  className="pointer-events-auto mt-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[#6b5a1e] underline"
                >
                  View case study
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
