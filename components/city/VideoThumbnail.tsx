"use client";

import { useRef, useState, useEffect } from "react";
import { BuildingVideo } from "@/lib/city/buildingVideos";
import {
  PIXEL_INSET_CLIP,
  pixelSpriteFrameClass,
} from "./pixelModalStyles";

interface VideoThumbnailProps {
  video: BuildingVideo;
  isActive: boolean;
  compact?: boolean;
}

export default function VideoThumbnail({
  video,
  isActive,
  compact = false,
}: VideoThumbnailProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!isActive && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
      setIsMuted(true);
    }
  }, [isActive]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    const vid = videoRef.current;
    if (!vid) return;

    if (isPlaying) {
      vid.pause();
      setIsPlaying(false);
    } else {
      vid.play();
      setIsPlaying(true);
    }
  };

  const handleMuteToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
  };

  return (
    <div
      className={`${pixelSpriteFrameClass} relative w-full cursor-pointer ${compact ? "h-28" : "h-40"}`}
      style={PIXEL_INSET_CLIP}
      onClick={handlePlay}
    >
      <video
        ref={videoRef}
        src={video.src}
        poster={video.poster}
        muted={isMuted}
        playsInline
        preload="none"
        onEnded={handleEnded}
        className="h-full w-full object-cover"
        aria-label={video.alt}
      />

      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
          <div className="flex h-12 w-12 items-center justify-center border-[3px] border-[#14181b] bg-[#d78432] shadow-[inset_0_-3px_0_#8a4717]">
            <svg className="ml-1 h-5 w-5" viewBox="0 0 24 24" fill="#21160a">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Mute toggle */}
      {isPlaying && (
        <button
          onClick={handleMuteToggle}
          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center border-[2px] border-[#14181b] bg-[#3f3b31] text-[#f5ecd2] transition-transform duration-100 hover:bg-[#4a463a] active:translate-y-px"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M11 5L6 9H2v6h4l5 4V5z" />
              <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
}
