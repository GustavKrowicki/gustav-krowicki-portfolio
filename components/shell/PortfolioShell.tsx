'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import initialGrid from '@/lib/city/cityGrid.json';
import type { GridCell } from '@/components/city/pogicity/types';
import ShellRail from './ShellRail';
import ShellPanel, { type PanelState } from './ShellPanel';
import type { SectionId } from './sections';

// Phaser needs the browser, so the city loads on the client only.
const CityViewer = dynamic(() => import('@/components/city/CityViewer'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#73645F]" />,
});

// Desktop width of the rail + panel column. The city takes the rest of the row and rescales when this changes.
const WIDTH_ON_DESKTOP: Record<PanelState, string> = {
  open: 'md:w-[440px]',
  expanded: 'md:w-[min(760px,60vw)]',
  closed: 'md:w-[72px]',
};

// One-page portfolio: the panel (rail + content) beside the live city. Phones stack the city above a bottom sheet.
export default function PortfolioShell() {
  const [section, setSection] = useState<SectionId>('home');
  const [panel, setPanel] = useState<PanelState>('open');
  // A case study opens over the section it came from and widens the panel for reading.
  const [openCase, setOpenCase] = useState<string | null>(null);

  // The page never scrolls; without this a trackpad swipe can trigger browser back (same fix as /city).
  useEffect(() => {
    const { documentElement: html, body } = document;
    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    html.style.overscrollBehavior = 'none';
    body.style.overscrollBehavior = 'none';
    return () => {
      html.style.overflow = '';
      body.style.overflow = '';
      html.style.overscrollBehavior = '';
      body.style.overscrollBehavior = '';
    };
  }, []);

  const openCaseStudy = useCallback((slug: string) => {
    setOpenCase(slug);
    setPanel('expanded');
  }, []);

  // Leaving a case returns the panel from reading width to its normal width.
  const closeCaseStudy = useCallback(() => {
    setOpenCase(null);
    setPanel((current) => (current === 'expanded' ? 'open' : current));
  }, []);

  const openSection = useCallback(
    (id: SectionId) => {
      if (openCase) closeCaseStudy();
      setSection(id);
      setPanel((current) => (current === 'closed' ? 'open' : current));
    },
    [openCase, closeCaseStudy]
  );

  // A project building in the city opens its case, with Back leading to Work.
  const handleProjectClick = useCallback(
    (slug: string) => {
      setSection('work');
      openCaseStudy(slug);
    },
    [openCaseStudy]
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#73645F] md:flex-row" data-testid="shell-root">
      <aside
        className={`order-2 flex shrink-0 flex-col-reverse overflow-hidden bg-[#F3F0EC] md:order-1 md:h-full md:flex-row md:transition-[width] md:duration-200 ${WIDTH_ON_DESKTOP[panel]}`}
      >
        <ShellRail active={panel === 'closed' ? null : section} onSelect={openSection} />
        <ShellPanel
          section={section}
          state={panel}
          openCase={openCase}
          onOpenCase={openCaseStudy}
          onCloseCase={closeCaseStudy}
          onToggleExpand={() => setPanel((current) => (current === 'expanded' ? 'open' : 'expanded'))}
          onClose={() => setPanel('closed')}
        />
      </aside>
      <div className="relative order-1 min-h-0 min-w-0 flex-1 md:order-2">
        <CityViewer
          initialGrid={initialGrid as GridCell[][]}
          onProjectClick={handleProjectClick}
          variant="shell"
        />
      </div>
    </div>
  );
}
