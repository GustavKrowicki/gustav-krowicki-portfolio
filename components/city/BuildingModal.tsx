"use client";

import { motion, AnimatePresence } from "framer-motion";
import { BuildingDefinition } from "@/lib/city/buildings";
import Image from "next/image";

interface BuildingModalProps {
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
    highlights: ["Reading", "Learning", "Continuous growth"],
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
  building,
  isOpen,
  onClose,
  onViewProject,
  onBackToPortfolio,
}: BuildingModalProps) {
  if (!building) return null;

  const metadata = BUILDING_METADATA[building.id] || {};
  const hasProject = building.projectSlug && building.interactable;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Modal - Top Right Corner */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="absolute top-4 right-4 z-50 w-80"
          >
            <div
              className="bg-[#1a1f2e]/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with building sprite */}
              <div className="relative bg-gradient-to-b from-white/5 to-transparent p-6">
                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>

                {/* Building sprite preview */}
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 bg-white/5 rounded-xl overflow-hidden flex items-center justify-center">
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

                  <div className="flex-1">
                    {/* Emoji badge */}
                    <span className="text-3xl mb-1 block">
                      {metadata.emoji || building.icon}
                    </span>
                    {/* Title */}
                    <h3 className="text-white text-xl font-bold">
                      {building.name}
                    </h3>
                    {/* Role */}
                    {metadata.role && (
                      <p className="text-blue-400 text-sm font-medium">
                        {metadata.role}
                      </p>
                    )}
                    {/* Timeline */}
                    {metadata.timeline && (
                      <p className="text-gray-500 text-sm">{metadata.timeline}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="px-6 pb-6">
                {/* Description */}
                {building.description && (
                  <p className="text-gray-300 mb-4">{building.description}</p>
                )}

                {/* Highlights */}
                {metadata.highlights && metadata.highlights.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-gray-400 text-xs uppercase tracking-wider mb-2">
                      Highlights
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {metadata.highlights.map((highlight, i) => (
                        <span
                          key={i}
                          className="px-3 py-1 bg-white/5 text-gray-300 text-sm rounded-full border border-white/5"
                        >
                          {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 mt-6">
                  {hasProject && onViewProject && (
                    <button
                      onClick={() => onViewProject(building.projectSlug!)}
                      className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-200 text-sm"
                    >
                      View Case Study
                    </button>
                  )}
                  <div className="flex gap-2">
                    {onBackToPortfolio && (
                      <button
                        onClick={onBackToPortfolio}
                        className="flex-1 px-4 py-2.5 bg-white/5 text-gray-300 rounded-xl font-medium hover:bg-white/10 transition-colors border border-white/5 text-sm"
                      >
                        ← Back to Portfolio
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl font-medium hover:bg-white/10 transition-colors border border-white/5 text-sm"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
