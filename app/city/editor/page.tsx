"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import savedGrid from "@/lib/city/cityGrid.json";
import {
  GRID_HEIGHT,
  GRID_WIDTH,
  GridCell,
  TileType,
} from "@/components/city/pogicity/types";

function buildEmptyGrid(): GridCell[][] {
  return Array.from({ length: GRID_HEIGHT }, (_, y) =>
    Array.from({ length: GRID_WIDTH }, (_, x) => ({
      type: TileType.Grass,
      x,
      y,
      isOrigin: true,
    }))
  );
}

// Dynamically import CityEditor to avoid SSR issues with Phaser
const CityEditor = dynamic(
  () => import("@/components/city/CityEditor"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-screen flex items-center justify-center bg-[#73645F]">
        <div className="text-white font-mono text-xl animate-pulse">
          Loading City Editor...
        </div>
      </div>
    ),
  }
);

function CityEditorPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmpty = searchParams.get("empty") === "1";
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const gridForEditor = useMemo<GridCell[][]>(
    () => (isEmpty ? buildEmptyGrid() : (savedGrid as GridCell[][])),
    [isEmpty]
  );

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
      <div className="w-full h-screen flex items-center justify-center bg-[#73645F]">
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
    <div className="w-full h-screen bg-[#73645F]">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/70 to-transparent p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-mono text-xl font-bold">
              City Editor <span className="text-yellow-400">(Dev Only)</span>
              {isEmpty && (
                <span className="ml-2 text-green-400">[Empty Plate]</span>
              )}
            </h1>
            <p className="text-gray-300 font-mono text-sm">
              {isEmpty
                ? "Blank grass canvas — drop in buildings, props, roads"
                : "Build and customize your city"}
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
              onClick={() => router.push("/new")}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 font-mono text-sm border border-white/20"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>

      {/* City Editor */}
      <CityEditor key={isEmpty ? "empty" : "saved"} initialGrid={gridForEditor} />
    </div>
  );
}

// useSearchParams() requires a Suspense boundary during prerendering
export default function CityEditorPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center bg-[#73645F]">
          <div className="text-white font-mono text-xl animate-pulse">
            Loading City Editor...
          </div>
        </div>
      }
    >
      <CityEditorPageContent />
    </Suspense>
  );
}
