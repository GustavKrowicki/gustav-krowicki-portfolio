"use client";

import { useState, useRef, useCallback } from "react";
import { Direction } from "./pogicity/types";
import {
  PIXEL_INSET_CLIP,
  pixelButtonClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
} from "./pixelModalStyles";

interface VirtualJoystickProps {
  isMobile: boolean;
  onDirectionChange: (direction: Direction | null) => void;
  onInteract?: () => void;
}

export default function VirtualJoystick({
  isMobile,
  onDirectionChange,
  onInteract,
}: VirtualJoystickProps) {
  const [isActive, setIsActive] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef({ x: 0, y: 0 });

  const DEAD_ZONE = 15; // Pixels before registering movement
  const MAX_DISTANCE = 40; // Max distance from center

  const getDirection = useCallback(
    (x: number, y: number): Direction | null => {
      const distance = Math.sqrt(x * x + y * y);
      if (distance < DEAD_ZONE) return null;

      // Determine primary direction based on angle
      const angle = Math.atan2(y, x) * (180 / Math.PI);

      if (angle >= -45 && angle < 45) {
        return Direction.Right;
      } else if (angle >= 45 && angle < 135) {
        return Direction.Down;
      } else if (angle >= -135 && angle < -45) {
        return Direction.Up;
      } else {
        return Direction.Left;
      }
    },
    []
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      centerRef.current = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };

      setIsActive(true);

      const x = touch.clientX - centerRef.current.x;
      const y = touch.clientY - centerRef.current.y;
      const clampedX = Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, x));
      const clampedY = Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, y));

      setPosition({ x: clampedX, y: clampedY });
      onDirectionChange(getDirection(clampedX, clampedY));
    },
    [getDirection, onDirectionChange]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isActive) return;
      e.preventDefault();

      const touch = e.touches[0];
      const x = touch.clientX - centerRef.current.x;
      const y = touch.clientY - centerRef.current.y;
      const clampedX = Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, x));
      const clampedY = Math.max(-MAX_DISTANCE, Math.min(MAX_DISTANCE, y));

      setPosition({ x: clampedX, y: clampedY });
      onDirectionChange(getDirection(clampedX, clampedY));
    },
    [isActive, getDirection, onDirectionChange]
  );

  const handleTouchEnd = useCallback(() => {
    setIsActive(false);
    setPosition({ x: 0, y: 0 });
    onDirectionChange(null);
  }, [onDirectionChange]);

  if (!isMobile) return null;

  return (
    <div
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 z-40 flex gap-4"
      data-testid="city-joystick"
    >
      {/* Joystick */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="relative h-32 w-32 touch-none"
      >
        <div className={`${pixelPanelOuterClass} absolute inset-0`} style={PIXEL_INSET_CLIP}>
          <div className={`${pixelPanelInnerClass} h-full w-full bg-[#5f5a4c]`} style={PIXEL_INSET_CLIP}>
            <div className="absolute inset-3 border-[3px] border-[#14181b] bg-[#3d3a31]">
              <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-[#5f7a59]" />
              <div className="absolute top-1/2 left-0 h-[3px] w-full -translate-y-1/2 bg-[#5f7a59]" />
            </div>
          </div>
        </div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 font-mono text-[#cfc6ac]">
              ▲
            </div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 font-mono text-[#cfc6ac]">
              ▼
            </div>
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 font-mono text-[#cfc6ac]">
              ◀
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 font-mono text-[#cfc6ac]">
              ▶
            </div>
          </div>
        </div>

        <div
          className="absolute left-1/2 top-1/2 h-12 w-12 border-[3px] border-[#17201d] bg-[#88a07e] shadow-[inset_0_-3px_0_#31473b] transition-transform"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            transitionDuration: isActive ? "0ms" : "150ms",
            ...PIXEL_INSET_CLIP,
          }}
        />
      </div>

      {onInteract && (
        <div className="self-end">
          <button
            onTouchStart={(e) => {
              e.preventDefault();
              onInteract();
            }}
            onTouchCancel={handleTouchEnd}
            className={`min-h-[5.5rem] min-w-[7rem] self-end ${pixelButtonClass("primary")}`}
            style={PIXEL_INSET_CLIP}
            data-testid="city-talk-button"
          >
            Talk
          </button>
          <p className={`mt-2 w-fit ${pixelHintClass}`}>Interact</p>
        </div>
      )}
    </div>
  );
}
