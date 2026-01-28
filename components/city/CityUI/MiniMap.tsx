'use client';

import Link from 'next/link';
import { Download, User, Mail, ArrowLeft } from 'lucide-react';
import { buildings } from '@/lib/data/buildings';
import { usePortfolioMode } from '@/contexts/PortfolioModeContext';

interface WorldBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MiniMapProps {
  playerPosition: { x: number; y: number };
  worldBounds: WorldBounds | null;
  inline?: boolean;
}

export default function MiniMap({ playerPosition, worldBounds, inline = false }: MiniMapProps) {
  const { setMode } = usePortfolioMode();
  const miniMapWidth = 160;
  const miniMapHeight = 110;

  // Convert world position to minimap position
  const worldToMinimap = (worldX: number, worldY: number) => {
    if (!worldBounds) return { x: miniMapWidth / 2, y: miniMapHeight / 2 };

    const x = ((worldX - worldBounds.x) / worldBounds.width) * miniMapWidth;
    const y = ((worldY - worldBounds.y) / worldBounds.height) * miniMapHeight;
    return { x, y };
  };

  // Convert grid position to minimap position (for buildings)
  const gridToMinimap = (gridX: number, gridY: number) => {
    // Grid is 20x15, map to minimap dimensions
    const x = (gridX / 20) * miniMapWidth;
    const y = (gridY / 15) * miniMapHeight;
    return { x, y };
  };

  const playerMiniPos = worldToMinimap(playerPosition.x, playerPosition.y);

  return (
    <div className={`bg-slate-800 rounded-xl p-3 border border-slate-700 ${inline ? 'w-full' : 'absolute top-4 right-4 w-48'}`}>
      {/* Header with branding */}
      <div className="mb-3 pb-2 border-b border-slate-700">
        <h2 className="text-white font-semibold text-sm">Gustav Krowicki</h2>
        <p className="text-slate-400 text-[10px]">Product Designer</p>
      </div>

      {/* Mini Map */}
      <div className="mb-3">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Map</p>
        <div
          className="relative border border-slate-600 rounded overflow-hidden bg-slate-800"
          style={{ width: miniMapWidth, height: miniMapHeight }}
        >
          {/* District quadrants */}
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            <div className="bg-blue-500/20" title="Corporate" />
            <div className="bg-green-500/20" title="Education" />
            <div className="bg-amber-500/20" title="Startup" />
            <div className="bg-purple-500/20" title="Personal" />
          </div>

          {/* Buildings - positioned by grid coordinates */}
          {buildings.map((building) => {
            const pos = gridToMinimap(building.gridPosition.x, building.gridPosition.y);
            return (
              <div
                key={building.id}
                className="absolute w-2 h-2 bg-white/80 rounded-sm transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: pos.x,
                  top: pos.y,
                }}
                title={building.name}
              />
            );
          })}

          {/* Player */}
          <div
            className="absolute w-3 h-3 bg-blue-400 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2 z-10"
            style={{
              left: Math.max(0, Math.min(miniMapWidth, playerMiniPos.x)),
              top: Math.max(0, Math.min(miniMapHeight, playerMiniPos.y)),
            }}
          />
        </div>

        {/* Legend */}
        <div className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5">
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm shrink-0 bg-blue-500" />
            <span className="text-[9px] text-slate-500 truncate">Corporate</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm shrink-0 bg-green-500" />
            <span className="text-[9px] text-slate-500 truncate">Education</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm shrink-0 bg-amber-500" />
            <span className="text-[9px] text-slate-500 truncate">Startup</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-sm shrink-0 bg-purple-500" />
            <span className="text-[9px] text-slate-500 truncate">Personal</span>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="mb-3 pb-2 border-b border-slate-700">
        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1.5">Navigate</p>
        <div className="flex flex-col gap-1">
          <Link
            href="/about"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs py-1 px-2 rounded hover:bg-slate-800 transition-colors"
          >
            <User className="w-3 h-3" />
            <span>About</span>
          </Link>
          <Link
            href="/contact"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs py-1 px-2 rounded hover:bg-slate-800 transition-colors"
          >
            <Mail className="w-3 h-3" />
            <span>Contact</span>
          </Link>
          <a
            href="/cv/CV-Gustav-Krowicki.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-slate-300 hover:text-white text-xs py-1 px-2 rounded hover:bg-slate-800 transition-colors"
          >
            <Download className="w-3 h-3" />
            <span>Download CV</span>
          </a>
        </div>
      </div>

      {/* Switch to Classic */}
      <button
        onClick={() => setMode('classic')}
        className="w-full flex items-center justify-center gap-2 text-xs py-2 px-3 bg-white text-slate-900 rounded-lg font-medium hover:bg-slate-100 transition-colors"
      >
        <ArrowLeft className="w-3 h-3" />
        <span>Classic View</span>
      </button>
    </div>
  );
}
