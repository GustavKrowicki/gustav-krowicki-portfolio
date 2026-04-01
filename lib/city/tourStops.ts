// Tour system data - defines stops and dialogue for the guided city tour

import { getBuilding } from "./buildings";

export interface TourStop {
  id: string;
  buildingId?: string;
  gridPosition?: { x: number; y: number };
  title: string;
  dialogue: string;
  category: "work" | "education" | "startup" | "interests" | "contact";
  projectSlug?: string;
  // Offset for NPC position relative to building center
  npcOffset?: { x: number; y: number };
  // Offset for camera position relative to building center (grid units)
  cameraOffset?: { x: number; y: number };
  // Separate mobile camera offset (uses cameraOffset as fallback if not set)
  cameraOffsetMobile?: { x: number; y: number };
}

export const TOUR_STOPS: TourStop[] = [
  {
    id: "welcome",
    title: "Welcome!",
    dialogue:
      "Welcome to my city! I'm Gustav, a product designer based in Denmark. Let me show you around my portfolio through this isometric world I've built.",
    category: "work",
    gridPosition: { x: 24, y: 24 },
  },
  {
    id: "lego",
    buildingId: "lego-hq",
    title: "LEGO HQ",
    dialogue:
      "This is where I currently work at LEGO, designing ML-assisted tools that help our internal teams work smarter. It's a dream come true to work with such an iconic brand!",
    category: "work",
    projectSlug: "lego",
    npcOffset: { x: -6, y: -6 },
    cameraOffset: { x: 6, y: 9 },
    cameraOffsetMobile: { x: 15.8, y: 15.3 },
  },
  {
    id: "valtech",
    buildingId: "valtech-office",
    title: "Valtech Office",
    dialogue:
      "I interned here at Valtech, learning design at scale and working on enterprise digital experiences. This is where I really grew as a designer.",
    category: "work",
    projectSlug: "valtech",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 10.6, y: 3.6 }, 
    cameraOffsetMobile: { x: 20.5, y: 18.8 },
  },
  {
    id: "sdu",
    buildingId: "sdu-kolding",
    title: "SDU Kolding",
    dialogue:
      "SDU Kolding is where I studied IT Product Design. This unique program taught me to bridge the gap between technology and user experience.",
    category: "education",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 11.5, y: 2.8 },
    cameraOffsetMobile: { x: 15.5, y: 12.4 },
  },
  {
    id: "melbourne",
    buildingId: "melbourne-uni",
    title: "University of Melbourne",
    dialogue:
      "I spent a semester abroad in Melbourne, Australia! It was an incredible experience studying design in a completely different culture and environment.",
    category: "education",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 11.7, y: 5.1 },
    cameraOffsetMobile: { x: 15.9, y: 12.6 },
  },
  {
    id: "berlin",
    buildingId: "berlin-uni",
    title: "Berlin University",
    dialogue:
      "Another exchange semester, this time in Berlin, Germany. The vibrant startup culture and design scene there really inspired my work.",
    category: "education",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 10.4, y: 4 },
    cameraOffsetMobile: { x: 17.4, y: 17.7 },
  },
  {
    id: "erhvervsakademiet",
    buildingId: "erhvervsakademiet",
    title: "Business Academy",
    dialogue:
      "This is where my journey in multimedia design began. The practical, hands-on approach here gave me strong foundations in digital design.",
    category: "education",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 12.2, y: 2.1 },
    cameraOffsetMobile: { x: 13, y: 13 },
  },
  {
    id: "cate-it",
    buildingId: "cate-it",
    title: "Cate it",
    dialogue:
      "This is my startup! Cate it is an AI-powered catering platform I co-founded. We're building the future of event catering with smart matching and seamless booking.",
    category: "startup",
    projectSlug: "cate-it",
    npcOffset: { x: 1, y: 1 },
    cameraOffset: { x: 13, y: 2.2 },
    cameraOffsetMobile: { x: 19.3, y: 17.5 },
  },
  {
    id: "dokk1",
    buildingId: "dokk1-library",
    title: "Dokk1 Library",
    dialogue:
      "I'm a big reader! I try to always have a book going — mostly non-fiction, biographies, and anything that makes me think differently about design and technology.",
    category: "interests",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 20, y: 9.9 },
    cameraOffsetMobile: { x: 21.6, y: 20.9 },
  },
  {
    id: "northside",
    buildingId: "northside-stage",
    title: "Northside Festival",
    dialogue:
      "I love music and festivals! Northside is one of my favorites - great music, great vibes, and always a source of creative inspiration.",
    category: "interests",
    npcOffset: { x: 2, y: 2 },
    cameraOffset: { x: 20.7, y: 8.9 },
    cameraOffsetMobile: { x: 28, y: 22.1 },
  },
  {
    id: "skiing",
    buildingId: "ski-chute-2",
    title: "Ski Slopes",
    dialogue:
      "When I'm not designing, you might find me on the ski slopes! There's nothing like the rush of skiing down a mountain.",
    category: "interests",
    npcOffset: { x: 1, y: 3 },
    cameraOffset: { x: 2, y: -4 },
    cameraOffsetMobile: { x: 15.8, y: 15.3 },
  },
  {
    id: "stadium",
    buildingId: "aarhus-stadium",
    title: "Aarhus Stadium",
    dialogue:
      "Football is a big part of my life. I try to catch games at the stadium whenever I can - there's nothing like the atmosphere of a live match!",
    category: "interests",
    npcOffset: { x: 3, y: 3 },
    cameraOffset: { x: 12.3, y: 5.9 },
    cameraOffsetMobile: { x: 15.1, y: 16.3 },
  },
  {
    id: "outro",
    title: "Let's Connect!",
    dialogue:
      "Thanks for taking the tour! I'd love to hear from you. Whether you want to discuss a project, chat about design, or just say hello - feel free to reach out!",
    category: "contact",
    gridPosition: { x: 24, y: 24 },
  },
];

// Get category label and color
export const CATEGORY_STYLES: Record<
  TourStop["category"],
  { label: string; color: string; bgColor: string }
> = {
  work: {
    label: "Work Experience",
    color: "text-blue-400",
    bgColor: "bg-blue-500/20",
  },
  education: {
    label: "Education",
    color: "text-green-400",
    bgColor: "bg-green-500/20",
  },
  startup: {
    label: "Startup",
    color: "text-purple-400",
    bgColor: "bg-purple-500/20",
  },
  interests: {
    label: "Interests",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/20",
  },
  contact: {
    label: "Contact",
    color: "text-pink-400",
    bgColor: "bg-pink-500/20",
  },
};

// Helper to find building center position in grid
export function findBuildingPosition(
  grid: any[][],
  buildingId: string
): { x: number; y: number } | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x];
      if (cell.buildingId === buildingId && cell.isOrigin) {
        // Get building definition to find footprint
        const building = getBuilding(buildingId);
        const footprint = building?.footprint || { width: 1, height: 1 };
        // Return center of the building instead of origin
        return {
          x: x + footprint.width / 2,
          y: y + footprint.height / 2,
        };
      }
    }
  }
  return null;
}
