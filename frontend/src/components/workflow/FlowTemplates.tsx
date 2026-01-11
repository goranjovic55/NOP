/**
 * FlowTemplates - Predefined workflow templates
 * Supports shift+click selection for copying content to clipboard
 */

import React, { useState, useCallback } from 'react';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';
import { CyberButton } from '../CyberUI';

interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'scanning' | 'access' | 'traffic' | 'agent' | 'utility';
  icon: string;
  nodes: Partial<WorkflowNode>[];
  edges: Partial<WorkflowEdge>[];
}

// Predefined templates
const TEMPLATES: FlowTemplate[] = [
  {
    id: 'ping-sweep',
    name: 'Ping Sweep',
    description: 'Ping multiple hosts in sequence',
    category: 'traffic',
    icon: '≋',
    nodes: [
      { type: 'block', position: { x: 100, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 200 }, data: { label: 'For Each Host', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{ $vars.hosts }}', variable: 'host' } } },
      { type: 'block', position: { x: 100, y: 300 }, data: { label: 'Ping Host', type: 'traffic.ping', category: 'traffic', parameters: { host: '{{ $item }}', count: 3 } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'Wait 1s', type: 'control.delay', category: 'control', parameters: { seconds: 1 } } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'reachable', targetHandle: 'in' },
      { source: '4', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '5', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'ssh-multi-command',
    name: 'SSH Multi-Command',
    description: 'Execute multiple SSH commands in sequence',
    category: 'access',
    icon: '⬡',
    nodes: [
      { type: 'block', position: { x: 100, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 200 }, data: { label: 'Test SSH', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{ $vars.target }}', username: 'root' } } },
      { type: 'block', position: { x: 100, y: 300 }, data: { label: 'Get Hostname', type: 'command.ssh_execute', category: 'command', parameters: { command: 'hostname' } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'Get OS Info', type: 'command.ssh_execute', category: 'command', parameters: { command: 'cat /etc/os-release' } } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'success', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'port-scan-version',
    name: 'Port Scan + Version',
    description: 'Scan ports then detect service versions',
    category: 'scanning',
    icon: '◈',
    nodes: [
      { type: 'block', position: { x: 100, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 200 }, data: { label: 'Port Scan', type: 'scanning.port_scan', category: 'scanning', parameters: { scanType: 'quick' } } },
      { type: 'block', position: { x: 100, y: 300 }, data: { label: 'Has Open Ports?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.openPorts.length > 0 }}' } } },
      { type: 'block', position: { x: 50, y: 400 }, data: { label: 'Version Detection', type: 'scanning.version_detect', category: 'scanning', parameters: {} } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'true', targetHandle: 'in' },
      { source: '3', target: '5', sourceHandle: 'false', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'traffic-burst',
    name: 'Traffic Burst Capture',
    description: 'Capture traffic burst and analyze',
    category: 'traffic',
    icon: '⊙',
    nodes: [
      { type: 'block', position: { x: 100, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 200 }, data: { label: 'Burst Capture', type: 'traffic.burst_capture', category: 'traffic', parameters: { duration_seconds: 5 } } },
      { type: 'block', position: { x: 100, y: 300 }, data: { label: 'Get Stats', type: 'traffic.get_stats', category: 'traffic', parameters: { period: '1m' } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'agent-deploy-chain',
    name: 'Agent Deploy Chain',
    description: 'Generate and deploy agent to target',
    category: 'agent',
    icon: '◆',
    nodes: [
      { type: 'block', position: { x: 100, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 200 }, data: { label: 'Generate Agent', type: 'agent.generate', category: 'agent', parameters: { platform: 'linux-amd64' } } },
      { type: 'block', position: { x: 100, y: 300 }, data: { label: 'Deploy Agent', type: 'agent.deploy', category: 'agent', parameters: { autoStart: true } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'Wait for Callback', type: 'control.delay', category: 'control', parameters: { seconds: 30 } } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'parallel-scan',
    name: 'Parallel Scan',
    description: 'Scan multiple hosts in parallel',
    category: 'scanning',
    icon: '⫴',
    nodes: [
      { type: 'block', position: { x: 200, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 200, y: 200 }, data: { label: 'Parallel Scan', type: 'control.parallel', category: 'control', parameters: { maxConcurrent: 3 } } },
      { type: 'block', position: { x: 50, y: 300 }, data: { label: 'Scan Host 1', type: 'scanning.port_scan', category: 'scanning', parameters: {} } },
      { type: 'block', position: { x: 200, y: 300 }, data: { label: 'Scan Host 2', type: 'scanning.port_scan', category: 'scanning', parameters: {} } },
      { type: 'block', position: { x: 350, y: 300 }, data: { label: 'Scan Host 3', type: 'scanning.port_scan', category: 'scanning', parameters: {} } },
      { type: 'block', position: { x: 200, y: 400 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'branch1', targetHandle: 'in' },
      { source: '2', target: '4', sourceHandle: 'branch2', targetHandle: 'in' },
      { source: '2', target: '5', sourceHandle: 'branch3', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '6', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'conditional-access',
    name: 'Conditional Access',
    description: 'Try SSH, fallback to RDP if fails',
    category: 'access',
    icon: '◇',
    nodes: [
      { type: 'block', position: { x: 150, y: 100 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 150, y: 200 }, data: { label: 'Try SSH', type: 'connection.ssh_test', category: 'connection', parameters: {} } },
      { type: 'block', position: { x: 50, y: 300 }, data: { label: 'SSH Command', type: 'command.ssh_execute', category: 'command', parameters: {} } },
      { type: 'block', position: { x: 250, y: 300 }, data: { label: 'Try RDP', type: 'connection.rdp_test', category: 'connection', parameters: {} } },
      { type: 'block', position: { x: 150, y: 400 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'success', targetHandle: 'in' },
      { source: '2', target: '4', sourceHandle: 'failure', targetHandle: 'in' },
      { source: '3', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'success', targetHandle: 'in' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  scanning: 'border-amber-500 bg-amber-500/10',
  access: 'border-cyber-blue bg-cyber-blue/10',
  traffic: 'border-cyber-purple bg-cyber-purple/10',
  agent: 'border-cyber-red bg-cyber-red/10',
  utility: 'border-cyber-gray bg-cyber-gray/10',
};

interface FlowTemplatesProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertTemplate: (nodes: Partial<WorkflowNode>[], edges: Partial<WorkflowEdge>[]) => void;
}

const FlowTemplates: React.FC<FlowTemplatesProps> = ({ isOpen, onClose, onInsertTemplate }) => {
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  // Handle template click with shift+select support
  const handleTemplateClick = useCallback((template: FlowTemplate, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift+click: Toggle selection for copy
      setSelectedTemplateIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(template.id)) {
          newSet.delete(template.id);
        } else {
          newSet.add(template.id);
        }
        return newSet;
      });
      setLastClickedId(template.id);
    } else {
      // Normal click: Insert template
      onInsertTemplate(template.nodes, template.edges);
    }
  }, [onInsertTemplate]);

  // Copy selected templates to clipboard
  const handleCopySelected = useCallback(async () => {
    if (selectedTemplateIds.size === 0) return;
    
    const selectedTemplates = TEMPLATES.filter(t => selectedTemplateIds.has(t.id));
    
    // Combine all nodes and edges from selected templates
    const allNodes: Partial<WorkflowNode>[] = [];
    const allEdges: Partial<WorkflowEdge>[] = [];
    let nodeOffset = 0;
    
    selectedTemplates.forEach((template, templateIndex) => {
      const yOffset = templateIndex * 600;
      
      template.nodes.forEach((node, idx) => {
        allNodes.push({
          ...node,
          position: {
            x: (node.position?.x || 0),
            y: (node.position?.y || 0) + yOffset,
          },
        });
      });
      
      template.edges.forEach(edge => {
        allEdges.push({
          ...edge,
          source: `${nodeOffset + parseInt(edge.source || '0')}`,
          target: `${nodeOffset + parseInt(edge.target || '0')}`,
        });
      });
      
      nodeOffset += template.nodes.length;
    });
    
    const clipboardData = {
      type: 'nop-flow-templates',
      nodes: allNodes,
      edges: allEdges,
      templates: selectedTemplates.map(t => t.name),
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2));
      setSelectedTemplateIds(new Set());
      alert(`Copied ${selectedTemplates.length} template(s) to clipboard!`);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [selectedTemplateIds]);

  // Insert all selected templates
  const handleInsertSelected = useCallback(() => {
    if (selectedTemplateIds.size === 0) return;
    
    const selectedTemplates = TEMPLATES.filter(t => selectedTemplateIds.has(t.id));
    
    // Combine all nodes and edges
    const allNodes: Partial<WorkflowNode>[] = [];
    const allEdges: Partial<WorkflowEdge>[] = [];
    
    selectedTemplates.forEach((template, templateIndex) => {
      const yOffset = templateIndex * 600;
      
      template.nodes.forEach(node => {
        allNodes.push({
          ...node,
          position: {
            x: (node.position?.x || 0),
            y: (node.position?.y || 0) + yOffset,
          },
        });
      });
      
      allEdges.push(...template.edges);
    });
    
    onInsertTemplate(allNodes, allEdges);
    setSelectedTemplateIds(new Set());
  }, [selectedTemplateIds, onInsertTemplate]);

  // Filter templates
  const filteredTemplates = filter === 'all' 
    ? TEMPLATES 
    : TEMPLATES.filter(t => t.category === filter);

  if (!isOpen) return null;

  return (
    <div className="w-80 bg-cyber-dark border-l border-cyber-gray flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-cyber-gray flex items-center justify-between">
        <h3 className="text-cyber-purple font-mono font-bold flex items-center gap-2">
          <span>◈</span> TEMPLATES
        </h3>
        <button
          onClick={onClose}
          className="text-cyber-gray hover:text-cyber-red transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Filter tabs */}
      <div className="p-2 border-b border-cyber-gray flex flex-wrap gap-1">
        {['all', 'scanning', 'access', 'traffic', 'agent'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 text-xs font-mono uppercase transition-colors ${
              filter === cat
                ? 'bg-cyber-purple text-white'
                : 'bg-cyber-darker text-cyber-gray-light hover:bg-cyber-gray/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Selection actions */}
      {selectedTemplateIds.size > 0 && (
        <div className="p-2 border-b border-cyber-gray bg-cyber-purple/20 flex items-center gap-2">
          <span className="text-cyber-purple text-sm font-mono">
            {selectedTemplateIds.size} selected
          </span>
          <div className="flex-1" />
          <CyberButton variant="blue" size="sm" onClick={handleCopySelected}>
            ⎘ COPY
          </CyberButton>
          <CyberButton variant="green" size="sm" onClick={handleInsertSelected}>
            + INSERT
          </CyberButton>
          <button
            onClick={() => setSelectedTemplateIds(new Set())}
            className="text-cyber-gray hover:text-cyber-red text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="px-3 py-2 bg-cyber-darker/50 text-cyber-gray-light text-xs">
        <span className="text-cyber-blue">Click</span> to insert • 
        <span className="text-cyber-purple ml-1">Shift+Click</span> to select for copy
      </div>

      {/* Template list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {filteredTemplates.map(template => (
          <div
            key={template.id}
            onClick={(e) => handleTemplateClick(template, e)}
            className={`
              p-3 border cursor-pointer transition-all
              ${selectedTemplateIds.has(template.id)
                ? 'border-cyber-purple bg-cyber-purple/20 ring-1 ring-cyber-purple'
                : `${CATEGORY_COLORS[template.category]} hover:border-cyber-purple/50`
              }
            `}
          >
            <div className="flex items-start gap-2">
              <span className="text-xl">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-cyber-gray-light font-mono text-sm font-medium truncate">
                  {template.name}
                </h4>
                <p className="text-cyber-gray text-xs mt-1">
                  {template.description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-cyber-gray">
                  <span className="bg-cyber-darker px-1.5 py-0.5">
                    {template.nodes.length} nodes
                  </span>
                  <span className="bg-cyber-darker px-1.5 py-0.5">
                    {template.edges.length} edges
                  </span>
                </div>
              </div>
              {selectedTemplateIds.has(template.id) && (
                <span className="text-cyber-purple">✓</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowTemplates;
