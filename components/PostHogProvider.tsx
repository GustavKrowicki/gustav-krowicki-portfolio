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
          // (character, camera) instead of a blank element. The remote
          // defaults (4fps, 0.4) made a 16-min city visit ~2 GB, too large
          // for the replay player and Replay Vision; 1fps at 0.2 keeps
          // typical visits playable. DOM, clicks and cursor are unaffected.
          captureCanvas: {
            recordCanvas: true,
            canvasFps: 1,
            canvasQuality: '0.2',
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
