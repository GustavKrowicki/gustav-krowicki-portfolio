import { useSyncExternalStore } from 'react';
import Image from 'next/image';
import { Tooltip } from '@base-ui/react/tooltip';
import { SECTIONS, type SectionId } from './sections';

interface ShellRailProps {
  active: SectionId | null;
  onSelect: (id: SectionId) => void;
}

// Tooltips only where a pointer can hover; touch screens get the label under the icon instead.
const HOVER_QUERY = '(hover: hover) and (pointer: fine)';
const subscribeHover = (onChange: () => void) => {
  const query = window.matchMedia(HOVER_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};
const useCanHover = () =>
  useSyncExternalStore(subscribeHover, () => window.matchMedia(HOVER_QUERY).matches, () => false);

// Vertical icon rail on desktop (left edge of the panel), horizontal tab bar on phones (under the sheet).
// The provider shares one delay: the first tooltip waits, its neighbours open at once (no delay, no animation).
export default function ShellRail({ active, onSelect }: ShellRailProps) {
  const canHover = useCanHover();
  return (
    <Tooltip.Provider delay={500} timeout={400}>
      <nav
        aria-label="Portfolio sections"
        className="flex shrink-0 items-start justify-around border-t border-neutral-200 px-2 pt-2 pb-1 md:w-[72px] md:flex-col md:items-center md:justify-start md:gap-5 md:border-t-0 md:border-r md:px-0 md:py-4"
      >
        {SECTIONS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          return (
            <Tooltip.Root key={id} disabled={!canHover}>
              <Tooltip.Trigger
                render={
                  <button
                    type="button"
                    onClick={() => onSelect(id)}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                    className={`group flex flex-col items-center gap-0.5 rounded-lg md:rounded-full ${id === 'home' ? 'md:mb-4' : ''}`}
                  />
                }
              >
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
                    isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 group-hover:text-neutral-900'
                  }`}
                >
                  {Icon ? (
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  ) : (
                    <Image
                      src="/images/about/me avatar.jpeg"
                      alt=""
                      width={40}
                      height={40}
                      className={`h-9 w-9 rounded-full object-cover ${isActive ? 'ring-2 ring-neutral-900' : ''}`}
                    />
                  )}
                </span>
                <span
                  aria-hidden
                  className={`text-[11px] leading-none md:hidden ${isActive ? 'text-neutral-900' : 'text-neutral-500'}`}
                >
                  {label}
                </span>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Positioner side="right" sideOffset={6} className="z-50">
                  <Tooltip.Popup className="shell-tooltip rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white shadow-sm">
                    {label}
                  </Tooltip.Popup>
                </Tooltip.Positioner>
              </Tooltip.Portal>
            </Tooltip.Root>
          );
        })}
      </nav>
    </Tooltip.Provider>
  );
}
