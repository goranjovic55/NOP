/**
 * BlockNode - Cyberpunk-styled custom React Flow node for workflow blocks
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, NodeExecutionStatus } from '../../types/workflow';
import { getBlockDefinition, CATEGORY_COLORS } from '../../types/blocks';

interface BlockNodeProps extends NodeProps<NodeData> {}

// Cyberpunk status colors
const statusColors: Record<NodeExecutionStatus, string> = {
  pending: '#4a5568',     // cyber-gray
  waiting: '#f59e0b',     // amber
  running: '#00d4ff',     // cyber-blue
  completed: '#00ff88',   // cyber-green
  failed: '#ff0040',      // cyber-red
  skipped: '#6b7280',     // gray
};

const BlockNode: React.FC<BlockNodeProps> = ({ data, selected }) => {
  const definition = getBlockDefinition(data.type);
  const categoryColor = data.color || CATEGORY_COLORS[data.category] || '#8b5cf6';
  
  // Get execution status from node data if available
  const executionStatus = (data as any).executionStatus as NodeExecutionStatus | undefined;
  const statusColor = executionStatus ? statusColors[executionStatus] : null;

  return (
    <div
      className={`
        relative bg-cyber-darker rounded min-w-[180px] max-w-[220px]
        transition-all duration-200
        ${selected ? 'ring-2 ring-cyber-purple ring-offset-1 ring-offset-cyber-black' : ''}
      `}
      style={{ 
        borderWidth: '1px',
        borderStyle: 'solid',
        borderColor: statusColor || categoryColor,
        boxShadow: executionStatus === 'running' 
          ? `0 0 20px ${statusColor}60, inset 0 0 20px ${statusColor}10` 
          : `0 0 10px ${categoryColor}20`
      }}
    >
      {/* Header with glowing effect */}
      <div 
        className="px-3 py-2 rounded-t flex items-center gap-2 border-b"
        style={{ 
          backgroundColor: `${categoryColor}15`,
          borderColor: `${categoryColor}30`
        }}
      >
        <span className="text-base">{data.icon || definition?.icon || '◈'}</span>
        <span className="text-xs font-mono text-white truncate uppercase tracking-wide">
          {data.label}
        </span>
        {executionStatus && (
          <span 
            className="ml-auto w-2 h-2 rounded-full"
            style={{ 
              backgroundColor: statusColor || undefined,
              boxShadow: `0 0 6px ${statusColor}`
            }}
          />
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2 text-xs font-mono">
        <div className="text-cyber-gray-light truncate uppercase">
          {data.category}
        </div>
        {Object.keys(data.parameters).length > 0 && (
          <div className="mt-1" style={{ color: categoryColor }}>
            [{Object.keys(data.parameters).length}] PARAMS
          </div>
        )}
      </div>

      {/* Input Handles - Cyberpunk styled */}
      {definition?.inputs.map((input, idx) => (
        <Handle
          key={`input-${input.id}`}
          type="target"
          position={Position.Left}
          id={input.id}
          className="!w-2.5 !h-2.5 !border !rounded-sm transition-all"
          style={{ 
            top: `${28 + (idx * 20)}px`,
            backgroundColor: '#0a0a0a',
            borderColor: '#00d4ff',
          }}
        />
      ))}

      {/* Output Handles - Cyberpunk styled */}
      {definition?.outputs.map((output, idx) => (
        <Handle
          key={`output-${output.id}`}
          type="source"
          position={Position.Right}
          id={output.id}
          className="!w-2.5 !h-2.5 !border !rounded-sm transition-all"
          style={{ 
            top: `${28 + (idx * 20)}px`,
            backgroundColor: '#0a0a0a',
            borderColor: '#00ff88',
          }}
        />
      ))}

      {/* Status indicator during execution */}
      {executionStatus === 'running' && (
        <div className="absolute -top-1 -right-1">
          <span className="flex h-3 w-3">
            <span 
              className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
              style={{ backgroundColor: '#00d4ff' }}
            />
            <span 
              className="relative inline-flex rounded-full h-3 w-3"
              style={{ backgroundColor: '#00d4ff' }}
            />
          </span>
        </div>
      )}
      
      {executionStatus === 'completed' && (
        <div 
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: '#00ff88',
            boxShadow: '0 0 8px #00ff88'
          }}
        >
          <span className="text-cyber-black text-xs font-bold">✓</span>
        </div>
      )}
      
      {executionStatus === 'failed' && (
        <div 
          className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: '#ff0040',
            boxShadow: '0 0 8px #ff0040'
          }}
        >
          <span className="text-white text-xs font-bold">✗</span>
        </div>
      )}

      {/* Corner accent */}
      <div 
        className="absolute bottom-0 right-0 w-2 h-2 border-r border-b"
        style={{ borderColor: categoryColor }}
      />
    </div>
  );
};

export default memo(BlockNode);
