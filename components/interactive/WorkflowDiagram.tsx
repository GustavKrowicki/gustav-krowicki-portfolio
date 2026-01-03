'use client';

import { useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  NodeProps,
  BackgroundVariant,
  MarkerType,
  Handle,
  Position,
} from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import { shouldReduceMotion } from '@/lib/utils';
import {
  Upload,
  Settings,
  BarChart3,
  Download,
  Play
} from 'lucide-react';

interface WorkflowNodeData {
  title: string;
  description: string;
  details: string;
  icon: React.ComponentType<any>;
  index: number;
}

// Custom node component
function WorkflowNode({ data, selected }: NodeProps<WorkflowNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = data.icon;
  const reduceMotion = shouldReduceMotion();

  return (
    <div className="workflow-node">
      {/* Input handle (left side) */}
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: '#555' }}
      />

      <motion.button
        className="w-64 text-center bg-white rounded-2xl p-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 cursor-move relative"
        onClick={() => setIsExpanded(!isExpanded)}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{
          opacity: 1,
          scale: 1,
          boxShadow: selected
            ? '0 8px 24px -6px rgba(0, 0, 0, 0.15), 0 0 0 2px rgba(37, 99, 235, 0.15)'
            : '0 6px 20px -6px rgba(0, 0, 0, 0.12)',
        }}
        transition={{
          opacity: { duration: reduceMotion ? 0 : 0.3, delay: data.index * 0.1 },
          scale: {
            duration: reduceMotion ? 0 : 0.3,
            delay: reduceMotion ? 0 : data.index * 0.1,
            type: 'spring',
            stiffness: 260,
            damping: 20
          },
          boxShadow: { duration: 0.2 }
        }}
        style={{
          border: selected ? '2px solid #2563eb' : '2px solid #e5e5e5'
        }}
      >
        {/* Icon */}
        <motion.div
          className="w-16 h-16 rounded-xl mx-auto mb-3 flex items-center justify-center pointer-events-none"
          animate={{
            backgroundColor: isExpanded ? '#2563eb' : '#f5f5f5',
            scale: isExpanded ? 1.1 : 1
          }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
        >
          <Icon
            className={isExpanded ? 'text-white' : 'text-accent'}
            size={32}
          />
        </motion.div>

        {/* Title */}
        <h3 className="text-lg font-bold mb-2 text-foreground pointer-events-none">
          {data.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-neutral-600 leading-relaxed px-1 pointer-events-none">
          {data.description}
        </p>

        {/* Click indicator */}
        <div className="mt-3 text-[10px] font-medium text-neutral-500 pointer-events-none">
          {isExpanded ? '▼ Click to collapse' : '▼ Click for details'}
        </div>
      </motion.button>

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#555' }}
      />

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.3 }}
            className="overflow-hidden pointer-events-none"
          >
            <div className="w-64 bg-white border-2 border-accent rounded-xl p-4 shadow-lg">
              <p className="text-xs text-neutral-700 leading-relaxed">
                {data.details}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Start node component
function StartNode() {
  const reduceMotion = shouldReduceMotion();

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: reduceMotion ? 0 : 0.4 }}
    >
      <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg">
        <Play className="text-white fill-white" size={28} />
      </div>
      <span className="text-xs font-bold text-green-600 uppercase tracking-wider">Start</span>

      {/* Output handle (right side) */}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: '#22c55e' }}
      />
    </motion.div>
  );
}

const nodeTypes = {
  workflowNode: WorkflowNode,
  startNode: StartNode,
};

const steps = [
  {
    id: 'input',
    title: 'Input Data',
    description: 'User uploads or connects data source',
    details: 'Users can import CSV files, paste data directly, or connect to live data sources. The system automatically detects data types and suggests appropriate visualizations.',
    icon: Upload
  },
  {
    id: 'configure',
    title: 'Configure',
    description: 'Set visualization type and parameters',
    details: 'Choose chart types, adjust colors, set axis labels, and fine-tune visual properties through an intuitive interface. Real-time preview updates as you adjust settings.',
    icon: Settings
  },
  {
    id: 'generate',
    title: 'Generate',
    description: 'Tool processes and creates the visualization',
    details: 'The engine processes your data and configuration to generate a polished, interactive visualization. Advanced algorithms optimize layout and presentation for clarity.',
    icon: BarChart3
  },
  {
    id: 'export',
    title: 'Export',
    description: 'Download or embed the result',
    details: 'Export as PNG, SVG, or interactive HTML. Get embed codes for websites or download publication-ready graphics. All outputs are optimized for your use case.',
    icon: Download
  }
];

// Initial node positions (horizontal layout with start node)
const initialNodes: Node<WorkflowNodeData>[] = [
  // Start node
  {
    id: 'start',
    type: 'startNode',
    position: { x: -150, y: 100 },
    data: {} as any,
    draggable: false,
  },
  // Workflow nodes
  ...steps.map((step, index) => ({
    id: step.id,
    type: 'workflowNode',
    position: { x: index * 350, y: 50 },
    data: {
      title: step.title,
      description: step.description,
      details: step.details,
      icon: step.icon,
      index: index,
    },
    draggable: true,
  }))
];

// Initial edges connecting the nodes with arrow markers
const initialEdges: Edge[] = [
  // Start to first node
  {
    id: 'start-input',
    source: 'start',
    target: 'input',
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#22c55e',
      strokeWidth: 3,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#22c55e',
      width: 20,
      height: 20,
    },
  },
  // Connections between workflow nodes
  ...steps.slice(0, -1).map((step, index) => ({
    id: `${step.id}-${steps[index + 1].id}`,
    source: step.id,
    target: steps[index + 1].id,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: '#a3a3a3',
      strokeWidth: 2.5,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#a3a3a3',
      width: 20,
      height: 20,
    },
  }))
];

export default function WorkflowDiagram() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="w-full py-12 relative" role="region" aria-label="Interactive workflow diagram">
      <div className="w-full h-125 border border-neutral-200 rounded-2xl overflow-hidden bg-white shadow-sm">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.5}
          maxZoom={1.5}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          zoomOnScroll={false}
          panOnScroll={true}
          panOnDrag={[1, 2]}
          edgesUpdatable={false}
          edgesFocusable={false}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1.5}
            color="#d4d4d4"
            style={{ opacity: 0.5 }}
          />
          <Controls
            showZoom={false}
            showFitView={true}
            showInteractive={false}
            className="bg-white border border-neutral-200 rounded-lg shadow-sm"
          />
        </ReactFlow>
      </div>

  
    </div>
  );
}
