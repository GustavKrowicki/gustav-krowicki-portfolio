import { getBuilding } from './buildings';
import { INTERIOR_BEATS } from './interiorBeats';
import { TOUR_STOPS } from './tourStops';
import { getProjectBySlug } from '../projects';

// A place: what the slot shows for a building tapped in the city (?popups=slot). Built from the texts that exist
// today: the walk-in cards (lib/city/interiorBeats.ts), the old tour dialog (lib/city/tourStops.ts) and the projects.
export interface Place {
  buildingId: string;
  title: string;
  /** The one line under the title */
  lead: string;
  /** More words, on the place page */
  text?: string;
  logoUrl?: string;
  /** The case's cover, when the building has a case: the card leads with it */
  coverImage?: string;
  caseSlug?: string;
  /** A walk-in building: Walk in goes through its door */
  walkIn: boolean;
  /** Extra content the old dialog had for this place */
  extra?: 'playlist' | 'books';
}

export function getPlace(buildingId: string): Place | null {
  const building = getBuilding(buildingId);
  if (!building) return null;
  const beats = INTERIOR_BEATS[buildingId];
  const stop = TOUR_STOPS.find((s) => s.buildingId === buildingId);
  const project = building.projectSlug ? getProjectBySlug(building.projectSlug) : undefined;
  if (!beats && !stop && !project) return null;

  const base = {
    buildingId,
    logoUrl: building.logoUrl,
    coverImage: project?.coverImage,
    caseSlug: project?.slug,
    walkIn: !!beats,
    extra: buildingId === 'northside-stage' ? 'playlist' : buildingId === 'dokk1-library' ? 'books' : undefined,
  } as const;
  if (beats) {
    return {
      ...base,
      title: beats.enter?.kicker ?? building.name,
      lead: beats.leave?.lead ?? beats.enter?.lead ?? '',
      text: beats.enter?.lead,
    };
  }
  if (project) return { ...base, title: project.title, lead: project.shortDescription };
  return { ...base, title: stop!.title, lead: stop!.dialogue.trim() };
}
