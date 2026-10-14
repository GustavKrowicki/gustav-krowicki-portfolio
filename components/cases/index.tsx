import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// Case studies by project slug (lib/projects.ts). Each loads only when it opens, so the shell does not ship
// the case code (diagrams, maps) up front.
const loading = () => <p className="px-6 py-10 text-sm text-neutral-500">Loading case…</p>;

export const CASES: Record<string, ComponentType> = {
  lego: dynamic(() => import('./LegoCase'), { loading }),
  valtech: dynamic(() => import('./ValtechCase'), { loading }),
  'cate-it': dynamic(() => import('./CateItCase'), { loading }),
  'viz-generator': dynamic(() => import('./VizGeneratorCase'), { loading }),
};
