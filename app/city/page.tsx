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

  const handleBackToPortfolio = () => {
    router.push("/");
  };

  return (
    <div className="w-full h-screen bg-[#3d5560]">
      {/* City Viewer */}
      <CityViewer
        initialGrid={initialGrid as GridCell[][]}
        onProjectClick={handleProjectClick}
        onBackToPortfolio={handleBackToPortfolio}
      />
    </div>
  );
}
