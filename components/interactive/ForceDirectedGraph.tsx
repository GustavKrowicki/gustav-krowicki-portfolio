'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { shouldReduceMotion } from '@/lib/utils';

export interface GraphNode {
  id: string;
  label: string;
  category?: string;
}

export interface GraphLink {
  source: string;
  target: string;
}

interface ForceDirectedGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  centerLabel?: string;
  showCenter?: boolean;
  categoryColors?: Record<string, string>;
  instructions?: string;
  showLegend?: boolean;
  legendItems?: Array<{ color: string; label: string }>;
}

export default function ForceDirectedGraph({
  nodes,
  links,
  centerLabel,
  showCenter = false,
  categoryColors = {},
  instructions,
  showLegend = false,
  legendItems = [],
}: ForceDirectedGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const simulationRef = useRef<d3.Simulation<any, any> | null>(null);

  useEffect(() => {
    // Handle responsive sizing
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.min(600, Math.max(400, width * 0.6));
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    const { width, height } = dimensions;
    const reduceMotion = shouldReduceMotion();

    // Clear previous content
    svg.selectAll('*').remove();

    // Create container group
    const g = svg.append('g');

    // Prepare nodes data
    let allNodes = nodes.map(d => ({ ...d }));

    // Add center node if needed
    if (showCenter && centerLabel) {
      allNodes = [
        { id: 'center', label: centerLabel, category: 'center' },
        ...allNodes
      ];
    }

    // Prepare links data
    let linkData = links.map(d => ({ ...d }));

    // If showing center, create links from center to all nodes
    if (showCenter && centerLabel) {
      const centerLinks = nodes.map((node) => ({
        source: 'center',
        target: node.id,
      }));
      linkData = centerLinks;
    }

    // Create force simulation
    const simulation = d3.forceSimulation(allNodes)
      .force('link', d3.forceLink(linkData)
        .id((d: any) => d.id)
        .distance(showCenter ? 200 : 100)
        .strength(showCenter ? 0.5 : 0.3)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius(50)
        .strength(0.8)
      )
      .alphaDecay(reduceMotion ? 1 : 0.02);

    simulationRef.current = simulation;

    // Create links
    const link = g.append('g')
      .selectAll('line')
      .data(linkData)
      .join('line')
      .attr('stroke', '#d4d4d4')
      .attr('stroke-width', 1)
      .attr('stroke-opacity', 0.4);

    // Create node groups
    const node = g.append('g')
      .selectAll('g')
      .data(allNodes)
      .join('g')
      .call(d3.drag<SVGGElement, any>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    // Add circles or special styling for center node
    node.each(function(d: any) {
      const nodeGroup = d3.select(this);

      if (d.category === 'center') {
        // Center node - larger with dark background
        nodeGroup.append('rect')
          .attr('x', -80)
          .attr('y', -18)
          .attr('width', 160)
          .attr('height', 36)
          .attr('rx', 18)
          .attr('fill', '#171717')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        nodeGroup.append('text')
          .text(d.label)
          .attr('text-anchor', 'middle')
          .attr('y', 4)
          .attr('font-size', '14px')
          .attr('font-weight', '600')
          .attr('fill', '#ffffff')
          .style('user-select', 'none')
          .style('cursor', 'grab');
      } else {
        // Regular nodes
        const color = d.category && categoryColors[d.category]
          ? categoryColors[d.category]
          : '#525252';

        nodeGroup.append('circle')
          .attr('r', 6)
          .attr('fill', color)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        nodeGroup.append('text')
          .text(d.label)
          .attr('x', 12)
          .attr('y', 4)
          .attr('font-size', '13px')
          .attr('font-weight', '500')
          .attr('fill', '#171717')
          .style('user-select', 'none')
          .style('cursor', 'grab');
      }
    });

    // Add hover effects
    node
      .style('cursor', 'grab')
      .on('mouseenter', function(event, d: any) {
        const nodeGroup = d3.select(this);

        if (d.category === 'center') {
          nodeGroup.select('text')
            .transition()
            .duration(200)
            .attr('font-weight', '700');
        } else {
          nodeGroup.select('circle')
            .transition()
            .duration(200)
            .attr('r', 8)
            .attr('stroke-width', 3);

          nodeGroup.select('text')
            .transition()
            .duration(200)
            .attr('font-weight', '700');
        }
      })
      .on('mouseleave', function(event, d: any) {
        const nodeGroup = d3.select(this);

        if (d.category === 'center') {
          nodeGroup.select('text')
            .transition()
            .duration(200)
            .attr('font-weight', '600');
        } else {
          nodeGroup.select('circle')
            .transition()
            .duration(200)
            .attr('r', 6)
            .attr('stroke-width', 2);

          nodeGroup.select('text')
            .transition()
            .duration(200)
            .attr('font-weight', '500');
        }
      });

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
      d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grabbing');
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      // Keep nodes fixed where user dropped them
      // d.fx and d.fy are already set from dragged()
      d3.select(event.sourceEvent.target.parentNode).style('cursor', 'grab');
    }

    return () => {
      simulation.stop();
    };
  }, [dimensions, nodes, links, centerLabel, showCenter, categoryColors]);

  return (
    <div className="w-full py-12 relative" role="region" aria-label="Interactive force-directed graph">
      <div
        ref={containerRef}
        className="w-full border border-neutral-200 rounded-2xl overflow-hidden bg-neutral-50 shadow-sm"
      >
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto"
        />
      </div>

      {/* Instructions */}
      {instructions && (
        <div className="mt-6 text-center">
          <p className="text-sm text-neutral-600" dangerouslySetInnerHTML={{ __html: instructions }} />
        </div>
      )}

      {/* Legend */}
      {showLegend && legendItems.length > 0 && (
        <div className="mt-4 flex justify-center gap-6 text-xs text-neutral-600">
          {legendItems.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
