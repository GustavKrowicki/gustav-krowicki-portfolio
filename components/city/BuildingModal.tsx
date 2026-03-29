"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BuildingDefinition } from "@/lib/city/buildings";
import { getBuildingVideo } from "@/lib/city/buildingVideos";
import Image from "next/image";
import VideoThumbnail from "./VideoThumbnail";
import {
  PIXEL_INSET_CLIP,
  PIXEL_PANEL_CLIP,
  pixelButtonClass,
  pixelChipClass,
  pixelDividerClass,
  pixelHeaderClass,
  pixelHintClass,
  pixelPanelInnerClass,
  pixelPanelOuterClass,
  pixelSpriteFrameClass,
} from "./pixelModalStyles";
import SpotifyPlayer, { NORTHSIDE_PLAYLIST_URL } from "./SpotifyPlayer";

interface BuildingModalProps {
  isMobile: boolean;
  building: BuildingDefinition | null;
  isOpen: boolean;
  onClose: () => void;
  onViewProject?: (projectSlug: string) => void;
  onBackToPortfolio?: () => void;
}

// Building metadata for enhanced display
const BUILDING_METADATA: Record<
  string,
  {
    role?: string;
    timeline?: string;
    highlights?: string[];
    emoji?: string;
  }
> = {
  "lego-hq": {
    role: "Product Designer",
    timeline: "2023 - Present",
    highlights: [
      "ML-assisted internal tools",
      "Design system development",
      "Cross-functional collaboration",
    ],
    emoji: "🧱",
  },
  "valtech-office": {
    role: "Design Intern",
    timeline: "2022",
    highlights: [
      "Enterprise digital experiences",
      "Client-facing design work",
      "Agile methodologies",
    ],
    emoji: "💼",
  },
  "melbourne-uni": {
    role: "Exchange Student",
    timeline: "2021",
    highlights: [
      "Human-Computer Interaction",
      "Design thinking workshops",
      "Cross-cultural design",
    ],
    emoji: "🦘",
  },
  "berlin-uni": {
    role: "Exchange Student",
    timeline: "2020",
    highlights: [
      "Startup culture immersion",
      "Interface design",
      "Innovation labs",
    ],
    emoji: "🇩🇪",
  },
  "sdu-kolding": {
    role: "IT Product Design",
    timeline: "2019 - 2023",
    highlights: [
      "UX Research",
      "Prototyping",
      "User-centered design",
    ],
    emoji: "🎓",
  },
  erhvervsakademiet: {
    role: "Multimedia Design",
    timeline: "2017 - 2019",
    highlights: [
      "Visual design fundamentals",
      "Web development",
      "Digital marketing",
    ],
    emoji: "🏫",
  },
  "dokk1-library": {
    role: "Personal Interest",
    highlights: ["Non-fiction", "Biographies", "Design thinking"],
    emoji: "📚",
  },
  "aarhus-stadium": {
    role: "Personal Interest",
    highlights: ["Football fan", "Live sports", "Team spirit"],
    emoji: "⚽",
  },
  "northside-stage": {
    role: "Personal Interest",
    highlights: ["Music festivals", "Live performances", "Creative inspiration"],
    emoji: "🎸",
  },
  "ski-chute-1": {
    role: "Personal Interest",
    highlights: ["Alpine skiing", "Adventure sports", "Winter escapes"],
    emoji: "🎿",
  },
  "ski-chute-2": {
    role: "Personal Interest",
    highlights: ["Ski touring", "Mountain exploration", "Nature"],
    emoji: "⛷️",
  },
  aeroguest: {
    role: "Personal Interest",
    highlights: ["Aviation", "Travel", "Technology"],
    emoji: "✈️",
  },
  "cate-it": {
    role: "Co-founder & Designer",
    timeline: "2023 - Present",
    highlights: [
      "AI-powered catering",
      "Startup founding",
      "Full product lifecycle",
    ],
    emoji: "🍽️",
  },
  "viz-generator": {
    role: "Side Project",
    timeline: "2022",
    highlights: [
      "Data visualization",
      "Chart generation",
      "Developer tools",
    ],
    emoji: "📊",
  },
};

export default function BuildingModal({
  isMobile,
  building,
  isOpen,
  onClose,
  onViewProject,
  onBackToPortfolio,
}: BuildingModalProps) {
  if (!building) return null;

  const metadata = BUILDING_METADATA[building.id] || {};
  const hasProject = building.projectSlug && building.interactable;
  const video = getBuildingVideo(building.id);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={isMobile ? { opacity: 0, y: 80 } : { opacity: 0, x: 20 }}
            animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, x: 0 }}
            exit={isMobile ? { opacity: 0, y: 80 } : { opacity: 0, x: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`fixed z-50 ${isMobile ? "bottom-0 left-0 right-0" : "top-4 right-4 w-80"}`}
            data-testid="city-building-modal"
          >
            <div className={pixelPanelOuterClass} style={PIXEL_PANEL_CLIP} onClick={(e) => e.stopPropagation()}>
              <div
                className={`${pixelPanelInnerClass} ${isMobile ? "max-h-[80vh] overflow-y-auto" : ""}`}
                style={PIXEL_INSET_CLIP}
              >
                <div className={`${pixelHeaderClass} ${isMobile ? "p-4" : "p-5"}`}>
                  <button
                    onClick={onClose}
                    className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center border-[3px] border-[#1b1f22] bg-[#3f3b31] text-[#f5ecd2] shadow-[inset_0_-3px_0_#27241d] transition-transform duration-100 hover:bg-[#4a463a] active:translate-y-px"
                    aria-label="Close modal"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="square"
                        strokeLinejoin="miter"
                        strokeWidth={2.5}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>

                  <div className={`flex gap-4 ${isMobile ? "items-start" : "items-center"}`}>
                    <div
                      className={`${pixelSpriteFrameClass} ${isMobile ? "h-20 w-20" : "h-24 w-24"} flex items-center justify-center p-2`}
                      style={PIXEL_INSET_CLIP}
                    >
                      {building.sprites.south && (
                        <Image
                          src={building.sprites.south}
                          alt={building.name}
                          width={96}
                          height={96}
                          className="object-contain"
                          style={{ imageRendering: "pixelated" }}
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pr-10">
                      <div className="mb-2 flex items-center gap-2">
                        <span className={pixelChipClass}>
                          {metadata.emoji || building.icon} Site
                        </span>
                      </div>
                      <h3 className="font-mono text-xl uppercase tracking-[0.08em] text-[#f5ecd2]">
                        {building.name}
                      </h3>
                      {metadata.role && (
                        <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-[#b7d0b0]">
                          {metadata.role}
                        </p>
                      )}
                      {metadata.timeline && (
                        <p className="mt-1 font-mono text-xs uppercase tracking-[0.08em] text-[#d2c7aa]">
                          {metadata.timeline}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className={`${isMobile ? "px-4 pb-[max(1rem,env(safe-area-inset-bottom))]" : "px-5 pb-5"}`}>
                  {video && (
                    <div className="mb-4">
                      <VideoThumbnail video={video} isActive={isOpen} />
                    </div>
                  )}

                  {building.id === "northside-stage" && (
                    <div className="mb-4">
                      <SpotifyPlayer playlistUrl={NORTHSIDE_PLAYLIST_URL} />
                    </div>
                  )}

                  <div className="bg-[#7a7567] px-4 py-4 text-[#161411] shadow-[inset_0_3px_0_#9b9687]">
                    {building.description && (
                      <p className="font-mono text-sm leading-relaxed text-[#161411]">
                        {building.description}
                      </p>
                    )}

                    {metadata.highlights && metadata.highlights.length > 0 && (
                      <div className="mt-4">
                        <h4 className="mb-2 font-mono text-[11px] uppercase tracking-[0.12em] text-[#2f2a22]">
                          Building Notes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {metadata.highlights.map((highlight, i) => (
                            <span key={i} className={pixelChipClass}>
                              {highlight}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={`${pixelDividerClass} mt-4 pt-4`}>
                    <div className="flex flex-col gap-2">
                      {hasProject && onViewProject && (
                        <button
                          onClick={() => onViewProject(building.projectSlug!)}
                          className={`w-full ${pixelButtonClass("primary")}`}
                        >
                          View Case Study
                        </button>
                      )}
                      <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
                        {onBackToPortfolio && (
                          <button
                            onClick={onBackToPortfolio}
                            className={`flex-1 ${pixelButtonClass("secondary")}`}
                          >
                            Back to Portfolio
                          </button>
                        )}
                        <button
                          onClick={onClose}
                          className={`${onBackToPortfolio && !isMobile ? "min-w-[7rem]" : "w-full"} ${pixelButtonClass("ghost")}`}
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <p className={`mt-2 ${pixelHintClass} ${isMobile ? "mx-2" : ""}`}>
              {hasProject ? "Inspect site dossier and continue exploring." : "Continue exploring the city."}
            </p>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
