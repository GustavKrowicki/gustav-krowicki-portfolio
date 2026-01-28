'use client';

interface DistrictIndicatorProps {
  district: {
    id: string;
    name: string;
    color: string;
  } | null;
  inline?: boolean;
}

export default function DistrictIndicator({ district, inline = false }: DistrictIndicatorProps) {
  const content = (
    <div
      className="px-4 py-2 rounded-lg border min-w-[180px]"
      style={{
        backgroundColor: district ? `${district.color}20` : '#334155',
        borderColor: district ? `${district.color}40` : '#475569',
      }}
    >
      <p className="text-xs text-slate-400 mb-1">Current District</p>
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: district?.color || '#64748b' }}
        />
        <span
          className="font-medium text-sm whitespace-nowrap"
          style={{ color: district?.color || '#94a3b8' }}
        >
          {district?.name || 'Exploring...'}
        </span>
      </div>
    </div>
  );

  if (inline) {
    return content;
  }

  if (!district) return null;

  return (
    <div className="absolute top-4 left-4 z-40">
      {content}
    </div>
  );
}
