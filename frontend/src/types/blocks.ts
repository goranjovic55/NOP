/**
 * Block Definitions Catalog
 * All available blocks for the workflow builder
 * Phase 3: Complete block library with all block types
 */

import { BlockDefinition, BlockCategory } from './workflow';

// Cyberpunk category colors
export const CATEGORY_COLORS: Record<BlockCategory, string> = {
  connection: '#00d4ff',  // cyber-blue
  command: '#00ff88',     // cyber-green
  traffic: '#8b5cf6',     // cyber-purple
  scanning: '#f59e0b',    // amber
  agent: '#ff0040',       // cyber-red
  control: '#6b7280',     // gray
  data: '#14b8a6',        // teal - New: Data processing blocks
};

// Cyberpunk category icons (Unicode symbols)
export const CATEGORY_ICONS: Record<BlockCategory, string> = {
  connection: '◎',
  command: '⬢',
  traffic: '≋',
  scanning: '◈',
  agent: '◆',
  control: '⚙',
  data: '⟐',      // New: Data processing blocks
};

// Block definitions with cyberpunk icons - Complete Phase 3 Library
export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  // ============================================
  // === Control Blocks (7 blocks) ===
  // ============================================
  {
    type: 'control.start',
    label: 'Start',
    category: 'control',
    icon: '▶',
    color: '#00ff88',
    description: 'Workflow entry point - execution begins here',
    inputs: [],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'name', label: 'Workflow Name', type: 'string', placeholder: 'My Workflow' },
    ],
  },
  {
    type: 'control.end',
    label: 'End',
    category: 'control',
    icon: '■',
    color: '#ff0040',
    description: 'Workflow exit point - execution ends here',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [],
    parameters: [
      { name: 'status', label: 'Exit Status', type: 'select', options: [
        { label: 'Success', value: 'success' },
        { label: 'Failure', value: 'failure' },
      ]},
      { name: 'message', label: 'Exit Message', type: 'string', placeholder: 'Workflow completed' },
    ],
  },
  {
    type: 'control.delay',
    label: 'Delay',
    category: 'control',
    icon: '◷',
    color: '#6b7280',
    description: 'Pause execution for specified duration',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'seconds', label: 'Seconds', type: 'number', required: true, default: 5 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/workflows/block/delay' },
  },
  {
    type: 'control.condition',
    label: 'Condition',
    category: 'control',
    icon: '◇',
    color: '#6b7280',
    description: 'Branch execution based on condition',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'true', type: 'output', label: 'True' },
      { id: 'false', type: 'output', label: 'False' },
    ],
    parameters: [
      { name: 'expression', label: 'Expression', type: 'string', required: true, placeholder: '{{ $prev.success }} === true' },
      { name: 'description', label: 'Description', type: 'string', placeholder: 'Check if previous step succeeded' },
    ],
  },
  {
    type: 'control.loop',
    label: 'Loop',
    category: 'control',
    icon: '⟳',
    color: '#6b7280',
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
    type: 'control.parallel',
    label: 'Parallel',
    category: 'control',
    icon: '⫴',
    color: '#6b7280',
    description: 'Execute multiple branches in parallel',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'branch1', type: 'output', label: 'Branch 1' },
      { id: 'branch2', type: 'output', label: 'Branch 2' },
      { id: 'branch3', type: 'output', label: 'Branch 3' },
    ],
    parameters: [
      { name: 'waitAll', label: 'Wait for All', type: 'boolean', default: true, description: 'Wait for all branches to complete' },
      { name: 'maxConcurrent', label: 'Max Concurrent', type: 'number', default: 3 },
    ],
  },
  {
    type: 'control.variable_set',
    label: 'Set Variable',
    category: 'control',
    icon: '◁',
    color: '#6b7280',
    description: 'Set a workflow variable',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'name', label: 'Variable Name', type: 'string', required: true, placeholder: 'myVar' },
      { name: 'value', label: 'Value', type: 'string', required: true, placeholder: '{{ $prev.output }}' },
      { name: 'type', label: 'Type', type: 'select', options: [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Boolean', value: 'boolean' },
        { label: 'Array', value: 'array' },
        { label: 'Object', value: 'object' },
      ]},
    ],
  },
  {
    type: 'control.variable_get',
    label: 'Get Variable',
    category: 'control',
    icon: '▷',
    color: '#6b7280',
    description: 'Get a workflow variable value',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [{ id: 'out', type: 'output', label: 'Output' }],
    parameters: [
      { name: 'name', label: 'Variable Name', type: 'string', required: true, placeholder: 'myVar' },
    ],
  },

  // ============================================
  // === Connection Blocks (5 blocks) ===
  // ============================================
  {
    type: 'connection.ssh_test',
    label: 'SSH Test',
    category: 'connection',
    icon: '⬡',
    color: '#00d4ff',
    description: 'Test SSH connectivity to a host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true, placeholder: '192.168.1.1' },
      { name: 'port', label: 'Port', type: 'number', default: 22 },
      { name: 'username', label: 'Username', type: 'string', required: true, placeholder: 'admin' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential', description: 'Use saved credential instead' },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 10 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/ssh' },
  },
  {
    type: 'connection.rdp_test',
    label: 'RDP Test',
    category: 'connection',
    icon: '⬢',
    color: '#00d4ff',
    description: 'Test RDP connectivity to Windows host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true, placeholder: '192.168.1.1' },
      { name: 'port', label: 'Port', type: 'number', default: 3389 },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'domain', label: 'Domain', type: 'string', placeholder: 'WORKGROUP' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/rdp' },
  },
  {
    type: 'connection.vnc_test',
    label: 'VNC Test',
    category: 'connection',
    icon: '⬣',
    color: '#00d4ff',
    description: 'Test VNC connectivity - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 5900 },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/vnc' },
  },
  {
    type: 'connection.ftp_test',
    label: 'FTP Test',
    category: 'connection',
    icon: '⬤',
    color: '#00d4ff',
    description: 'Test FTP/SFTP connectivity - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 21 },
      { name: 'protocol', label: 'Protocol', type: 'select', options: [
        { label: 'FTP', value: 'ftp' },
        { label: 'SFTP', value: 'sftp' },
        { label: 'FTPS', value: 'ftps' },
      ]},
      { name: 'username', label: 'Username', type: 'string' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/ftp' },
  },
  {
    type: 'connection.tcp_test',
    label: 'TCP Test',
    category: 'connection',
    icon: '◎',
    color: '#00d4ff',
    description: 'Test TCP port connectivity - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', required: true },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/test/tcp' },
  },

  // ============================================
  // === Command Blocks (5 blocks) ===
  // ============================================
  {
    type: 'command.ssh_execute',
    label: 'SSH Execute',
    category: 'command',
    icon: '⬢',
    color: '#00ff88',
    description: 'Execute command via SSH - outputs pass/fail/output for use with Code Block',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 22 },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'command', label: 'Command', type: 'textarea', required: true, placeholder: 'ls -la /home' },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 30 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/execute/ssh' },
  },
  {
    type: 'command.system_info',
    label: 'System Info',
    category: 'command',
    icon: '⌘',
    color: '#00ff88',
    description: 'Get remote system information - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'infoType', label: 'Info Type', type: 'select', options: [
        { label: 'All', value: 'all' },
        { label: 'OS Info', value: 'os' },
        { label: 'Hardware', value: 'hardware' },
        { label: 'Network', value: 'network' },
        { label: 'Processes', value: 'processes' },
      ]},
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/system-info' },
  },
  {
    type: 'command.ftp_list',
    label: 'FTP List',
    category: 'command',
    icon: '▤',
    color: '#00ff88',
    description: 'List directory contents via FTP - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 21 },
      { name: 'username', label: 'Username', type: 'string' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'path', label: 'Remote Path', type: 'string', default: '/', placeholder: '/home/user' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/ftp/list' },
  },
  {
    type: 'command.ftp_download',
    label: 'FTP Download',
    category: 'command',
    icon: '⬇',
    color: '#00ff88',
    description: 'Download file via FTP - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 21 },
      { name: 'username', label: 'Username', type: 'string' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'remotePath', label: 'Remote File', type: 'string', required: true, placeholder: '/home/user/file.txt' },
      { name: 'localPath', label: 'Local Path', type: 'string', placeholder: '/tmp/downloaded.txt' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/ftp/download' },
  },
  {
    type: 'command.ftp_upload',
    label: 'FTP Upload',
    category: 'command',
    icon: '⬆',
    color: '#00ff88',
    description: 'Upload file via FTP - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'port', label: 'Port', type: 'number', default: 21 },
      { name: 'username', label: 'Username', type: 'string' },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'localPath', label: 'Local File', type: 'string', required: true },
      { name: 'remotePath', label: 'Remote Path', type: 'string', required: true, placeholder: '/home/user/upload.txt' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/access/ftp/upload' },
  },

  // ============================================
  // === Traffic Blocks (7 blocks) ===
  // ============================================
  {
    type: 'traffic.start_capture',
    label: 'Start Capture',
    category: 'traffic',
    icon: '◉',
    color: '#8b5cf6',
    description: 'Start traffic capture on interface - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'interface', label: 'Interface', type: 'string', placeholder: 'eth0' },
      { name: 'filter', label: 'BPF Filter', type: 'string', placeholder: 'port 80 or port 443' },
      { name: 'maxPackets', label: 'Max Packets', type: 'number', default: 1000 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/start-capture' },
  },
  {
    type: 'traffic.stop_capture',
    label: 'Stop Capture',
    category: 'traffic',
    icon: '◌',
    color: '#8b5cf6',
    description: 'Stop traffic capture - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'captureId', label: 'Capture ID', type: 'string', placeholder: '{{ $prev.captureId }}' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/stop-capture' },
  },
  {
    type: 'traffic.burst_capture',
    label: 'Burst Capture',
    category: 'traffic',
    icon: '⊙',
    color: '#8b5cf6',
    description: 'Capture traffic for short duration - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'interface', label: 'Interface', type: 'string', placeholder: 'eth0' },
      { name: 'duration_seconds', label: 'Duration (s)', type: 'number', default: 1, required: true },
      { name: 'filter', label: 'BPF Filter', type: 'string', placeholder: 'host 192.168.1.1' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/burst-capture' },
  },
  {
    type: 'traffic.get_stats',
    label: 'Get Stats',
    category: 'traffic',
    icon: '▦',
    color: '#8b5cf6',
    description: 'Get traffic statistics - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'interface', label: 'Interface', type: 'string' },
      { name: 'period', label: 'Period', type: 'select', options: [
        { label: 'Last Minute', value: '1m' },
        { label: 'Last 5 Minutes', value: '5m' },
        { label: 'Last Hour', value: '1h' },
        { label: 'Last Day', value: '1d' },
      ]},
    ],
    api: { method: 'GET', endpoint: '/api/v1/traffic/stats' },
  },
  {
    type: 'traffic.ping',
    label: 'Ping',
    category: 'traffic',
    icon: '≋',
    color: '#8b5cf6',
    description: 'Ping a host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'count', label: 'Count', type: 'number', default: 4 },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/ping' },
  },
  {
    type: 'traffic.advanced_ping',
    label: 'Advanced Ping',
    category: 'traffic',
    icon: '⦿',
    color: '#8b5cf6',
    description: 'Ping with advanced options - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'count', label: 'Count', type: 'number', default: 4 },
      { name: 'size', label: 'Packet Size', type: 'number', default: 64 },
      { name: 'interval', label: 'Interval (ms)', type: 'number', default: 1000 },
      { name: 'ttl', label: 'TTL', type: 'number', default: 64 },
      { name: 'sourceInterface', label: 'Source Interface', type: 'string' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/advanced-ping' },
  },
  {
    type: 'traffic.storm',
    label: 'Traffic Storm',
    category: 'traffic',
    icon: '≋',
    color: '#8b5cf6',
    description: 'Generate broadcast storm for testing - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'interface', label: 'Interface', type: 'string', required: true },
      { name: 'type', label: 'Storm Type', type: 'select', options: [
        { label: 'Broadcast', value: 'broadcast' },
        { label: 'Multicast', value: 'multicast' },
        { label: 'Unicast Flood', value: 'unicast' },
      ]},
      { name: 'duration', label: 'Duration (s)', type: 'number', default: 5 },
      { name: 'rate', label: 'Packets/sec', type: 'number', default: 1000 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/traffic/storm' },
  },

  // ============================================
  // === Scanning Blocks (6 blocks) ===
  // ============================================
  {
    type: 'scanning.version_detect',
    label: 'Version Detection',
    category: 'scanning',
    icon: '◈',
    color: '#f59e0b',
    description: 'Detect service versions using nmap - outputs pass/fail/output for Code Block interpretation',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'ports', label: 'Ports', type: 'string', placeholder: '22,80,443 or leave empty for top 1000' },
      { name: 'aggressive', label: 'Aggressive Scan', type: 'boolean', default: false },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 300 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/scans/default/version-detection' },
  },
  {
    type: 'scanning.port_scan',
    label: 'Port Scan',
    category: 'scanning',
    icon: '⬢',
    color: '#f59e0b',
    description: 'Scan for open ports - outputs pass/fail/output for Code Block interpretation',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
      { name: 'scanType', label: 'Scan Type', type: 'select', options: [
        { label: 'Quick (Top 100)', value: 'quick' },
        { label: 'Standard (Top 1000)', value: 'standard' },
        { label: 'Full (All 65535)', value: 'full' },
        { label: 'Custom', value: 'custom' },
      ]},
      { name: 'ports', label: 'Custom Ports', type: 'string', placeholder: '1-1000 or 22,80,443,8080' },
      { name: 'technique', label: 'Technique', type: 'select', options: [
        { label: 'TCP SYN', value: 'syn' },
        { label: 'TCP Connect', value: 'connect' },
        { label: 'UDP', value: 'udp' },
      ]},
    ],
    api: { method: 'POST', endpoint: '/api/v1/scans/default/port-scan' },
  },
  {
    type: 'scanning.network_discovery',
    label: 'Network Discovery',
    category: 'scanning',
    icon: '◎',
    color: '#f59e0b',
    description: 'Discover hosts on a network range - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'network', label: 'Network CIDR', type: 'string', required: true, placeholder: '192.168.1.0/24' },
      { name: 'scan_type', label: 'Scan Type', type: 'select', options: [
        { label: 'Basic (Fast)', value: 'basic' },
        { label: 'Comprehensive', value: 'comprehensive' },
        { label: 'Ping Only', value: 'ping_only' },
        { label: 'ARP Scan', value: 'arp' },
      ]},
      { name: 'ports', label: 'Port Range', type: 'string', placeholder: '1-1000', default: '1-1000' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/discovery/scan' },
  },
  {
    type: 'scanning.host_scan',
    label: 'Host Scan',
    category: 'scanning',
    icon: '◇',
    color: '#f59e0b',
    description: 'Comprehensive scan of a single host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host IP', type: 'string', required: true, placeholder: '192.168.1.1' },
      { name: 'scan_type', label: 'Scan Type', type: 'select', options: [
        { label: 'Comprehensive', value: 'comprehensive' },
        { label: 'Ports Only', value: 'ports' },
        { label: 'Services', value: 'services' },
      ]},
      { name: 'ports', label: 'Port Range', type: 'string', placeholder: '1-65535' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/discovery/scan/host' },
  },
  {
    type: 'scanning.ping_sweep',
    label: 'Ping Sweep',
    category: 'scanning',
    icon: '≋',
    color: '#f59e0b',
    description: 'Ping sweep to find live hosts - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'target', label: 'Target', type: 'string', required: true, placeholder: '192.168.1.0/24 or 192.168.1.1' },
      { name: 'timeout', label: 'Timeout (s)', type: 'number', default: 5 },
    ],
    api: { method: 'POST', endpoint: '/api/v1/discovery/ping/{host}' },
  },
  {
    type: 'scanning.service_scan',
    label: 'Service Scan',
    category: 'scanning',
    icon: '⬡',
    color: '#f59e0b',
    description: 'Scan for common services on a host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Host', type: 'string', required: true },
    ],
    api: { method: 'GET', endpoint: '/api/v1/access/scan/services/{host}' },
  },

  // ============================================
  // === Agent Blocks (3 blocks) ===
  // ============================================
  {
    type: 'agent.generate',
    label: 'Generate Agent',
    category: 'agent',
    icon: '◆',
    color: '#ff0040',
    description: 'Generate agent binary for target platform - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'agent_id', label: 'Agent Template ID', type: 'string', required: true },
      { name: 'platform', label: 'Platform', type: 'select', required: true, options: [
        { label: 'Linux AMD64', value: 'linux-amd64' },
        { label: 'Linux ARM64', value: 'linux-arm64' },
        { label: 'Windows AMD64', value: 'windows-amd64' },
        { label: 'Windows x86', value: 'windows-386' },
        { label: 'macOS AMD64', value: 'darwin-amd64' },
        { label: 'macOS ARM64', value: 'darwin-arm64' },
      ]},
      { name: 'obfuscate', label: 'Obfuscate', type: 'boolean', default: true },
      { name: 'compress', label: 'Compress', type: 'boolean', default: true },
    ],
    api: { method: 'POST', endpoint: '/api/v1/agents/{agent_id}/generate' },
  },
  {
    type: 'agent.deploy',
    label: 'Deploy Agent',
    category: 'agent',
    icon: '◇',
    color: '#ff0040',
    description: 'Deploy agent to target host - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'host', label: 'Target Host', type: 'string', required: true },
      { name: 'username', label: 'Username', type: 'string', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'credential', label: 'Saved Credential', type: 'credential' },
      { name: 'agentBinary', label: 'Agent Binary', type: 'string', placeholder: '{{ $prev.agentPath }}' },
      { name: 'remotePath', label: 'Remote Path', type: 'string', default: '/tmp/agent' },
      { name: 'autoStart', label: 'Auto Start', type: 'boolean', default: true },
    ],
    api: { method: 'POST', endpoint: '/api/v1/agents/deploy' },
  },
  {
    type: 'agent.terminate',
    label: 'Terminate Agent',
    category: 'agent',
    icon: '⊘',
    color: '#ff0040',
    description: 'Terminate running agent - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'agent_id', label: 'Agent ID', type: 'string', required: true },
      { name: 'force', label: 'Force Kill', type: 'boolean', default: false },
      { name: 'cleanup', label: 'Cleanup Files', type: 'boolean', default: true },
    ],
    api: { method: 'POST', endpoint: '/api/v1/agents/{agent_id}/terminate' },
  },

  // ============================================
  // === Vulnerability Blocks (3 blocks) ===
  // ============================================
  {
    type: 'vulnerability.cve_lookup',
    label: 'CVE Lookup',
    category: 'scanning',
    icon: '⚠',
    color: '#f59e0b',
    description: 'Lookup CVE information from NVD database - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'cve_id', label: 'CVE ID', type: 'string', placeholder: 'CVE-2023-1234' },
      { name: 'product', label: 'Product Name', type: 'string', placeholder: 'apache' },
      { name: 'version', label: 'Version', type: 'string', placeholder: '2.4.49' },
      { name: 'vendor', label: 'Vendor', type: 'string', placeholder: 'apache' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/vulnerabilities/lookup-cve' },
  },
  {
    type: 'vulnerability.get_exploits',
    label: 'Get Exploits',
    category: 'scanning',
    icon: '⚡',
    color: '#f59e0b',
    description: 'Get available exploit modules for a CVE - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'cve_id', label: 'CVE ID', type: 'string', required: true, placeholder: 'CVE-2023-1234' },
    ],
    api: { method: 'GET', endpoint: '/api/v1/vulnerabilities/exploits/{cve_id}' },
  },
  {
    type: 'vulnerability.execute_exploit',
    label: 'Execute Exploit',
    category: 'agent',
    icon: '⚔',
    color: '#ff0040',
    description: 'Execute an exploit against a target - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'target_ip', label: 'Target IP', type: 'string', required: true },
      { name: 'target_port', label: 'Target Port', type: 'number', required: true },
      { name: 'exploit_type', label: 'Exploit Type', type: 'select', required: true, options: [
        { label: 'vsftpd Backdoor', value: 'vsftpd_backdoor' },
        { label: 'Shell Command', value: 'shell_command' },
      ]},
      { name: 'command', label: 'Command', type: 'string', placeholder: 'id && whoami' },
    ],
    api: { method: 'POST', endpoint: '/api/v1/vulnerabilities/exploit/execute' },
  },

  // ============================================
  // === Asset Blocks (3 blocks) ===
  // ============================================
  {
    type: 'asset.list_assets',
    label: 'List Assets',
    category: 'scanning',
    icon: '▤',
    color: '#f59e0b',
    description: 'Get list of discovered assets - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'search', label: 'Search', type: 'string', placeholder: 'Filter by IP or hostname' },
      { name: 'asset_type', label: 'Asset Type', type: 'select', options: [
        { label: 'All', value: '' },
        { label: 'Server', value: 'server' },
        { label: 'Workstation', value: 'workstation' },
        { label: 'Router', value: 'router' },
        { label: 'Switch', value: 'switch' },
        { label: 'IoT', value: 'iot' },
      ]},
      { name: 'status', label: 'Status', type: 'select', options: [
        { label: 'All', value: '' },
        { label: 'Online', value: 'online' },
        { label: 'Offline', value: 'offline' },
        { label: 'Unknown', value: 'unknown' },
      ]},
      { name: 'page', label: 'Page', type: 'number', default: 1 },
      { name: 'size', label: 'Page Size', type: 'number', default: 50 },
    ],
    api: { method: 'GET', endpoint: '/api/v1/assets/' },
  },
  {
    type: 'asset.get_asset',
    label: 'Get Asset',
    category: 'scanning',
    icon: '◉',
    color: '#f59e0b',
    description: 'Get details of a specific asset - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'asset_id', label: 'Asset ID', type: 'string', required: true },
    ],
    api: { method: 'GET', endpoint: '/api/v1/assets/{asset_id}' },
  },
  {
    type: 'asset.get_stats',
    label: 'Asset Stats',
    category: 'scanning',
    icon: '◊',
    color: '#f59e0b',
    description: 'Get asset statistics - outputs pass/fail/output',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'out', type: 'output', label: 'Output' },
    ],
    parameters: [],
    api: { method: 'GET', endpoint: '/api/v1/assets/stats' },
  },

  // ============================================
  // === Data Processing Blocks (4 blocks) ===
  // === 3-Output Model: pass/fail/output ===
  // ============================================
  {
    type: 'data.code',
    label: 'Code Block',
    category: 'data',
    icon: '⟐',
    color: '#14b8a6',
    description: 'JavaScript code for custom pass/fail logic and output transformation. Uses 3-output model: pass, fail, output.',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'output', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'description', label: 'Description', type: 'string', placeholder: 'What does this code block do?' },
      { 
        name: 'passCode', 
        label: 'Pass Condition (JavaScript)', 
        type: 'textarea', 
        required: true,
        placeholder: '// Return true/false\nreturn /Ring is OK/i.test(context.input);',
        description: 'JavaScript code that returns boolean. Input available as context.input',
      },
      { 
        name: 'failCode', 
        label: 'Fail Condition (optional)', 
        type: 'textarea', 
        placeholder: '// Optional: defaults to !pass\nreturn /Error|Failed/i.test(context.input);',
        description: 'Optional: If not set, fail = !pass',
      },
      { 
        name: 'outputCode', 
        label: 'Output Transformation (JavaScript)', 
        type: 'textarea', 
        required: true,
        placeholder: '// Return value for next block\nreturn { status: "OK", data: context.input };',
        description: 'JavaScript code that returns the output value for the next block',
      },
    ],
    hasPassFailOutputs: true,
    api: { method: 'POST', endpoint: '/api/v1/workflows/block/code' },
  },
  {
    type: 'data.output_interpreter',
    label: 'Output Interpreter',
    category: 'data',
    icon: '⟑',
    color: '#14b8a6',
    description: 'Parse and interpret output from previous block using declarative rules. Determines pass/fail without writing code.',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
      { id: 'output', type: 'output', label: 'Output' },
    ],
    parameters: [
      { name: 'inputSource', label: 'Input Source', type: 'string', default: '{{previous.output}}', placeholder: '{{previous.rawOutput}}' },
      { 
        name: 'aggregation', 
        label: 'Rule Aggregation', 
        type: 'select', 
        default: 'all',
        options: [
          { label: 'All must pass', value: 'all' },
          { label: 'Any must pass', value: 'any' },
          { label: 'Weighted score', value: 'weighted' },
        ],
      },
      { 
        name: 'containsPass', 
        label: 'Must Contain (Pass)', 
        type: 'string', 
        placeholder: 'Ring is OK',
        description: 'Text that must be present in output to pass',
      },
      { 
        name: 'notContainsFail', 
        label: 'Must Not Contain (Fail)', 
        type: 'string', 
        placeholder: 'Error|Failed',
        description: 'Text that must NOT be present (regex supported)',
      },
      { 
        name: 'regexPattern', 
        label: 'Regex Pattern', 
        type: 'string', 
        placeholder: '\\d+ ports? in segment',
        description: 'Optional regex that must match for pass',
      },
      { 
        name: 'extractVariable', 
        label: 'Extract Variable', 
        type: 'string', 
        placeholder: 'portCount',
        description: 'Variable name to store extracted value',
      },
      { 
        name: 'extractPattern', 
        label: 'Extract Pattern (Regex)', 
        type: 'string', 
        placeholder: '(\\d+) ports',
        description: 'Regex with capture group for extraction',
      },
    ],
    hasPassFailOutputs: true,
    api: { method: 'POST', endpoint: '/api/v1/workflows/block/interpreter' },
  },
  {
    type: 'data.assertion',
    label: 'Assertion',
    category: 'data',
    icon: '✓',
    color: '#14b8a6',
    description: 'Simple pass/fail assertion based on a condition. Use for explicit workflow checkpoints.',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'fail', type: 'output', label: 'Fail' },
    ],
    parameters: [
      { name: 'name', label: 'Assertion Name', type: 'string', required: true, placeholder: 'Check ring status' },
      { 
        name: 'condition', 
        label: 'Condition Type', 
        type: 'select', 
        required: true,
        options: [
          { label: 'Contains', value: 'contains' },
          { label: 'Not Contains', value: 'not_contains' },
          { label: 'Equals', value: 'equals' },
          { label: 'Regex Match', value: 'regex' },
          { label: 'Expression', value: 'expression' },
        ],
      },
      { name: 'value', label: 'Expected Value', type: 'string', required: true, placeholder: 'Ring is OK' },
      { name: 'failMessage', label: 'Failure Message', type: 'string', placeholder: 'Ring status check failed!' },
    ],
    hasPassFailOutputs: true,
    api: { method: 'POST', endpoint: '/api/v1/workflows/block/assertion' },
  },
  {
    type: 'data.transform',
    label: 'Transform',
    category: 'data',
    icon: '↹',
    color: '#14b8a6',
    description: 'Transform input data using a template or expression. Always passes, outputs transformed data.',
    inputs: [{ id: 'in', type: 'input', label: 'Input' }],
    outputs: [
      { id: 'pass', type: 'output', label: 'Pass' },
      { id: 'output', type: 'output', label: 'Output' },
    ],
    parameters: [
      { 
        name: 'transformType', 
        label: 'Transform Type', 
        type: 'select', 
        required: true,
        options: [
          { label: 'JSON Parse', value: 'json_parse' },
          { label: 'JSON Stringify', value: 'json_stringify' },
          { label: 'Extract Field', value: 'extract_field' },
          { label: 'Template', value: 'template' },
          { label: 'Split Lines', value: 'split_lines' },
          { label: 'Filter Array', value: 'filter_array' },
        ],
      },
      { name: 'field', label: 'Field Path', type: 'string', placeholder: 'data.results[0].value' },
      { name: 'template', label: 'Template', type: 'textarea', placeholder: '{"status": "{{input.status}}", "count": {{input.count}}}' },
      { name: 'filterExpression', label: 'Filter Expression', type: 'string', placeholder: 'item.active === true' },
    ],
    hasPassFailOutputs: true,
    api: { method: 'POST', endpoint: '/api/v1/workflows/block/transform' },
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
  return ['control', 'connection', 'command', 'traffic', 'scanning', 'agent', 'data'];
}

// Get block count by category
export function getBlockCounts(): Record<BlockCategory, number> {
  const counts = {} as Record<BlockCategory, number>;
  for (const category of getAllCategories()) {
    counts[category] = getBlocksByCategory(category).length;
  }
  return counts;
}

// Validate block parameters
export function validateBlockParameters(
  type: string, 
  params: Record<string, any>
): { valid: boolean; errors: string[] } {
  const definition = getBlockDefinition(type);
  if (!definition) {
    return { valid: false, errors: [`Unknown block type: ${type}`] };
  }

  const errors: string[] = [];
  
  for (const param of definition.parameters) {
    if (param.required && (params[param.name] === undefined || params[param.name] === '')) {
      errors.push(`${param.label} is required`);
    }
  }

  return { valid: errors.length === 0, errors };
}
