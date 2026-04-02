'use client';

import ForceDirectedGraph, { GraphNode, GraphLink } from './ForceDirectedGraph';

const interests: GraphNode[] = [
  // Personal
  { id: 'football', label: 'Football', category: 'personal' },
  { id: 'sports', label: 'Sports', category: 'personal' },
  { id: 'skiing', label: 'Skiing', category: 'personal' },
  { id: 'reading', label: 'Book Reading', category: 'personal' },
  { id: 'concerts', label: 'Concerts', category: 'personal' },
  { id: 'city-living', label: 'City Living', category: 'personal' },
  { id: 'travelling', label: 'Travelling', category: 'personal' },
  { id: 'cooking', label: 'Cooking', category: 'personal' },
  { id: 'trail-running', label: 'Trail-Running', category: 'personal' },
  // Professional
  { id: 'interface', label: 'Interface Design', category: 'professional' },
  { id: 'systems', label: 'Design Systems', category: 'professional' },
  { id: 'prototyping', label: 'Prototyping', category: 'professional' },
  { id: 'strategy', label: 'Product Strategy', category: 'professional' },
  { id: 'strategic-thinking', label: 'Strategic Thinking', category: 'professional' },
  { id: 'system-thinking', label: 'System Thinking', category: 'professional' },
  { id: 'friction', label: 'Design Friction', category: 'professional' },
  { id: 'human-ai', label: 'Human-AI Interaction', category: 'professional' },
];

const links: GraphLink[] = [
  // Personal connections
  { source: 'football', target: 'sports' },
  { source: 'skiing', target: 'sports' },
  { source: 'trail-running', target: 'sports' },
  { source: 'city-living', target: 'concerts' },
  { source: 'city-living', target: 'cooking' },
  { source: 'travelling', target: 'city-living' },
  { source: 'travelling', target: 'skiing' },
  { source: 'reading', target: 'cooking' },
  // Professional connections
  { source: 'interface', target: 'systems' },
  { source: 'interface', target: 'prototyping' },
  { source: 'strategy', target: 'strategic-thinking' },
  { source: 'strategic-thinking', target: 'system-thinking' },
  { source: 'system-thinking', target: 'friction' },
  { source: 'human-ai', target: 'friction' },
  { source: 'human-ai', target: 'interface' },
  { source: 'prototyping', target: 'human-ai' },
  // Cross-category connections
  { source: 'reading', target: 'strategic-thinking' },
  { source: 'travelling', target: 'system-thinking' },
];

const categoryColors: Record<string, string> = {
  personal: '#525252',
  professional: '#a3a3a3',
};

const legendItems = [
  { color: '#525252', label: 'Personal' },
  { color: '#a3a3a3', label: 'Professional' },
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
