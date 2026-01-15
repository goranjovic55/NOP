/**
 * BlockDetailsPanel - Side panel showing detailed block execution information
 * 
 * Features:
 * - Shows when a block is clicked during/after execution
 * - Displays full input/output data
 * - Shows execution history for looped blocks
 * - Pass/fail status with interpretation details
 * - Collapsible sections for large outputs
 */

import React, { useState, useEffect, useCallback } from 'react';

interface ExecutionDetail {
  nodeId: string;
  label: string;
  type: string;
  executionStatus?: string;
  executionData?: {
    status?: string;
    pass?: boolean;
    fail?: boolean;
    input?: any;
    output?: any;
    rawOutput?: string;
    duration?: number;
    startTime?: string;
    endTime?: string;
    executionCount?: number;
    error?: string;
    interpretation?: {
      passed: boolean;
      reason: string;
      rules?: Array<{ rule: string; passed: boolean; reason: string }>;
    };
  };
  parameters?: Record<string, any>;
}

interface BlockDetailsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  executionResults?: Map<string, any>;
}

const BlockDetailsPanel: React.FC<BlockDetailsPanelProps> = ({
  isOpen,
  onClose,
  executionResults,
}) => {
  const [selectedBlock, setSelectedBlock] = useState<ExecutionDetail | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['output', 'input']));

  // Listen for block click events from BlockNode
  useEffect(() => {
    const handleBlockClick = (event: CustomEvent<ExecutionDetail>) => {
      setSelectedBlock(event.detail);
    };

    window.addEventListener('blockExecutionClick', handleBlockClick as EventListener);
    return () => {
      window.removeEventListener('blockExecutionClick', handleBlockClick as EventListener);
    };
  }, []);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatOutput = (data: any): string => {
    if (data === undefined || data === null) return 'null';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const getStatusColor = (status?: string): string => {
    switch (status) {
      case 'completed': return '#00ff88';
      case 'failed': return '#ff0040';
      case 'running': return '#00d4ff';
      case 'waiting': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  const exec = selectedBlock?.executionData;
  const statusColor = getStatusColor(selectedBlock?.executionStatus);

  return (
    <div className="w-80 bg-cyber-dark border-l border-cyber-gray flex flex-col h-full">
      {/* Header */}
      <div 
        className="p-3 border-b flex items-center justify-between"
        style={{ borderColor: statusColor }}
      >
        <h3 className="text-cyber-purple font-mono font-bold flex items-center gap-2">
          <span>◈</span> BLOCK DETAILS
        </h3>
        <button
          onClick={onClose}
          className="text-cyber-gray hover:text-cyber-red transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      {selectedBlock ? (
        <div className="flex-1 overflow-y-auto">
          {/* Block Identity */}
          <div 
            className="p-3 border-b"
            style={{ 
              backgroundColor: `${statusColor}15`,
              borderColor: `${statusColor}40`
            }}
          >
            <div className="text-cyber-gray-light font-mono text-sm font-bold mb-1">
              {selectedBlock.label}
            </div>
            <div className="text-cyber-gray text-xs font-mono">
              {selectedBlock.type}
            </div>
          </div>

          {/* Execution Status */}
          <div className="p-3 border-b border-cyber-gray">
            <div className="flex items-center justify-between mb-2">
              <span className="text-cyber-gray text-xs font-mono uppercase">Status</span>
              <span 
                className="px-2 py-1 rounded text-xs font-mono font-bold"
                style={{ 
                  backgroundColor: `${statusColor}30`,
                  color: statusColor,
                  border: `1px solid ${statusColor}`
                }}
              >
                {selectedBlock.executionStatus?.toUpperCase() || 'PENDING'}
              </span>
            </div>

            {exec?.duration && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyber-gray text-xs font-mono uppercase">Duration</span>
                <span className="text-cyber-gray-light text-xs font-mono">
                  {formatDuration(exec.duration)}
                </span>
              </div>
            )}

            {exec?.executionCount && exec.executionCount > 1 && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-cyber-gray text-xs font-mono uppercase">Executions</span>
                <span className="text-cyber-purple text-xs font-mono">
                  {exec.executionCount}×
                </span>
              </div>
            )}

            {exec?.pass !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-cyber-gray text-xs font-mono uppercase">Pass/Fail</span>
                <div className="flex gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    exec.pass ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/50' : 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30'
                  }`}>
                    PASS: {exec.pass ? '✓' : '-'}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${
                    exec.fail ? 'bg-cyber-red/20 text-cyber-red border border-cyber-red/50' : 'bg-cyber-gray/20 text-cyber-gray border border-cyber-gray/30'
                  }`}>
                    FAIL: {exec.fail ? '✓' : '-'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Input Section */}
          {exec?.input !== undefined && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('input')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-blue text-xs font-mono uppercase flex items-center gap-2">
                  <span>→</span> INPUT
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('input') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('input') && (
                <div className="px-3 pb-3">
                  <pre className="bg-cyber-darker p-2 rounded text-xs text-cyber-blue font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                    {formatOutput(exec.input)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Output Section */}
          {exec?.output !== undefined && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('output')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-green text-xs font-mono uppercase flex items-center gap-2">
                  <span>←</span> OUTPUT
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('output') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('output') && (
                <div className="px-3 pb-3">
                  <pre 
                    className="p-2 rounded text-xs font-mono whitespace-pre-wrap max-h-60 overflow-auto"
                    style={{ 
                      backgroundColor: `${statusColor}10`,
                      color: statusColor
                    }}
                  >
                    {formatOutput(exec.output)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Raw Output Section */}
          {exec?.rawOutput && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('rawOutput')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-gray-light text-xs font-mono uppercase flex items-center gap-2">
                  <span>◇</span> RAW OUTPUT
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('rawOutput') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('rawOutput') && (
                <div className="px-3 pb-3">
                  <pre className="bg-cyber-darker p-2 rounded text-xs text-cyber-gray-light font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                    {exec.rawOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Interpretation Section */}
          {exec?.interpretation && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('interpretation')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-purple text-xs font-mono uppercase flex items-center gap-2">
                  <span>⎇</span> INTERPRETATION
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('interpretation') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('interpretation') && (
                <div className="px-3 pb-3 space-y-2">
                  <div 
                    className={`p-2 rounded text-xs font-mono ${
                      exec.interpretation.passed 
                        ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/50'
                        : 'bg-cyber-red/20 text-cyber-red border border-cyber-red/50'
                    }`}
                  >
                    {exec.interpretation.reason}
                  </div>
                  
                  {/* Individual rules */}
                  {exec.interpretation.rules?.map((rule, idx) => (
                    <div 
                      key={idx}
                      className={`p-2 rounded text-xs font-mono ${
                        rule.passed 
                          ? 'bg-cyber-darker text-cyber-green'
                          : 'bg-cyber-darker text-cyber-red'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{rule.passed ? '✓' : '✗'}</span>
                        <span className="text-cyber-gray uppercase text-xs">{rule.rule}</span>
                      </div>
                      <div className="mt-1 text-cyber-gray-light">{rule.reason}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Section */}
          {exec?.error && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('error')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-red text-xs font-mono uppercase flex items-center gap-2">
                  <span>⚠</span> ERROR
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('error') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('error') && (
                <div className="px-3 pb-3">
                  <pre className="bg-cyber-red/10 border border-cyber-red/50 p-2 rounded text-xs text-cyber-red font-mono whitespace-pre-wrap max-h-40 overflow-auto">
                    {exec.error}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* Parameters Section */}
          {selectedBlock.parameters && Object.keys(selectedBlock.parameters).length > 0 && (
            <div className="border-b border-cyber-gray">
              <button
                onClick={() => toggleSection('parameters')}
                className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/10 transition-colors"
              >
                <span className="text-cyber-gray-light text-xs font-mono uppercase flex items-center gap-2">
                  <span>⚙</span> PARAMETERS ({Object.keys(selectedBlock.parameters).length})
                </span>
                <span className="text-cyber-gray text-xs">
                  {expandedSections.has('parameters') ? '▼' : '▶'}
                </span>
              </button>
              {expandedSections.has('parameters') && (
                <div className="px-3 pb-3 space-y-1">
                  {Object.entries(selectedBlock.parameters).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-xs font-mono">
                      <span className="text-cyber-gray">{key}:</span>
                      <span className="text-cyber-gray-light truncate max-w-[150px]">
                        {typeof value === 'string' ? value : JSON.stringify(value)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Timestamps */}
          {(exec?.startTime || exec?.endTime) && (
            <div className="p-3 text-xs font-mono text-cyber-gray">
              {exec.startTime && (
                <div className="flex justify-between mb-1">
                  <span>Started:</span>
                  <span className="text-cyber-gray-light">
                    {new Date(exec.startTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
              {exec.endTime && (
                <div className="flex justify-between">
                  <span>Ended:</span>
                  <span className="text-cyber-gray-light">
                    {new Date(exec.endTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-cyber-gray font-mono text-sm">
            <div className="text-2xl mb-2">◈</div>
            <div>Click on an executed block</div>
            <div>to view details</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BlockDetailsPanel;
