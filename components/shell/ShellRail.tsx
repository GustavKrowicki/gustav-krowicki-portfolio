import Image from 'next/image';
import { SECTIONS, type SectionId } from './sections';

interface ShellRailProps {
  active: SectionId | null;
  onSelect: (id: SectionId) => void;
}

// Vertical icon rail on desktop (left edge of the panel), horizontal tab bar on phones (under the sheet).
export default function ShellRail({ active, onSelect }: ShellRailProps) {
  return (
    <nav
      aria-label="Portfolio sections"
      className="flex shrink-0 items-center justify-around border-t border-neutral-200 px-2 py-2 md:w-[72px] md:flex-col md:justify-start md:gap-5 md:border-t-0 md:border-r md:px-0 md:py-4"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            aria-current={isActive ? 'page' : undefined}
            title={label}
            className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isActive ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-900'
            } ${id === 'home' ? 'md:mb-4' : ''}`}
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
          </button>
        );
      })}
    </nav>
  );
}
