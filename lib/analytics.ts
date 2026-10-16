import posthog, { type CaptureOptions } from 'posthog-js';

function capture(event: string, properties?: Record<string, unknown>, options?: CaptureOptions) {
  posthog?.capture?.(event, properties, options);
}

// City events
export function trackCityEntered(device: 'mobile' | 'desktop') {
  capture('city_entered', { device });
}

export function trackModeSelected(mode: 'tour' | 'explore' | 'adventure', character?: string) {
  capture('mode_selected', { mode, ...(character && { character }) });
}

export function trackBuildingInteracted(
  buildingName: string,
  mode: string,
  method: 'click' | 'keyboard' | 'mobile_button' | 'logo_click' | 'zone_entry' | 'auto_walk'
) {
  capture('building_interacted', { building_name: buildingName, mode, method });
}

export function trackProjectOpened(projectSlug: string, source: 'city') {
  capture('project_opened', { project_slug: projectSlug, source });
}

export function trackAdventureCompleted(durationSeconds: number, buildingsVisitedCount: number) {
  capture('adventure_completed', { duration_seconds: durationSeconds, buildings_visited_count: buildingsVisitedCount });
}

export function trackAdventureExited(durationSeconds: number, buildingsVisitedCount: number) {
  capture('adventure_exited', { duration_seconds: durationSeconds, buildings_visited_count: buildingsVisitedCount });
}

export function trackCityExited(durationSeconds: number, mode: string, buildingsVisitedCount: number) {
  // Sent immediately rather than batched, so it still arrives when fired from pagehide (tab close)
  capture(
    'city_exited',
    { duration_seconds: durationSeconds, mode, buildings_visited_count: buildingsVisitedCount },
    { send_instantly: true }
  );
}

export function trackTourStopViewed(stopTitle: string, stopIndex: number) {
  capture('tour_stop_viewed', { stop_title: stopTitle, stop_index: stopIndex });
}

export function trackTourCompleted(durationSeconds: number) {
  capture('tour_completed', { duration_seconds: durationSeconds });
}

export function trackTourExited(durationSeconds: number, stopsViewedCount: number) {
  capture('tour_exited', { duration_seconds: durationSeconds, stops_viewed_count: stopsViewedCount });
}

export function trackContactClicked(method: 'email' | 'phone' | 'linkedin') {
  capture('contact_clicked', { method });
}

export function trackCvDownloaded(source: 'contact' | 'panel') {
  capture('cv_downloaded', { source });
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
