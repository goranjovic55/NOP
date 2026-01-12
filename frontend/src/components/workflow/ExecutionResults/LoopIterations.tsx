/**
 * LoopIterations - Handles loop iteration display with expand/collapse
 * 
 * Features:
 * - Compressed view showing iteration summary (pass/fail count)
 * - Individual iterations expandable to show step details
 * - Status indicators for each iteration
 * - Iteration value display (e.g., IP address being tested)
 */

import React from 'react';
import {
  LoopIteration,
  ExecutionNode,
  NodeStatus,
  STATUS_ICONS,
  EXECUTION_STATUS_COLORS,
} from '../../types/executionResults';

interface LoopIterationsProps {
  nodeId: string;
  iterations: LoopIteration[];
  expandedIterations: Set<number>;
  onToggleIteration: (index: number) => void;
  onSelectNode: (nodeId: string) => void;
  selectedNodeId: string | null;
}

export const LoopIterations: React.FC<LoopIterationsProps> = ({
  nodeId,
  iterations,
  expandedIterations,
  onToggleIteration,
  onSelectNode,
  selectedNodeId,
}) => {
  // Calculate summary
  const summary = {
    total: iterations.length,
    passed: iterations.filter(i => i.status === 'passed').length,
    failed: iterations.filter(i => i.status === 'failed').length,
    skipped: iterations.filter(i => i.status === 'skipped').length,
  };

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Render a single iteration
  const renderIteration = (iteration: LoopIteration, index: number): React.ReactNode => {
    const isExpanded = expandedIterations.has(index);
    const statusIcon = STATUS_ICONS[iteration.status];
    const statusColor = EXECUTION_STATUS_COLORS[iteration.status];

    return (
      <div key={index} className="border-l border-gray-700 ml-2">
        {/* Iteration Header */}
        <div
          className={`flex items-center gap-2 py-1 px-2 cursor-pointer hover:bg-gray-800 rounded ${
            iteration.status === 'failed' ? 'bg-red-900/10' : ''
          }`}
          onClick={() => onToggleIteration(index)}
        >
          {/* Expand/Collapse */}
          <button className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white">
            {isExpanded ? '−' : '+'}
          </button>

          {/* Status Icon */}
          <span style={{ color: statusColor }}>{statusIcon}</span>

          {/* Iteration Label */}
          <span className="text-gray-300">
            Iteration {index + 1}
            {iteration.iterationLabel && (
              <span className="text-cyan-400 ml-1">: {iteration.iterationLabel}</span>
            )}
            {!iteration.iterationLabel && iteration.iterationValue !== undefined && (
              <span className="text-cyan-400 ml-1">
                : {formatIterationValue(iteration.iterationValue)}
              </span>
            )}
          </span>

          {/* Duration */}
          <span className="text-xs text-gray-500 ml-auto">
            {formatDuration(iteration.duration)}
          </span>

          {/* Expand Indicator */}
          <span className="text-xs text-gray-500">
            [{isExpanded ? '−' : '+'}]
          </span>
        </div>

        {/* Error Message (always visible for failed iterations) */}
        {iteration.status === 'failed' && iteration.error && !isExpanded && (
          <div className="ml-6 py-1 px-2 text-xs text-red-400 truncate">
            └─ Error: {iteration.error}
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div className="ml-6 py-2 space-y-1">
            {iteration.children.map((child) => (
              <IterationChildNode
                key={child.id}
                node={child}
                isSelected={selectedNodeId === child.id}
                onSelect={() => onSelectNode(child.id)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {/* Loop Summary */}
      <div className="flex items-center gap-4 text-xs text-gray-400 py-1 px-2 bg-gray-800/50 rounded">
        <span>Loop Summary:</span>
        <span style={{ color: EXECUTION_STATUS_COLORS.passed }}>
          {summary.passed} passed
        </span>
        {summary.failed > 0 && (
          <span style={{ color: EXECUTION_STATUS_COLORS.failed }}>
            {summary.failed} failed
          </span>
        )}
        {summary.skipped > 0 && (
          <span style={{ color: EXECUTION_STATUS_COLORS.skipped }}>
            {summary.skipped} skipped
          </span>
        )}
        <span className="ml-auto text-gray-500">
          {summary.total} iterations
        </span>
      </div>

      {/* Iterations */}
      {iterations.map((iteration, index) => renderIteration(iteration, index))}
    </div>
  );
};

// Child Node Sub-component (for steps within an iteration)
interface IterationChildNodeProps {
  node: ExecutionNode;
  isSelected: boolean;
  onSelect: () => void;
}

const IterationChildNode: React.FC<IterationChildNodeProps> = ({
  node,
  isSelected,
  onSelect,
}) => {
  const statusIcon = STATUS_ICONS[node.status];
  const statusColor = EXECUTION_STATUS_COLORS[node.status];

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Get output preview
  const getOutputPreview = (): string | null => {
    if (!node.result) return null;
    if (node.result.error) return `Error: ${node.result.error}`;
    if (node.result.assertionResult) return node.result.assertionResult.message;
    return null;
  };

  const outputPreview = getOutputPreview();

  return (
    <div
      className={`flex items-center gap-2 py-0.5 px-2 rounded cursor-pointer transition-colors ${
        isSelected
          ? 'bg-cyan-900/40 border border-cyan-500'
          : 'hover:bg-gray-800 border border-transparent'
      }`}
      onClick={onSelect}
    >
      {/* Status Icon */}
      <span style={{ color: statusColor }} className="text-sm">
        {statusIcon}
      </span>

      {/* Name */}
      <span className="text-gray-200 text-sm flex-1">{node.blockName}</span>

      {/* Duration */}
      <span className="text-xs text-gray-500">{formatDuration(node.duration)}</span>

      {/* Output Preview */}
      {outputPreview && (
        <span
          className={`text-xs truncate max-w-xs ${
            node.result?.error ? 'text-red-400' : 'text-green-400'
          }`}
        >
          └─ {outputPreview}
        </span>
      )}
    </div>
  );
};

// Helper: Format iteration value for display
const formatIterationValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    // Try to get a meaningful label
    if ('ip' in value) return value.ip;
    if ('hostname' in value) return value.hostname;
    if ('name' in value) return value.name;
    if ('id' in value) return value.id;
    return JSON.stringify(value).substring(0, 30);
  }
  return String(value);
};

export default LoopIterations;
