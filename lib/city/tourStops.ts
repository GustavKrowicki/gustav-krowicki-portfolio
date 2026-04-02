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
      "Welcome to my city! I'm Gustav, a digital product designer based in Denmark. Let me show you around my portfolio through this 3d world I've built.",
    category: "work",
    gridPosition: { x: 24, y: 24 },
    cameraOffset: { x: 0, y: 0 },
  },
  {
    id: "lego",
    buildingId: "lego-hq",
    title: "LEGO HQ",
    dialogue:
      "The Lego Group is where I currently work as a student worker. I'm designing a machine learning-assisted tool that ensure the right product mix on the shelves. No doubt, that i  am proud giving back to brand that has given me so much joy growing up.",
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
      "I interned here at Valtech for 6 months, learning design at scale and working on enterprise digital experiences. This is where I really grew as a designer. ",
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
      "SDU Kolding is where i am currently finishing my studies in ITD product design here in the summer of 26. The studies are focused on bridging the gap between technology and user experience, from a physical product perspective.",
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
      "I spent a semester abroad in Melbourne, Australia! My interests in physical design came from this experience, where I had heaps of fun during the courses design fundamentals and design prototyping. Long nights in the studio, and lots of fun nights out :)",
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
      "An exchange semester in Berlin, Germany. I had big personal growth during this semester, and studied with a lot of interesting and good people from all over the world in a graphic design program.",
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
      "This is where my journey in multimedia design began. The practical, hands-on approach here gave me strong foundations in digital design. Playing around with website design, learning html, css and APIs really opened my eyes to the possibilities of digital design.",
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
      "This is side-project! Cate-it is a bookingplatform for food trucks, where you can book a food truck for your event. We are 3 persons on this project. Check out the case study!",
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
      "I like to read! I try to always have a book going, usally in the mix of fiction and non-fiction books. The library is a great place, so why not use it?",
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
      "I love music and festivals! Northside festival is one that I am looking forward to this summer. Check out some of the artists that are playing this year, and see you in the crowd then.",
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
      "When I'm not designing, you might find me on the ski slopes! There's nothing like the rush of skiing down a mountain in the fresh air.",
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
      "I follow the ups-and-downs of the local football team AGF. I love to go the games, and support the team in the stands. Crossing my fingers for magical moments this summer!",
    category: "interests",
    npcOffset: { x: 3, y: 3 },
    cameraOffset: { x: 12.3, y: 5.9 },
    cameraOffsetMobile: { x: 15.1, y: 16.3 },
  },
  {
    id: "outro",
    title: "Let's Connect!",
    dialogue:
      "Thanks for taking the tour! Hope you had fun exploring my city. I'm always open for a chat, so feel free to reach out!",
    category: "contact",
    gridPosition: { x: 24, y: 24 },
    cameraOffset: { x: 0, y: 0 },
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
