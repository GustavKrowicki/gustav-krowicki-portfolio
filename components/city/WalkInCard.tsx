"use client";

import { AnimatePresence, motion } from "framer-motion";
import { INTERIOR_BEATS } from "@/lib/city/interiorBeats";
import { PIXEL_INSET_CLIP, PIXEL_PANEL_CLIP, pixelPanelOuterClass } from "./pixelModalStyles";

// The pixel buttons (pixelButtonClass), one size smaller: the card must leave the open building in view on a phone
const button =
  "border-[3px] px-3 py-1 font-mono text-[12px] uppercase tracking-[0.08em] transition-transform duration-100 active:translate-y-px";
const walkInButton = `${button} border-[#6e2e14] bg-[#d78432] text-[#21160a] shadow-[inset_0_-3px_0_#8a4717] hover:bg-[#e1933f]`;
const caseButton = `${button} border-[#2d3134] bg-[#474438] text-[#f0ead6] shadow-[inset_0_-3px_0_#2c2922] hover:bg-[#555144]`;

interface WalkInCardProps {
  /** The walk-in building opened in place (its roof is off), or null */
  buildingId: string | null;
  onWalkIn: () => void;
  onReadCase: () => void;
  onClose: () => void;
}

// The card for a walk-in building opened in place (a tap takes its roof off, MainScene
// openWalkInPeek): its place and one sentence, then the two ways on: walk in, or read the case. Same look and place as
// the beat cards (PeekCard), over the top of the city, so the open building below stays in view.
export default function WalkInCard({ buildingId, onWalkIn, onReadCase, onClose }: WalkInCardProps) {
  const beats = buildingId ? INTERIOR_BEATS[buildingId] : undefined;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex justify-center px-3">
      <AnimatePresence mode="wait">
        {buildingId && beats && (
          <motion.div
            key={buildingId}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`${pixelPanelOuterClass} pointer-events-auto w-full max-w-[340px] !p-[4px]`}
            style={PIXEL_PANEL_CLIP}
            role="dialog"
            aria-label={beats.enter?.kicker}
            data-testid="walk-in-card"
          >
            <div className="relative border-[3px] border-[#0f1214] border-l-[8px] border-l-[#9a4a36] bg-[#f4f1e8] px-2.5 py-1.5 text-[#1d1f22]">
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-1.5 top-1 px-1.5 font-mono text-[16px] leading-none text-[#6b5a1e]"
              >
                ×
              </button>
              <p className="pr-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b5a1e]">{beats.enter?.kicker}</p>
              <p className="mt-0.5 text-[14px] font-semibold leading-snug">{beats.leave?.lead}</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                <button onClick={onWalkIn} className={walkInButton} style={PIXEL_INSET_CLIP}>
                  Walk in
                </button>
                <button onClick={onReadCase} className={caseButton} style={PIXEL_INSET_CLIP}>
                  Read the case
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
