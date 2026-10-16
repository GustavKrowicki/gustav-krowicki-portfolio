export type CityDistrict = 'corporate' | 'education' | 'startup' | 'personal';

export interface CityBuildingConfig {
  district: CityDistrict;
  buildingSprite: string;
  position: { x: number; y: number };
  dialogContent?: string;
  videoUrl?: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription?: string;
  role: string;
  timeline: string;
  team?: string[];
  tools: string[];
  tags: string[];
  featured: boolean;
  coverImage: string;
  link?: string;
  order: number;
  city?: CityBuildingConfig;
}
