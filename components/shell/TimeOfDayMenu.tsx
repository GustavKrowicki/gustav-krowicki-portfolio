'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Sun } from 'lucide-react';
import { TIMES_OF_DAY, type TimeOfDay } from '@/lib/city/nightSchedule';

interface TimeOfDayMenuProps {
  value: TimeOfDay;
  onChange: (value: TimeOfDay) => void;
}

// The sun button at the end of the rail: pick the city's time of day. Auto (the visitor's clock) is the default.
export default function TimeOfDayMenu({ value, onChange }: TimeOfDayMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on a click outside or Escape
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onPointer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative md:mt-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Time of day"
        aria-haspopup="menu"
        aria-expanded={open}
        title="Time of day"
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
          open ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
        }`}
      >
        <Sun className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Time of day"
          className="absolute bottom-12 right-0 z-50 w-56 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-black/5 md:bottom-0 md:left-12 md:right-auto"
        >
          <p className="px-3 pb-1 pt-2 text-xs font-medium text-neutral-500">Time of day in the city</p>
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
              className="flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-[15px] text-neutral-900 hover:bg-neutral-100"
            >
              <span>
                {label}
                {id === 'auto' && <span className="ml-2 text-neutral-500">your clock</span>}
              </span>
              {id === value && <Check className="h-4 w-4" strokeWidth={2} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
