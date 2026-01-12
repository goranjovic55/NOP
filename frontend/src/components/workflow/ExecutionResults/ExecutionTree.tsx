/**
 * ExecutionTree - Tree visualization of workflow execution
 * 
 * Displays the execution flow as a tree with:
 * - Status indicators for each node
 * - Expand/collapse for loops and nested structures
 * - Click to select node for details view
 * - Filtering by status
 */

import React from 'react';
import { ExecutionNode as ExecutionNodeComponent } from './ExecutionNode';
import { LoopIterations } from './LoopIterations';
import {
  ExecutionNode,
  NodeStatus,
  STATUS_ICONS,
  EXECUTION_STATUS_COLORS,
} from '../../types/executionResults';

interface ExecutionTreeProps {
  rootNode: ExecutionNode;
  expandedNodes: Set<string>;
  expandedIterations: Map<string, Set<number>>;
  selectedNodeId: string | null;
  filter: {
    showPassed: boolean;
    showFailed: boolean;
    showSkipped: boolean;
    showWarnings: boolean;
    searchText: string;
  };
  onToggleNode: (nodeId: string) => void;
  onToggleIteration: (nodeId: string, iterationIndex: number) => void;
  onSelectNode: (nodeId: string) => void;
}

export const ExecutionTree: React.FC<ExecutionTreeProps> = ({
  rootNode,
  expandedNodes,
  expandedIterations,
  selectedNodeId,
  filter,
  onToggleNode,
  onToggleIteration,
  onSelectNode,
}) => {
  // Filter nodes based on status
  const shouldShowNode = (node: ExecutionNode): boolean => {
    // Search text filter
    if (filter.searchText) {
      const searchLower = filter.searchText.toLowerCase();
      if (!node.blockName.toLowerCase().includes(searchLower)) {
        // Check if any child matches
        const childMatch = node.children.some(child => shouldShowNode(child));
        if (!childMatch) return false;
      }
    }

    // Status filter
    switch (node.status) {
      case 'passed':
        return filter.showPassed;
      case 'failed':
        return filter.showFailed;
      case 'skipped':
        return filter.showSkipped;
      case 'warning':
        return filter.showWarnings;
      default:
        return true;
    }
  };

  // Render a node and its children recursively
  const renderNode = (node: ExecutionNode, isLast: boolean = false): React.ReactNode => {
    if (!shouldShowNode(node)) return null;

    const isExpanded = expandedNodes.has(node.id);
    const nodeExpandedIterations = expandedIterations.get(node.id) || new Set();
    const hasChildren = node.children.length > 0 || (node.iterations && node.iterations.length > 0);
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id} className="relative">
        {/* Connector Line */}
        {node.depth > 0 && (
          <div
            className="absolute left-3 top-0 w-px bg-gray-600"
            style={{
              height: isLast ? '20px' : '100%',
            }}
          />
        )}

        {/* Node */}
        <ExecutionNodeComponent
          node={node}
          isExpanded={isExpanded}
          isSelected={isSelected}
          hasChildren={hasChildren}
          onToggle={() => onToggleNode(node.id)}
          onSelect={() => onSelectNode(node.id)}
        />

        {/* Children */}
        {isExpanded && node.children.length > 0 && (
          <div className="ml-6 border-l border-gray-700">
            {node.children.map((child, idx) =>
              renderNode(child, idx === node.children.length - 1)
            )}
          </div>
        )}

        {/* Loop Iterations */}
        {isExpanded && node.isLoop && node.iterations && node.iterations.length > 0 && (
          <div className="ml-6">
            <LoopIterations
              nodeId={node.id}
              iterations={node.iterations}
              expandedIterations={nodeExpandedIterations}
              onToggleIteration={(index) => onToggleIteration(node.id, index)}
              onSelectNode={onSelectNode}
              selectedNodeId={selectedNodeId}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="font-mono text-sm">
      {/* Filter Bar */}
      <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700">
        <span className="text-gray-400">Show:</span>
        <FilterToggle
          label="Passed"
          checked={filter.showPassed}
          color={EXECUTION_STATUS_COLORS.passed}
          icon={STATUS_ICONS.passed}
        />
        <FilterToggle
          label="Failed"
          checked={filter.showFailed}
          color={EXECUTION_STATUS_COLORS.failed}
          icon={STATUS_ICONS.failed}
        />
        <FilterToggle
          label="Skipped"
          checked={filter.showSkipped}
          color={EXECUTION_STATUS_COLORS.skipped}
          icon={STATUS_ICONS.skipped}
        />
        <FilterToggle
          label="Warnings"
          checked={filter.showWarnings}
          color={EXECUTION_STATUS_COLORS.warning}
          icon={STATUS_ICONS.warning}
        />
      </div>

      {/* Tree */}
      <div className="space-y-1">
        {renderNode(rootNode, true)}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-gray-700 flex flex-wrap gap-4 text-xs text-gray-500">
        <span>Legend:</span>
        {Object.entries(STATUS_ICONS).map(([status, icon]) => (
          <span key={status} className="flex items-center gap-1">
            <span style={{ color: EXECUTION_STATUS_COLORS[status as NodeStatus] }}>
              {icon}
            </span>
            <span className="capitalize">{status}</span>
          </span>
        ))}
      </div>
    </div>
  );
};

// Filter Toggle Sub-component
interface FilterToggleProps {
  label: string;
  checked: boolean;
  color: string;
  icon: string;
}

const FilterToggle: React.FC<FilterToggleProps> = ({ label, checked, color, icon }) => (
  <label
    className={`flex items-center gap-1 cursor-pointer ${
      checked ? 'opacity-100' : 'opacity-50'
    }`}
  >
    <span style={{ color }}>{icon}</span>
    <span className="text-gray-300">{label}</span>
  </label>
);

export default ExecutionTree;
