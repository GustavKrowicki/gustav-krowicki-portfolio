'use client';

import ForceDirectedGraph, { GraphNode } from './ForceDirectedGraph';

const challenges: GraphNode[] = [
  { id: 'data-quality', label: 'Data quality' },
  { id: 'algorithm', label: 'Algorithm behavior' },
  { id: 'stakeholders', label: 'Stakeholders' },
  { id: 'org-priorities', label: 'Organizational priorities' },
  { id: 'autonomy', label: 'User autonomy' },
];


export default function ChallengeMap() {
  return (
    <ForceDirectedGraph
      nodes={challenges}
      links={[]}
      showCenter={true}
      centerLabel="Design Challenges"
    
    />
  );
}
