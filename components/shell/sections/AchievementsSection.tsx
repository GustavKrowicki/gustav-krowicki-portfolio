'use client';

import { useEffect, useRef } from 'react';
import { FIND_GROUPS, FINDS, VISIT_STARTED_AT, useFound, type Find } from '@/lib/achievements';
import { trackAchievementsOpened } from '@/lib/analytics';
import type { SectionId } from '../sections';

// What the visitor found in the city (POR-21). A plain page: found tiles say what they show about Gustav, grey tiles
// say where the rest hide, and secrets stay a question mark until found. Progress stays in this browser.
export default function AchievementsSection({ onOpenSection }: { onOpenSection: (id: SectionId) => void }) {
  const found = useFound();
  const count = FINDS.filter((find) => found[find.id] !== undefined).length;
  const total = FINDS.length;

  // Once per opening of the section, with the count it opened at
  const openedAt = useRef(count);
  useEffect(() => trackAchievementsOpened(openedAt.current), []);

  return (
    <div className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">What you found</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {count === 0
          ? 'Small things are hidden in the city: rooms, places and a few secrets. Walk around to find them.'
          : count === total
            ? `You found all ${total}. Thank you for looking this closely.`
            : `You found ${count} of ${total}. The grey ones are still hidden in the city.`}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-neutral-200">
        <div
          className="h-full bg-neutral-900 transition-[width]"
          style={{ width: `${(count / total) * 100}%` }}
          data-testid="finds-count"
          data-count={count}
        />
      </div>

      {FIND_GROUPS.map((group) => {
        const finds = FINDS.filter((find) => find.group === group.id);
        const groupFound = finds.filter((find) => found[find.id] !== undefined).length;
        return (
          <section key={group.id} className="mt-8">
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-medium text-neutral-500">{group.label}</h3>
              <span className="text-sm text-neutral-500">
                {groupFound} of {finds.length}
              </span>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {finds
                .filter((find) => found[find.id] !== undefined)
                .map((find) => (
                  <li key={find.id} className="rounded-lg border border-neutral-200 bg-white px-4 py-3" data-testid="find-tile">
                    <p className="font-medium text-neutral-900">{find.title}</p>
                    <p className="mt-1 text-sm leading-relaxed text-neutral-700">{find.about}</p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {find.how}
                      {found[find.id] < VISIT_STARTED_AT ? ' during an earlier visit.' : '.'}
                    </p>
                  </li>
                ))}
              {/* What is still hidden: one grey row per place, so the list stays short on a phone */}
              {hiddenRows(finds.filter((find) => found[find.id] === undefined)).map((row) => (
                <li key={row} className="rounded-lg bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
                  {row}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <button
        type="button"
        onClick={() => onOpenSection('hobbies')}
        className="mt-8 text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
      >
        More about me
      </button>
    </div>
  );
}

// "2 hidden at LEGO HQ", "1 hidden at the stadium"; secrets say only how many are left
function hiddenRows(hidden: Find[]): string[] {
  const counts = new Map<string, number>();
  for (const find of hidden) {
    const key = find.where ?? '';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts].map(([where, n]) =>
    where ? `${n} hidden at ${where}` : `${n} ${n === 1 ? 'secret' : 'secrets'} still hidden`
  );
}
