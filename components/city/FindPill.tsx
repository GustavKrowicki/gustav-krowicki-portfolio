"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { Find } from "@/lib/achievements";
import { FINDS, requestFindOpen } from "@/lib/achievements";

// Phones: a find is a small pill in the top right corner of the city instead of a card across it (FoundToast is the
// desktop version). It shows the find's title, folds into just the star and the count after a moment, and a tap opens
// the find's page in the Achievements tab. A hint (no find) shows as a plain pill with its line. Modeled on the
// discovery pill on tomjohn.design.
export default function FindPill({ find, count, hint }: { find: Find | null; count: number; hint?: string | null }) {
  // The find whose pill has folded; a new find starts open again
  const [foldedId, setFoldedId] = useState<string | null>(null);
  const folded = !!find && foldedId === find.id;
  useEffect(() => {
    if (!find) return;
    const timer = window.setTimeout(() => setFoldedId(find.id), 2500);
    return () => window.clearTimeout(timer);
  }, [find]);

  return (
    <div className="pointer-events-none absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex max-w-[calc(100%-1.5rem)] justify-end">
      <AnimatePresence mode="wait">
        {find ? (
          <motion.button
            key={find.id}
            type="button"
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={() => requestFindOpen(find.id)}
            aria-label={`Found ${count} of ${FINDS.length}: ${find.title}. Open it`}
            className="pointer-events-auto flex h-11 min-w-0 items-center gap-2 rounded-full border border-neutral-200 bg-[#F3F0EC] px-4 text-neutral-900 shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
            data-testid="find-pill"
          >
            <span className="text-[15px] text-[#3d7a3a]" aria-hidden>★</span>
            <motion.span layout className="shrink-0 text-[13px] font-medium tabular-nums text-neutral-500">
              {count}/{FINDS.length}
            </motion.span>
            {!folded && (
              <motion.span layout className="truncate text-[14px] font-semibold" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {find.title}
              </motion.span>
            )}
          </motion.button>
        ) : hint ? (
          <motion.p
            key={hint}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="status"
            className="max-w-[300px] rounded-2xl border border-neutral-200 bg-[#F3F0EC] px-4 py-2.5 text-[14px] leading-snug text-neutral-900 shadow-[0_4px_14px_rgba(0,0,0,0.2)]"
            data-testid="find-hint"
          >
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
