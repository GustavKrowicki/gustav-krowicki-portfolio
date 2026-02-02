"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import initialGrid from "@/lib/city/cityGrid.json";
import { GridCell } from "@/components/city/pogicity/types";

// Dynamically import CityViewer to avoid SSR issues with Phaser
const CityViewer = dynamic(
  () => import("@/components/city/CityViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#3d5560]">
        <div className="text-white font-mono text-xl animate-pulse">
          Loading Gustav's City...
        </div>
      </div>
    ),
  }
);

export default function CityPage() {
  const router = useRouter();

  const handleProjectClick = (projectSlug: string) => {
    router.push(`/work/${projectSlug}`);
  };

  return (
    <div className="w-full h-screen bg-[#3d5560]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-mono text-xl font-bold">
              Gustav's City
            </h1>
            <p className="text-gray-300 font-mono text-sm">
              Explore my portfolio in isometric style
            </p>
          </div>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 font-mono text-sm border border-white/20"
          >
            ← Back to Portfolio
          </button>
        </div>
      </div>

      {/* City Viewer */}
      <CityViewer
        initialGrid={initialGrid as GridCell[][]}
        onProjectClick={handleProjectClick}
      />
    </div>
  );
}
