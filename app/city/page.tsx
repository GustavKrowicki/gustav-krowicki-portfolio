"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import initialGrid from "@/lib/city/cityGrid.json";
import { GridCell } from "@/components/city/pogicity/types";

function CityLoadingFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#3d5560]">
      <div className="text-white font-mono text-xl animate-pulse">
        Loading Gustav&apos;s City...
      </div>
    </div>
  );
}

// Dynamically import CityViewer to avoid SSR issues with Phaser
const CityViewer = dynamic(
  () => import("@/components/city/CityViewer"),
  {
    ssr: false,
    loading: () => <CityLoadingFallback />,
  }
);

function CityPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const e2eMode = searchParams.get("e2e") === "1";

  // Prevent macOS trackpad two-finger swipe from triggering browser back/forward.
  // Setting overflow:hidden on html/body removes the scrollable context so Chrome
  // won't activate its swipe-back gesture system in the first place.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = "";
      body.style.overflow = "";
      html.style.overscrollBehavior = "";
      body.style.overscrollBehavior = "";
    };
  }, []);

  // Belt-and-suspenders: push a dummy history entry so if a swipe-back gesture
  // somehow still fires, it navigates to the same /city page instead of leaving.
  useEffect(() => {
    history.pushState(null, "", "/city");
    const onPopState = () => {
      history.pushState(null, "", "/city");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleProjectClick = (projectSlug: string) => {
    router.push(`/work/${projectSlug}`);
  };

  const handleBackToPortfolio = () => {
    router.push("/");
  };

  return (
    <div className="w-full h-[100dvh] bg-[#3d5560]" style={{ overscrollBehavior: "none" }}>
      <CityViewer
        initialGrid={initialGrid as GridCell[][]}
        onProjectClick={handleProjectClick}
        onBackToPortfolio={handleBackToPortfolio}
        e2eMode={e2eMode}
      />
    </div>
  );
}

export default function CityPage() {
  return (
    <Suspense fallback={<CityLoadingFallback />}>
      <CityPageContent />
    </Suspense>
  );
}
