import { CircleX, Maximize2, Minimize2 } from 'lucide-react';
import { SectionContent, type SectionId } from './sections';

export type PanelState = 'open' | 'expanded' | 'closed';

interface ShellPanelProps {
  section: SectionId;
  state: PanelState;
  selectedProject: string | null;
  onToggleExpand: () => void;
  onClose: () => void;
}

// Phones: a sheet above the tab bar (55% of the screen, 85% expanded). Desktop: the column right of the rail.
const HEIGHT_ON_PHONE: Record<PanelState, string> = {
  open: 'h-[55dvh]',
  expanded: 'h-[85dvh]',
  closed: 'h-0',
};

export default function ShellPanel({ section, state, selectedProject, onToggleExpand, onClose }: ShellPanelProps) {
  const isClosed = state === 'closed';
  const isExpanded = state === 'expanded';

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
        <span className="font-semibold text-neutral-900">Gustav Krowicki</span>
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
      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
        <SectionContent id={section} selectedProject={selectedProject} />
      </div>
    </section>
  );
}
