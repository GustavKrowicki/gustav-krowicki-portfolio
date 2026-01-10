'use client';

import ForceDirectedGraph, { GraphNode } from './ForceDirectedGraph';

const challenges: GraphNode[] = [
  { id: 'data-quality', label: 'Data quality' },
  { id: 'algorithm', label: 'Algorithm behavior' },
  { id: 'stakeholders', label: 'Stakeholders' },
  { id: 'org-priorities', label: 'Organizational priorities' },
  { id: 'autonomy', label: 'User autonomy' },
];

const instructions = `
  <span class="font-semibold">Drag</span> challenge nodes to rearrange •
  <span class="font-semibold">Pan</span> to explore the map •
  <span class="font-semibold">Physics</span> simulation creates organic movement
`;

export default function ChallengeMap() {
  return (
    <ForceDirectedGraph
      nodes={challenges}
      links={[]}
      showCenter={true}
      centerLabel="Design Challenges"
      instructions={instructions}
    />
  );
}
