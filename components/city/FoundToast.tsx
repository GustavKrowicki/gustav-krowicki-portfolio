"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { Find } from "@/lib/achievements";
import { FINDS } from "@/lib/achievements";
import { PIXEL_PANEL_CLIP, pixelPanelOuterClass } from "./pixelModalStyles";

// A short note over the city when the visitor finds something away from the beat cards (a place, the night, the
// minutes). Same pixel panel as the peek card; it takes no pointer events, so the city stays in reach underneath.
export default function FoundToast({ find, count }: { find: Find | null; count: number }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex justify-center px-3">
      <AnimatePresence mode="wait">
        {find && (
          <motion.div
            key={find.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={`${pixelPanelOuterClass} w-full max-w-[320px]`}
            style={PIXEL_PANEL_CLIP}
            role="status"
            aria-live="polite"
            data-testid="found-toast"
          >
            <div className="border-[3px] border-[#0f1214] border-l-[8px] border-l-[#3d7a3a] bg-[#f4f1e8] px-3 py-2.5 text-[#1d1f22]">
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#3d7a3a]">
                ★ Found · {count} of {FINDS.length}
              </p>
              <p className="mt-1 text-[15px] font-semibold leading-snug">{find.title}</p>
              <p className="mt-0.5 text-[14px] leading-snug">{find.about}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
