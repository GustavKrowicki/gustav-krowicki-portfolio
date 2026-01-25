import { Project } from './types';

export const projects: Project[] = [
  {
    id: '1',
    title: 'ML-Assisted Internal Product',
    slug: 'lego',
    shortDescription: 'Conducted research and designed interfaces for an ML-powered tool at LEGO',
    fullDescription: 'Led user research and interface design for an internal machine learning-assisted product at LEGO, focusing on understanding complex user needs and translating ML capabilities into intuitive workflows.',
    role: 'Digital Product Designer',
    timeline: 'January 2025 - Present',
    team: ['Product Manager', 'ML Engineers', 'Developers'],
    tools: ['Figma', 'Miro', 'User Research', 'Prototyping'],
    tags: ['Research', 'ML/AI', 'Enterprise', 'Product Design'],
    featured: true,
    coverImage: '/images/lego/LEGO cover.png',
    order: 1,
    city: {
      district: 'corporate',
      buildingSprite: 'building-lego',
      position: { x: 100, y: 100 },
      dialogContent: 'Leading ML interface design at LEGO',
    },
  },
  {
    id: '2',
    title: 'Cate it - Food Catering Platform',
    slug: 'cate-it',
    shortDescription: 'Co-founded and designed a platform connecting customers with local caterers',
    fullDescription: 'Co-founded Cate it, a digital platform designed to connect customers with local caterers. Led product strategy and UX design, focusing on building trust in a two-sided marketplace.',
    role: 'Co-Founder & Product Designer',
    timeline: '2023 - 2024',
    team: ['Co-founder', 'Developers'],
    tools: ['Figma', 'User Research', 'Business Strategy', 'MVP Design'],
    tags: ['Entrepreneurship', 'Strategy', 'UX Design', 'Marketplace'],
    featured: true,
    coverImage: '/images/cate-it/cate it cover2.png',
    order: 2,
    city: {
      district: 'startup',
      buildingSprite: 'building-cateit',
      position: { x: 150, y: 400 },
      dialogContent: 'Co-founded a food catering marketplace',
    },
  },
  {
    id: '3',
    title: 'Valtech Internship Projects',
    slug: 'valtech',
    shortDescription: 'Client work on digital solutions including research, prototyping, and design systems',
    fullDescription: 'Worked on various client projects at Valtech, including Vestas digital solutions. Contributed to user research, journey mapping, wireframing, and prototyping across multiple workstreams.',
    role: 'Product Design Intern',
    timeline: '2023',
    team: ['Design Team', 'Client Stakeholders'],
    tools: ['Figma', 'Miro', 'User Research', 'Journey Mapping', 'Prototyping'],
    tags: ['Client Work', 'Research', 'Prototyping', 'Design Systems'],
    featured: false,
    coverImage: '/images/valtech/valtech cover.png',
    order: 3,
    city: {
      district: 'corporate',
      buildingSprite: 'building-valtech',
      position: { x: 250, y: 150 },
      dialogContent: 'Design internship at a global agency',
    },
  },
  {
    id: '4',
    title: 'Visual asset generator',
    slug: 'viz-generator',
    shortDescription: 'Built a tool to generate custom visualizations for cate it branding',
    fullDescription: 'Designed and developed an interactive tool that generates data visualizations based on user-defined parameters. Combined design thinking with technical implementation.',
    role: 'Designer & Developer',
    timeline: '2024',
    tools: ['React', 'D3.js', 'Figma', 'TypeScript'],
    tags: ['Branding', 'Tool Design', 'Development'],
    featured: false,
    coverImage: '/images/viz-generator/Screenshot 2026-01-10 at 11.12.18.png',
    order: 4,
    city: {
      district: 'personal',
      buildingSprite: 'building-home',
      position: { x: 500, y: 450 },
      dialogContent: 'Personal project combining design and code',
    },
  },
];

export const getFeaturedProjects = (): Project[] => {
  return projects.filter(project => project.featured).sort((a, b) => a.order - b.order);
};

export const getProjectBySlug = (slug: string): Project | undefined => {
  return projects.find(project => project.slug === slug);
};

export const getAllProjects = (): Project[] => {
  return projects.sort((a, b) => a.order - b.order);
};
