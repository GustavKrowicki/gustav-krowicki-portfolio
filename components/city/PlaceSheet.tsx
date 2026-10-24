"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { INTERIOR_BEATS } from "@/lib/city/interiorBeats";

interface PlaceSheetProps {
  /** The walk-in building opened in place (its roof is off), or null */
  buildingId: string | null;
  onWalkIn: () => void;
  onReadCase: () => void;
  onClose: () => void;
}

// Phones: the card for a walk-in building opened in place is a sheet from the bottom of the city, in the panel's plain
// style (the walk-in card at the top is the desktop version). Same words and the same two ways on: walk in, or read
// the case. Drag it down, tap ×, tap the city or press Esc to close it. Modeled on tomjohn.design, where a place's card
// is the phone's bottom sheet.
export default function PlaceSheet({ buildingId, onWalkIn, onReadCase, onClose }: PlaceSheetProps) {
  const beats = buildingId ? INTERIOR_BEATS[buildingId] : undefined;
  return (
    <AnimatePresence>
      {buildingId && beats && (
        <motion.div
          key={buildingId}
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.9 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 60 || info.velocity.y > 400) onClose();
          }}
          className="absolute inset-x-0 bottom-0 z-30 touch-none rounded-t-2xl border-t border-neutral-200 bg-[#FDFDFD] px-5 pb-5 text-neutral-900 shadow-[0_-8px_24px_rgba(0,0,0,0.18)]"
          role="dialog"
          aria-label={beats.enter?.kicker}
          data-testid="place-sheet"
        >
          <div className="flex justify-center pb-1 pt-2" aria-hidden>
            <span className="h-1 w-10 rounded-full bg-neutral-300" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-neutral-500">{beats.enter?.kicker}</p>
              <p className="mt-1 text-[17px] font-semibold leading-snug">{beats.leave?.lead}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={onWalkIn}
              className="h-11 flex-1 rounded-full bg-neutral-900 px-5 text-[15px] font-medium text-white active:bg-neutral-700"
            >
              Walk in
            </button>
            <button
              type="button"
              onClick={onReadCase}
              className="h-11 flex-1 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-medium text-neutral-900 active:bg-neutral-100"
            >
              Read the case
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
