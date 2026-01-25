import { CityDistrict } from '../types';

export interface District {
  id: CityDistrict;
  name: string;
  description: string;
  color: string;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const districts: District[] = [
  {
    id: 'corporate',
    name: 'Corporate District',
    description: 'Major companies and enterprise work',
    color: '#3B82F6', // blue
    bounds: { x: 0, y: 0, width: 400, height: 300 },
  },
  {
    id: 'education',
    name: 'Education District',
    description: 'University and academic projects',
    color: '#10B981', // green
    bounds: { x: 400, y: 0, width: 300, height: 300 },
  },
  {
    id: 'startup',
    name: 'Startup District',
    description: 'Entrepreneurial ventures',
    color: '#F59E0B', // amber
    bounds: { x: 0, y: 300, width: 350, height: 300 },
  },
  {
    id: 'personal',
    name: 'Personal District',
    description: 'Side projects and experiments',
    color: '#8B5CF6', // purple
    bounds: { x: 350, y: 300, width: 350, height: 300 },
  },
];

export const getDistrictById = (id: CityDistrict): District | undefined => {
  return districts.find(d => d.id === id);
};

export const getDistrictAtPosition = (x: number, y: number): District | undefined => {
  return districts.find(d =>
    x >= d.bounds.x &&
    x < d.bounds.x + d.bounds.width &&
    y >= d.bounds.y &&
    y < d.bounds.y + d.bounds.height
  );
};
