"use client";

import { useState, useRef, useEffect, useCallback } from "react";

export const NORTHSIDE_PLAYLIST_URL = "https://open.spotify.com/playlist/3EauLdytT4srscIeLfXD2H?si=613af6771c324e08";
const PLAYLIST_URI = "spotify:playlist:3EauLdytT4srscIeLfXD2H";

const TRACKS = [
  { name: "Shutdown", artist: "Skepta", uri: "spotify:track:44GokgCa37BTZP2NU2zkoJ" },
  { name: "London", artist: "Skepta, Fred again..", uri: "spotify:track:1JBO94PcFFU28q3ApaONq0" },
  { name: "Seven Nation Army", artist: "The White Stripes", uri: "spotify:track:3dPQuX8Gs42Y7b454ybpMR" },
  { name: "Baxter (these are my friends)", artist: "Fred again.., Baxter Dury", uri: "spotify:track:6Orwi1oYLckpnBF7NbCbrg" },
  { name: "Cocaine Man", artist: "Baxter Dury", uri: "spotify:track:4IIW93KNqv3L5VILol1S7u" },
  { name: "We Are The People", artist: "Empire Of The Sun", uri: "spotify:track:3zEN0ii6s4DHHBpnTp3RP7" },
  { name: "Voodoo", artist: "Tinlicker, Ben Böhmer", uri: "spotify:track:5cGBQ9W3XtRuRQFgDklDrI" },
  { name: "Walking On A Dream", artist: "Empire Of The Sun", uri: "spotify:track:5r5cp9IpziiIsR6b93vcnQ" },
  { name: "Hymn", artist: "Charlotte de Witte", uri: "spotify:track:2OkW1IqUtKuy8EX11KAkDZ" },
  { name: "Følsom dreng", artist: "Blaue Blume", uri: "spotify:track:7AwvJjfVR2xSJkclCMBOHy" },
  { name: "(It Goes Like) Nanana", artist: "Peggy Gou", uri: "spotify:track:1BktkzhQ6rhP1jTREtUdPK" },
  { name: "Can't Play Myself", artist: "Skepta, Amy Winehouse", uri: "spotify:track:6GrLwf1LdBCmkBOsmOcbPp" },
  { name: "Greaze Mode", artist: "Skepta, Nafe Smallz", uri: "spotify:track:3nG784YlxS4VQOF0qiHKVP" },
  { name: "Gas Me Up (Diligent)", artist: "Skepta", uri: "spotify:track:18cocM7GNYj2Scj1ePOJYc" },
];

interface SpotifyPlayerProps {
  playlistUrl: string;
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (IFrameAPI: any) => void;
  }
}

export default function SpotifyPlayer({ playlistUrl }: SpotifyPlayerProps) {
  const [isPaused, setIsPaused] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentUri, setCurrentUri] = useState(TRACKS[0].uri);
  const [ready, setReady] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const embedRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<any>(null);

  const currentTrack = TRACKS.find((t) => t.uri === currentUri);
  const currentIndex = TRACKS.findIndex((t) => t.uri === currentUri);

  // Load the iFrame API script
  useEffect(() => {
    if (document.querySelector('script[src*="spotify-iframe-api"]')) {
      setScriptLoaded(true);
      return;
    }
    const existing = document.querySelector(
      'script[src="https://open.spotify.com/embed/iframe-api/v1"]'
    );
    if (existing) {
      setScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);
  }, []);

  // Create the controller once script is loaded and container is mounted
  useEffect(() => {
    if (!scriptLoaded || !embedRef.current || controllerRef.current) return;

    const initController = (IFrameAPI: any) => {
      if (controllerRef.current) return;
      IFrameAPI.createController(
        embedRef.current,
        {
          uri: PLAYLIST_URI,
          width: "100%",
          height: 80,
          theme: "dark",
        },
        (controller: any) => {
          controllerRef.current = controller;
          setReady(true);

          controller.addListener("playback_update", (e: any) => {
            setIsPaused(e.data.isPaused);
            setPosition(e.data.position);
            setDuration(e.data.duration);
            if (e.data.playingURI) {
              setCurrentUri(e.data.playingURI);
            }
          });
        }
      );
    };

    // If the API is already available (e.g. remount after first load), use it directly
    if ((window as any).SpotifyIframeApi) {
      initController((window as any).SpotifyIframeApi);
      return;
    }

    // Otherwise wait for the API callback
    const prevCallback = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (IFrameAPI: any) => {
      prevCallback?.(IFrameAPI);
      initController(IFrameAPI);
    };
  }, [scriptLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controllerRef.current) {
        controllerRef.current.destroy();
        controllerRef.current = null;
      }
    };
  }, []);

  const togglePlay = useCallback(() => {
    controllerRef.current?.togglePlay();
  }, []);

  const nextTrack = useCallback(() => {
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    setCurrentUri(TRACKS[nextIndex].uri);
    controllerRef.current?.loadUri(TRACKS[nextIndex].uri);
  }, [currentIndex]);

  const prevTrack = useCallback(() => {
    const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
    setCurrentUri(TRACKS[prevIndex].uri);
    controllerRef.current?.loadUri(TRACKS[prevIndex].uri);
  }, [currentIndex]);

  const progress = duration > 0 ? position / duration : 0;

  return (
    <div className="border-[3px] border-[#14181b] bg-[#504d42] p-3">
      {/* Track info */}
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#b7ae96]">
          Now Playing
        </span>
        {currentIndex >= 0 && (
          <span className="font-mono text-[9px] text-[#b7ae96]">
            {currentIndex + 1}/{TRACKS.length}
          </span>
        )}
      </div>

      <div className="mb-2">
        <p className="truncate font-mono text-sm uppercase tracking-[0.08em] text-[#f5ecd2]">
          {currentTrack?.name || "Select a track"}
        </p>
        <p className="truncate font-mono text-[11px] uppercase tracking-[0.08em] text-[#b7ae96]">
          {currentTrack?.artist || "\u00A0"}
        </p>
      </div>

      {/* Spotify embed (hidden but functional) */}
      <div className="absolute h-0 w-0 overflow-hidden">
        <div ref={embedRef} />
      </div>

      {/* Progress bar */}
      <div className="mb-3 h-[6px] border-[2px] border-[#14181b] bg-[#2f2c25]">
        <div
          className="h-full bg-[#d78432] transition-[width] duration-200"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        <button
          onClick={prevTrack}
          className="flex h-8 w-8 items-center justify-center border-[2px] border-[#14181b] bg-[#3f3b31] font-mono text-[#f5ecd2] shadow-[inset_0_-2px_0_#27241d] transition-transform duration-100 active:translate-y-px disabled:opacity-50"
          aria-label="Previous track"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <rect x="0" y="1" width="2" height="8" />
            <polygon points="10,1 10,9 3,5" />
          </svg>
        </button>

        <button
          onClick={togglePlay}
          disabled={!ready}
          className="flex h-8 w-8 items-center justify-center border-[2px] border-[#14181b] bg-[#d78432] text-[#21160a] shadow-[inset_0_-2px_0_#8a4717] transition-transform duration-100 active:translate-y-px disabled:opacity-50"
          aria-label={isPaused ? "Play" : "Pause"}
        >
          {isPaused ? (
            <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
              <polygon points="0,0 8,5 0,10" />
            </svg>
          ) : (
            <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
              <rect x="0" y="0" width="3" height="10" />
              <rect x="5" y="0" width="3" height="10" />
            </svg>
          )}
        </button>

        <button
          onClick={nextTrack}
          className="flex h-8 w-8 items-center justify-center border-[2px] border-[#14181b] bg-[#3f3b31] font-mono text-[#f5ecd2] shadow-[inset_0_-2px_0_#27241d] transition-transform duration-100 active:translate-y-px disabled:opacity-50"
          aria-label="Next track"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
            <polygon points="0,1 0,9 7,5" />
            <rect x="8" y="1" width="2" height="8" />
          </svg>
        </button>

        <div className="flex-1" />

        <a
          href={playlistUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 border-[2px] border-[#14181b] bg-[#1DB954] px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#0a1f10] shadow-[inset_0_-2px_0_#148a3d] transition-transform duration-100 active:translate-y-px"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Spotify
        </a>
      </div>
    </div>
  );
}
