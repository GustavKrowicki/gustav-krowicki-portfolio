'use client';

import { useEffect, useRef, useCallback } from 'react';

interface TouchControlsProps {
  onMove: (dx: number, dy: number) => void;
  onInteract: () => void;
}

export default function TouchControls({ onMove, onInteract }: TouchControlsProps) {
  const joystickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const centerRef = useRef({ x: 0, y: 0 });

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!joystickRef.current || !knobRef.current) return;

    const touch = e.touches[0];
    const rect = joystickRef.current.getBoundingClientRect();
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
    isDragging.current = true;

    // Calculate initial position
    const dx = touch.clientX - centerRef.current.x;
    const dy = touch.clientY - centerRef.current.y;
    updateKnob(dx, dy);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging.current || !knobRef.current) return;
    e.preventDefault();

    const touch = e.touches[0];
    const dx = touch.clientX - centerRef.current.x;
    const dy = touch.clientY - centerRef.current.y;
    updateKnob(dx, dy);
  }, []);

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
    if (knobRef.current) {
      knobRef.current.style.transform = 'translate(-50%, -50%)';
    }
    onMove(0, 0);
  }, [onMove]);

  const updateKnob = (dx: number, dy: number) => {
    if (!knobRef.current) return;

    const maxDistance = 40;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDistance;
    const knobY = Math.sin(angle) * clampedDistance;

    knobRef.current.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    // Normalize movement
    if (distance > 10) {
      const normalizedX = dx / maxDistance;
      const normalizedY = dy / maxDistance;
      onMove(
        Math.max(-1, Math.min(1, normalizedX)),
        Math.max(-1, Math.min(1, normalizedY))
      );
    } else {
      onMove(0, 0);
    }
  };

  useEffect(() => {
    const joystick = joystickRef.current;
    if (!joystick) return;

    joystick.addEventListener('touchstart', handleTouchStart, { passive: false });
    joystick.addEventListener('touchmove', handleTouchMove, { passive: false });
    joystick.addEventListener('touchend', handleTouchEnd);
    joystick.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      joystick.removeEventListener('touchstart', handleTouchStart);
      joystick.removeEventListener('touchmove', handleTouchMove);
      joystick.removeEventListener('touchend', handleTouchEnd);
      joystick.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  return (
    <div className="fixed bottom-8 left-0 right-0 flex justify-between px-8 pointer-events-none md:hidden z-40">
      {/* Virtual Joystick */}
      <div
        ref={joystickRef}
        className="w-32 h-32 bg-slate-800/60 rounded-full relative pointer-events-auto touch-none"
        style={{ touchAction: 'none' }}
      >
        <div
          ref={knobRef}
          className="absolute top-1/2 left-1/2 w-16 h-16 bg-slate-600/80 rounded-full transform -translate-x-1/2 -translate-y-1/2 border-2 border-slate-500"
        />
      </div>

      {/* Interact Button */}
      <button
        onClick={onInteract}
        className="w-20 h-20 bg-blue-500/80 rounded-full pointer-events-auto flex items-center justify-center text-white font-bold text-lg active:bg-blue-600 border-4 border-blue-400"
      >
        E
      </button>
    </div>
  );
}
