import { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Place } from '@/lib/city/places';
import { FIND_WALK_EVENT, type FindWalkTarget } from '@/lib/achievements';
import SpotifyPlayer, { NORTHSIDE_PLAYLIST_URL } from '@/components/city/SpotifyPlayer';
import BookShelf from '@/components/city/BookShelf';

interface PlaceSectionProps {
  place: Place;
  onOpenCase: (slug: string) => void;
  /** Walk in through the door of a walk-in building opened in place */
  onWalkIn: () => void;
  /** Phones: the sheet is at its short height, so a tap on the card grows it */
  onGrow?: () => void;
  /** Phones: the playlist's song list opened, so grow the sheet one step */
  onGrowForList?: () => void;
}

// A building opened from the city (?popups=slot): its place in the panel or the sheet. It leads with the case's cover
// (recruiters look at the work first), then the logo, the title and one line, then Read the case and Walk in. The
// rest sits below, for the half sheet and the desktop panel. Modeled on tomjohn.design's place card.
export default function PlaceSection({ place, onOpenCase, onWalkIn, onGrow, onGrowForList }: PlaceSectionProps) {
  // Focus follows the slot: a screen reader or keyboard lands on the place that just opened
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => headingRef.current?.focus({ preventScroll: true }), [place.buildingId]);

  const walkThere = () => {
    const detail: FindWalkTarget = { buildingId: place.buildingId };
    window.dispatchEvent(new CustomEvent(FIND_WALK_EVENT, { detail }));
  };

  return (
    <div data-testid="place-section">
      {place.coverImage && (
        <button
          type="button"
          onClick={onGrow}
          tabIndex={-1}
          aria-hidden
          className="relative block aspect-[3/1] w-full overflow-hidden border-b border-neutral-200 bg-white md:aspect-[16/9]"
        >
          <Image src={place.coverImage} alt="" fill sizes="(min-width: 768px) 440px, 100vw" className="object-cover" />
        </button>
      )}
      <div className="px-6 pb-6 pt-4">
        <div className="flex items-center gap-2.5">
          {place.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={place.logoUrl} alt="" className="h-7 w-7 shrink-0 rounded-full border border-neutral-200 bg-white object-contain p-0.5" />
          )}
          <h2 ref={headingRef} tabIndex={-1} className="text-xl font-semibold text-neutral-900" style={{ outline: 'none' }}>
            {place.title}
          </h2>
        </div>
        <p className="mt-1.5 leading-snug text-neutral-700">{place.lead}</p>

        <div className="mt-4 flex gap-3">
          {place.caseSlug && (
            <button
              type="button"
              onClick={() => onOpenCase(place.caseSlug!)}
              className="h-11 flex-1 rounded-full bg-neutral-900 px-5 text-[15px] font-medium text-white hover:bg-neutral-700 active:bg-neutral-700"
            >
              Read the case
            </button>
          )}
          {place.walkIn ? (
            <button
              type="button"
              onClick={onWalkIn}
              className="h-11 flex-1 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-medium text-neutral-900 hover:bg-neutral-100 active:bg-neutral-100"
            >
              Walk in
            </button>
          ) : (
            !place.caseSlug && (
              <button
                type="button"
                onClick={walkThere}
                className="h-11 flex-1 rounded-full border border-neutral-300 bg-white px-5 text-[15px] font-medium text-neutral-900 hover:bg-neutral-100 active:bg-neutral-100"
              >
                Walk there
              </button>
            )
          )}
        </div>

        {place.text && <p className="mt-6 leading-relaxed text-neutral-700">{place.text}</p>}
        {place.extra === 'playlist' && (
          <div className="mt-6">
            <SpotifyPlayer playlistUrl={NORTHSIDE_PLAYLIST_URL} variant="plain" onOpen={onGrowForList} />
          </div>
        )}
        {place.extra === 'books' && (
          <div className="mt-6">
            <BookShelf variant="plain" />
          </div>
        )}
      </div>
    </div>
  );
}
