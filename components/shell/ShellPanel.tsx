import { useRef } from 'react';
import { ArrowLeft, CircleX, Maximize2, Minimize2, X } from 'lucide-react';
import type { Place } from '@/lib/city/places';
import { SECTIONS, SectionContent, type SectionId } from './sections';
import PlaceSection from './sections/PlaceSection';

// peek: phones only (?popups=slot), the short sheet: a place card, or Home with the first cases in view
export type PanelState = 'peek' | 'open' | 'expanded' | 'closed';

interface ShellPanelProps {
  section: SectionId;
  state: PanelState;
  openCase: string | null;
  /** ?popups=slot: a building opened from the city, shown in the panel */
  place?: Place | null;
  /** ?popups=slot: one motion for every slot change, and the phone sheet's grabber */
  slot?: boolean;
  onOpenCase: (slug: string) => void;
  onOpenSection: (id: SectionId) => void;
  onCloseCase: () => void;
  onClosePlace?: () => void;
  onWalkIn?: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
  /** Phones (?popups=slot): the grabber was swiped up or tapped, or swiped down */
  onGrow?: () => void;
  onShrink?: () => void;
}

// Phones: a sheet above the tab bar (55% of the screen, 85% expanded, and with ?popups=slot a short 320 px peek).
// Desktop: the column right of the rail.
const HEIGHT_ON_PHONE: Record<PanelState, string> = {
  peek: 'h-[min(320px,55dvh)]',
  open: 'h-[55dvh]',
  expanded: 'h-[85dvh]',
  closed: 'h-0',
};

// The one motion for slot changes (?popups=slot): Tom's 0.4 s soft ease-out, none when the visitor asks for less motion
export const SLOT_MOTION = 'duration-[400ms] ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none';
// The same for the desktop column's width (the aside), spelled out so Tailwind finds the classes
export const SLOT_MOTION_DESKTOP = 'md:duration-[400ms] md:ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none';

export default function ShellPanel({
  section,
  state,
  openCase,
  place = null,
  slot = false,
  onOpenCase,
  onOpenSection,
  onCloseCase,
  onClosePlace,
  onWalkIn,
  onToggleExpand,
  onClose,
  onGrow,
  onShrink,
}: ShellPanelProps) {
  const isClosed = state === 'closed';
  const isExpanded = state === 'expanded';
  const isPeek = state === 'peek';
  const sectionLabel = SECTIONS.find(({ id }) => id === section)?.label;
  // Back is one step: a case goes back to its place (or section), a place back to the section
  const back = openCase
    ? { label: place ? place.title : sectionLabel, onClick: onCloseCase }
    : place
      ? { label: sectionLabel, onClick: onClosePlace }
      : null;

  // The grabber (phones, ?popups=slot): a swipe up or a tap grows the sheet, a swipe down shrinks it
  const dragFrom = useRef<number | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    dragFrom.current = e.clientY;
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (dragFrom.current === null) return;
    const dy = e.clientY - dragFrom.current;
    dragFrom.current = null;
    if (dy > 30) onShrink?.();
    else if (dy < -30 || Math.abs(dy) < 6) onGrow?.();
  };

  return (
    <section
      aria-label="Portfolio panel"
      data-testid="shell-panel"
      data-state={state}
      inert={isClosed}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden transition-[height] md:h-full md:flex-1 md:transition-none ${
        slot ? SLOT_MOTION : 'duration-200'
      } ${HEIGHT_ON_PHONE[state]} ${isClosed ? 'md:invisible' : ''}`}
    >
      {slot && (
        <div
          className="relative flex h-7 shrink-0 touch-none items-center justify-center md:hidden"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (dragFrom.current = null)}
          data-testid="sheet-grabber"
        >
          <button
            type="button"
            aria-label={isExpanded ? 'Shrink panel' : 'Expand panel'}
            // a keyboard press (no pointer, so detail 0) grows or shrinks it; taps go through the drag above
            onClick={(e) => e.detail === 0 && (isExpanded ? onShrink?.() : onGrow?.())}
            className="flex h-7 w-20 items-center justify-center"
          >
            <span className="h-1 w-10 rounded-full bg-neutral-300" />
          </button>
          {isPeek && place && (
            <button
              type="button"
              onClick={onClosePlace}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              aria-label="Close"
              className="absolute right-2 flex h-11 w-11 items-center justify-center text-neutral-500"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      )}
      <header
        className={`h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-6 ${
          isPeek ? 'hidden md:flex' : 'flex'
        }`}
      >
        {back ? (
          <button
            type="button"
            onClick={back.onClick}
            aria-label={`Back to ${back.label}`}
            className="flex min-w-0 items-center gap-2 font-medium text-neutral-900 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="truncate">{back.label}</span>
          </button>
        ) : (
          <span className="font-semibold text-neutral-900">Gustav Krowicki</span>
        )}
        <div className="flex items-center gap-3 text-neutral-600">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Shrink panel' : 'Expand panel'}
            className="hover:text-neutral-900"
          >
            {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close panel" className="hover:text-neutral-900">
            <CircleX className="h-5 w-5" />
          </button>
        </div>
      </header>
      {/* Keyed by what it shows, so a new section, place or case starts scrolled to the top. */}
      <div
        key={openCase ?? place?.buildingId ?? section}
        className={`min-h-0 flex-1 overflow-y-auto ${openCase ? 'bg-background' : ''}`}
        data-testid="shell-panel-content"
      >
        {place && !openCase ? (
          <PlaceSection
            place={place}
            onOpenCase={onOpenCase}
            onWalkIn={() => onWalkIn?.()}
            onGrow={isPeek ? onGrow : undefined}
            // the song list needs the tall sheet: from peek that is two steps
            onGrowForList={isExpanded ? undefined : isPeek ? () => (onGrow?.(), onGrow?.()) : onGrow}
          />
        ) : (
          <SectionContent
            id={section}
            openCase={openCase}
            onOpenCase={onOpenCase}
            onOpenSection={onOpenSection}
            compactHome={slot}
          />
        )}
      </div>
    </section>
  );
}
