"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { InteriorBeat } from "@/lib/city/interiorBeats";
import { PIXEL_PANEL_CLIP, pixelButtonClass, pixelPanelOuterClass } from "./pixelModalStyles";

interface PeekCardProps {
  /** The open beat (lib/city/interiorBeats.ts), or null when the avatar is not on a stand tile */
  beat: InteriorBeat | null;
  /** Remount key, so walking from one beat to the next plays the change */
  beatKey: string | null;
  /** Shown at the top of the card the first time its find is found (lib/achievements.ts), e.g. "Found · 3 of 17" */
  foundTag?: string;
  onViewCaseStudy?: () => void;
  /** A button on the card was pressed (beat.choices) */
  onChoose?: (choice: NonNullable<InteriorBeat["choices"]>[number]) => void;
  /** Phones show the card at the bottom of the city, in thumb reach and clear of an in-app browser's top bar */
  atBottom?: boolean;
  /** Phones show the card in the plain style of the place sheet and the panel (PlaceSheet), not as a pixel panel */
  plain?: boolean;
}

// The two looks: a pixel panel (desktop) and the plain style of the place sheet and the panel (phones)
const styles = {
  pixel: {
    box: "border-[3px] border-[#0f1214] border-l-[8px] border-l-[#c9a93f] bg-[#f4f1e8] px-3 py-2.5 text-[#1d1f22]",
    kicker: "font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b5a1e]",
    found: "shrink-0 font-mono text-[11px] uppercase tracking-[0.1em] text-[#3d7a3a]",
    caseLink: "pointer-events-auto mt-2 font-mono text-[12px] uppercase tracking-[0.1em] text-[#6b5a1e] underline",
  },
  plain: {
    box: "rounded-2xl border border-neutral-200 bg-[#F3F0EC] px-5 py-4 text-neutral-900 shadow-[0_4px_18px_rgba(0,0,0,0.22)]",
    kicker: "text-xs font-medium uppercase tracking-[0.08em] text-neutral-500",
    found: "shrink-0 text-xs font-medium text-[#3d7a3a]",
    primary: "h-11 flex-auto whitespace-nowrap rounded-full bg-neutral-900 px-4 text-[15px] font-medium text-white active:bg-neutral-700",
    secondary: "h-11 flex-auto whitespace-nowrap rounded-full border border-neutral-300 bg-white px-4 text-[15px] font-medium text-neutral-900 active:bg-neutral-100",
    caseLink: "pointer-events-auto mt-3 text-[14px] font-medium text-neutral-900 underline underline-offset-2",
  },
};

// A peek card over the top of the city view while the avatar stands on a beat's stand tile inside a walk-in building.
// Real text (sharp on a phone), above the scene so the zone the avatar looks at stays in view below it; it does not
// take pointer events, so walking (joystick, clicks on the map) goes on underneath and closes it. On phones it sits at
// the bottom of the city instead (atBottom).
export default function PeekCard({ beat, beatKey, foundTag, onViewCaseStudy, onChoose, atBottom = false, plain = false }: PeekCardProps) {
  // At the bottom it sits above the time of day button (bottom-3, about 40 px high)
  const place = atBottom ? "bottom-16" : "top-[max(0.75rem,env(safe-area-inset-top))]";
  const slide = atBottom ? 8 : -8;
  return (
    <div className={`pointer-events-none absolute inset-x-0 ${place} z-30 flex justify-center px-3`}>
      <AnimatePresence mode="wait">
        {beat && (
          <motion.div
            key={beatKey}
            initial={{ opacity: 0, y: slide }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: slide }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={plain ? "w-full max-w-[360px]" : `${pixelPanelOuterClass} w-full max-w-[360px]`}
            style={plain ? undefined : PIXEL_PANEL_CLIP}
            role="status"
            aria-live="polite"
            data-testid="peek-card"
          >
            <div className={plain ? styles.plain.box : styles.pixel.box}>
              <div className="flex items-baseline justify-between gap-2">
                <p className={plain ? styles.plain.kicker : styles.pixel.kicker}>{beat.kicker}</p>
                {foundTag && (
                  <p className={plain ? styles.plain.found : styles.pixel.found} data-testid="peek-found">
                    ★ {foundTag}
                  </p>
                )}
              </div>
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
              {beat.choices && onChoose && (
                <div className={plain ? "mt-3 flex gap-3" : "mt-2.5 flex flex-wrap gap-2"}>
                  {beat.choices.map((choice, i) => (
                    <button
                      key={choice.id}
                      onClick={() => onChoose(choice)}
                      className={
                        plain
                          ? `pointer-events-auto ${i === 0 ? styles.plain.primary : styles.plain.secondary}`
                          : `pointer-events-auto ${pixelButtonClass(i === 0 ? "primary" : "secondary")} min-h-[44px]`
                      }
                      data-testid={`peek-choice-${choice.id}`}
                    >
                      {choice.label}
                    </button>
                  ))}
                </div>
              )}
              {beat.caseStudy && onViewCaseStudy && (
                <button
                  onClick={onViewCaseStudy}
                  className={plain ? styles.plain.caseLink : styles.pixel.caseLink}
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
