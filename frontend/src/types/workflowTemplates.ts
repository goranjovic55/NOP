/**
 * Workflow Templates - Pre-built automation patterns for NOP
 * 
 * These templates provide common network automation workflows:
 * - Network testing (connectivity, ring tests)
 * - Discovery (full, quick, passive)
 * - Security assessment (vulnerability, compliance)
 * - Monitoring (health checks, baselines)
 */

import { WorkflowTemplate, BlockType } from './executionResults';

/**
 * Template: Rep Ring Test
 * Tests network ring redundancy by verifying connectivity across all nodes
 */
export const REP_RING_TEST_TEMPLATE: WorkflowTemplate = {
  id: 'template-rep-ring-test',
  name: 'Rep Ring Test',
  description: 'Tests network ring redundancy by verifying bidirectional connectivity across all ring nodes. Reports pass/fail for each segment.',
  category: 'network_testing',
  icon: '🔄',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'ring_nodes',
      type: 'array',
      required: true,
      description: 'Array of IP addresses in the ring order',
      example: ['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4'],
    },
    {
      name: 'timeout_ms',
      type: 'number',
      required: false,
      default: 5000,
      description: 'Ping timeout in milliseconds',
    },
    {
      name: 'retry_count',
      type: 'number',
      required: false,
      default: 3,
      description: 'Number of retries for failed pings',
    },
  ],
  
  expectedOutputs: ['ring_status', 'failed_segments', 'latency_report'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'set-vars', type: 'set_variable', position: { x: 100, y: 120 }, data: { 
        variables: [
          { name: 'results', value: [] },
          { name: 'failed_count', value: 0 },
        ]
      }},
      { id: 'loop-nodes', type: 'loop_foreach', position: { x: 100, y: 200 }, data: {
        collection: '{{ring_nodes}}',
        iterator: 'current_node',
        index: 'node_index',
      }},
      { id: 'ping-test', type: 'ping_test', position: { x: 100, y: 280 }, data: {
        target: '{{current_node}}',
        timeout: '{{timeout_ms}}',
        retries: '{{retry_count}}',
      }},
      { id: 'check-response', type: 'assertion', position: { x: 100, y: 360 }, data: {
        expression: '{{ping_result.success}} == true',
        message: 'Node {{current_node}} should respond to ping',
      }},
      { id: 'aggregate', type: 'aggregate', position: { x: 100, y: 440 }, data: {
        operation: 'collect',
        field: 'ping_result',
        output: 'all_results',
      }},
      { id: 'generate-report', type: 'report', position: { x: 100, y: 520 }, data: {
        title: 'Rep Ring Test Report',
        include: ['all_results', 'failed_count'],
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 600 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'set-vars' },
      { id: 'e2', source: 'set-vars', target: 'loop-nodes' },
      { id: 'e3', source: 'loop-nodes', target: 'ping-test' },
      { id: 'e4', source: 'ping-test', target: 'check-response' },
      { id: 'e5', source: 'check-response', target: 'loop-nodes', label: 'next iteration' },
      { id: 'e6', source: 'loop-nodes', target: 'aggregate', label: 'loop complete' },
      { id: 'e7', source: 'aggregate', target: 'generate-report' },
      { id: 'e8', source: 'generate-report', target: 'end' },
    ],
    variables: {
      timeout_ms: 5000,
      retry_count: 3,
    },
  },
  
  estimatedDuration: '2-5 minutes',
  complexity: 'simple',
};

/**
 * Template: Full Network Discovery
 * Complete network enumeration with port scanning and service detection
 */
export const FULL_DISCOVERY_TEMPLATE: WorkflowTemplate = {
  id: 'template-full-discovery',
  name: 'Full Network Discovery',
  description: 'Complete network enumeration: ARP discovery → port scanning → service detection → CVE lookup. Provides comprehensive asset inventory.',
  category: 'discovery',
  icon: '🔍',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'target_network',
      type: 'string',
      required: true,
      description: 'Target network in CIDR notation',
      example: '10.0.0.0/24',
    },
    {
      name: 'port_range',
      type: 'string',
      required: false,
      default: '1-1000',
      description: 'Port range to scan',
    },
    {
      name: 'scan_type',
      type: 'string',
      required: false,
      default: 'comprehensive',
      description: 'Scan type: basic, comprehensive, vuln',
    },
  ],
  
  expectedOutputs: ['discovered_hosts', 'open_ports', 'services', 'vulnerabilities'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'arp-scan', type: 'discovery_scan', position: { x: 100, y: 130 }, data: {
        method: 'arp',
        target: '{{target_network}}',
      }},
      { id: 'loop-hosts', type: 'loop_foreach', position: { x: 100, y: 210 }, data: {
        collection: '{{discovered_hosts}}',
        iterator: 'host',
      }},
      { id: 'port-scan', type: 'port_scan', position: { x: 100, y: 290 }, data: {
        target: '{{host.ip}}',
        ports: '{{port_range}}',
        type: 'tcp',
      }},
      { id: 'service-detect', type: 'service_detection', position: { x: 100, y: 370 }, data: {
        target: '{{host.ip}}',
        ports: '{{open_ports}}',
      }},
      { id: 'cve-lookup', type: 'vulnerability_scan', position: { x: 100, y: 450 }, data: {
        services: '{{detected_services}}',
      }},
      { id: 'aggregate', type: 'aggregate', position: { x: 100, y: 530 }, data: {
        operation: 'merge',
        output: 'discovery_results',
      }},
      { id: 'report', type: 'report', position: { x: 100, y: 610 }, data: {
        title: 'Network Discovery Report',
        format: 'detailed',
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 690 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'arp-scan' },
      { id: 'e2', source: 'arp-scan', target: 'loop-hosts' },
      { id: 'e3', source: 'loop-hosts', target: 'port-scan' },
      { id: 'e4', source: 'port-scan', target: 'service-detect' },
      { id: 'e5', source: 'service-detect', target: 'cve-lookup' },
      { id: 'e6', source: 'cve-lookup', target: 'loop-hosts', label: 'next host' },
      { id: 'e7', source: 'loop-hosts', target: 'aggregate', label: 'complete' },
      { id: 'e8', source: 'aggregate', target: 'report' },
      { id: 'e9', source: 'report', target: 'end' },
    ],
    variables: {
      port_range: '1-1000',
      scan_type: 'comprehensive',
    },
  },
  
  estimatedDuration: '5-30 minutes',
  complexity: 'complex',
};

/**
 * Template: Port Availability Check
 * Verify that critical ports are open and accessible
 */
export const PORT_CHECK_TEMPLATE: WorkflowTemplate = {
  id: 'template-port-check',
  name: 'Port Availability Check',
  description: 'Verifies that specified critical ports are open on target hosts. Useful for service health monitoring.',
  category: 'network_testing',
  icon: '🔌',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'targets',
      type: 'array',
      required: true,
      description: 'Array of target hosts to check',
      example: ['web-server-1', 'web-server-2'],
    },
    {
      name: 'required_ports',
      type: 'array',
      required: true,
      description: 'Array of ports that must be open',
      example: [22, 80, 443],
    },
    {
      name: 'timeout_ms',
      type: 'number',
      required: false,
      default: 3000,
      description: 'Connection timeout in milliseconds',
    },
  ],
  
  expectedOutputs: ['port_status', 'failed_ports', 'summary'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'loop-hosts', type: 'loop_foreach', position: { x: 100, y: 130 }, data: {
        collection: '{{targets}}',
        iterator: 'host',
      }},
      { id: 'loop-ports', type: 'loop_foreach', position: { x: 100, y: 210 }, data: {
        collection: '{{required_ports}}',
        iterator: 'port',
      }},
      { id: 'check-port', type: 'port_scan', position: { x: 100, y: 290 }, data: {
        target: '{{host}}',
        ports: '{{port}}',
        timeout: '{{timeout_ms}}',
      }},
      { id: 'assert-open', type: 'assertion', position: { x: 100, y: 370 }, data: {
        expression: '{{port_result.open}} == true',
        message: 'Port {{port}} on {{host}} should be open',
      }},
      { id: 'aggregate', type: 'aggregate', position: { x: 100, y: 450 }, data: {
        operation: 'collect',
        output: 'all_results',
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 530 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'loop-hosts' },
      { id: 'e2', source: 'loop-hosts', target: 'loop-ports' },
      { id: 'e3', source: 'loop-ports', target: 'check-port' },
      { id: 'e4', source: 'check-port', target: 'assert-open' },
      { id: 'e5', source: 'assert-open', target: 'loop-ports', label: 'next port' },
      { id: 'e6', source: 'loop-ports', target: 'loop-hosts', label: 'next host' },
      { id: 'e7', source: 'loop-hosts', target: 'aggregate', label: 'complete' },
      { id: 'e8', source: 'aggregate', target: 'end' },
    ],
    variables: {
      timeout_ms: 3000,
    },
  },
  
  estimatedDuration: '1-3 minutes',
  complexity: 'simple',
};

/**
 * Template: Service Health Check
 * Monitor service availability across multiple endpoints
 */
export const SERVICE_HEALTH_TEMPLATE: WorkflowTemplate = {
  id: 'template-service-health',
  name: 'Service Health Check',
  description: 'Checks if critical services are responding properly. Supports HTTP, TCP, and ICMP health checks.',
  category: 'monitoring',
  icon: '💓',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'services',
      type: 'array',
      required: true,
      description: 'Array of service definitions with host, port, and protocol',
      example: [
        { name: 'Web', host: '10.0.0.1', port: 80, protocol: 'http' },
        { name: 'SSH', host: '10.0.0.1', port: 22, protocol: 'tcp' },
      ],
    },
    {
      name: 'alert_on_failure',
      type: 'boolean',
      required: false,
      default: true,
      description: 'Send alert if any service fails',
    },
  ],
  
  expectedOutputs: ['service_status', 'failed_services', 'healthy_count'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'loop-services', type: 'loop_foreach', position: { x: 100, y: 130 }, data: {
        collection: '{{services}}',
        iterator: 'service',
      }},
      { id: 'health-check', type: 'ping_test', position: { x: 100, y: 210 }, data: {
        target: '{{service.host}}',
        port: '{{service.port}}',
        protocol: '{{service.protocol}}',
      }},
      { id: 'assert-healthy', type: 'assertion', position: { x: 100, y: 290 }, data: {
        expression: '{{health_result.success}} == true',
        message: '{{service.name}} should be healthy',
      }},
      { id: 'condition-alert', type: 'condition', position: { x: 100, y: 370 }, data: {
        expression: '{{alert_on_failure}} && {{failed_count}} > 0',
      }},
      { id: 'send-alert', type: 'alert', position: { x: 200, y: 450 }, data: {
        severity: 'high',
        message: 'Service health check failed: {{failed_services}}',
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 530 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'loop-services' },
      { id: 'e2', source: 'loop-services', target: 'health-check' },
      { id: 'e3', source: 'health-check', target: 'assert-healthy' },
      { id: 'e4', source: 'assert-healthy', target: 'loop-services', label: 'next' },
      { id: 'e5', source: 'loop-services', target: 'condition-alert', label: 'complete' },
      { id: 'e6', source: 'condition-alert', target: 'send-alert', condition: 'true' },
      { id: 'e7', source: 'condition-alert', target: 'end', condition: 'false' },
      { id: 'e8', source: 'send-alert', target: 'end' },
    ],
    variables: {
      alert_on_failure: true,
    },
  },
  
  estimatedDuration: '30 seconds - 2 minutes',
  complexity: 'moderate',
};

/**
 * Template: Vulnerability Assessment
 * Comprehensive security vulnerability scan
 */
export const VULNERABILITY_TEMPLATE: WorkflowTemplate = {
  id: 'template-vulnerability-assessment',
  name: 'Vulnerability Assessment',
  description: 'Comprehensive vulnerability scan including CVE lookup, exploit matching, and risk assessment.',
  category: 'security',
  icon: '🛡️',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'targets',
      type: 'array',
      required: true,
      description: 'Target hosts or networks to assess',
      example: ['10.0.0.0/24'],
    },
    {
      name: 'cve_databases',
      type: 'array',
      required: false,
      default: ['cve', 'exploit_db', 'metasploit'],
      description: 'CVE databases to query',
    },
    {
      name: 'min_severity',
      type: 'string',
      required: false,
      default: 'medium',
      description: 'Minimum severity to report: low, medium, high, critical',
    },
  ],
  
  expectedOutputs: ['vulnerabilities', 'risk_score', 'recommendations'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'discover', type: 'discovery_scan', position: { x: 100, y: 130 }, data: {
        targets: '{{targets}}',
      }},
      { id: 'loop-hosts', type: 'loop_foreach', position: { x: 100, y: 210 }, data: {
        collection: '{{discovered_hosts}}',
        iterator: 'host',
      }},
      { id: 'service-scan', type: 'service_detection', position: { x: 100, y: 290 }, data: {
        target: '{{host.ip}}',
        comprehensive: true,
      }},
      { id: 'vuln-scan', type: 'vulnerability_scan', position: { x: 100, y: 370 }, data: {
        services: '{{detected_services}}',
        databases: '{{cve_databases}}',
        min_severity: '{{min_severity}}',
      }},
      { id: 'aggregate-vulns', type: 'aggregate', position: { x: 100, y: 450 }, data: {
        operation: 'merge',
        field: 'vulnerabilities',
      }},
      { id: 'calculate-risk', type: 'transform_data', position: { x: 100, y: 530 }, data: {
        operation: 'risk_score',
        input: '{{all_vulnerabilities}}',
      }},
      { id: 'report', type: 'report', position: { x: 100, y: 610 }, data: {
        title: 'Vulnerability Assessment Report',
        format: 'security',
        include: ['vulnerabilities', 'risk_score', 'recommendations'],
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 690 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'discover' },
      { id: 'e2', source: 'discover', target: 'loop-hosts' },
      { id: 'e3', source: 'loop-hosts', target: 'service-scan' },
      { id: 'e4', source: 'service-scan', target: 'vuln-scan' },
      { id: 'e5', source: 'vuln-scan', target: 'loop-hosts', label: 'next' },
      { id: 'e6', source: 'loop-hosts', target: 'aggregate-vulns', label: 'complete' },
      { id: 'e7', source: 'aggregate-vulns', target: 'calculate-risk' },
      { id: 'e8', source: 'calculate-risk', target: 'report' },
      { id: 'e9', source: 'report', target: 'end' },
    ],
    variables: {
      cve_databases: ['cve', 'exploit_db', 'metasploit'],
      min_severity: 'medium',
    },
  },
  
  estimatedDuration: '10-60 minutes',
  complexity: 'complex',
};

/**
 * Template: Quick Network Scan
 * Fast network enumeration for immediate visibility
 */
export const QUICK_SCAN_TEMPLATE: WorkflowTemplate = {
  id: 'template-quick-scan',
  name: 'Quick Network Scan',
  description: 'Fast network scan for immediate visibility. ARP discovery with basic port check on common ports.',
  category: 'discovery',
  icon: '⚡',
  author: 'NOP Team',
  version: '1.0.0',
  createdAt: '2026-01-12T00:00:00Z',
  updatedAt: '2026-01-12T00:00:00Z',
  
  requiredInputs: [
    {
      name: 'target_network',
      type: 'string',
      required: true,
      description: 'Target network in CIDR notation',
      example: '192.168.1.0/24',
    },
  ],
  
  expectedOutputs: ['hosts', 'common_ports'],
  
  workflow: {
    nodes: [
      { id: 'start', type: 'start', position: { x: 100, y: 50 }, data: { label: 'Start' } },
      { id: 'arp-scan', type: 'discovery_scan', position: { x: 100, y: 130 }, data: {
        method: 'arp',
        target: '{{target_network}}',
        timeout: 2000,
      }},
      { id: 'parallel-scan', type: 'parallel', position: { x: 100, y: 210 }, data: {
        maxConcurrent: 10,
      }},
      { id: 'quick-ports', type: 'port_scan', position: { x: 100, y: 290 }, data: {
        ports: '22,80,443,3389,8080',
        timeout: 1000,
      }},
      { id: 'aggregate', type: 'aggregate', position: { x: 100, y: 370 }, data: {
        operation: 'collect',
      }},
      { id: 'end', type: 'end', position: { x: 100, y: 450 }, data: { label: 'End' } },
    ],
    edges: [
      { id: 'e1', source: 'start', target: 'arp-scan' },
      { id: 'e2', source: 'arp-scan', target: 'parallel-scan' },
      { id: 'e3', source: 'parallel-scan', target: 'quick-ports' },
      { id: 'e4', source: 'quick-ports', target: 'aggregate' },
      { id: 'e5', source: 'aggregate', target: 'end' },
    ],
    variables: {},
  },
  
  estimatedDuration: '30 seconds - 2 minutes',
  complexity: 'simple',
};

/**
 * All available templates
 */
export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  REP_RING_TEST_TEMPLATE,
  FULL_DISCOVERY_TEMPLATE,
  PORT_CHECK_TEMPLATE,
  SERVICE_HEALTH_TEMPLATE,
  VULNERABILITY_TEMPLATE,
  QUICK_SCAN_TEMPLATE,
];

/**
 * Get templates by category
 */
export const getTemplatesByCategory = (category: string): WorkflowTemplate[] => {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
};

/**
 * Get template by ID
 */
export const getTemplateById = (id: string): WorkflowTemplate | undefined => {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
};

export default WORKFLOW_TEMPLATES;
