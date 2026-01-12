/**
 * ExecutionNode - Single node in the execution tree
 * 
 * Displays:
 * - Status icon with color
 * - Block name and type
 * - Duration
 * - Expand/collapse for nodes with children
 * - Click to select for details view
 */

import React from 'react';
import {
  ExecutionNode as ExecutionNodeType,
  STATUS_ICONS,
  EXECUTION_STATUS_COLORS,
  BLOCK_CATEGORY_COLORS,
} from '../../types/executionResults';

interface ExecutionNodeProps {
  node: ExecutionNodeType;
  isExpanded: boolean;
  isSelected: boolean;
  hasChildren: boolean;
  onToggle: () => void;
  onSelect: () => void;
}

export const ExecutionNode: React.FC<ExecutionNodeProps> = ({
  node,
  isExpanded,
  isSelected,
  hasChildren,
  onToggle,
  onSelect,
}) => {
  const statusIcon = STATUS_ICONS[node.status];
  const statusColor = EXECUTION_STATUS_COLORS[node.status];
  const categoryColor = BLOCK_CATEGORY_COLORS[node.blockCategory];

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Get output preview
  const getOutputPreview = (): string | null => {
    if (!node.result) return null;
    
    // For assertions, show result message
    if (node.result.assertionResult) {
      return node.result.assertionResult.message;
    }
    
    // For network results, show summary
    if (node.result.networkResult) {
      const nr = node.result.networkResult;
      const parts: string[] = [];
      if (nr.hostsFound !== undefined) parts.push(`${nr.hostsFound} hosts`);
      if (nr.portsOpen !== undefined) parts.push(`${nr.portsOpen} ports`);
      if (nr.servicesDetected !== undefined) parts.push(`${nr.servicesDetected} services`);
      if (nr.latencyMs !== undefined) parts.push(`${nr.latencyMs}ms`);
      return parts.join(', ');
    }
    
    // For errors, show error message
    if (node.result.error) {
      return `Error: ${node.result.error}`;
    }
    
    // For simple outputs, stringify
    if (node.result.output !== undefined) {
      const output = node.result.output;
      if (typeof output === 'string') return output;
      if (typeof output === 'object') {
        return JSON.stringify(output).substring(0, 50);
      }
      return String(output);
    }
    
    return null;
  };

  const outputPreview = getOutputPreview();

  return (
    <div
      className={`flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors ${
        isSelected
          ? 'bg-cyan-900/40 border border-cyan-500'
          : 'hover:bg-gray-800 border border-transparent'
      }`}
      onClick={onSelect}
      style={{ marginLeft: `${node.depth * 1.5}rem` }}
    >
      {/* Expand/Collapse Button */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white"
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      ) : (
        <span className="w-4" />
      )}

      {/* Status Icon */}
      <span
        className={`text-lg ${node.status === 'running' ? 'animate-pulse' : ''}`}
        style={{ color: statusColor }}
      >
        {statusIcon}
      </span>

      {/* Block Name */}
      <span className="text-gray-100 flex-1">
        {node.blockName}
      </span>

      {/* Block Type Badge */}
      <span
        className="text-xs px-1.5 py-0.5 rounded opacity-60"
        style={{
          backgroundColor: `${categoryColor}20`,
          color: categoryColor,
        }}
      >
        {formatBlockType(node.blockType)}
      </span>

      {/* Loop Info */}
      {node.isLoop && node.totalIterations !== undefined && (
        <span className="text-xs text-gray-400">
          ({node.currentIteration !== undefined ? `${node.currentIteration + 1}/` : ''}
          {node.totalIterations} iterations)
        </span>
      )}

      {/* Duration */}
      {node.duration !== undefined && (
        <span className="text-xs text-gray-500 w-16 text-right">
          {formatDuration(node.duration)}
        </span>
      )}

      {/* Output Preview */}
      {outputPreview && (
        <span
          className={`text-xs ml-2 truncate max-w-xs ${
            node.result?.error ? 'text-red-400' : 'text-gray-400'
          }`}
        >
          └─ {truncate(outputPreview, 50)}
        </span>
      )}
    </div>
  );
};

// Helper: Format block type for display
const formatBlockType = (type: string): string => {
  return type
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Helper: Truncate string
const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

export default ExecutionNode;
