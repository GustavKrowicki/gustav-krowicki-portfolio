import posthog from 'posthog-js';

function capture(event: string, properties?: Record<string, unknown>) {
  posthog?.capture?.(event, properties);
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
  method: 'click' | 'keyboard' | 'mobile_button' | 'logo_click'
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
  capture('city_exited', { duration_seconds: durationSeconds, mode, buildings_visited_count: buildingsVisitedCount });
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

// Classic events
export function trackProjectCardClicked(projectSlug: string, page: 'home' | 'work') {
  capture('project_card_clicked', { project_slug: projectSlug, page });
}

export function trackContactClicked(method: 'email' | 'phone' | 'linkedin') {
  capture('contact_clicked', { method });
}

export function trackCvDownloaded(source: 'header' | 'contact' | 'mobile_nav') {
  capture('cv_downloaded', { source });
}

// Cross-cutting
export function trackModeSwitched(from: 'classic' | 'city', to: 'classic' | 'city') {
  capture('mode_switched', { from, to });
}
