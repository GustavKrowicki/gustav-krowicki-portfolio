import { ArrowLeft, CircleX, Maximize2, Minimize2 } from 'lucide-react';
import { SECTIONS, SectionContent, type SectionId } from './sections';

export type PanelState = 'open' | 'expanded' | 'closed';

interface ShellPanelProps {
  section: SectionId;
  state: PanelState;
  openCase: string | null;
  onOpenCase: (slug: string) => void;
  onCloseCase: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
}

// Phones: a sheet above the tab bar (55% of the screen, 85% expanded). Desktop: the column right of the rail.
const HEIGHT_ON_PHONE: Record<PanelState, string> = {
  open: 'h-[55dvh]',
  expanded: 'h-[85dvh]',
  closed: 'h-0',
};

export default function ShellPanel({
  section,
  state,
  openCase,
  onOpenCase,
  onCloseCase,
  onToggleExpand,
  onClose,
}: ShellPanelProps) {
  const isClosed = state === 'closed';
  const isExpanded = state === 'expanded';
  const sectionLabel = SECTIONS.find(({ id }) => id === section)?.label;

  return (
    <section
      aria-label="Portfolio panel"
      data-testid="shell-panel"
      inert={isClosed}
      className={`flex min-h-0 min-w-0 flex-col overflow-hidden transition-[height] duration-200 md:h-full md:flex-1 md:transition-none ${
        HEIGHT_ON_PHONE[state]
      } ${isClosed ? 'md:invisible' : ''}`}
    >
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200 px-6">
        {openCase ? (
          <button
            type="button"
            onClick={onCloseCase}
            aria-label={`Back to ${sectionLabel}`}
            className="flex items-center gap-2 font-medium text-neutral-900 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
            {sectionLabel}
          </button>
        ) : (
          <span className="font-semibold text-neutral-900">Gustav Krowicki</span>
        )}
        <div className="flex items-center gap-3 text-neutral-600">
          <button
            type="button"
            onClick={onToggleExpand}
            aria-label={isExpanded ? 'Shrink panel' : 'Expand panel'}
            className="hover:text-neutral-900"
          >
            {isExpanded ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
          </button>
          <button type="button" onClick={onClose} aria-label="Close panel" className="hover:text-neutral-900">
            <CircleX className="h-5 w-5" />
          </button>
        </div>
      </header>
      {/* Keyed by what it shows, so a new section or case starts scrolled to the top. */}
      <div
        key={openCase ?? section}
        className={`min-h-0 flex-1 overflow-y-auto ${openCase ? 'bg-background' : ''}`}
        data-testid="shell-panel-content"
      >
        <SectionContent id={section} openCase={openCase} onOpenCase={onOpenCase} />
      </div>
    </section>
  );
}
