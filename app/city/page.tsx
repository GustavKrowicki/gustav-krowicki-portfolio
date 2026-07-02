"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { trackCityEntered } from "@/lib/analytics";
import dynamic from "next/dynamic";
import initialGrid from "@/lib/city/cityGrid.json";
import { GridCell } from "@/components/city/pogicity/types";

function CityLoadingFallback() {
  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#73645F]">
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
  // Track city entry on mount
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    trackCityEntered(isMobile ? 'mobile' : 'desktop');
  }, []);

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
    // Preserve the query string (e.g. ?e2e=1 for Playwright) — replacing the URL
    // without it makes Next.js sync useSearchParams and drop e2eMode mid-mount.
    const cityUrl = `/city${window.location.search}`;
    history.pushState(null, "", cityUrl);
    const onPopState = () => {
      history.pushState(null, "", cityUrl);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleProjectClick = (projectSlug: string) => {
    router.push(`/work/${projectSlug}`);
  };

  return (
    <div className="w-full h-[100dvh] bg-[#73645F]" style={{ overscrollBehavior: "none" }}>
      <CityViewer
        initialGrid={initialGrid as GridCell[][]}
        onProjectClick={handleProjectClick}
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
