"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Direction } from "./pogicity/types";

interface VirtualJoystickProps {
  onDirectionChange: (direction: Direction | null) => void;
  onInteract?: () => void;
}

export default function VirtualJoystick({
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

  // Detect mobile device
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        window.innerWidth < 768
      );
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isMobile) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 flex gap-4">
      {/* Joystick */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative w-28 h-28 touch-none"
      >
        {/* Background ring */}
        <div className="absolute inset-0 rounded-full bg-black/30 backdrop-blur-sm border-2 border-white/20" />

        {/* Direction indicators */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 relative">
            {/* Up arrow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 text-white/40">
              ▲
            </div>
            {/* Down arrow */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1 text-white/40">
              ▼
            </div>
            {/* Left arrow */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 text-white/40">
              ◀
            </div>
            {/* Right arrow */}
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 text-white/40">
              ▶
            </div>
          </div>
        </div>

        {/* Movable thumb */}
        <div
          className="absolute top-1/2 left-1/2 w-12 h-12 rounded-full bg-white/80 shadow-lg transition-transform"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            transitionDuration: isActive ? "0ms" : "150ms",
          }}
        />
      </div>

      {/* Interact button */}
      {onInteract && (
        <button
          onTouchStart={(e) => {
            e.preventDefault();
            onInteract();
          }}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-lg shadow-lg active:scale-95 transition-transform border-2 border-white/30 self-end"
        >
          E
        </button>
      )}
    </div>
  );
}
