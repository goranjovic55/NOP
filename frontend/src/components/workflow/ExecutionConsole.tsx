/**
 * ExecutionConsole - Shows real-time output from workflow execution
 */

import React, { useEffect, useRef, useState } from 'react';
import { WorkflowExecution, NodeResult } from '../../types/workflow';
import { CyberButton } from '../CyberUI';

interface ExecutionConsoleProps {
  execution: WorkflowExecution | null;
  isOpen: boolean;
  onToggle: () => void;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel?: string;
  type: 'start' | 'success' | 'error' | 'output' | 'info';
  message: string;
  data?: any;
}

const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  execution,
  isOpen,
  onToggle,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const prevResultsRef = useRef<Record<string, NodeResult>>({});

  // Watch for changes in execution and add log entries
  useEffect(() => {
    if (!execution) return;

    const newLogs: LogEntry[] = [];

    // Check for new node results
    Object.entries(execution.nodeResults).forEach(([nodeId, result]) => {
      const prevResult = prevResultsRef.current[nodeId];
      
      // New result or updated result
      if (!prevResult || prevResult.completedAt !== result.completedAt) {
        if (result.success) {
          newLogs.push({
            id: `${nodeId}-success-${Date.now()}`,
            timestamp: new Date(result.completedAt || Date.now()),
            nodeId,
            type: 'success',
            message: `Completed in ${result.duration || 0}ms`,
            data: result.output,
          });
        } else if (result.error) {
          newLogs.push({
            id: `${nodeId}-error-${Date.now()}`,
            timestamp: new Date(result.completedAt || Date.now()),
            nodeId,
            type: 'error',
            message: result.error,
          });
        }
      }
    });

    // Check for nodes that started
    Object.entries(execution.nodeStatuses).forEach(([nodeId, status]) => {
      if (status === 'running' && !prevResultsRef.current[nodeId]) {
        newLogs.push({
          id: `${nodeId}-start-${Date.now()}`,
          timestamp: new Date(),
          nodeId,
          type: 'start',
          message: 'Started execution',
        });
      }
    });

    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs].slice(-500)); // Keep last 500 entries
    }

    prevResultsRef.current = { ...execution.nodeResults };
  }, [execution]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Clear logs when execution restarts
  useEffect(() => {
    if (execution?.status === 'running' && Object.keys(execution.nodeResults).length === 0) {
      setLogs([{
        id: 'start-' + Date.now(),
        timestamp: new Date(),
        nodeId: 'system',
        type: 'info',
        message: `Execution started: ${execution.id.slice(0, 8)}...`,
      }]);
      prevResultsRef.current = {};
    }
  }, [execution?.status, execution?.id]);

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-cyber-green';
      case 'error': return 'text-cyber-red';
      case 'start': return 'text-cyber-blue';
      case 'output': return 'text-cyber-purple';
      default: return 'text-cyber-gray-light';
    }
  };

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'start': return '▶';
      case 'output': return '◈';
      default: return '◇';
    }
  };

  const formatOutput = (data: any): string => {
    if (data === undefined || data === null) return '';
    if (typeof data === 'string') return data;
    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    prevResultsRef.current = {};
  };

  if (!isOpen) {
    return (
      <div className="absolute bottom-16 left-4 z-10">
        <CyberButton
          variant="gray"
          size="sm"
          onClick={onToggle}
          className="flex items-center gap-2"
        >
          <span>◈</span> CONSOLE
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-cyber-purple/30 rounded text-xs">
              {logs.length}
            </span>
          )}
        </CyberButton>
      </div>
    );
  }

  return (
    <div className="absolute bottom-16 left-4 right-4 z-10 max-w-3xl">
      <div className="bg-cyber-darker border border-cyber-gray rounded overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 bg-cyber-black/50 border-b border-cyber-gray">
          <div className="flex items-center gap-3">
            <span className="text-cyber-purple font-mono text-sm">◈ EXECUTION CONSOLE</span>
            {execution && (
              <span className="text-xs text-cyber-gray-light">
                {execution.status.toUpperCase()} · Level {execution.currentLevel}/{execution.totalLevels}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs text-cyber-gray-light cursor-pointer">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="w-3 h-3"
              />
              Auto-scroll
            </label>
            <CyberButton variant="gray" size="sm" onClick={clearLogs}>
              Clear
            </CyberButton>
            <CyberButton variant="gray" size="sm" onClick={onToggle}>
              ✕
            </CyberButton>
          </div>
        </div>

        {/* Log entries */}
        <div
          ref={consoleRef}
          className="h-64 overflow-y-auto font-mono text-xs p-2 space-y-1"
        >
          {logs.length === 0 ? (
            <div className="text-cyber-gray text-center py-8">
              No execution logs yet. Run a flow to see output.
            </div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="flex gap-2 hover:bg-cyber-gray/10 px-1 rounded">
                <span className="text-cyber-gray shrink-0">
                  {log.timestamp.toLocaleTimeString('en-US', { hour12: false })}
                </span>
                <span className={`shrink-0 ${getTypeColor(log.type)}`}>
                  {getTypeIcon(log.type)}
                </span>
                <span className="text-cyber-blue shrink-0">
                  [{log.nodeId.slice(0, 12)}]
                </span>
                <span className={getTypeColor(log.type)}>
                  {log.message}
                </span>
              </div>
            ))
          )}
          
          {/* Show output data for entries that have it */}
          {logs.filter(l => l.data).map((log) => (
            <div key={`${log.id}-data`} className="ml-24 bg-cyber-black/50 rounded p-2 mt-1">
              <pre className="text-cyber-gray-light whitespace-pre-wrap break-all">
                {formatOutput(log.data)}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ExecutionConsole;
