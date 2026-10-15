'use client';

import { useState } from 'react';
import { UserRound } from 'lucide-react';

// Placeholder for the avatar builder (POR-22). The parts need art first, so each part shows empty slots.
const PARTS = ['Face', 'Hair', 'Body', 'Shoes'] as const;
const SLOTS_PER_PART = 4;

export default function AvatarSection() {
  const [part, setPart] = useState<(typeof PARTS)[number]>('Face');
  const [name, setName] = useState('');

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">Create your own avatar</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Pick a face, hair, body and shoes, then walk the city as yourself. The parts are not drawn yet.
      </p>

      <div className="mt-6 flex flex-col items-center rounded-lg bg-white px-4 py-6">
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-neutral-100">
          <UserRound className="h-14 w-14 text-neutral-400" strokeWidth={1.5} />
        </span>
        <span className="mt-3 rounded bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
          {name.trim() || 'Your name'}
        </span>
      </div>

      <div role="tablist" aria-label="Avatar parts" className="mt-6 flex gap-2">
        {PARTS.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === part}
            onClick={() => setPart(p)}
            className={`rounded-full px-3 py-1 text-sm ${
              p === part ? 'bg-neutral-900 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      <ul role="tabpanel" aria-label={part} className="mt-4 grid grid-cols-4 gap-3">
        {Array.from({ length: SLOTS_PER_PART }, (_, i) => (
          <li
            key={i}
            className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-neutral-300 text-xs text-neutral-400"
          >
            Soon
          </li>
        ))}
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
