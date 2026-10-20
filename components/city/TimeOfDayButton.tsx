"use client";

import { useEffect, useRef, useState } from "react";
import { TIMES_OF_DAY, type TimeOfDay } from "@/lib/city/nightSchedule";
import { PIXEL_INSET_CLIP, pixelButtonClass } from "./pixelModalStyles";

interface TimeOfDayButtonProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
}

// The time of day button on the city, next to Walk: Auto (the visitor's clock, the default), Morning, Day, Evening,
// Night. The list opens upward, over the city.
export default function TimeOfDayButton({ value, onChange }: TimeOfDayButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = TIMES_OF_DAY.find((t) => t.id === value)?.label ?? "Auto";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={pixelButtonClass("ghost")}
        style={PIXEL_INSET_CLIP}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Time of day: ${current}`}
      >
        {current}
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Time of day"
          className="absolute bottom-full right-0 mb-2 w-44 md:left-0 md:right-auto border-[3px] border-[#2d3134] bg-[#474438] p-1 font-mono text-sm uppercase tracking-[0.08em] text-[#f0ead6] shadow-[inset_0_-3px_0_#2c2922]"
          style={PIXEL_INSET_CLIP}
        >
          <p className="px-2 pb-1 pt-1 text-[11px] text-[#d9d1bb]">Time of day</p>
          {TIMES_OF_DAY.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={id === value}
              onClick={() => {
                onChange(id);
                setOpen(false);
              }}
              className={`flex min-h-11 w-full items-center justify-between px-2 text-left uppercase hover:bg-[#555144] ${
                id === value ? "bg-[#5d5848]" : ""
              }`}
            >
              <span>{label}</span>
              {id === value && <span aria-hidden>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
