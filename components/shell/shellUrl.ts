import { CASES } from '@/components/cases';
import { getPlace } from '@/lib/city/places';
import { SECTIONS, type SectionId } from './sections';

// The open section, place and case live in the query string (?s=work&place=valtech-office&case=valtech), so a link or
// a reload opens the same view. The site is a static export, so this is client-side state only: the server always
// serves the same page. A place is a building opened from the city.
export interface ShellView {
  section: SectionId;
  openCase: string | null;
  openPlace?: string | null;
}

const SECTION_IDS = new Set<string>(SECTIONS.map(({ id }) => id));

// Unknown values fall back: a bad section to Home, a bad case or place to none. A case without a section belongs to Work.
export function readView(search: string): ShellView {
  const params = new URLSearchParams(search);
  const caseParam = params.get('case');
  const openCase = caseParam && caseParam in CASES ? caseParam : null;
  const placeParam = params.get('place');
  const openPlace = placeParam && getPlace(placeParam) ? placeParam : null;
  const sectionParam = params.get('s');
  const section =
    sectionParam && SECTION_IDS.has(sectionParam) ? (sectionParam as SectionId) : openCase && !openPlace ? 'work' : 'home';
  return { section, openCase, openPlace };
}

// Home without a case or place is the plain page URL. Other params on the URL (UTM tags from applications) are kept.
export function viewToSearch({ section, openCase, openPlace = null }: ShellView, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('s');
  params.delete('place');
  params.delete('case');
  if (section !== 'home' || (openCase && !openPlace)) params.set('s', section);
  if (openPlace) params.set('place', openPlace);
  if (openCase) params.set('case', openCase);
  const query = params.toString();
  return query ? `?${query}` : '';
}
