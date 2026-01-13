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

// UI Testing templates - Designed for testing application workflows
// All templates use 3-OUTPUT MODEL: Every block can produce pass, fail, output
const TEMPLATES: FlowTemplate[] = [
  // ============================================================================
  // UI TESTING TEMPLATES - Test UI Interactions & Workflows
  // ============================================================================
  {
    id: 'ui-testing-login-form-validation',
    name: 'UI Testing - Login Form Validation',
    description: 'Test login form with credentials validation using output parsing',
    category: 'utility',
    icon: '🔐',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Navigate to Login', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Navigating to login page"' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Enter Credentials', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Username: admin, Password: test123"' } } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Submit Form', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Login successful. Redirecting to dashboard."' } } },
      { type: 'block', position: { x: 280, y: 350 }, data: { 
        label: 'Verify Login Success', 
        type: 'data.output_interpreter', 
        category: 'data', 
        parameters: { 
          inputSource: '{{previous.output}}',
          aggregation: 'all',
          containsPass: 'successful|dashboard',
          notContainsFail: 'error|failed|denied',
          extractVariable: 'loginStatus',
          extractPattern: '(successful|failed)'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { 
        label: 'Check Dashboard Load', 
        type: 'data.assertion', 
        category: 'data', 
        parameters: { 
          name: 'Dashboard Visible',
          condition: 'contains',
          value: 'dashboard',
          failMessage: 'Dashboard failed to load'
        } 
      } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'ui-testing-form-submit-workflow',
    name: 'UI Testing - Form Submit & Validation',
    description: 'Test multi-step form submission with field validation using code blocks',
    category: 'utility',
    icon: '✎',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Open Form', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Form loaded with 5 required fields"' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { 
        label: 'Validate Fields', 
        type: 'data.code', 
        category: 'data', 
        parameters: { 
          description: 'Check if all required fields are populated',
          passCode: `// Check if all required fields are filled
const output = context.input;
const fieldCount = (output.match(/field/gi) || []).length;
return fieldCount >= 5;`,
          outputCode: `// Return field validation results
const output = context.input;
return {
            fieldCount: (output.match(/field/gi) || []).length,
            allFieldsFilled: /5 required fields/.test(output),
            formReady: true,
            timestamp: new Date().toISOString()
          };`
        } 
      } },
      { type: 'block', position: { x: 100, y: 350 }, data: { label: 'Submit Form', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Form submitted successfully. Transaction ID: TXN-12345"' } } },
      { type: 'block', position: { x: 280, y: 350 }, data: { 
        label: 'Extract Transaction ID', 
        type: 'data.output_interpreter', 
        category: 'data', 
        parameters: { 
          inputSource: '{{previous.output}}',
          aggregation: 'all',
          containsPass: 'successfully',
          extractVariable: 'transactionId',
          extractPattern: '(TXN-\\d+)'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { 
        label: 'Confirm Success', 
        type: 'data.assertion', 
        category: 'data', 
        parameters: { 
          name: 'Transaction Recorded',
          condition: 'regex',
          value: 'TXN-\\d+',
          failMessage: 'Transaction ID not found'
        } 
      } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'ui-testing-navigation-flow',
    name: 'UI Testing - Navigation & Page Flow',
    description: 'Test navigation between pages with state validation using data blocks',
    category: 'utility',
    icon: '⟲',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Load Home Page', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Home page loaded. URL: /home"' } } },
      { type: 'block', position: { x: 100, y: 250 }, data: { label: 'Click Navigation Link', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Navigating to /dashboard. Status: 200"' } } },
      { type: 'block', position: { x: 280, y: 250 }, data: { 
        label: 'Verify Page Load', 
        type: 'data.output_interpreter', 
        category: 'data', 
        parameters: { 
          inputSource: '{{previous.output}}',
          aggregation: 'all',
          containsPass: '/dashboard',
          notContainsFail: '404|500|error',
          extractVariable: 'pageUrl',
          extractPattern: '(/(\\w+))'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Wait for Render', type: 'control.delay', category: 'control', parameters: { seconds: 1 } } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'Check Page Content', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Dashboard content loaded: widgets, charts, data tables"' } } },
      { type: 'block', position: { x: 280, y: 550 }, data: { 
        label: 'Validate Content', 
        type: 'data.code', 
        category: 'data', 
        parameters: { 
          description: 'Check if dashboard has expected components',
          passCode: `// Check for dashboard components
const content = context.input;
const hasWidgets = /widgets/.test(content);
const hasCharts = /charts/.test(content);
const hasTables = /tables/.test(content);
return hasWidgets && hasCharts && hasTables;`,
          outputCode: `// Extract page components
const content = context.input;
return {
            hasWidgets: /widgets/.test(content),
            hasCharts: /charts/.test(content),
            hasTables: /tables/.test(content),
            componentCount: (content.match(/(widgets|charts|tables)/gi) || []).length,
            renderComplete: true
          };`
        } 
      } },
      { type: 'block', position: { x: 100, y: 650 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'out', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'out', targetHandle: 'in' },
      { source: '6', target: '7', sourceHandle: 'out', targetHandle: 'in' },
      { source: '7', target: '8', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
  {
    id: 'ui-testing-error-handling',
    name: 'UI Testing - Error Handling & Recovery',
    description: 'Test error scenarios and recovery flows with assertion blocks',
    category: 'utility',
    icon: '⚠',
    nodes: [
      { type: 'block', position: { x: 100, y: 50 }, data: { label: 'Start', type: 'control.start', category: 'control', parameters: {} } },
      { type: 'block', position: { x: 100, y: 150 }, data: { label: 'Attempt Invalid Action', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Error: Insufficient permissions. Error Code: 403"' } } },
      { type: 'block', position: { x: 280, y: 150 }, data: { 
        label: 'Capture Error', 
        type: 'data.output_interpreter', 
        category: 'data', 
        parameters: { 
          inputSource: '{{previous.output}}',
          aggregation: 'any',
          containsPass: 'Error',
          extractVariable: 'errorCode',
          extractPattern: '(\\d{3})'
        } 
      } },
      { type: 'block', position: { x: 100, y: 350 }, data: { 
        label: 'Verify Error Message', 
        type: 'data.assertion', 
        category: 'data', 
        parameters: { 
          name: 'Error Message Displayed',
          condition: 'contains',
          value: 'Insufficient permissions',
          failMessage: 'Error message not shown'
        } 
      } },
      { type: 'block', position: { x: 100, y: 450 }, data: { label: 'Show Retry Button', type: 'command.ssh_execute', category: 'command', parameters: { host: 'localhost', command: 'echo "Error UI rendered with retry option"' } } },
      { type: 'block', position: { x: 280, y: 450 }, data: { 
        label: 'Check Recovery Options', 
        type: 'data.assertion', 
        category: 'data', 
        parameters: { 
          name: 'Recovery UI Visible',
          condition: 'contains',
          value: 'retry',
          failMessage: 'Retry button not available'
        } 
      } },
      { type: 'block', position: { x: 100, y: 550 }, data: { label: 'End', type: 'control.end', category: 'control', parameters: { status: 'success' } } },
    ],
    edges: [
      { source: '1', target: '2', sourceHandle: 'out', targetHandle: 'in' },
      { source: '2', target: '3', sourceHandle: 'out', targetHandle: 'in' },
      { source: '3', target: '4', sourceHandle: 'pass', targetHandle: 'in' },
      { source: '4', target: '5', sourceHandle: 'out', targetHandle: 'in' },
      { source: '5', target: '6', sourceHandle: 'pass', targetHandle: 'in' },
    ],
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  utility: 'border-cyber-blue bg-cyber-blue/10',
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
        {['all', 'utility'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat === 'all' ? 'all' : 'utility')}
            className={`px-2 py-1 text-xs font-mono uppercase transition-colors ${
              (filter === 'all' && cat === 'all') || (filter === 'utility' && cat === 'utility')
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
