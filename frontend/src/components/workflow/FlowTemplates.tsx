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

// Practical automation flow templates based on real use cases
// Updated with 3-OUTPUT MODEL: Every block can produce pass, fail, output
const TEMPLATES: FlowTemplate[] = [
  // ============================================================================
  // TRAFFIC DOMAIN FLOWS (with Code Blocks for output interpretation)
  // ============================================================================
  {
    id: 'multi-host-ping-monitor',
    name: 'Multi-Host Ping Monitor',
    description: 'Ping multiple hosts and collect reachability results with pass/fail interpretation',
    category: 'traffic',
    icon: '≋',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Define Hosts', type: 'control.variable_set', category: 'control', parameters: { name: 'hosts', value: '["192.168.1.1", "192.168.1.2", "192.168.1.3"]' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'For Each Host', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{hosts}}', variable: 'host' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Ping Host', type: 'traffic.ping', category: 'traffic', parameters: { host: '{{item}}', count: 3, timeout: 5 } } },
      { type: 'block', position: { x: 250, y: 350 }, data: { label: 'Parse Ping Result', type: 'data.code', category: 'data', parameters: { 
        description: 'Interpret ping result and determine pass/fail',
        passCode: 'return context.input && context.input.success === true && context.input.latency < 1000;',
        failCode: 'return context.input && (context.input.success === false || context.input.latency > 5000);',
        outputCode: 'return { host: context.variables.host, reachable: context.input?.success || false, latencyMs: context.input?.latency || null, status: context.input?.success ? "UP" : "DOWN" };'
      } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'traffic-baseline-collection',
    name: 'Traffic Baseline Collection',
    description: 'Capture network traffic for baseline analysis',
    category: 'traffic',
    icon: '⊙',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Start Capture', type: 'traffic.start_capture', category: 'traffic', parameters: { interface: 'eth0' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Wait 60s', type: 'control.delay', category: 'control', parameters: { seconds: 60 } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Stop Capture', type: 'traffic.stop_capture', category: 'traffic', parameters: {} } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Get Stats', type: 'traffic.get_stats', category: 'traffic', parameters: {} } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },

  // ============================================================================
  // SCANNING DOMAIN FLOWS
  // ============================================================================
  {
    id: 'network-discovery-pipeline',
    name: 'Network Discovery Pipeline',
    description: 'Discover hosts, scan ports, detect services',
    category: 'scanning',
    icon: '◈',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Define Network', type: 'control.variable_set', category: 'control', parameters: { name: 'targets', value: '["192.168.1.10", "192.168.1.20", "192.168.1.30"]' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'For Each Target', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{targets}}', variable: 'target' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Port Scan', type: 'scanning.port_scan', category: 'scanning', parameters: { host: '{{item}}', ports: '22,80,443,3389' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Version Detection', type: 'scanning.version_detect', category: 'scanning', parameters: { host: '{{item}}' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'security-scan-pipeline',
    name: 'Security Scan Pipeline',
    description: 'Port scan → Version detect → Vulnerability check with Code Block to interpret results',
    category: 'scanning',
    icon: '◈',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Target', type: 'control.variable_set', category: 'control', parameters: { name: 'target', value: '192.168.1.100' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Port Scan', type: 'scanning.port_scan', category: 'scanning', parameters: { host: '{{target}}', ports: '1-1000' } } },
      { type: 'block', position: { x: 280, y: 250 }, data: { label: 'Parse Ports', type: 'data.code', category: 'data', parameters: { 
        description: 'Check if open ports were found',
        passCode: 'return context.input && context.input.ports && context.input.ports.length > 0;',
        outputCode: 'return { openPorts: context.input?.ports || [], portCount: context.input?.ports?.length || 0, hasSSH: context.input?.ports?.includes(22), hasHTTP: context.input?.ports?.includes(80) || context.input?.ports?.includes(443) };'
      } } },
      { type: 'block', position: { x: 50, y: 450 }, data: { label: 'Version Detection', type: 'scanning.version_detect', category: 'scanning', parameters: { host: '{{target}}' } } },
      { type: 'block', position: { x: 280, y: 450 }, data: { label: 'Parse Services', type: 'data.code', category: 'data', parameters: { 
        description: 'Check detected services for vulnerabilities',
        passCode: 'const services = context.input?.services || []; return services.length > 0;',
        failCode: 'return context.input?.error !== undefined;',
        outputCode: 'const services = context.input?.services || []; return { serviceCount: services.length, services: services.map(s => s.name + " " + s.version).join(", "), hasVulnerable: services.some(s => s.vulnerable) };'
      } } },
      { type: 'block', position: { x: 250, y: 550 }, data: { label: 'No Services Found', type: 'control.delay', category: 'control', parameters: { seconds: 1 } } },
      { type: 'block', position: { x: 100, y: 650 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '7', sourceHandle: 'fail', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'out', targetHandle: 'in' },
      { source: '6', target: '8', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '7', target: '8', sourceHandle: 'out', targetHandle: 'in' },
    ],
  },

  // ============================================================================
  // ACCESS DOMAIN FLOWS
  // ============================================================================
  {
    id: 'connectivity-health-check',
    name: 'Connectivity Health Check',
    description: 'Test ICMP, SSH, and HTTPS connectivity per host',
    category: 'access',
    icon: '♡',
    nodes: [
      { type: 'block', position: { x: 150, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 150, y: 150 }, data: { label: 'Define Hosts', type: 'control.variable_set', category: 'control', parameters: { name: 'hosts', value: '["gateway", "web-server", "db-server"]' } } },
      { type: 'block', position: { x: 150, y: 250 }, data: { label: 'For Each Host', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{hosts}}', variable: 'host' } } },
      { type: 'block', position: { x: 50, y: 350 }, data: { label: 'Ping', type: 'traffic.ping', category: 'traffic', parameters: { host: '{{item}}', count: 2 } } },
      { type: 'block', position: { x: 150, y: 350 }, data: { label: 'SSH Test', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{item}}', port: 22 } } },
      { type: 'block', position: { x: 250, y: 350 }, data: { label: 'HTTPS Test', type: 'connection.tcp_test', category: 'connection', parameters: { host: '{{item}}', port: 443 } } },
      { type: 'block', position: { x: 150, y: 450 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '3', target: '5', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '7', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'ssh-command-chain',
    name: 'SSH Command Chain',
    description: 'Execute multiple commands on target via SSH',
    category: 'access',
    icon: '⬡',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Test SSH', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{target}}', port: 22, username: 'root' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Get Hostname', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{target}}', command: 'hostname' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Get System Info', type: 'command.system_info', category: 'command', parameters: { host: '{{target}}' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Get Disk Usage', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{target}}', command: 'df -h' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'rep-ring-test',
    name: 'REP Ring Failover Test',
    description: 'Test switch redundancy with Code Block to parse "show rep topology" output and determine pass/fail',
    category: 'access',
    icon: '◎',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Define Switches', type: 'control.variable_set', category: 'control', parameters: { name: 'switches', value: '["192.168.1.1", "192.168.1.2", "192.168.1.3", "192.168.1.4"]' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'For Each Switch', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{switches}}', variable: 'switch' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'SSH Connect', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{item}}', port: 22 } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Shutdown Port', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{item}}', command: 'conf t; int Gi0/1; shutdown; end' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'Wait 10s', type: 'control.delay', category: 'control', parameters: { seconds: 10 } } },
      { type: 'block', position: { x: 100, y: 650 }, data: { label: 'Show REP Status', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{item}}', command: 'show rep topology' } } },
      { type: 'block', position: { x: 280, y: 650 }, data: { label: 'Parse REP Status', type: 'data.code', category: 'data', parameters: { 
        description: 'Parse REP ring output to determine if ring is OK',
        passCode: '// Check if ring status is OK\nconst output = context.input;\nreturn /Ring is OK/i.test(output);',
        failCode: '// Fail if we see error messages\nconst output = context.input;\nreturn /Error|Failed|Ring is Down/i.test(output);',
        outputCode: '// Extract ring status and port count\nconst output = context.input;\nconst portMatch = output.match(/(\\d+) ports? in segment/);\nconst ringOK = /Ring is OK/i.test(output);\nreturn {\n  ringStatus: ringOK ? "OK" : "FAILED",\n  portCount: portMatch ? parseInt(portMatch[1]) : 0,\n  rawOutput: output,\n  timestamp: new Date().toISOString()\n};'
      } } },
      { type: 'block', position: { x: 100, y: 850 }, data: { label: 'Enable Port', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{item}}', command: 'conf t; int Gi0/1; no shutdown; end' } } },
      { type: 'block', position: { x: 100, y: 950 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'out', targetHandle: 'in' },
      { source: '7', target: '8', sourceHandle: 'out', targetHandle: 'in' },
      { source: '8', target: '9', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '9', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '10', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },

  // ============================================================================
  // AGENT DOMAIN FLOWS
  // ============================================================================
  {
    id: 'agent-mass-deployment',
    name: 'Agent Mass Deployment',
    description: 'Deploy agents to multiple targets via SSH',
    category: 'agent',
    icon: '◆',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Define Targets', type: 'control.variable_set', category: 'control', parameters: { name: 'targets', value: '["192.168.1.10", "192.168.1.15", "192.168.1.20"]' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'For Each Target', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{targets}}', variable: 'target' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Test SSH', type: 'connection.ssh_test', category: 'connection', parameters: { host: '{{item}}', port: 22 } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Check SSH', type: 'control.condition', category: 'control', parameters: { expression: '{{$prev.success}}' } } },
      { type: 'block', position: { x: 50, y: 550 }, data: { label: 'Generate Agent', type: 'agent.generate', category: 'agent', parameters: { platform: 'linux-amd64', capabilities: ['asset', 'traffic', 'host'] } } },
      { type: 'block', position: { x: 50, y: 650 }, data: { label: 'Deploy Agent', type: 'agent.deploy', category: 'agent', parameters: { host: '{{item}}', autoStart: true } } },
      { type: 'block', position: { x: 250, y: 550 }, data: { label: 'Log Failed', type: 'control.delay', category: 'control', parameters: { seconds: 1 } } },
      { type: 'block', position: { x: 100, y: 750 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'true', targetHandle: 'in' },
      { source: '5', target: '8', sourceHandle: 'false', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'out', targetHandle: 'in' },
      { source: '7', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '8', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '9', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'agent-pov-recon',
    name: 'Agent POV Reconnaissance',
    description: 'Scan remote network through deployed agent',
    category: 'agent',
    icon: '⬢',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Agent', type: 'control.variable_set', category: 'control', parameters: { name: 'agent_id', value: 'your-agent-id-here' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Set Network', type: 'control.variable_set', category: 'control', parameters: { name: 'target_network', value: '10.10.0.0/24' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Ping via Agent', type: 'traffic.advanced_ping', category: 'traffic', parameters: { hosts: '{{target_network}}', count: 1 } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'For Each Host', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{$prev.hosts}}', variable: 'host' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'Port Scan', type: 'scanning.port_scan', category: 'scanning', parameters: { host: '{{item.ip}}', ports: '22,80,443,3389' } } },
      { type: 'block', position: { x: 100, y: 650 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '6', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '7', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },

  // ============================================================================
  // DATA PROCESSING FLOWS (using new 3-output blocks)
  // ============================================================================
  {
    id: 'service-health-check-with-assertions',
    name: 'Service Health Check (Assertions)',
    description: 'Check service health using Output Interpreter for pass/fail',
    category: 'utility',
    icon: '✓',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Set Target', type: 'control.variable_set', category: 'control', parameters: { name: 'target', value: '192.168.1.100' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Get System Info', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{target}}', command: 'systemctl status nginx && df -h && free -m' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { 
        label: 'Check Nginx Running', 
        type: 'data.output_interpreter', 
        category: 'data', 
        parameters: { 
          inputSource: '{{previous.output}}',
          aggregation: 'all',
          containsPass: 'active (running)',
          notContainsFail: 'inactive|failed|dead',
          extractVariable: 'nginxStatus',
          extractPattern: 'Active: (.+)'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { 
        label: 'Assert Disk OK', 
        type: 'data.assertion', 
        category: 'data', 
        parameters: { 
          name: 'Disk Space Check',
          condition: 'not_contains',
          value: '100%',
          failMessage: 'Disk is full!'
        } 
      } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'network-device-config-audit',
    name: 'Network Config Audit (Code Block)',
    description: 'Audit network device configs with JavaScript parsing',
    category: 'scanning',
    icon: '⟐',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Define Devices', type: 'control.variable_set', category: 'control', parameters: { name: 'devices', value: '["switch1", "switch2", "router1"]' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'For Each Device', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{devices}}', variable: 'device' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Get Running Config', type: 'command.ssh_execute', category: 'command', parameters: { host: '{{item}}', command: 'show running-config' } } },
      { type: 'block', position: { x: 100, y: 450 }, data: { 
        label: 'Audit Config', 
        type: 'data.code', 
        category: 'data', 
        parameters: { 
          description: 'Check for security issues in running config',
          passCode: `// Check for common security issues
const config = context.input;
const hasPasswordEncryption = /service password-encryption/i.test(config);
const hasSSHv2 = /ip ssh version 2/i.test(config);
const noTelnet = !/line vty.*transport input telnet/i.test(config);
return hasPasswordEncryption && hasSSHv2 && noTelnet;`,
          outputCode: `// Extract security audit results
const config = context.input;
return {
  device: context.variables.device,
  passwordEncryption: /service password-encryption/i.test(config),
  sshv2: /ip ssh version 2/i.test(config),
  telnetDisabled: !/line vty.*transport input telnet/i.test(config),
  aclCount: (config.match(/access-list/g) || []).length,
  timestamp: new Date().toISOString()
};`
        } 
      } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '6', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
  {
    id: 'data-transform-pipeline',
    name: 'Data Transform Pipeline',
    description: 'Transform and filter data between blocks',
    category: 'utility',
    icon: '↹',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Get Assets', type: 'asset.list_assets', category: 'scanning', parameters: { status: 'online' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { 
        label: 'Filter Linux Only', 
        type: 'data.transform', 
        category: 'data', 
        parameters: { 
          transformType: 'filter_array',
          filterExpression: 'item.os && item.os.toLowerCase().includes("linux")'
        } 
      } },
      { type: 'block', position: { x: 100, y: 350 }, data: { 
        label: 'Extract IPs', 
        type: 'data.code', 
        category: 'data', 
        parameters: { 
          passCode: 'return context.input.length > 0;',
          outputCode: 'return context.input.map(asset => asset.ip_address);'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'For Each IP', type: 'control.loop', category: 'control', parameters: { mode: 'array', array: '{{$prev.output}}', variable: 'ip' } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'Ping', type: 'traffic.ping', category: 'traffic', parameters: { host: '{{item}}', count: 2 } } },
      { type: 'block', position: { x: 100, y: 650 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'iteration', targetHandle: 'in' },
      { source: '6', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '7', sourceHandle: 'complete', targetHandle: 'in' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  scanning: 'border-cyber-green bg-cyber-green/10',
  access: 'border-cyber-blue bg-cyber-blue/10',
  traffic: 'border-cyber-purple bg-cyber-purple/10',
  agent: 'border-cyber-red bg-cyber-red/10',
  utility: 'border-cyber-gray bg-cyber-gray/10',
  data: 'border-teal-400 bg-teal-400/10',
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
