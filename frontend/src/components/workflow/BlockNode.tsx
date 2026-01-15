/**
 * BlockNode - Cyberpunk-styled custom React Flow node for workflow blocks
 * 
 * Features:
 * - 3-Output Model: pass (green), fail (red), output (blue)
 * - Execution status shown via border color glow (running=cyan, completed=green, failed=red)
 * - Status text displayed inside block after execution
 * - Hover tooltip shows: input, output, status, time, execution count
 * - Click to show detailed output in side panel
 */

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, NodeExecutionStatus } from '../../types/workflow';
import { getBlockDefinition, CATEGORY_COLORS } from '../../types/blocks';

interface BlockNodeProps extends NodeProps<NodeData> {}

// Execution status colors - used for border glow
const statusColors: Record<NodeExecutionStatus, string> = {
  pending: '#4a5568',     // cyber-gray
  waiting: '#f59e0b',     // amber/pulsing
  running: '#00d4ff',     // cyber-blue
  completed: '#00ff88',   // cyber-green
  failed: '#ff0040',      // cyber-red
  skipped: '#6b7280',     // gray
};

// Status labels for display
const statusLabels: Record<NodeExecutionStatus, string> = {
  pending: 'PENDING',
  waiting: 'WAITING',
  running: 'RUNNING',
  completed: 'PASSED',
  failed: 'FAILED',
  skipped: 'SKIPPED',
};

// Format duration for display
const formatDuration = (ms?: number): string => {
  if (!ms) return '-';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
};

const BlockNode: React.FC<BlockNodeProps> = ({ data, selected, id }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  // SAFETY: Ensure data exists and has required fields
  if (!data) {
    console.error('BlockNode: data is null/undefined');
    return <div className="bg-cyber-red p-2 text-cyber-gray-light">ERROR: No data</div>;
  }
  
  // Ensure all values are strings/primitives - prevents React Error #185
  const safeLabel = typeof data.label === 'string' ? data.label : String(data.label || 'Unknown');
  const safeType = typeof data.type === 'string' ? data.type : String(data.type || '');
  const safeCategory = typeof data.category === 'string' ? data.category : String(data.category || 'control');
  
  const definition = getBlockDefinition(safeType);
  const categoryColor = data.color || CATEGORY_COLORS[data.category as keyof typeof CATEGORY_COLORS] || '#8b5cf6';
  
  // Get execution data from node
  const executionStatus = (data as any).executionStatus as NodeExecutionStatus | undefined;
  const executionResult = (data as any).executionResult as any;
  const executionCount = (data as any).executionCount as number || 0;
  const executionDuration = (data as any).executionDuration as number || 0;
  const executionInput = (data as any).executionInput as any;
  const executionOutput = (data as any).executionOutput as any;
  
  // Debug: Log when execution status is set
  if (executionStatus) {
    console.log('[DEBUG] BlockNode render:', id, safeLabel, 'executionStatus=', executionStatus);
  }
  
  // Determine border color based on execution status
  const borderColor = executionStatus 
    ? statusColors[executionStatus] 
    : (selected ? '#a855f7' : categoryColor);
  
  const isExecuting = executionStatus === 'running' || executionStatus === 'waiting';
  const hasExecuted = executionStatus === 'completed' || executionStatus === 'failed';

  // Calculate block height based on number of handles + status bar
  const numOutputs = definition?.outputs?.length || 1;
  const numInputs = definition?.inputs?.length || 1;
  const maxHandles = Math.max(numOutputs, numInputs);
  const minBlockHeight = Math.max(hasExecuted ? 100 : 80, 40 + (maxHandles * 18));

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Main Block Container */}
      <div
        className={`
          relative bg-cyber-darker rounded min-w-[180px] max-w-[220px]
          transition-all duration-300
          ${selected ? 'scale-105 z-50' : ''}
          ${isExecuting ? 'animate-pulse' : ''}
        `}
        style={{ 
          minHeight: `${minBlockHeight}px`,
          borderWidth: executionStatus ? '2px' : '1px',
          borderStyle: 'solid',
          borderColor: borderColor,
          boxShadow: isExecuting
            ? `0 0 30px ${borderColor}80, 0 0 60px ${borderColor}40, inset 0 0 30px ${borderColor}20`
            : hasExecuted
              ? `0 0 20px ${borderColor}60, inset 0 0 15px ${borderColor}15`
              : selected
                ? '0 0 30px rgba(168, 85, 247, 0.6), 0 0 60px rgba(168, 85, 247, 0.3)'
                : `0 0 10px ${categoryColor}20`
        }}
      >
        {/* Header with glowing effect */}
        <div 
          className="px-3 py-2 rounded-t flex items-center gap-2 border-b"
          style={{ 
            backgroundColor: hasExecuted 
              ? `${borderColor}20` 
              : `${categoryColor}15`,
            borderColor: hasExecuted 
              ? `${borderColor}40` 
              : `${categoryColor}30`
          }}
        >
          <span className="text-base">{(typeof data.icon === 'string' ? data.icon : '') || definition?.icon || '◈'}</span>
          <span className="text-xs font-mono text-cyber-gray-light truncate uppercase tracking-wide flex-1">
            {safeLabel}
          </span>
          {/* Execution count badge */}
          {executionCount > 1 && (
            <span 
              className="px-1.5 py-0.5 text-xs font-mono rounded"
              style={{ 
                backgroundColor: `${borderColor}30`,
                color: borderColor,
                border: `1px solid ${borderColor}50`
              }}
            >
              ×{executionCount}
            </span>
          )}
        </div>

        {/* Body */}
        <div className="px-3 py-2 text-xs font-mono">
          <div className="text-cyber-gray-light truncate uppercase">
            {safeCategory}
          </div>
          {Object.keys(data.parameters || {}).length > 0 && !hasExecuted && (
            <div className="mt-1" style={{ color: categoryColor }}>
              [{Object.keys(data.parameters || {}).length}] PARAMS
            </div>
          )}
        </div>

        {/* Execution Status Bar - shown after execution */}
        {hasExecuted && (
          <div 
            className="mx-2 mb-2 px-2 py-1.5 rounded text-center font-mono text-xs uppercase tracking-wider"
            style={{ 
              backgroundColor: `${borderColor}25`,
              color: borderColor,
              border: `1px solid ${borderColor}60`,
              textShadow: `0 0 8px ${borderColor}60`
            }}
          >
            {statusLabels[executionStatus!]}
            {executionDuration > 0 && (
              <span className="ml-2 opacity-70">
                {formatDuration(executionDuration)}
              </span>
            )}
          </div>
        )}

        {/* Running indicator - pulsing bar */}
        {isExecuting && (
          <div className="mx-2 mb-2 h-1 rounded overflow-hidden bg-cyber-darker">
            <div 
              className="h-full animate-pulse"
              style={{ 
                backgroundColor: borderColor,
                animation: 'running-bar 1s ease-in-out infinite',
                boxShadow: `0 0 10px ${borderColor}`
              }}
            />
          </div>
        )}

        {/* Input Handles */}
        {definition?.inputs.map((input, idx) => {
          const inputCount = definition.inputs.length;
          const handleTop = inputCount === 1 ? '50%' : `${25 + (idx * (50 / Math.max(inputCount - 1, 1)))}%`;
          return (
            <Handle
              key={`input-${input.id}`}
              type="target"
              position={Position.Left}
              id={input.id}
              className="!w-2.5 !h-2.5 !border !rounded-sm transition-all"
              style={{ 
                top: handleTop,
                backgroundColor: '#0a0a0a',
                borderColor: '#00d4ff',
              }}
            />
          );
        })}

        {/* Fallback input handle if no definition */}
        {!definition && (
          <Handle
            type="target"
            position={Position.Left}
            id="in"
            className="!w-2.5 !h-2.5 !border !rounded-sm"
            style={{ 
              top: '50%',
              backgroundColor: '#0a0a0a',
              borderColor: '#00d4ff',
            }}
          />
        )}

        {/* Output Handles - 3-output model: pass (green), fail (red), out (blue) */}
        {definition?.outputs.map((output, idx) => {
          const outputCount = definition.outputs.length;
          const handleTop = outputCount === 1 ? '50%' 
            : outputCount === 2 ? `${35 + (idx * 30)}%`
            : `${25 + (idx * 25)}%`;
          
          // Color coding: pass=green, fail=red, output/out=blue
          const handleColor = output.id === 'pass' ? '#00ff88' 
            : output.id === 'fail' ? '#ff0040' 
            : '#00d4ff';
          
          return (
            <React.Fragment key={`output-${output.id}`}>
              <Handle
                type="source"
                position={Position.Right}
                id={output.id}
                className="!w-2.5 !h-2.5 !border !rounded-sm transition-all"
                style={{ 
                  top: handleTop,
                  backgroundColor: '#0a0a0a',
                  borderColor: handleColor,
                }}
              />
              {/* Output labels for multi-output blocks */}
              {outputCount > 1 && (
                <div
                  className="absolute text-xs font-mono uppercase pointer-events-none"
                  style={{
                    right: '12px',
                    top: handleTop,
                    transform: 'translateY(-50%)',
                    color: handleColor,
                    textShadow: `0 0 4px ${handleColor}40`,
                  }}
                >
                  {output.id === 'pass' ? '✓' : output.id === 'fail' ? '✗' : '→'}
                </div>
              )}
            </React.Fragment>
          );
        })}

        {/* Fallback output handle if no definition */}
        {!definition && (
          <Handle
            type="source"
            position={Position.Right}
            id="out"
            className="!w-2.5 !h-2.5 !border !rounded-sm"
            style={{ 
              top: '50%',
              backgroundColor: '#0a0a0a',
              borderColor: '#00ff88',
            }}
          />
        )}

        {/* Corner accent */}
        <div 
          className="absolute bottom-0 right-0 w-2 h-2 border-r border-b"
          style={{ borderColor: borderColor }}
        />
      </div>

      {/* Hover Tooltip - Execution Summary */}
      {showTooltip && hasExecuted && (
        <div 
          className="absolute left-full ml-3 top-0 z-[100] w-64 bg-cyber-black border rounded shadow-lg pointer-events-none"
          style={{ 
            borderColor: borderColor,
            boxShadow: `0 0 20px ${borderColor}40`
          }}
        >
          {/* Tooltip Header */}
          <div 
            className="px-3 py-2 border-b font-mono text-xs uppercase flex items-center gap-2"
            style={{ 
              backgroundColor: `${borderColor}20`,
              borderColor: `${borderColor}40`,
              color: borderColor
            }}
          >
            <span>{statusLabels[executionStatus!]}</span>
            <span className="ml-auto opacity-70">{formatDuration(executionDuration)}</span>
            {executionCount > 1 && (
              <span className="px-1 py-0.5 bg-cyber-darker rounded text-xs">
                ×{executionCount}
              </span>
            )}
          </div>

          {/* Tooltip Body */}
          <div className="p-3 space-y-2 text-xs font-mono">
            {/* Input */}
            {executionInput !== undefined && (
              <div>
                <div className="text-cyber-gray uppercase text-xs mb-1">INPUT</div>
                <div className="text-cyber-blue bg-cyber-darker p-1.5 rounded max-h-16 overflow-auto">
                  {typeof executionInput === 'string' 
                    ? executionInput.substring(0, 100) + (executionInput.length > 100 ? '...' : '')
                    : JSON.stringify(executionInput, null, 1).substring(0, 100)}
                </div>
              </div>
            )}

            {/* Output */}
            {executionOutput !== undefined && (
              <div>
                <div className="text-cyber-gray uppercase text-xs mb-1">OUTPUT</div>
                <div 
                  className="p-1.5 rounded max-h-16 overflow-auto"
                  style={{ 
                    backgroundColor: `${borderColor}15`,
                    color: borderColor 
                  }}
                >
                  {typeof executionOutput === 'string' 
                    ? executionOutput.substring(0, 100) + (executionOutput.length > 100 ? '...' : '')
                    : JSON.stringify(executionOutput, null, 1).substring(0, 100)}
                </div>
              </div>
            )}

            {/* Click hint */}
            <div className="text-cyber-gray-light text-xs text-center pt-1 border-t border-cyber-gray/30">
              Click block for full details
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip - No execution yet */}
      {showTooltip && !hasExecuted && !isExecuting && (
        <div 
          className="absolute left-full ml-3 top-0 z-[100] w-48 bg-cyber-black border border-cyber-gray rounded shadow-lg pointer-events-none p-2"
        >
          <div className="text-xs font-mono text-cyber-gray-light">
            <div className="text-cyber-gray uppercase text-xs mb-1">BLOCK TYPE</div>
            <div className="text-cyber-gray-light mb-2">{safeType}</div>
            {Object.keys(data.parameters || {}).length > 0 && (
              <>
                <div className="text-cyber-gray uppercase text-xs mb-1">PARAMETERS</div>
                <div className="text-cyber-purple">{Object.keys(data.parameters || {}).length} configured</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(BlockNode);
