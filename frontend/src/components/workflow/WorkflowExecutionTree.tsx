/**
 * WorkflowExecutionTree - Hierarchical visualization of workflow execution
 * Displays execution status, pass/fail results, and output data in a collapsible tree
 */

import React, { useState, useMemo } from 'react';
import { WorkflowExecution, NodeExecutionStatus, NodeResult } from '../../types/workflow';

interface ExecutionTreeNode {
  id: string;
  name: string;
  status: NodeExecutionStatus;
  duration?: number;
  output?: Record<string, any>;
  children: ExecutionTreeNode[];
  isExpanded?: boolean;
}

interface WorkflowExecutionTreeProps {
  execution: WorkflowExecution;
}

const statusConfig = {
  pending: {
    color: 'text-cyber-gray-light',
    bgColor: 'bg-cyber-gray/10',
    borderColor: 'border-cyber-gray/30',
    icon: '○',
    label: '○',
  },
  waiting: {
    color: 'text-cyber-gray-light',
    bgColor: 'bg-cyber-gray/10',
    borderColor: 'border-cyber-gray/30',
    icon: '⧖',
    label: '⧖',
  },
  running: {
    color: 'text-cyber-yellow',
    bgColor: 'bg-cyber-yellow/10',
    borderColor: 'border-cyber-yellow/30',
    icon: '⊙',
    label: '⊙',
  },
  completed: {
    color: 'text-cyber-green',
    bgColor: 'bg-cyber-green/10',
    borderColor: 'border-cyber-green/30',
    icon: '✓',
    label: '✓',
  },
  failed: {
    color: 'text-cyber-red',
    bgColor: 'bg-cyber-red/10',
    borderColor: 'border-cyber-red/30',
    icon: '✗',
    label: '✗',
  },
  skipped: {
    color: 'text-cyber-gray',
    bgColor: 'bg-cyber-gray/10',
    borderColor: 'border-cyber-gray/30',
    icon: '⊘',
    label: '⊘',
  },
} as const;

/**
 * Evaluate pass condition from data block
 * Supports expressions like: ${variable === 'value'} or ${condition && otherCondition}
 */
function evaluatePassCondition(condition: string, context: Record<string, any>): boolean {
  try {
    if (!condition) return true;
    
    // Replace ${...} expressions with their evaluated values
    const evaluatedCondition = condition.replace(/\$\{([^}]+)\}/g, (match, expr) => {
      try {
        // Create a function with the context variables in scope
        const func = new Function(...Object.keys(context), `return ${expr}`);
        const result = func(...Object.values(context));
        return result ? 'true' : 'false';
      } catch {
        return 'false';
      }
    });
    
    // Evaluate the final boolean expression
    const func = new Function(`return ${evaluatedCondition}`);
    return !!func();
  } catch (error) {
    console.warn('Failed to evaluate pass condition:', error);
    return false;
  }
}

/**
 * Build execution tree from workflow execution data
 */
function buildExecutionTree(
  execution: WorkflowExecution,
  nodes?: any[] // FlowNodes
): ExecutionTreeNode[] {
  if (!nodes || nodes.length === 0) return [];

  return nodes.map((node) => {
    const status = execution.nodeStatuses[node.id] || 'pending';
    const result = execution.nodeResults[node.id];
    const output = result?.output || {};

    // Build child nodes if this is a group/container node
    const children = node.children
      ? buildExecutionTree(execution, node.children)
      : [];

    // If any child failed, parent fails
    const childStatus = children.some((child) => child.status === 'failed') ? 'failed' : status;

    return {
      id: node.id,
      name: node.data?.label || node.id,
      status: childStatus as NodeExecutionStatus,
      duration: result?.duration,
      output: Object.keys(output).length > 0 ? output : undefined,
      children,
    };
  });
}

/**
 * Format output value for display
 */
function formatOutputValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'string') {
    // Truncate long strings
    return value.length > 100 ? `${value.substring(0, 100)}...` : value;
  }
  if (typeof value === 'object') {
    try {
      const str = JSON.stringify(value, null, 2);
      return str.length > 100 ? `${str.substring(0, 100)}...` : str;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Tree node component with recursive rendering
 */
interface TreeNodeProps {
  node: ExecutionTreeNode;
  level: number;
  onToggle?: (id: string) => void;
  expandedNodes?: Set<string>;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, level, onToggle, expandedNodes = new Set() }) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children.length > 0 || (node.output && Object.keys(node.output).length > 0);
  const config = statusConfig[node.status];

  return (
    <div className="select-none">
      {/* Node row */}
      <div
        onClick={() => onToggle?.(node.id)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded cursor-pointer
          transition-colors hover:bg-cyber-purple/5
          ${config.bgColor} border-l-2 ${config.borderColor}
          ${level > 0 ? 'ml-' + Math.min(level * 4, 16) : ''}
        `}
        style={{ paddingLeft: `${level * 16 + 12}px` }}
      >
        {/* Expand icon */}
        {hasChildren && (
          <span className={`text-cyber-gray transition-transform flex-shrink-0 text-xs ${
            isExpanded ? 'rotate-90' : ''
          }`}>
            ▶
          </span>
        )}
        {!hasChildren && <div className="w-4" />}

        {/* Status icon */}
        <span className={`${config.color} flex-shrink-0`}>{config.icon}</span>

        {/* Block name */}
        <span className={`${config.color} font-semibold flex-1 text-sm`}>{node.name}</span>

        {/* Duration */}
        {node.duration !== undefined && (
          <span className="text-cyber-gray-light text-xs font-mono">
            {(node.duration / 1000).toFixed(2)}s
          </span>
        )}

        {/* Status label */}
        <span className={`${config.color} text-xs font-bold ml-2`}>{config.label}</span>
      </div>

      {/* Child nodes and output */}
      {isExpanded && (
        <div>
          {/* Output data */}
          {node.output && (
            <div className="px-3 py-2 bg-cyber-darker/30 border-l-2 border-cyber-gray/20 ml-4">
              {Object.entries(node.output).map(([key, value]) => {
                // Skip internal fields
                if (key.startsWith('_')) return null;

                return (
                  <div
                    key={key}
                    className="py-1 text-xs font-mono text-cyber-gray-light hover:text-cyber-blue transition-colors"
                  >
                    <span className="text-cyber-purple">{key}</span>
                    <span className="text-cyber-gray-light mx-2">:</span>
                    <span className="text-cyber-blue">{formatOutputValue(value)}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Child nodes */}
          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              level={level + 1}
              onToggle={onToggle}
              expandedNodes={expandedNodes}
            />
          ))}
        </div>
      )}
    </div>
  );
};

/**
 * Main execution tree component
 */
const WorkflowExecutionTree: React.FC<WorkflowExecutionTreeProps> = ({ execution }) => {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Build tree from node statuses and results
  const tree = useMemo(() => {
    const nodes = Object.entries(execution.nodeStatuses).map(([nodeId, status]) => {
      const result = execution.nodeResults[nodeId];
      return {
        id: nodeId,
        name: nodeId,
        status,
        duration: result?.duration,
        output: result?.output || {},
        children: [] as ExecutionTreeNode[],
      };
    });
    return nodes;
  }, [execution]);

  const handleToggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  if (tree.length === 0) {
    return (
      <div className="p-4 text-cyber-gray-light text-center text-sm">
        No execution data available
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {/* Legend */}
      <div className="mb-3 pb-3 border-b border-cyber-gray/30 grid grid-cols-3 gap-2 text-xs">
        {Object.entries(statusConfig)
          .slice(0, 6)
          .map(([status, config]) => (
            <div key={status} className="flex items-center gap-2">
              <div className={`${config.color}`}>{config.icon}</div>
              <span className="text-cyber-gray-light capitalize">{status}</span>
            </div>
          ))}
      </div>

      {/* Tree */}
      <div className="space-y-0 max-h-96 overflow-y-auto">
        {tree.map((node) => (
          <TreeNode
            key={node.id}
            node={node}
            level={0}
            onToggle={handleToggleNode}
            expandedNodes={expandedNodes}
          />
        ))}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-3 border-t border-cyber-gray/30 grid grid-cols-4 gap-2 text-xs text-cyber-gray-light">
        <div>
          <span className="text-cyber-green font-bold">
            {tree.filter((n) => n.status === 'completed').length}
          </span>
          <span className="ml-1 block">Completed</span>
        </div>
        <div>
          <span className="text-cyber-red font-bold">
            {tree.filter((n) => n.status === 'failed').length}
          </span>
          <span className="ml-1 block">Failed</span>
        </div>
        <div>
          <span className="text-cyber-yellow font-bold">
            {tree.filter((n) => n.status === 'running').length}
          </span>
          <span className="ml-1 block">Running</span>
        </div>
        <div>
          <span className="text-cyber-blue font-bold">{tree.length}</span>
          <span className="ml-1 block">Total</span>
        </div>
      </div>
    </div>
  );
};

export default WorkflowExecutionTree;
