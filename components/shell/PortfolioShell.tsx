'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import initialGrid from '@/lib/city/cityGrid.json';
import type { GridCell } from '@/components/city/pogicity/types';
import ShellRail from './ShellRail';
import ShellPanel, { SLOT_MOTION_DESKTOP, type PanelState } from './ShellPanel';
import type { SectionId } from './sections';
import { readView, viewToSearch, type ShellView } from './shellUrl';
import { AVATAR_WALK_EVENT } from '@/lib/city/models/avatarPieces';
import { FIND_OPEN_EVENT, FIND_WALK_EVENT } from '@/lib/achievements';
import { PLACE_WALK_IN_EVENT } from '@/lib/popupMode';
import { getPlace } from '@/lib/city/places';

// Phaser needs the browser, so the city loads on the client only.
const CityViewer = dynamic(() => import('@/components/city/CityViewer'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-[#73645F]" />,
});

// Desktop width of the rail + panel column. The city takes the rest of the row and rescales when this changes.
const WIDTH_ON_DESKTOP: Record<PanelState, string> = {
  peek: 'md:w-[440px]',
  open: 'md:w-[440px]',
  expanded: 'md:w-[min(760px,60vw)]',
  closed: 'md:w-[72px]',
};

// Sections that open at reading width, like a case (the CV pages need the room).
const READING_SECTIONS: SectionId[] = ['cv'];

const isPhoneWidth = () => !window.matchMedia('(min-width: 768px)').matches;

// One-page portfolio: the panel (rail + content) beside the live city. Phones stack the city above a bottom sheet.
// One slot (Figma board F): a building tapped in the city opens its place in the same panel, a case opens over
// the place, and Back goes one step: case, place, section.
export default function PortfolioShell() {
  // ?e2e=1 exposes the city's test API (window.__CITY_E2E__); CityViewer renders on the client only
  const [e2eMode] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1');
  const [section, setSection] = useState<SectionId>('home');
  const [panel, setPanel] = useState<PanelState>('open');
  // A case study opens over the section it came from and widens the panel for reading.
  const [openCase, setOpenCase] = useState<string | null>(null);
  // The building opened from the city, and the panel's state before it opened (restored on close)
  const [openPlace, setOpenPlace] = useState<string | null>(null);
  const panelBeforePlace = useRef<PanelState | null>(null);
  const place = openPlace ? getPlace(openPlace) : null;

  // Restore the view from the URL on load, and again when the browser goes back or forward.
  useEffect(() => {
    const applyUrl = () => {
      const view = readView(window.location.search);
      setSection(view.section);
      setOpenCase(view.openCase);
      setOpenPlace(view.openPlace ?? null);
      setPanel((current) =>
        view.openCase || READING_SECTIONS.includes(view.section)
          ? 'expanded'
          : isPhoneWidth() && (view.openPlace || view.section === 'home')
            ? current === 'closed' && !view.openPlace ? 'closed' : 'peek'
            : current === 'expanded' || current === 'peek'
              ? 'open'
              : current
      );
    };
    applyUrl();
    window.addEventListener('popstate', applyUrl);
    return () => window.removeEventListener('popstate', applyUrl);
  }, []);

  // Each step a visitor takes (section, case, Back) becomes a browser history entry.
  const pushView = useCallback((view: ShellView) => {
    const search = viewToSearch(view, window.location.search);
    if (search === window.location.search) return;
    window.history.pushState(null, '', `${window.location.pathname}${search}${window.location.hash}`);
  }, []);

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

  const openCaseStudy = useCallback(
    (slug: string, from: SectionId = section) => {
      setOpenCase(slug);
      setPanel('expanded');
      pushView({ section: from, openCase: slug, openPlace });
    },
    [section, openPlace, pushView]
  );

  // Leaving a case returns the panel from reading width to its normal width.
  const closeCaseStudy = useCallback(() => {
    setOpenCase(null);
    setPanel((current) => (current === 'expanded' ? 'open' : current));
    pushView({ section, openCase: null, openPlace });
  }, [section, openPlace, pushView]);

  // A building tapped in the city opens its place in the panel (phones: the short sheet). It replaces a
  // place or case that was open; closing it puts the panel back as it was.
  const openPlaceFromCity = useCallback(
    (buildingId: string) => {
      if (!getPlace(buildingId)) return;
      if (!openPlace && !openCase) panelBeforePlace.current = panel;
      setOpenCase(null);
      setOpenPlace(buildingId);
      setPanel(isPhoneWidth() ? 'peek' : 'open');
      pushView({ section, openCase: null, openPlace: buildingId });
    },
    [openPlace, openCase, panel, section, pushView]
  );

  const closePlace = useCallback(
    (restore = true) => {
      if (!openPlace) return;
      const before = panelBeforePlace.current;
      panelBeforePlace.current = null;
      setOpenPlace(null);
      setOpenCase(null);
      if (restore) setPanel(before === 'expanded' ? 'open' : before ?? (isPhoneWidth() ? 'peek' : 'open'));
      pushView({ section, openCase: null, openPlace: null });
    },
    [openPlace, section, pushView]
  );

  // Esc goes one step back, as Back does
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openCase) closeCaseStudy();
      else if (openPlace) closePlace();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCase, openPlace, closeCaseStudy, closePlace]);

  // Phones: the grabber grows the sheet a step (short, half, full) or shrinks it; below short, a place
  // closes, and Home closes the sheet
  const growPanel = useCallback(
    () => setPanel((current) => (current === 'closed' ? 'peek' : current === 'peek' ? 'open' : 'expanded')),
    []
  );
  const shrinkPanel = useCallback(() => {
    if (panel === 'expanded') return setPanel('open');
    if (panel === 'open') return setPanel('peek');
    if (openPlace) return closePlace();
    setPanel('closed');
  }, [panel, openPlace, closePlace]);

  const openSection = useCallback(
    (id: SectionId) => {
      // Leaving a case or a reading section returns the panel from reading width to its normal width.
      const leavingReadingWidth = openCase !== null || READING_SECTIONS.includes(section);
      if (openCase) setOpenCase(null);
      if (openPlace) setOpenPlace(null);
      panelBeforePlace.current = null;
      setSection(id);
      setPanel((current) => {
        if (READING_SECTIONS.includes(id)) return 'expanded';
        if (current === 'closed' || current === 'peek' || (current === 'expanded' && leavingReadingWidth)) return 'open';
        return current;
      });
      pushView({ section: id, openCase: null });
    },
    [openCase, openPlace, section, pushView]
  );

  // The Avatar tab's "Walk the city" button: close the panel so the city (and the joystick) take over.
  useEffect(() => {
    const onWalk = () => setPanel('closed');
    window.addEventListener(AVATAR_WALK_EVENT, onWalk);
    return () => window.removeEventListener(AVATAR_WALK_EVENT, onWalk);
  }, []);

  // A find's "Walk there": on a phone the panel covers the city, so it closes; on desktop the city is beside it.
  useEffect(() => {
    const onFindWalk = () => {
      if (!isPhoneWidth()) return;
      // a place's own Walk there leaves the place; it opens again when the avatar arrives
      if (openPlace) closePlace(false);
      setPanel('closed');
    };
    window.addEventListener(FIND_WALK_EVENT, onFindWalk);
    return () => window.removeEventListener(FIND_WALK_EVENT, onFindWalk);
  }, [openPlace, closePlace]);

  // The find pill in the city (phones) opens that find's page in the Achievements tab
  useEffect(() => {
    const onFindOpen = () => openSection('achievements');
    window.addEventListener(FIND_OPEN_EVENT, onFindOpen);
    return () => window.removeEventListener(FIND_OPEN_EVENT, onFindOpen);
  }, [openSection]);

  // Phones: a place opened in the city takes the sheet's spot (CityViewer onPlaceOpen)
  const closePanelForPlace = useCallback(() => setPanel('closed'), []);

  // A project building in the city opens its case, with Back leading to Work.
  const handleProjectClick = useCallback(
    (slug: string) => {
      setSection('work');
      openCaseStudy(slug, 'work');
    },
    [openCaseStudy]
  );

  return (
    <div className="fixed inset-0 flex flex-col bg-[#73645F] md:flex-row" data-testid="shell-root">
      <aside
        className={`order-2 flex shrink-0 flex-col-reverse overflow-hidden bg-[#FDFDFD] md:order-1 md:h-full md:flex-row md:transition-[width] ${SLOT_MOTION_DESKTOP} ${WIDTH_ON_DESKTOP[panel]}`}
      >
        <ShellRail active={panel === 'closed' ? null : section} onSelect={openSection} />
        <ShellPanel
          section={section}
          state={panel}
          openCase={openCase}
          place={place}
          onOpenCase={openCaseStudy}
          onOpenSection={openSection}
          onCloseCase={closeCaseStudy}
          onClosePlace={() => closePlace()}
          onWalkIn={() => window.dispatchEvent(new CustomEvent(PLACE_WALK_IN_EVENT))}
          onGrow={growPanel}
          onShrink={shrinkPanel}
          onToggleExpand={() => setPanel((current) => (current === 'expanded' ? 'open' : 'expanded'))}
          onClose={() => {
            closePlace(false);
            setPanel('closed');
          }}
        />
      </aside>
      <div className="relative order-1 min-h-0 min-w-0 flex-1 overflow-hidden md:order-2">
        <CityViewer
          initialGrid={initialGrid as GridCell[][]}
          onProjectClick={handleProjectClick}
          variant="shell"
          avatarTabOpen={panel !== 'closed' && section === 'avatar' && !openCase}
          panelOpen={panel !== 'closed'}
          onPlaceOpen={closePanelForPlace}
          popups="slot"
          openPlace={openPlace}
          onOpenPlace={openPlaceFromCity}
          onClosePlace={() => closePlace()}
          e2eMode={e2eMode}
        />
      </div>
    </div>
  );
}
