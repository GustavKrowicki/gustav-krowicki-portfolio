'use client';

import ForceDirectedGraph, { GraphNode } from './ForceDirectedGraph';

const challenges: GraphNode[] = [
  { id: 'trust', label: 'Building Trust in AI' },
  { id: 'uncertainty', label: 'Algorithm Uncertainty' },
  { id: 'expectations', label: 'Creative Expectations' },
  { id: 'stakeholders', label: 'Stakeholder Alignment' },
  { id: 'complexity', label: 'Workflow Complexity' },
  { id: 'transparency', label: 'Transparency & Control' },
  { id: 'failure', label: 'Failure Mode Design' },
  { id: 'disclosure', label: 'Progressive Disclosure' },
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
