import posthog, { type CaptureOptions } from 'posthog-js';

function capture(event: string, properties?: Record<string, unknown>, options?: CaptureOptions) {
  posthog?.capture?.(event, properties, options);
}

// City events
export function trackCityEntered(device: 'mobile' | 'desktop') {
  capture('city_entered', { device });
}

export function trackModeSelected(mode: 'explore' | 'adventure', character?: string) {
  capture('mode_selected', { mode, ...(character && { character }) });
}

export function trackBuildingInteracted(
  buildingName: string,
  mode: string,
  method: 'click' | 'keyboard' | 'mobile_button' | 'logo_click' | 'zone_entry' | 'auto_walk' | 'open_in_place'
) {
  capture('building_interacted', { building_name: buildingName, mode, method });
}

export function trackProjectOpened(projectSlug: string, source: 'city') {
  capture('project_opened', { project_slug: projectSlug, source });
}

export function trackCityExited(durationSeconds: number, mode: string, buildingsVisitedCount: number) {
  // Sent immediately rather than batched, so it still arrives when fired from pagehide (tab close)
  capture(
    'city_exited',
    { duration_seconds: durationSeconds, mode, buildings_visited_count: buildingsVisitedCount },
    { send_instantly: true }
  );
}

export function trackContactClicked(method: 'email' | 'phone' | 'linkedin') {
  capture('contact_clicked', { method });
}

export function trackCvDownloaded(source: 'contact' | 'panel' | 'note') {
  capture('cv_downloaded', { source });
}

// "Open PDF" on the CV (opens the browser's own PDF viewer)
export function trackPdfOpened(document: 'cv') {
  capture('pdf_opened', { document });
}

// Cross-cutting
export function trackModeSwitched(from: 'classic' | 'city', to: 'classic' | 'city') {
  capture('mode_switched', { from, to });
}

export function trackSpotifyInteracted(
  action: 'play' | 'pause' | 'next' | 'prev' | 'embed_click',
  source: 'city_player' | 'about_playlist_1' | 'about_playlist_2',
  trackName?: string
) {
  capture('spotify_interacted', { action, source, track_name: trackName });
}

// Walk-in beat cards: a button on a card (e.g. the food truck hatch: "eat" or "book")
export function trackBeatChoice(buildingId: string, beat: string, choice: string) {
  capture('beat_choice', { building_id: buildingId, beat, choice });
}

// Finds (lib/achievements.ts): one event per new find, with how many this browser has found so far
export function trackFind(findId: string, group: string, foundCount: number) {
  capture('find_made', { find_id: findId, group, found_count: foundCount });
}

export function trackAchievementsOpened(foundCount: number) {
  capture('achievements_opened', { found_count: foundCount });
}
