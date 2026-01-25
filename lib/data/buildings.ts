import { CityDistrict } from '../types';

export interface Building {
  id: string;
  name: string;
  type: 'project' | 'landmark' | 'decoration';
  district: CityDistrict;
  gridPosition: { x: number; y: number }; // Grid coordinates (0-19, 0-14)
  sprite: string;
  projectSlug?: string;
  description?: string;
  interactable: boolean;
}

export const buildings: Building[] = [
  // Corporate District (top-left quadrant: x < 10, y < 7.5)
  {
    id: 'lego-hq',
    name: 'LEGO HQ',
    type: 'project',
    district: 'corporate',
    gridPosition: { x: 3, y: 3 },
    sprite: 'building-lego',
    projectSlug: 'lego',
    description: 'ML-Assisted Internal Product',
    interactable: true,
  },
  {
    id: 'valtech-office',
    name: 'Valtech Office',
    type: 'project',
    district: 'corporate',
    gridPosition: { x: 6, y: 5 },
    sprite: 'building-valtech',
    projectSlug: 'valtech',
    description: 'Design Internship',
    interactable: true,
  },

  // Education District (top-right quadrant: x >= 10, y < 7.5)
  {
    id: 'sdu-campus',
    name: 'SDU Campus',
    type: 'landmark',
    district: 'education',
    gridPosition: { x: 14, y: 4 },
    sprite: 'building-sdu',
    description: 'University of Southern Denmark',
    interactable: true,
  },

  // Startup District (bottom-left quadrant: x < 10, y >= 7.5)
  {
    id: 'cate-it-office',
    name: 'Cate it Office',
    type: 'project',
    district: 'startup',
    gridPosition: { x: 4, y: 10 },
    sprite: 'building-cateit',
    projectSlug: 'cate-it',
    description: 'Food Catering Platform',
    interactable: true,
  },

  // Personal District (bottom-right quadrant: x >= 10, y >= 7.5)
  {
    id: 'home-office',
    name: 'Home Office',
    type: 'project',
    district: 'personal',
    gridPosition: { x: 14, y: 11 },
    sprite: 'building-home',
    projectSlug: 'viz-generator',
    description: 'Personal Projects',
    interactable: true,
  },
];

export const getBuildingById = (id: string): Building | undefined => {
  return buildings.find(b => b.id === id);
};

export const getBuildingsByDistrict = (district: CityDistrict): Building[] => {
  return buildings.filter(b => b.district === district);
};

export const getInteractableBuildings = (): Building[] => {
  return buildings.filter(b => b.interactable);
};

export const getBuildingByProjectSlug = (slug: string): Building | undefined => {
  return buildings.find(b => b.projectSlug === slug);
};
