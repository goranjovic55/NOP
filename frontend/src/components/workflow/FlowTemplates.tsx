/**
 * FlowTemplates - Predefined workflow templates for network operations
 * UI Test templates from merged commit scenarios
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

// UI Test Templates from merged commit scenarios
const TEMPLATES: FlowTemplate[] = [
  // ============================================================================
  // UI TEST TEMPLATES
  // ============================================================================
  {
    id: 'multi-host-ping-monitor',
    name: 'UI Test: Multi-Host Ping Monitor',
    description: 'Ping multiple hosts and monitor connectivity status',
    category: 'traffic',
    icon: '≡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Multi-Host Ping' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Ping Host 1', type: 'traffic.ping', category: 'traffic', parameters: { host: '172.21.0.10', count: 2 } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Ping Host 2', type: 'traffic.ping', category: 'traffic', parameters: { host: '172.21.0.20', count: 2 } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'count-loop-test',
    name: 'UI Test: Count Loop Test',
    description: 'Test loop iteration with counter variable',
    category: 'utility',
    icon: '⟳',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Loop Test' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Counter', type: 'control.variable_set', category: 'control', parameters: { name: 'counter', value: '0' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Loop 3 Times', type: 'control.loop', category: 'control', parameters: { iterations: 3, variable: 'i' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Increment', type: 'control.variable_set', category: 'control', parameters: { name: 'counter', value: '{{counter + 1}}' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '5', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },
  {
    id: 'agent-pov-reconnaissance',
    name: 'UI Test: Agent POV Reconnaissance',
    description: 'Reconnaissance from host perspective with network scanning',
    category: 'scanning',
    icon: '◆',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Host Recon' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'SSH: Get Network Info', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.21.0.10', command: 'ip addr' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'SSH: Scan Local Net', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.21.0.10', command: 'arp -a' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Parse Results', type: 'data.output_interpreter', category: 'data', parameters: { inputSource: '{{previous.output}}', containsPass: 'inet', extractVariable: 'hosts' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'agent-mass-deployment',
    name: 'UI Test: Agent Mass Deployment',
    description: 'Deploy agents to multiple target hosts',
    category: 'agent',
    icon: '◆',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Mass Deploy' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Generate Agent', type: 'agent.generate', category: 'agent', parameters: { platform: 'linux-amd64', obfuscate: true } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Deploy to Host 1', type: 'agent.deploy', category: 'agent', parameters: { host: '172.21.0.10', username: 'root' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Deploy to Host 2', type: 'agent.deploy', category: 'agent', parameters: { host: '172.21.0.20', username: 'root' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'rep-ring-failover-test',
    name: 'UI Test: REP Ring Failover Test',
    description: 'Test redundancy ring failover between nodes',
    category: 'access',
    icon: '⬡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'REP Ring Test' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Test Primary', type: 'traffic.ping', category: 'traffic', parameters: { host: '172.21.0.10', count: 2 } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Test Secondary', type: 'traffic.ping', category: 'traffic', parameters: { host: '172.21.0.20', count: 2 } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Check Failover', type: 'data.assertion', category: 'data', parameters: { condition: 'or', values: ['primary.reachable', 'secondary.reachable'], failMessage: 'All nodes down' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'ssh-command-chain',
    name: 'UI Test: SSH Command Chain',
    description: 'Execute chained SSH commands with output parsing',
    category: 'access',
    icon: '⬢',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'SSH Chain' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'SSH: Get Hostname', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.21.0.10', command: 'hostname' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'SSH: Get Uptime', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.21.0.10', command: 'uptime' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'SSH: Get Disk', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.21.0.10', command: 'df -h' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'connectivity-health-check',
    name: 'UI Test: Connectivity Health Check',
    description: 'Check connectivity health across network segments',
    category: 'traffic',
    icon: '≡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Health Check' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Ping Gateway', type: 'traffic.ping', category: 'traffic', parameters: { host: '172.21.0.1', count: 4 } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Check Latency', type: 'data.output_interpreter', category: 'data', parameters: { inputSource: '{{previous.output}}', containsPass: 'ms', extractVariable: 'latency' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Ping DNS', type: 'traffic.ping', category: 'traffic', parameters: { host: '8.8.8.8', count: 2 } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },
  {
    id: 'security-scan-pipeline',
    name: 'UI Test: Security Scan Pipeline',
    description: 'Run security scans with vulnerability detection',
    category: 'scanning',
    icon: '⊙',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Security Scan' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Port Scan', type: 'scanning.port_scan', category: 'scanning', parameters: { host: '172.21.0.10', scanType: 'full' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Version Detect', type: 'scanning.version_detect', category: 'scanning', parameters: { host: '172.21.0.10' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Check Results', type: 'data.assertion', category: 'data', parameters: { condition: 'exists', value: 'open_ports', failMessage: 'No ports found' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'network-discovery-pipeline',
    name: 'UI Test: Network Discovery Pipeline',
    description: 'Discover hosts and scan for services',
    category: 'scanning',
    icon: '⊙',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Network Discovery' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Network', type: 'control.variable_set', category: 'control', parameters: { name: 'network', value: '172.21.0.0/24' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Discover Hosts', type: 'scanning.network_discovery', category: 'scanning', parameters: { network: '{{network}}' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Parse Hosts', type: 'data.output_interpreter', category: 'data', parameters: { inputSource: '{{previous.output}}', containsPass: 'host', extractVariable: 'hostList' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'traffic-baseline-collection',
    name: 'UI Test: Traffic Baseline Collection',
    description: 'Collect traffic baseline for network analysis',
    category: 'traffic',
    icon: '◉',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Traffic Baseline' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Capture Traffic', type: 'traffic.burst_capture', category: 'traffic', parameters: { interface: 'eth0', duration_seconds: 5 } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Get Stats', type: 'traffic.get_stats', category: 'traffic', parameters: { interface: 'eth0' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Analyze', type: 'data.code', category: 'data', parameters: { description: 'Analyze baseline', passCode: 'return true;', outputCode: 'return { baseline: context.input };' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  scanning: 'border-cyber-orange bg-cyber-orange/10',
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
    } else {
      // Normal click: Insert template
      onInsertTemplate(template.nodes, template.edges);
    }
  }, [onInsertTemplate]);

  // Copy selected templates to clipboard
  const handleCopySelected = useCallback(async () => {
    if (selectedTemplateIds.size === 0) return;
    
    const selectedTemplates = TEMPLATES.filter(t => selectedTemplateIds.has(t.id));
    const clipboardData = {
      type: 'nop-flow-templates',
      templates: selectedTemplates,
    };
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(clipboardData, null, 2));
      setSelectedTemplateIds(new Set());
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, [selectedTemplateIds]);

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
        {['all', 'scanning', 'access', 'traffic', 'agent', 'utility'].map(cat => (
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
        <span className="text-cyber-purple ml-1">Shift+Click</span> to select
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
              <span className="text-lg text-cyber-purple">{template.icon}</span>
              <div className="flex-1 min-w-0">
                <h4 className="text-cyber-gray-light font-mono text-sm font-medium truncate">
                  {template.name}
                </h4>
                <p className="text-cyber-gray text-xs mt-1 line-clamp-2">
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FlowTemplates;
