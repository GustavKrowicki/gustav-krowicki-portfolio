'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AVATAR_DEFAULT_CHOICE,
  AVATAR_SLOTS,
  AVATAR_CHANGE_EVENT,
  AVATAR_STORAGE_KEY,
  avatarThumbUrl,
  type AvatarChoice,
} from '@/lib/city/models/avatarPieces';
import AvatarLayerView from './AvatarLayerView';

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
  }, [choice, name]);

  const [smile, setSmile] = useState(false);

  const onReady = () => {
    if (measured.current) return;
    measured.current = true;
    const ms = Math.round(performance.now() - openedAt.current);
    document.documentElement.dataset.avatarReadyMs = String(ms);
  };

  const current = AVATAR_SLOTS.find((s) => s.id === slot)!;

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">Create your own avatar</h2>
      <p className="mt-2 text-sm leading-relaxed text-neutral-600">
        Dress me in my own clothes, then walk the city with it.
      </p>

      {/* Avatar beside the slots, so a half-height panel shows both without scrolling */}
      <div className="mt-4 flex items-start gap-4">
        <div className="flex shrink-0 flex-col items-center rounded-lg bg-[#e9e4da] px-2 pb-3">
          <AvatarLayerView choice={choice} expression={smile ? 'smile' : 'neutral'} onReady={onReady} />
          <span className="-mt-1 max-w-[7rem] truncate rounded bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
            {name.trim() || 'Your name'}
          </span>
        </div>

        <div className="min-w-0 flex-1">
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

          <ul role="tabpanel" aria-label={current.label} className="mt-3 grid grid-cols-2 gap-2">
            {current.options.map((o) => {
              const selected = choice[current.id] === o.id;
              return (
                <li key={o.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setChoice((c) => ({ ...c, [current.id]: o.id }))}
                    className={`flex h-[4.5rem] w-full flex-col items-center justify-center gap-0.5 rounded-lg border bg-white text-xs ${
                      selected ? 'border-neutral-900 text-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element -- tiny static PNG, no resizing needed */}
                    <img
                      src={avatarThumbUrl(o.id)}
                      alt=""
                      width={40}
                      height={40}
                      className="h-10 w-10 object-contain"
                    />
                    <span className="px-1 text-center leading-tight">{o.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            aria-pressed={smile}
            onClick={() => setSmile((v) => !v)}
            className={`mt-3 rounded-full px-3 py-1 text-xs ${smile ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600'}`}
          >
            Smile
          </button>
          <label className="mt-3 block">
            <span className="text-xs font-medium text-neutral-500">Name tag</span>
            <input
              type="text"
              value={name}
              maxLength={16}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
