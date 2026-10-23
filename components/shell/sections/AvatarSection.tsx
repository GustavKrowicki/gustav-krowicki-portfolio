'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_DEFAULT_CHOICE,
  AVATAR_SLOTS,
  AVATAR_CHANGE_EVENT,
  AVATAR_WALK_EVENT,
  AVATAR_STORAGE_KEY,
  avatarThumbUrl,
  type AvatarChoice,
} from '@/lib/city/models/avatarPieces';
import AvatarLayerView from './AvatarLayerView';
import { markFound } from '@/lib/achievements';

// Avatar builder (POR-22): dress the avatar one piece per slot. The figure is 2D layers drawn from the approved
// model sheet (AvatarLayerView); the city wears the matching pre-baked 2D sheets, live. The choice stays in this
// browser (localStorage), nowhere else.

type SlotId = (typeof AVATAR_SLOTS)[number]['id'];

function readSaved(): { choice: AvatarChoice; name: string } {
  try {
    const raw = JSON.parse(window.localStorage.getItem(AVATAR_STORAGE_KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return { choice: AVATAR_DEFAULT_CHOICE, name: '' };
    const choice = { ...AVATAR_DEFAULT_CHOICE };
    for (const slot of AVATAR_SLOTS) {
      const id = raw.choice?.[slot.id];
      if (slot.options.some((o) => o.id === id)) choice[slot.id] = id;
    }
    return { choice, name: typeof raw.name === 'string' ? raw.name.slice(0, 16) : '' };
  } catch {
    return { choice: AVATAR_DEFAULT_CHOICE, name: '' };
  }
}

export default function AvatarSection() {
  const [slot, setSlot] = useState<SlotId>('top');
  // The shell only mounts this section on the client (it opens from the URL after load), so the saved
  // choice can be read in the initial state.
  const [saved] = useState(() => (typeof window === 'undefined' ? null : readSaved()));
  const [choice, setChoice] = useState<AvatarChoice>(saved?.choice ?? AVATAR_DEFAULT_CHOICE);
  const [name, setName] = useState(saved?.name ?? '');
  const openedAt = useRef(0);
  // The outfit this tab opened with: changing it is the "Try-on haul" find
  const openedChoice = useRef(JSON.stringify(saved?.choice ?? AVATAR_DEFAULT_CHOICE));
  const measured = useRef(false);

  useEffect(() => {
    openedAt.current = performance.now();
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify({ choice, name }));
    } catch {
      // private mode or storage blocked: the builder still works for this visit
    }
    window.dispatchEvent(new CustomEvent(AVATAR_CHANGE_EVENT, { detail: choice }));
    if (JSON.stringify(choice) !== openedChoice.current) markFound('avatar');
  }, [choice, name]);

  const [smile, setSmile] = useState(false);

  const onReady = () => {
    if (measured.current) return;
    measured.current = true;
    const ms = Math.round(performance.now() - openedAt.current);
    document.documentElement.dataset.avatarReadyMs = String(ms);
  };

  // Phones dress the avatar in the city: the city above the sheet zooms in on it (CityViewer avatarTabOpen), so the
  // sheet holds no figure, only the pieces in one swipe row and the bottom bar
  const [isPhone] = useState(() => typeof window !== 'undefined' && !window.matchMedia('(min-width: 768px)').matches);

  const current = AVATAR_SLOTS.find((s) => s.id === slot)!;

  const slotTabs = (
    <div role="tablist" aria-label="Avatar slots" className="flex flex-wrap gap-1.5">
      {AVATAR_SLOTS.map((s) => (
        <button
          key={s.id}
          type="button"
          role="tab"
          aria-selected={s.id === slot}
          onClick={() => setSlot(s.id)}
          className={`rounded-full px-3 py-1 text-sm ${
            s.id === slot ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  );

  const options = (
    <ul
      role="tabpanel"
      aria-label={current.label}
      className={
        isPhone
          ? '-mx-4 mt-3 flex snap-x gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]'
          : 'mt-3 grid grid-cols-2 gap-2'
      }
    >
      {current.options.map((o) => {
        const selected = choice[current.id] === o.id;
        return (
          <li key={o.id} className={isPhone ? 'shrink-0 snap-start' : undefined}>
            <button
              type="button"
              aria-pressed={selected}
              onClick={() => setChoice((c) => ({ ...c, [current.id]: o.id }))}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-lg border bg-[#FDFDFD] text-xs ${
                isPhone ? 'h-[4.5rem] w-[5.25rem]' : 'h-[4.5rem] w-full'
              } ${selected ? 'border-neutral-900 text-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- tiny static PNG, no resizing needed */}
              <img src={avatarThumbUrl(o.id)} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
              <span className="px-1 text-center leading-tight">{o.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );

  // The bar sits at the bottom of the sheet on phones; on desktop right under the slots
  return (
    <div className="flex min-h-full flex-col md:min-h-0">
      {isPhone ? (
        <div className="flex-1 px-4 pt-4 pb-4">
          <h2 className="text-xl font-semibold text-neutral-900">Dress your avatar</h2>
          <p className="mt-1 text-sm text-neutral-600">That is you in the city above. Change a piece and watch it.</p>
          <div className="mt-3">{slotTabs}</div>
          {options}
        </div>
      ) : (
        <div className="flex-1 px-6 pt-6 pb-4">
          <h2 className="text-2xl font-semibold text-neutral-900">Create your own avatar</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            Dress me in my own clothes, then walk the city with it.
          </p>

          {/* Avatar beside the slots */}
          <div className="mt-4 flex items-start gap-4">
            <div className="flex shrink-0 flex-col items-center rounded-lg bg-[#e9e4da] px-2 pb-3">
              <AvatarLayerView choice={choice} expression={smile ? 'smile' : 'neutral'} onReady={onReady} />
              <span className="-mt-1 max-w-[7rem] truncate rounded bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                {name.trim() || 'Your name'}
              </span>
              <button
                type="button"
                aria-pressed={smile}
                onClick={() => setSmile((v) => !v)}
                className={`mt-2 rounded-full px-3 py-1 text-xs ${smile ? 'bg-neutral-900 text-white' : 'bg-white/70 text-neutral-600'}`}
              >
                Smile
              </button>
            </div>

            <div className="min-w-0 flex-1">
              {slotTabs}
              {options}
            </div>
          </div>
        </div>
      )}

      {/* Name and Walk stay at the bottom of the panel, so a phone sees them without a scroll (POR-48) */}
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-neutral-200 bg-[#FDFDFD] px-4 py-3 md:px-6">
        <input
          type="text"
          value={name}
          maxLength={16}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          aria-label="Name tag"
          // 16 px text, so iPhone Safari does not zoom in on focus
          className="min-w-0 flex-1 rounded-full border border-neutral-300 bg-white px-4 py-2 text-base text-neutral-900 focus:border-neutral-900 focus:outline-none md:text-sm"
        />
        <button
          type="button"
          onClick={() => window.dispatchEvent(new Event(AVATAR_WALK_EVENT))}
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Walk the city
        </button>
      </div>
    </div>
  );
}
