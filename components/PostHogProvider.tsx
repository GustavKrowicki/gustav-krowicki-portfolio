'use client';

import posthog from 'posthog-js';
import { PostHogProvider as PHProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
    if (key) {
      posthog.init(key, {
        api_host: host || 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        // 'history_change' also captures client-side (App Router) navigations;
        // `true` only fires on the first hard page load.
        capture_pageview: 'history_change',
        capture_pageleave: true,
        session_recording: {
          // Record the Phaser WebGL canvas so /city replays show the game
          // (character, camera) instead of a blank element. fps/quality are
          // left to remote defaults (4fps, 0.4).
          captureCanvas: {
            recordCanvas: true,
          },
        },
      });
      (window as any).posthog = posthog;

      const params = new URLSearchParams(window.location.search);
      const identifyAs = params.get('identify');
      if (identifyAs) {
        posthog.identify(identifyAs, { is_internal: true });
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
