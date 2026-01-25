'use client';

interface DistrictIndicatorProps {
  district: {
    id: string;
    name: string;
    color: string;
  } | null;
}

export default function DistrictIndicator({ district }: DistrictIndicatorProps) {
  if (!district) return null;

  return (
    <div className="absolute top-4 left-4 z-40">
      <div
        className="px-4 py-2 rounded-lg backdrop-blur-sm border"
        style={{
          backgroundColor: `${district.color}20`,
          borderColor: `${district.color}40`,
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: district.color }}
          />
          <span
            className="font-medium text-sm"
            style={{ color: district.color }}
          >
            {district.name}
          </span>
        </div>
      </div>
    </div>
  );
}
