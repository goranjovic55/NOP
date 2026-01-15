/**
 * FlowTemplates - Predefined workflow templates for network operations
 * Production-ready templates for automation scenarios
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

// Production workflow templates
const TEMPLATES: FlowTemplate[] = [
  // ============================================================================
  // ASSET ITERATION TEMPLATES
  // ============================================================================
  {
    id: 'assets-ping-scan-loop',
    name: 'Assets: Ping & Scan Live Hosts',
    description: 'Get all assets, ping each one, scan those that respond',
    category: 'scanning',
    icon: '⟳',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Asset Ping & Scan' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Get All Assets', type: 'assets.get_all', category: 'assets', parameters: { includeOffline: true, limit: 100 } } },
      { type: 'block', position: { x: 100, y: 270 }, data: { label: 'Loop Assets', type: 'control.loop', category: 'control', parameters: { mode: 'array', items: '{{ $prev.assets }}', variable: 'asset' } } },
      { type: 'block', position: { x: 320, y: 270 }, data: { label: 'Ping Host', type: 'scanning.ping_sweep', category: 'scanning', parameters: { target: '{{ $loop.item.ip_address }}', timeout: 3 } } },
      { type: 'block', position: { x: 320, y: 390 }, data: { label: 'Is Alive?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check if ping succeeded' } } },
      { type: 'block', position: { x: 520, y: 340 }, data: { label: 'Host Scan', type: 'scanning.host_scan', category: 'scanning', parameters: { host: '{{ $loop.item.ip_address }}', scan_type: 'comprehensive' } } },
      { type: 'block', position: { x: 520, y: 460 }, data: { label: 'Log Result', type: 'control.variable_set', category: 'control', parameters: { name: 'lastScan', value: '{{ $prev.output }}' } } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'assets', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'true', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'false', targetHandle: 'next' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '7', target: '3', sourceHandle: 'out', targetHandle: 'next' },
      { source: '3', target: '8', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },
  {
    id: 'discovery-ssh-hostinfo',
    name: 'Discovery: SSH Port 22 → Host Info',
    description: 'Discover hosts, scan for port 22, SSH login and get host info',
    category: 'access',
    icon: '⬡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'SSH Discovery & Info' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'ARP Discovery', type: 'assets.discover_arp', category: 'assets', parameters: { subnet: '172.29.0.0/24', timeout: 10, autoAdd: true } } },
      { type: 'block', position: { x: 100, y: 270 }, data: { label: 'Loop Discovered', type: 'control.loop', category: 'control', parameters: { mode: 'array', items: '{{ $prev.discovered }}', variable: 'host' } } },
      { type: 'block', position: { x: 320, y: 270 }, data: { label: 'Port Scan 22', type: 'scanning.port_scan', category: 'scanning', parameters: { target: '{{ $loop.item.ip }}', ports: '22', scan_type: 'syn' } } },
      { type: 'block', position: { x: 320, y: 390 }, data: { label: 'SSH Open?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.ports | length }} > 0', description: 'Check if port 22 is open' } } },
      { type: 'block', position: { x: 520, y: 340 }, data: { label: 'SSH Test', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{ $loop.item.ip }}', port: 22, username: 'root', password: 'toor' } } },
      { type: 'block', position: { x: 520, y: 460 }, data: { label: 'SSH Connected?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check SSH connection' } } },
      { type: 'block', position: { x: 720, y: 410 }, data: { label: 'Get Host Info', type: 'command.system_info', category: 'command', parameters: { host: '{{ $loop.item.ip }}', username: 'root', password: 'toor', infoType: 'all' } } },
      { type: 'block', position: { x: 720, y: 530 }, data: { label: 'Save Result', type: 'control.variable_set', category: 'control', parameters: { name: 'hostInfo', value: '{{ $prev.output }}' } } },
      { type: 'block', position: { x: 100, y: 600 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'discovered', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'true', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'false', targetHandle: 'next' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '7', target: '8', sourceHandle: 'true', targetHandle: 'in' },
      { source: '7', target: '3', sourceHandle: 'false', targetHandle: 'next' },
      { source: '8', target: '9', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '9', target: '3', sourceHandle: 'out', targetHandle: 'next' },
      { source: '3', target: '10', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },
  {
    id: 'direct-ssh-hostinfo',
    name: 'Direct: SSH to Host & Get Info',
    description: 'Connect to single host via SSH and get system info (uses test target 172.29.0.100)',
    category: 'access',
    icon: '⬡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Direct SSH Info' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Ping Host', type: 'scanning.ping_sweep', category: 'scanning', parameters: { target: '172.29.0.100', timeout: 3 } } },
      { type: 'block', position: { x: 100, y: 270 }, data: { label: 'Is Alive?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check if host responds' } } },
      { type: 'block', position: { x: 300, y: 220 }, data: { label: 'SSH Test', type: 'connection.ssh_test', category: 'connection', parameters: { host: '172.29.0.100', port: 22, username: 'root', password: 'toor' } } },
      { type: 'block', position: { x: 300, y: 340 }, data: { label: 'Get Host Info', type: 'command.system_info', category: 'command', parameters: { host: '172.29.0.100', username: 'root', password: 'toor', infoType: 'all' } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'true', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'false', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  // ============================================================================
  // AUTOMATION SCENARIOS (10 Production Workflows)
  // These templates can be used with production or test environments
  // ============================================================================
  
  // Scenario 1: Asset Discovery & Inventory
  {
    id: 'asset-discovery',
    name: 'Asset Discovery & Inventory',
    description: 'Discover all hosts on subnet via ARP/Ping, add to inventory',
    category: 'scanning',
    icon: '◉',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Asset Discovery' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'ARP Discovery', type: 'assets.discover_arp', category: 'assets', parameters: { subnet: '172.29.0.0/24', timeout: 15, autoAdd: true } } },
      { type: 'block', position: { x: 100, y: 270 }, data: { label: 'Ping Sweep', type: 'assets.discover_ping', category: 'assets', parameters: { subnet: '172.29.0.0/24', timeout: 2000, concurrent: 50, autoAdd: true } } },
      { type: 'block', position: { x: 100, y: 390 }, data: { label: 'Get All Assets', type: 'assets.get_all', category: 'assets', parameters: { includeOffline: false, limit: 100 } } },
      { type: 'block', position: { x: 100, y: 510 }, data: { label: 'Asset Count Check', type: 'data.assertion', category: 'data', parameters: { name: 'Discovered hosts check', condition: 'expression', value: 'context.input.length > 0', failMessage: 'No hosts discovered!' } } },
      { type: 'block', position: { x: 100, y: 630 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Discovery complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'discovered', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'discovered', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'assets', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 2: Vulnerability Assessment Chain
  {
    id: 'vuln-assessment',
    name: 'Vulnerability Assessment Chain',
    description: 'Scan target, detect versions, lookup CVEs, map exploits',
    category: 'scanning',
    icon: '⚠',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Vuln Assessment' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Version Detection', type: 'scanning.version_detect', category: 'scanning', parameters: { host: '172.29.0.106', ports: '22,80,8080,3306', aggressive: true, timeout: 300 } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Parse Versions', type: 'data.output_interpreter', category: 'data', parameters: { inputSource: '{{previous.output}}', containsPass: 'Apache', extractVariable: 'apacheVersion', extractPattern: 'Apache/(\\d+\\.\\d+\\.\\d+)' } } },
      { type: 'block', position: { x: 320, y: 290 }, data: { label: 'CVE Lookup Apache', type: 'vulnerability.cve_lookup', category: 'scanning', parameters: { product: 'apache http server', version: '2.4.49', vendor: 'apache' } } },
      { type: 'block', position: { x: 320, y: 430 }, data: { label: 'Get Exploits', type: 'vulnerability.get_exploits', category: 'scanning', parameters: { cve_id: 'CVE-2021-41773' } } },
      { type: 'block', position: { x: 320, y: 570 }, data: { label: 'Transform Results', type: 'data.transform', category: 'data', parameters: { transformType: 'json_stringify', template: '{"host": "172.29.0.106", "cves": {{input.cves}}, "exploits": {{input.exploits}}}' } } },
      { type: 'block', position: { x: 100, y: 570 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Vuln assessment complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 3: Credential Validation Sweep
  {
    id: 'credential-sweep',
    name: 'Credential Validation Sweep',
    description: 'Test SSH/FTP credentials against multiple hosts',
    category: 'access',
    icon: '🔑',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Credential Sweep' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Targets', type: 'control.variable_set', category: 'control', parameters: { name: 'targets', value: '["172.29.0.100", "172.29.0.105", "172.29.0.106"]', type: 'array' } } },
      { type: 'block', position: { x: 100, y: 270 }, data: { label: 'Loop Targets', type: 'control.loop', category: 'control', parameters: { mode: 'array', items: '{{ $vars.targets }}', variable: 'target' } } },
      { type: 'block', position: { x: 320, y: 220 }, data: { label: 'SSH Test (root)', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{ $loop.item }}', port: 22, username: 'root', password: 'toor', timeout: 10 } } },
      { type: 'block', position: { x: 320, y: 360 }, data: { label: 'FTP Test', type: 'connection.ftp_test', category: 'connection', parameters: { host: '{{ $loop.item }}', port: 21, protocol: 'ftp', username: 'ftpuser', password: 'ftp123' } } },
      { type: 'block', position: { x: 320, y: 500 }, data: { label: 'Log Results', type: 'control.variable_set', category: 'control', parameters: { name: 'lastResult', value: '{"host": "{{ $loop.item }}", "ssh": {{ $prev.success }}, "ftp": {{ $blocks.ftp_test.success }}}' } } },
      { type: 'block', position: { x: 100, y: 500 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Credential sweep complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'out', targetHandle: 'in' },
      { source: '6', target: '3', sourceHandle: 'out', targetHandle: 'next' },
      { source: '3', target: '7', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },

  // Scenario 4: SSH Command Execution Campaign
  {
    id: 'ssh-campaign',
    name: 'SSH Command Execution Campaign',
    description: 'Execute commands on all SSH-accessible hosts',
    category: 'access',
    icon: '⬢',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'SSH Campaign' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Filter SSH Assets', type: 'assets.get_by_filter', category: 'assets', parameters: { status: 'online', subnet: '172.29.0.0/24' } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Loop Assets', type: 'control.loop', category: 'control', parameters: { mode: 'array', items: '{{ $prev.assets }}', variable: 'asset' } } },
      { type: 'block', position: { x: 320, y: 240 }, data: { label: 'SSH Test', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{ $loop.item.ip_address }}', port: 22, username: 'root', password: 'toor', timeout: 10 } } },
      { type: 'block', position: { x: 320, y: 380 }, data: { label: 'SSH Connected?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check SSH connection' } } },
      { type: 'block', position: { x: 540, y: 330 }, data: { label: 'Run: hostname', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{ $loop.item.ip_address }}', port: 22, username: 'root', password: 'toor', command: 'hostname && uname -a', timeout: 30 } } },
      { type: 'block', position: { x: 540, y: 470 }, data: { label: 'Parse Output', type: 'data.code', category: 'data', parameters: { description: 'Parse hostname output', passCode: 'return context.input && context.input.length > 0;', outputCode: 'return { host: context.input.split("\\n")[0], info: context.input };' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'SSH campaign complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'assets', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'true', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'false', targetHandle: 'next' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '7', target: '3', sourceHandle: 'pass', targetHandle: 'next' },
      { source: '3', target: '8', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },

  // Scenario 5: Network Traffic Analysis
  {
    id: 'traffic-analysis',
    name: 'Network Traffic Analysis',
    description: 'Capture and analyze network traffic patterns',
    category: 'traffic',
    icon: '≋',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Traffic Analysis' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Burst Capture (5s)', type: 'traffic.burst_capture', category: 'traffic', parameters: { interface: 'eth0', duration_seconds: 5, filter: 'net 172.29.0.0/24' } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Get Traffic Stats', type: 'traffic.get_stats', category: 'traffic', parameters: { interface: 'eth0', period: '1m' } } },
      { type: 'block', position: { x: 100, y: 430 }, data: { label: 'Analyze Traffic', type: 'data.output_interpreter', category: 'data', parameters: { inputSource: '{{previous.output}}', containsPass: 'packets', extractVariable: 'packetCount', extractPattern: '(\\d+) packets' } } },
      { type: 'block', position: { x: 100, y: 570 }, data: { label: 'Traffic Check', type: 'data.assertion', category: 'data', parameters: { name: 'Traffic detected', condition: 'expression', value: 'context.input.packetCount > 0', failMessage: 'No traffic captured!' } } },
      { type: 'block', position: { x: 100, y: 710 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Traffic analysis complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 6: Exploit Discovery & Mapping
  {
    id: 'exploit-discovery',
    name: 'Exploit Discovery & Mapping',
    description: 'Find services, lookup CVEs, discover available exploits',
    category: 'scanning',
    icon: '⚡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Exploit Discovery' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Service Scan', type: 'scanning.service_scan', category: 'scanning', parameters: { host: '172.29.0.106' } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Version Detect', type: 'scanning.version_detect', category: 'scanning', parameters: { host: '172.29.0.106', ports: '22,8080,3306', aggressive: true } } },
      { type: 'block', position: { x: 100, y: 430 }, data: { label: 'CVE Lookup', type: 'vulnerability.cve_lookup', category: 'scanning', parameters: { product: 'apache http server', version: '2.4.49' } } },
      { type: 'block', position: { x: 100, y: 570 }, data: { label: 'Get Exploits', type: 'vulnerability.get_exploits', category: 'scanning', parameters: { cve_id: 'CVE-2021-41773' } } },
      { type: 'block', position: { x: 100, y: 710 }, data: { label: 'Map Results', type: 'data.transform', category: 'data', parameters: { transformType: 'template', template: '{"target": "172.29.0.106", "exploitable": true, "exploits": {{input}}}' } } },
      { type: 'block', position: { x: 100, y: 850 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Exploit discovery complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 7: FTP File Operations
  {
    id: 'ftp-operations',
    name: 'FTP File Operations',
    description: 'Connect to FTP, list files, download and upload',
    category: 'access',
    icon: '▤',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'FTP Operations' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'FTP Test', type: 'connection.ftp_test', category: 'connection', parameters: { host: '172.29.0.105', port: 21, protocol: 'ftp', username: 'ftpuser', password: 'ftp123' } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'FTP Connected?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check FTP connection' } } },
      { type: 'block', position: { x: 320, y: 240 }, data: { label: 'FTP List', type: 'command.ftp_list', category: 'command', parameters: { host: '172.29.0.105', port: 21, username: 'ftpuser', password: 'ftp123', path: '/downloads' } } },
      { type: 'block', position: { x: 320, y: 380 }, data: { label: 'FTP Download', type: 'command.ftp_download', category: 'command', parameters: { host: '172.29.0.105', port: 21, username: 'ftpuser', password: 'ftp123', remotePath: '/downloads/test.txt', localPath: '/tmp/downloaded.txt' } } },
      { type: 'block', position: { x: 320, y: 520 }, data: { label: 'FTP Upload', type: 'command.ftp_upload', category: 'command', parameters: { host: '172.29.0.105', port: 21, username: 'ftpuser', password: 'ftp123', localPath: '/tmp/downloaded.txt', remotePath: '/uploads/uploaded.txt' } } },
      { type: 'block', position: { x: 100, y: 520 }, data: { label: 'End Success', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'FTP operations complete' } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'End Fail', type: 'control.end', category: 'control', parameters: { status: 'failure', message: 'FTP connection failed' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'true', targetHandle: 'in' },
      { source: '3', target: '8', sourceHandle: 'false', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 8: Multi-Host Ping Health Check
  {
    id: 'ping-health-check',
    name: 'Multi-Host Ping Health Check',
    description: 'Ping all assets and verify connectivity status',
    category: 'traffic',
    icon: '●',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Health Check' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Get All Assets', type: 'assets.get_all', category: 'assets', parameters: { includeOffline: true, limit: 50 } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Loop Assets', type: 'control.loop', category: 'control', parameters: { mode: 'array', items: '{{ $prev.assets }}', variable: 'asset' } } },
      { type: 'block', position: { x: 320, y: 240 }, data: { label: 'Ping Host', type: 'traffic.ping', category: 'traffic', parameters: { host: '{{ $loop.item.ip_address }}', count: 3, timeout: 5 } } },
      { type: 'block', position: { x: 320, y: 380 }, data: { label: 'Check Status', type: 'data.assertion', category: 'data', parameters: { name: 'Host reachable', condition: 'expression', value: 'context.input.success === true', failMessage: 'Host unreachable: {{ $loop.item.ip_address }}' } } },
      { type: 'block', position: { x: 320, y: 520 }, data: { label: 'Update Status', type: 'assets.check_online', category: 'assets', parameters: { host: '{{ $loop.item.ip_address }}', method: 'ping', updateInventory: true } } },
      { type: 'block', position: { x: 100, y: 520 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Health check complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'assets', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'loop', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '3', sourceHandle: 'online', targetHandle: 'next' },
      { source: '5', target: '3', sourceHandle: 'fail', targetHandle: 'next' },
      { source: '3', target: '7', sourceHandle: 'done', targetHandle: 'in' },
    ],
  },

  // Scenario 9: Agent Deployment Chain
  {
    id: 'agent-deploy',
    name: 'Agent Deployment Chain',
    description: 'Generate agent, deploy via SSH, verify running',
    category: 'agent',
    icon: '◆',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Agent Deploy' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'SSH Test Target', type: 'connection.ssh_test', category: 'connection', parameters: { host: '172.29.0.100', port: 22, username: 'root', password: 'toor', timeout: 10 } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'SSH OK?', type: 'control.condition', category: 'control', parameters: { expression: '{{ $prev.success }} === true', description: 'Check SSH access' } } },
      { type: 'block', position: { x: 320, y: 240 }, data: { label: 'Generate Agent', type: 'agent.generate', category: 'agent', parameters: { agent_id: 'default', platform: 'linux-amd64', obfuscate: true, compress: true } } },
      { type: 'block', position: { x: 320, y: 380 }, data: { label: 'Deploy Agent', type: 'agent.deploy', category: 'agent', parameters: { host: '172.29.0.100', username: 'root', password: 'toor', agentBinary: '{{ $prev.agentPath }}', remotePath: '/tmp/nop-agent', autoStart: true } } },
      { type: 'block', position: { x: 320, y: 520 }, data: { label: 'Verify Running', type: 'command.ssh_execute', category: 'command', parameters: { host: '172.29.0.100', port: 22, username: 'root', password: 'toor', command: 'ps aux | grep nop-agent', timeout: 15 } } },
      { type: 'block', position: { x: 100, y: 520 }, data: { label: 'End Success', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Agent deployed' } } },
      { type: 'block', position: { x: 100, y: 400 }, data: { label: 'End Fail', type: 'control.end', category: 'control', parameters: { status: 'failure', message: 'SSH access failed' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'true', targetHandle: 'in' },
      { source: '3', target: '8', sourceHandle: 'false', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },

  // Scenario 10: Traffic Storm Testing
  {
    id: 'traffic-storm',
    name: 'Traffic Storm Testing',
    description: 'Generate traffic storm, capture burst, analyze results',
    category: 'traffic',
    icon: '⚡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: { name: 'Storm Test' } } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Pre-Storm Stats', type: 'traffic.get_stats', category: 'traffic', parameters: { interface: 'eth0', period: '1m' } } },
      { type: 'block', position: { x: 100, y: 290 }, data: { label: 'Start Storm', type: 'traffic.storm', category: 'traffic', parameters: { interface: 'eth0', type: 'broadcast', duration: 3, rate: 500 } } },
      { type: 'block', position: { x: 100, y: 430 }, data: { label: 'Wait', type: 'control.delay', category: 'control', parameters: { seconds: 5 } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'Burst Capture', type: 'traffic.burst_capture', category: 'traffic', parameters: { interface: 'eth0', duration_seconds: 2, filter: 'broadcast' } } },
      { type: 'block', position: { x: 100, y: 690 }, data: { label: 'Post-Storm Stats', type: 'traffic.get_stats', category: 'traffic', parameters: { interface: 'eth0', period: '1m' } } },
      { type: 'block', position: { x: 100, y: 830 }, data: { label: 'Analyze Results', type: 'data.code', category: 'data', parameters: { description: 'Compare pre/post stats', passCode: 'return true;', outputCode: 'return { preStorm: context.vars.preStats, postStorm: context.input, stormDetected: true };' } } },
      { type: 'block', position: { x: 100, y: 970 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success', message: 'Storm test complete' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '7', target: '8', sourceHandle: 'pass', targetHandle: 'in' },
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
