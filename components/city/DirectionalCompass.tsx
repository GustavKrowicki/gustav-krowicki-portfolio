"use client";

import { motion } from "framer-motion";
import { Direction } from "./pogicity/types";

interface DirectionalCompassProps {
  walkableDirections: Direction[];
}

const keys = [
  { dir: Direction.Up, label: "W", arrow: "↑" },
  { dir: Direction.Right, label: "D", arrow: "→" },
  { dir: Direction.Left, label: "A", arrow: "←" },
  { dir: Direction.Down, label: "S", arrow: "↓" },
] as const;

export default function DirectionalCompass({
  walkableDirections,
}: DirectionalCompassProps) {
  const isWalkable = (dir: Direction) => walkableDirections.includes(dir);

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="fixed top-14 right-4 z-40"
    >
      <div className="bg-black/50 backdrop-blur-sm rounded-lg border border-white/20 p-2">
        {/* 2x2 diamond grid of keyboard keys */}
        <div className="grid grid-cols-2 gap-1">
          {keys.map(({ dir, label, arrow }) => {
            const active = isWalkable(dir);

            return (
              <div
                key={dir}
                className={`
                  w-10 h-10 rounded-md flex flex-col items-center justify-center
                  border transition-all duration-150 select-none
                  ${active
                    ? "bg-white/15 border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
                    : "bg-white/5 border-white/10"
                  }
                `}
              >
                <span
                  className={`text-sm leading-none transition-all duration-150 ${
                    active ? "text-white" : "text-white/20"
                  }`}
                >
                  {arrow}
                </span>
                <span
                  className={`text-[8px] font-mono font-bold leading-none mt-0.5 transition-all duration-150 ${
                    active ? "text-white/60" : "text-white/15"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
