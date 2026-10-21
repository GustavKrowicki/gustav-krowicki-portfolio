'use client';

import { useEffect, useRef, useState } from 'react';
import {
  FIND_GROUPS,
  FINDS,
  FIND_WALK_EVENT,
  VISIT_STARTED_AT,
  findHiddenImage,
  findWalkTarget,
  findImage,
  getFind,
  useFound,
  type Find,
} from '@/lib/achievements';
import { trackAchievementsOpened } from '@/lib/analytics';
import type { SectionId } from '../sections';

// What the visitor found in the city (POR-21). A plain page of small picture tiles: a found tile shows its crop of the
// city and its title, a hidden tile shows the same crop as a dark mosaic with a question mark. Tap a tile to read it.
// Progress stays in this browser.
export default function AchievementsSection({ onOpenSection }: { onOpenSection: (id: SectionId) => void }) {
  const found = useFound();
  const count = FINDS.filter((find) => found[find.id] !== undefined).length;
  const total = FINDS.length;
  const [openId, setOpenId] = useState<string | null>(null);
  const top = useRef<HTMLDivElement>(null);

  // Once per opening of the section, with the count it opened at
  const openedAt = useRef(count);
  useEffect(() => trackAchievementsOpened(openedAt.current), []);

  // The panel scrolls, so a tile far down opens its detail at the top
  useEffect(() => top.current?.scrollIntoView({ block: 'start' }), [openId]);

  const open = openId ? getFind(openId) : undefined;
  if (open) {
    return (
      <div ref={top} className="px-6 py-6">
        <FindDetail find={open} foundAt={found[open.id]} onBack={() => setOpenId(null)} />
      </div>
    );
  }

  return (
    <div ref={top} className="px-6 py-6">
      <h2 className="text-2xl font-semibold text-neutral-900">What you found</h2>
      <p className="mt-3 text-sm leading-relaxed text-neutral-600">
        {count === 0
          ? 'Small things are hidden in the city: rooms, places and a few secrets. Walk around to find them.'
          : count === total
            ? `You found all ${total}. Thank you for looking this closely.`
            : `You found ${count} of ${total}. The dark ones are still hidden in the city.`}
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
              <h3 className="text-sm font-medium text-neutral-900">{group.label}</h3>
              <span className="font-mono text-xs text-neutral-500">
                {groupFound}/{finds.length}
              </span>
            </div>
            {/* Found ones first, so a phone shows the progress without scrolling */}
            <ul className="mt-3 grid grid-cols-3 gap-x-2 gap-y-4">
              {[...finds]
                .sort((a, b) => Number(found[b.id] !== undefined) - Number(found[a.id] !== undefined))
                .map((find) => (
                  <li key={find.id}>
                    <FindTile find={find} isFound={found[find.id] !== undefined} onOpen={() => setOpenId(find.id)} />
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

function FindTile({ find, isFound, onOpen }: { find: Find; isFound: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block w-full text-left"
      data-testid={isFound ? 'find-tile' : 'find-hidden'}
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-lg bg-neutral-800">
        {isFound ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={findImage(find)}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={findHiddenImage(find)}
              alt=""
              className="h-full w-full object-cover [image-rendering:pixelated]"
              style={{ filter: 'brightness(.55) saturate(.6)' }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold text-white/90">?</span>
          </>
        )}
      </div>
      <p className={`mt-1.5 truncate text-[13px] leading-4 font-medium ${isFound ? 'text-neutral-900' : 'text-neutral-400'}`}>
        {isFound ? find.title : find.where ? find.where.replace(/^the /, 'The ') : 'Secret'}
      </p>
    </button>
  );
}

function FindDetail({ find, foundAt, onBack }: { find: Find; foundAt: number | undefined; onBack: () => void }) {
  const isFound = foundAt !== undefined;
  const walkTarget = findWalkTarget(find, isFound);
  return (
    <div data-testid="find-detail">
      {/* The walk button sits up top, so a phone shows it without scrolling */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-sm font-medium text-neutral-900 underline underline-offset-4 hover:text-neutral-600"
        >
          All finds
        </button>
        {walkTarget && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent(FIND_WALK_EVENT, { detail: walkTarget }))}
            className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
            data-testid="find-walk"
          >
            {isFound ? 'Walk there' : 'Walk me close'}
          </button>
        )}
      </div>
      <div className="relative mt-4 aspect-[3/2] overflow-hidden rounded-lg bg-neutral-800">
        {isFound ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={findImage(find)} alt="" className="h-full w-full object-cover" />
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={findHiddenImage(find)}
              alt=""
              className="h-full w-full object-cover [image-rendering:pixelated]"
              style={{ filter: 'brightness(.55) saturate(.6)' }}
            />
            <span className="absolute inset-0 flex items-center justify-center text-4xl font-semibold text-white/90">?</span>
          </>
        )}
      </div>
      {isFound ? (
        <>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">{find.title}</h2>
          <p className="mt-2 leading-relaxed text-neutral-700">{find.about}</p>
          <p className="mt-2 text-sm text-neutral-500">
            {find.how}
            {foundAt < VISIT_STARTED_AT ? ' during an earlier visit.' : '.'}
          </p>
        </>
      ) : (
        <>
          <h2 className="mt-4 text-xl font-semibold text-neutral-900">Still hidden</h2>
          <p className="mt-2 leading-relaxed text-neutral-700">
            {find.where ? `Look around ${find.where}.` : 'A secret. It shows up when the moment is right.'}
          </p>
        </>
      )}
    </div>
  );
}
