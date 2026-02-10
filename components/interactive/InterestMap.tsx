'use client';

import ForceDirectedGraph, { GraphNode, GraphLink } from './ForceDirectedGraph';

const interests: GraphNode[] = [
  { id: 'research', label: 'User Research', category: 'design' },
  { id: 'strategy', label: 'Product Strategy', category: 'design' },
  { id: 'interface', label: 'Interface Design', category: 'design' },
  { id: 'prototyping', label: 'Prototyping', category: 'design' },
  { id: 'systems', label: 'Design Systems', category: 'design' },
  { id: 'ml', label: 'ML/AI Tools', category: 'domain' },
  { id: 'workflows', label: 'Creative Workflows', category: 'domain' },
  { id: 'trust', label: 'Trust & Transparency', category: 'domain' },
  { id: 'emerging', label: 'Emerging Tech', category: 'domain' },
  { id: 'react', label: 'React/TypeScript', category: 'tech' },
  { id: 'd3', label: 'Visual asset generation', category: 'tech' },
  { id: 'thinking', label: 'Strategic Thinking', category: 'design' },
];

const links: GraphLink[] = [
  { source: 'research', target: 'strategy' },
  { source: 'research', target: 'interface' },
  { source: 'strategy', target: 'thinking' },
  { source: 'interface', target: 'prototyping' },
  { source: 'interface', target: 'systems' },
  { source: 'prototyping', target: 'react' },
  { source: 'systems', target: 'react' },
  { source: 'ml', target: 'emerging' },
  { source: 'ml', target: 'workflows' },
  { source: 'ml', target: 'trust' },
  { source: 'd3', target: 'react' },
  { source: 'd3', target: 'interface' },
  { source: 'thinking', target: 'ml' },
];

const categoryColors = {
  design: '#525252',
  tech: '#737373',
  domain: '#a3a3a3',
};

const legendItems = [
  { color: '#525252', label: 'Design' },
  { color: '#737373', label: 'Technology' },
  { color: '#a3a3a3', label: 'Domain' },
];

const instructions = `
  <span class="font-semibold">Drag</span> interests to rearrange •
  <span class="font-semibold">Connected</span> interests attract each other •
  <span class="font-semibold">Physics</span> simulation creates organic movement
`;

export default function InterestMap() {
  return (
    <ForceDirectedGraph
      nodes={interests}
      links={links}
      categoryColors={categoryColors}
      instructions={instructions}
      showLegend={true}
      legendItems={legendItems}
    />
  );
}
