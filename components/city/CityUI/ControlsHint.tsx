'use client';

interface ControlsHintProps {
  nearbyBuilding?: { name: string } | null;
  inline?: boolean;
}

export default function ControlsHint({ nearbyBuilding, inline = false }: ControlsHintProps) {
  if (inline) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <p className="text-slate-400 text-xs mb-3 uppercase tracking-wider">Controls</p>
        <div className="space-y-3">
          <div>
            <p className="text-slate-300 text-xs mb-2">Movement</p>
            <div className="flex flex-col items-center gap-1">
              <kbd className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-300">W</kbd>
              <div className="flex gap-1">
                <kbd className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-300">A</kbd>
                <kbd className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-300">S</kbd>
                <kbd className="px-3 py-1 bg-slate-700 rounded text-xs text-slate-300">D</kbd>
              </div>
            </div>
            <p className="text-slate-500 text-[10px] mt-2 text-center">or click to walk</p>
          </div>
          <div className="border-t border-slate-700 pt-3">
            <p className="text-slate-300 text-xs mb-1">Interact</p>
            <p className="text-slate-500 text-[10px]">
              Press <kbd className="px-1 py-0.5 bg-slate-700 rounded">E</kbd> or click building
            </p>
          </div>
        </div>
        {/* Always render to reserve space and prevent layout shift */}
        <div className="mt-3 pt-3 border-t border-slate-700">
          <p className={`text-xs font-medium ${nearbyBuilding ? 'text-amber-400 animate-pulse' : 'text-slate-600'}`}>
            {nearbyBuilding ? `Near: ${nearbyBuilding.name}` : 'No building nearby'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end pointer-events-none">
      {/* Movement controls */}
      <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm pointer-events-auto">
        <p className="text-slate-400 text-xs mb-2">Movement</p>
        <div className="flex flex-col items-center gap-1">
          <div className="flex gap-1">
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">W</kbd>
          </div>
          <div className="flex gap-1">
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">A</kbd>
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">S</kbd>
            <kbd className="px-2 py-1 bg-slate-700 rounded text-xs text-slate-300">D</kbd>
          </div>
          <p className="text-slate-500 text-[10px] mt-1">or click to walk</p>
        </div>
      </div>

      {/* Interaction hint */}
      {nearbyBuilding && (
        <div className="bg-slate-900/80 rounded-lg p-3 backdrop-blur-sm pointer-events-auto animate-pulse">
          <p className="text-white text-sm font-medium">{nearbyBuilding.name}</p>
          <p className="text-slate-400 text-xs">
            Press <kbd className="px-1 py-0.5 bg-slate-700 rounded text-[10px]">E</kbd> or click to interact
          </p>
        </div>
      )}
    </div>
  );
}
