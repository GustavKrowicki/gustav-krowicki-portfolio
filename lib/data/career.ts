import { CityDistrict } from '../types';

export interface CareerEntry {
  id: string;
  title: string;
  company: string;
  period: string;
  description: string;
  district: CityDistrict;
  buildingId?: string;
  skills: string[];
}

export const careerEntries: CareerEntry[] = [
  {
    id: 'lego-2025',
    title: 'Digital Product Designer',
    company: 'LEGO',
    period: 'January 2025 - Present',
    description: 'Leading user research and interface design for ML-powered internal tools.',
    district: 'corporate',
    buildingId: 'lego-hq',
    skills: ['User Research', 'ML/AI Interfaces', 'Figma', 'Prototyping'],
  },
  {
    id: 'valtech-2023',
    title: 'Product Design Intern',
    company: 'Valtech',
    period: '2023',
    description: 'Worked on client projects including Vestas digital solutions.',
    district: 'corporate',
    buildingId: 'valtech-office',
    skills: ['Client Work', 'Journey Mapping', 'Wireframing', 'Design Systems'],
  },
  {
    id: 'cateit-2023',
    title: 'Co-Founder & Product Designer',
    company: 'Cate it',
    period: '2023 - 2024',
    description: 'Co-founded a food catering marketplace connecting customers with local caterers.',
    district: 'startup',
    buildingId: 'cate-it-office',
    skills: ['Entrepreneurship', 'Product Strategy', 'MVP Design', 'User Research'],
  },
  {
    id: 'sdu',
    title: 'BSc IT Product Development',
    company: 'University of Southern Denmark',
    period: '2021 - 2024',
    description: 'Studied IT product development with focus on UX design and development.',
    district: 'education',
    buildingId: 'sdu-campus',
    skills: ['Design Thinking', 'Development', 'Research Methods', 'Team Projects'],
  },
];

export const getCareerEntryById = (id: string): CareerEntry | undefined => {
  return careerEntries.find(c => c.id === id);
};

export const getCareerEntriesByDistrict = (district: CityDistrict): CareerEntry[] => {
  return careerEntries.filter(c => c.district === district);
};

export const getCareerEntryByBuildingId = (buildingId: string): CareerEntry | undefined => {
  return careerEntries.find(c => c.buildingId === buildingId);
};
