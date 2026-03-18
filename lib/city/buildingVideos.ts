export interface BuildingVideo {
  src: string;
  poster?: string;
  alt: string;
}

const BUILDING_VIDEOS: Record<string, BuildingVideo> = {
  "lego-hq": {
    src: "/videos/lego-walkthrough.mp4",
    alt: "Gustav presenting the LEGO case study",
  },
  "valtech-office": {
    src: "/videos/valtech-walkthrough.mp4",
    alt: "Gustav presenting the Valtech case study",
  },
  "cate-it": {
    src: "/videos/cate-it-walkthrough.mp4",
    alt: "Gustav presenting the Cate IT case study",
  },
  "viz-generator": {
    src: "/videos/viz-generator-walkthrough.mp4",
    alt: "Gustav presenting the Viz Generator case study",
  },
};

export function getBuildingVideo(
  buildingId: string
): BuildingVideo | null {
  return BUILDING_VIDEOS[buildingId] ?? null;
}
