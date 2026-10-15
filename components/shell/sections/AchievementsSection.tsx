'use client';

import { Check, Lock } from 'lucide-react';
import { ACHIEVEMENT_PLACES, useFoundPlaces } from '@/lib/achievements';
import { getBuilding } from '@/lib/city/buildings';
import type { SectionId } from '../sections';

// The free time areas still need content in About me. Until then they show as "coming soon" (POR-21).
const MORE_TO_FIND = ['Photos', 'Workshop', 'Music', 'Food', 'Books', 'Forest trail', 'Ski slope', 'AGF'];

// Placeholder for shell step 5: progress only. The content lives in Work and About me.
export default function AchievementsSection({ onOpenSection }: { onOpenSection: (id: SectionId) => void }) {
  const found = useFoundPlaces();
  const count = ACHIEVEMENT_PLACES.filter((id) => found.includes(id)).length;
  const total = ACHIEVEMENT_PLACES.length;

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">Achievements</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        Click a place in the city to find it. Your progress stays in this browser.
      </p>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-medium text-neutral-500">Places found</h3>
          <span className="font-semibold text-neutral-900" data-testid="places-found">
            {count}/{total}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full bg-neutral-900 transition-[width]" style={{ width: `${(count / total) * 100}%` }} />
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3">
          {ACHIEVEMENT_PLACES.map((id) => {
            const isFound = found.includes(id);
            return (
              <li
                key={id}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 ${isFound ? 'bg-white' : 'bg-neutral-100'}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isFound ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-400'
                  }`}
                >
                  {isFound ? <Check className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                </span>
                <span className={`text-sm ${isFound ? 'font-medium text-neutral-900' : 'text-neutral-500'}`}>
                  {isFound ? getBuilding(id)?.name : 'Not found yet'}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-8">
        <h3 className="text-sm font-medium text-neutral-500">More to find (coming soon)</h3>
        <ul className="mt-3 flex flex-wrap gap-2">
          {MORE_TO_FIND.map((area) => (
            <li key={area} className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-500">
              {area}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => onOpenSection('hobbies')}
          className="mt-4 text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
        >
          See them in About me
        </button>
      </section>
    </div>
  );
}
