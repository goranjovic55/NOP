/**
 * Block Definitions Catalog
 * All available blocks for the workflow builder
 */

import { BlockDefinition, BlockCategory } from './workflow';

// Category colors
export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  connection: '#3B82F6',  // Blue
  command: '#10B981',     // Green
  traffic: '#8B5CF6',     // Purple
  scanning: '#F59E0B',    // Amber
  agent: '#EF4444',       // Red
  control: '#6B7280',     // Gray
};

// Category icons
export const CATEGORY_ICONS: Record<BlockCategory, string> = {
  connection: '🔌',
  command: '⚡',
  traffic: '📡',
  scanning: '🔍',
  agent: '🤖',
  control: '⚙️',
};

// Block definitions
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // === Control Blocks ===
  {
    type: 'control.start',
    label: 'Start',
    category: 'control',
    icon: '▶️',
    color: '#22C55E',
    description: 'Workflow entry point',
    inputs: [],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [],
  },
  {
    type: 'control.end',
    label: 'End',
    category: 'control',
    icon: '⏹️',
    color: '#EF4444',
    description: 'Workflow exit point',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [],
    parameters: [
      { name: 'status', label: 'Status', type: 'select', options: [
        { label: 'Success', value: 'success' },
        { label: 'Failure', value: 'failure' },
      ]},
    ],
  },
  {
    type: 'control.delay',
    label: 'Delay',
    category: 'control',
    icon: '⏱️',
    color: '#6B7280',
    description: 'Pause execution for specified duration',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'seconds', label: 'Seconds', type: 'number', required: true, default: 5 },
    ],
  },
  {
    type: 'control.condition',
    label: 'Condition',
    category: 'control',
    icon: '❓',
    color: '#6B7280',
    description: 'Branch based on condition',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'true', type: 'output', label: 'True' },
      { id: 'false', type: 'output', label: 'False' },
    ],
    parameters: [
      { name: 'expression', label: 'Expression', type: 'string', required: true, placeholder: '{{ $prev.success }} === true' },
    ],
  },
  {
    type: 'control.loop',
    label: 'Loop',
    category: 'control',
    icon: '🔄',
    color: '#6B7280',
    description: 'Iterate over items or count',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'iteration', type: 'output', label: 'Each Iteration' },
      { id: 'complete', type: 'output', label: 'Complete' },
    ],
    parameters: [
      { name: 'mode', label: 'Mode', type: 'select', required: true, options: [
        { label: 'Count', value: 'count' },
        { label: 'Array', value: 'array' },
      ]},
      { name: 'count', label: 'Count', type: 'number', default: 5 },
      { name: 'array', label: 'Array Expression', type: 'string', placeholder: '{{ $vars.hosts }}' },
      { name: 'variable', label: 'Item Variable', type: 'string', default: 'item' },
    ],
  },
  {
    type: 'control.variable_set',
    label: 'Set Variable',
    category: 'control',
    icon: '📝',
    color: '#6B7280',
    description: 'Set a workflow variable',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'name', label: 'Variable Name', type: 'string', required: true },
      { name: 'value', label: 'Value', type: 'string', required: true },
    ],
  },
  {
    type: 'control.variable_get',
    label: 'Get Variable',
    category: 'control',
    icon: '📖',
    color: '#6B7280',
    description: 'Get a workflow variable',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'name', label: 'Variable Name', type: 'string', required: true },
    ],
  },

  // === Connection Blocks ===
  {
    type: 'connection.ssh_test',
    label: 'SSH Test',
    category: 'connection',
    icon: '🔐',
    color: '#3B82F6',
    description: 'Test SSH connectivity',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'success', type: 'output', label: 'Success' },
      { id: 'failure', type: 'output', label: 'Failure' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true, placeholder: '192.168.1.1' },
      { name: 'port', label: 'Port', type: 'number', default: 22 },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/ssh' },
  },
  {
    type: 'connection.tcp_test',
    label: 'TCP Test',
    category: 'connection',
    icon: '🔗',
    color: '#3B82F6',
    description: 'Test TCP port connectivity',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'success', type: 'output', label: 'Open' },
      { id: 'failure', type: 'output', label: 'Closed' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/tcp' },
  },

  // === Command Blocks ===
  {
    type: 'command.ssh_execute',
    label: 'SSH Execute',
    category: 'command',
    icon: '⚡',
    color: '#10B981',
    description: 'Execute command via SSH',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'out', type: 'output', label: 'Output' },
      { id: 'error', type: 'output', label: 'Error' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 22 },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'command', label: 'Command', type: 'textarea', required: true, placeholder: 'ls -la' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/execute/ssh' },
  },

  // === Traffic Blocks ===
  {
    type: 'traffic.ping',
    label: 'Ping',
    category: 'traffic',
    icon: '📶',
    color: '#8B5CF6',
    description: 'Ping a host',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'reachable', type: 'output', label: 'Reachable' },
      { id: 'unreachable', type: 'output', label: 'Unreachable' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/ping' },
  },
  {
    type: 'traffic.burst_capture',
    label: 'Burst Capture',
    category: 'traffic',
    icon: '📸',
    color: '#8B5CF6',
    description: 'Capture traffic for short duration',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'duration_seconds', label: 'Duration (s)', type: 'number', default: 1 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/burst-capture' },
  },

  // === Scanning Blocks ===
  {
    type: 'scanning.version_detect',
    label: 'Version Detection',
    category: 'scanning',
    icon: '🔍',
    color: '#F59E0B',
    description: 'Detect service versions (nmap)',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'out', type: 'output', label: 'Output' },
      { id: 'error', type: 'output', label: 'Error' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'ports', label: 'Ports', type: 'string', placeholder: '22,80,443 or leave empty for top 1000' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/scans/default/version-detection' },
  },
  {
    type: 'scanning.port_scan',
    label: 'Port Scan',
    category: 'scanning',
    icon: '🎯',
    color: '#F59E0B',
    description: 'Scan common ports',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'out', type: 'output', label: 'Output' },
      { id: 'error', type: 'output', label: 'Error' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
    ],
    api: { method: 'GET', endpoint: '/api/v1/access/scan/services/{host}' },
  },

  // === Agent Blocks ===
  {
    type: 'agent.generate',
    label: 'Generate Agent',
    category: 'agent',
    icon: '🏭',
    color: '#EF4444',
    description: 'Generate agent binary',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'out', type: 'output', label: 'Output' },
      { id: 'error', type: 'output', label: 'Error' },
    ],
    parameters: [
      { name: 'agent_id', label: 'Agent Template ID', type: 'string', required: true },
      { name: 'platform', label: 'Platform', type: 'select', options: [
        { label: 'Linux AMD64', value: 'linux-amd64' },
        { label: 'Windows AMD64', value: 'windows-amd64' },
        { label: 'macOS AMD64', value: 'darwin-amd64' },
        { label: 'macOS ARM64', value: 'darwin-arm64' },
      ]},
    ],
    api: { method: 'POST', endpoint: '/api/v1/agents/{agent_id}/generate' },
  },
  {
    type: 'agent.terminate',
    label: 'Terminate Agent',
    category: 'agent',
    icon: '⛔',
    color: '#EF4444',
    description: 'Terminate running agent',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'agent_id', label: 'Agent ID', type: 'string', required: true },
    ],
    api: { method: 'POST', endpoint: '/api/v1/agents/{agent_id}/terminate' },
  },
];

// Helper to get block definition by type
export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_DEFINITIONS.find(b => b.type === type);
}

// Helper to get blocks by category
export function getBlocksByCategory(category: BlockCategory): BlockDefinition[] {
  return BLOCK_DEFINITIONS.filter(b => b.category === category);
}

// Get all categories
export function getAllCategories(): BlockCategory[] {
  return ['control', 'connection', 'command', 'traffic', 'scanning', 'agent'];
}
