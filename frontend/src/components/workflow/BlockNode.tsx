/**
 * BlockNode - Custom React Flow node for workflow blocks
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, NodeExecutionStatus } from '../../types/workflow';
import { getBlockDefinition, CATEGORY_COLORS } from '../../types/blocks';

interface BlockNodeProps extends NodeProps<NodeData> {}

const statusColors: Record<NodeExecutionStatus, string> = {
  pending: '#6B7280',
  waiting: '#F59E0B',
  running: '#3B82F6',
  completed: '#22C55E',
  failed: '#EF4444',
  skipped: '#9CA3AF',
};

const BlockNode: React.FC<BlockNodeProps> = ({ data, selected, id }) => {
  const definition = getBlockDefinition(data.type);
  const categoryColor = data.color || CATEGORY_COLORS[data.category] || '#6B7280';
  
  // Get execution status from node data if available
  const executionStatus = (data as any).executionStatus as NodeExecutionStatus | undefined;
  const statusColor = executionStatus ? statusColors[executionStatus] : null;

  return (
    <div
      className={`
        relative bg-gray-800 rounded-lg border-2 min-w-[180px] max-w-[220px]
        transition-all duration-200 shadow-lg
        ${selected ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900' : ''}
      `}
      style={{ 
        borderColor: statusColor || categoryColor,
        boxShadow: executionStatus === 'running' 
          ? `0 0 20px ${statusColor}40` 
          : undefined
      }}
    >
      {/* Header */}
      <div 
        className="px-3 py-2 rounded-t-md flex items-center gap-2"
        style={{ backgroundColor: `${categoryColor}20` }}
      >
        <span className="text-lg">{data.icon || definition?.icon || '📦'}</span>
        <span className="text-sm font-medium text-white truncate">
          {data.label}
        </span>
        {executionStatus && (
          <span 
            className="ml-auto w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: statusColor || undefined }}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs text-gray-400">
        <div className="truncate">
          {data.category.charAt(0).toUpperCase() + data.category.slice(1)}
        </div>
        {Object.keys(data.parameters).length > 0 && (
          <div className="mt-1 text-gray-500">
            {Object.keys(data.parameters).length} params
          </div>
        )}
      </div>

      {/* Input Handles */}
      {definition?.inputs.map((input, idx) => (
        <Handle
          key={`input-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-blue-500 hover:!border-blue-400"
          style={{ 
            top: `${30 + (idx * 20)}px`,
          }}
        />
      ))}

      {/* Output Handles */}
      {definition?.outputs.map((output, idx) => (
        <Handle
          key={`output-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-400 hover:!bg-green-500 hover:!border-green-400"
          style={{ 
            top: `${30 + (idx * 20)}px`,
          }}
        />
      ))}

      {/* Status indicator during execution */}
      {executionStatus === 'running' && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
        </div>
      )}
      
      {executionStatus === 'completed' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✓</span>
        </div>
      )}
      
      {executionStatus === 'failed' && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs">✗</span>
        </div>
      )}
    </div>
  );
};

export default memo(BlockNode);
