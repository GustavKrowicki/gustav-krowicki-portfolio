'use client';

import dynamic from 'next/dynamic';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AVATAR_DEFAULT_CHOICE,
  AVATAR_SLOTS,
  AVATAR_STORAGE_KEY,
  avatarLookPieces,
  type AvatarChoice,
} from '@/lib/city/models/avatarPieces';

// Avatar builder (POR-22): dress the base body one piece per slot. The 3D view (three.js and the one GLB)
// loads only when this tab opens. The choice stays in this browser (localStorage), nowhere else.
const AvatarToonView = dynamic(() => import('./AvatarToonView'), {
  ssr: false,
  loading: () => <div style={{ width: 128, height: 240 }} aria-hidden />,
});

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
  }, [choice, name]);

  const worn = useMemo(() => avatarLookPieces(choice), [choice]);

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
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Dress me in my own clothes, one piece per slot, then walk the city with it.
      </p>

      <div className="mt-6 flex flex-col items-center rounded-lg bg-[#e9e4da] px-4 py-6">
        <AvatarToonView worn={worn} onReady={onReady} />
        <span className="mt-3 rounded bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
          {name.trim() || 'Your name'}
        </span>
      </div>

      <div role="tablist" aria-label="Avatar slots" className="mt-6 flex gap-2">
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

      <ul role="tabpanel" aria-label={current.label} className="mt-4 grid grid-cols-4 gap-3">
        {current.options.map((o) => {
          const selected = choice[current.id] === o.id;
          return (
            <li key={o.id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => setChoice((c) => ({ ...c, [current.id]: o.id }))}
                className={`flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border bg-white text-xs ${
                  selected ? 'border-neutral-900 text-neutral-900' : 'border-neutral-200 text-neutral-500 hover:border-neutral-400'
                }`}
              >
                <span
                  className="h-6 w-6 rounded-full border border-black/10"
                  style={{ backgroundColor: o.swatch }}
                  aria-hidden
                />
                <span className="px-1 text-center leading-tight">{o.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <label className="mt-6 block">
        <span className="text-sm font-medium text-neutral-500">Name tag</span>
        <input
          type="text"
          value={name}
          maxLength={16}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          className="mt-2 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-neutral-900 focus:outline-none"
        />
      </label>
    </div>
  );
}
