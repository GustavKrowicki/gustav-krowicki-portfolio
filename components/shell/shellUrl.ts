import { CASES } from '@/components/cases';
import { SECTIONS, type SectionId } from './sections';

// The open section and case live in the query string (?s=work&case=lego), so a link or a reload opens the same view.
// The site is a static export, so this is client-side state only: the server always serves the same page.
export interface ShellView {
  section: SectionId;
  openCase: string | null;
}

const SECTION_IDS = new Set<string>(SECTIONS.map(({ id }) => id));

// Unknown values fall back: a bad section to Home, a bad case to no case. A case without a section belongs to Work.
export function readView(search: string): ShellView {
  const params = new URLSearchParams(search);
  const caseParam = params.get('case');
  const openCase = caseParam && caseParam in CASES ? caseParam : null;
  const sectionParam = params.get('s');
  const section = sectionParam && SECTION_IDS.has(sectionParam) ? (sectionParam as SectionId) : openCase ? 'work' : 'home';
  return { section, openCase };
}

// Home without a case is the plain page URL. Other params on the URL (UTM tags from applications) are kept.
export function viewToSearch({ section, openCase }: ShellView, currentSearch: string): string {
  const params = new URLSearchParams(currentSearch);
  params.delete('s');
  params.delete('case');
  if (section !== 'home' || openCase) params.set('s', section);
  if (openCase) params.set('case', openCase);
  const query = params.toString();
  return query ? `?${query}` : '';
}
