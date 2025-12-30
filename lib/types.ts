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
}

export interface InterestNode {
  id: string;
  label: string;
  description: string;
  category?: 'design' | 'business' | 'tech' | 'research';
  x?: number;
  y?: number;
}

export interface InterestConnection {
  source: string;
  target: string;
  strength?: number;
}

export interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export interface Challenge {
  id: string;
  category: string;
  title: string;
  description: string;
  solution?: string;
  color?: string;
}
