// Tour system data - defines stops and dialogue for the guided city tour

export interface TourStop {
  id: string;
  buildingId?: string;
  gridPosition?: { x: number; y: number };
  title: string;
  dialogue: string;
  category: "work" | "education" | "startup" | "interests" | "contact";
  projectSlug?: string;
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
  },
  {
    id: "valtech",
    buildingId: "valtech-office",
    title: "Valtech Office",
    dialogue:
      "I interned here at Valtech, learning design at scale and working on enterprise digital experiences. This is where I really grew as a designer.",
    category: "work",
    projectSlug: "valtech",
  },
  {
    id: "sdu",
    buildingId: "sdu-kolding",
    title: "SDU Kolding",
    dialogue:
      "SDU Kolding is where I studied IT Product Design. This unique program taught me to bridge the gap between technology and user experience.",
    category: "education",
  },
  {
    id: "melbourne",
    buildingId: "melbourne-uni",
    title: "University of Melbourne",
    dialogue:
      "I spent a semester abroad in Melbourne, Australia! It was an incredible experience studying design in a completely different culture and environment.",
    category: "education",
  },
  {
    id: "berlin",
    buildingId: "berlin-uni",
    title: "Berlin University",
    dialogue:
      "Another exchange semester, this time in Berlin, Germany. The vibrant startup culture and design scene there really inspired my work.",
    category: "education",
  },
  {
    id: "erhvervsakademiet",
    buildingId: "erhvervsakademiet",
    title: "Business Academy",
    dialogue:
      "This is where my journey in multimedia design began. The practical, hands-on approach here gave me strong foundations in digital design.",
    category: "education",
  },
  {
    id: "cate-it",
    buildingId: "cate-it",
    title: "Cate it",
    dialogue:
      "This is my startup! Cate it is an AI-powered catering platform I co-founded. We're building the future of event catering with smart matching and seamless booking.",
    category: "startup",
    projectSlug: "cate-it",
  },
  {
    id: "northside",
    buildingId: "northside-stage",
    title: "Northside Festival",
    dialogue:
      "I love music and festivals! Northside is one of my favorites - great music, great vibes, and always a source of creative inspiration.",
    category: "interests",
  },
  {
    id: "skiing",
    buildingId: "ski-chute-1",
    title: "Ski Slopes",
    dialogue:
      "When I'm not designing, you might find me on the ski slopes! There's nothing like the rush of skiing down a mountain.",
    category: "interests",
  },
  {
    id: "stadium",
    buildingId: "aarhus-stadium",
    title: "Aarhus Stadium",
    dialogue:
      "Football is a big part of my life. I try to catch games at the stadium whenever I can - there's nothing like the atmosphere of a live match!",
    category: "interests",
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

// Helper to find building position in grid
export function findBuildingPosition(
  grid: any[][],
  buildingId: string
): { x: number; y: number } | null {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const cell = grid[y][x];
      if (cell.buildingId === buildingId && cell.isOrigin) {
        return { x, y };
      }
    }
  }
  return null;
}
