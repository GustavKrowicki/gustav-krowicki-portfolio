"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import initialGrid from "@/lib/city/cityGrid.json";
import { GridCell } from "@/components/city/pogicity/types";

// Dynamically import CityEditor to avoid SSR issues with Phaser
const CityEditor = dynamic(
  () => import("@/components/city/CityEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#3d5560]">
        <div className="text-white font-mono text-xl animate-pulse">
          Loading City Editor...
        </div>
      </div>
    ),
  }
);

export default function CityEditorPage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Only allow editor access on localhost
    const isLocalhost =
      typeof window !== "undefined" &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1");

    if (isLocalhost) {
      setIsAuthorized(true);
    } else {
      // Redirect to viewer mode in production
      router.replace("/city");
    }

    setIsChecking(false);
  }, [router]);

  if (isChecking) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#3d5560]">
        <div className="text-white font-mono text-xl animate-pulse">
          Checking authorization...
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="w-full h-screen bg-[#3d5560]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-mono text-xl font-bold">
              City Editor <span className="text-yellow-400">(Dev Only)</span>
            </h1>
            <p className="text-gray-300 font-mono text-sm">
              Build and customize your city
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/city")}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 font-mono text-sm border border-white/20"
            >
              View Mode
            </button>
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 font-mono text-sm border border-white/20"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* City Editor */}
      <CityEditor initialGrid={initialGrid as GridCell[][]} />
    </div>
  );
}
