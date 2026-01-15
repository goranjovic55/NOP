/**
 * ExecutionConsole - Shows real-time output from workflow execution
 * Features: Always visible, minimizable, expandable block outputs
 * Supports both workflow execution logs and single block execution logs
 */

import React, { useEffect, useRef, useState } from 'react';
import { WorkflowExecution, NodeResult } from '../../types/workflow';
import { useWorkflowStore, ConsoleLogEntry } from '../../store/workflowStore';
import { CyberButton } from '../CyberUI';

interface ExecutionConsoleProps {
  execution: WorkflowExecution | null;
  isMinimized: boolean;
  onToggleMinimize: () => void;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel?: string;
  type: 'start' | 'success' | 'error' | 'output' | 'info' | 'single-block';
  message: string;
  data?: any;
}

const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({
  execution,
  isMinimized,
  onToggleMinimize,
}) => {
  const { consoleLogs, clearConsoleLogs } = useWorkflowStore();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const consoleRef = useRef<HTMLDivElement>(null);
  const prevResultsRef = useRef<Record<string, NodeResult>>({});
  const prevConsoleLogsLengthRef = useRef<number>(0);

  // Toggle expanded state for a log entry
  const toggleExpanded = (logId: string) => {
    setExpandedLogs(prev => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  // Watch for changes in execution and add log entries
  useEffect(() => {
    if (!execution) return;

    const newLogs: LogEntry[] = [];

    // Check for new node results
    if (execution.nodeResults) {
      Object.entries(execution.nodeResults).forEach(([nodeId, result]) => {
        const prevResult = prevResultsRef.current[nodeId];
        
        // New result or updated result
        if (!prevResult || prevResult.completedAt !== result.completedAt) {
          const logId = `${nodeId}-result-${Date.now()}`;
          newLogs.push({
            id: logId,
            timestamp: new Date(result.completedAt || Date.now()),
            nodeId,
            type: result.success ? 'success' : 'error',
            message: result.success 
              ? `Completed in ${result.duration || 0}ms`
              : (result.error || 'Failed'),
            data: result.output,
          });
          // Auto-expand results with data
          if (result.output && Object.keys(result.output).length > 0) {
            setExpandedLogs(prev => new Set(prev).add(logId));
          }
        }
      });
    }

    // Check for nodes that started
    if (execution.nodeStatuses) {
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
    }

    if (newLogs.length > 0) {
      setLogs(prev => [...prev, ...newLogs].slice(-500)); // Keep last 500 entries
    }

    prevResultsRef.current = { ...execution.nodeResults };
  }, [execution]);

  // Watch for new console logs from store (single block executions)
  useEffect(() => {
    if (consoleLogs.length > prevConsoleLogsLengthRef.current) {
      // Get new logs since last check
      const newStoreLogs = consoleLogs.slice(prevConsoleLogsLengthRef.current);
      const newLogs: LogEntry[] = newStoreLogs.map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp),
        nodeId: log.nodeId,
        nodeLabel: log.nodeLabel,
        type: log.type,
        message: log.message,
        data: log.data,
      }));
      
      if (newLogs.length > 0) {
        setLogs(prev => [...prev, ...newLogs].slice(-500));
        // Auto-expand logs with data
        newLogs.forEach(log => {
          if (log.data && Object.keys(log.data).length > 0) {
            setExpandedLogs(prev => new Set(prev).add(log.id));
          }
        });
      }
    }
    prevConsoleLogsLengthRef.current = consoleLogs.length;
  }, [consoleLogs]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  // Clear logs when execution restarts
  useEffect(() => {
    if (execution?.status === 'running' && Object.keys(execution.nodeResults || {}).length === 0) {
      setLogs([{
        id: 'start-' + Date.now(),
        timestamp: new Date(),
        nodeId: 'system',
        type: 'info',
        message: `Execution started: ${execution.id.slice(0, 8)}...`,
      }]);
      prevResultsRef.current = {};
      setExpandedLogs(new Set());
    }
  }, [execution?.status, execution?.id]);

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'text-cyber-green';
      case 'error': return 'text-cyber-red';
      case 'start': return 'text-cyber-blue';
      case 'output': return 'text-cyber-purple';
      case 'single-block': return 'text-cyber-orange';
      default: return 'text-cyber-gray-light';
    }
  };

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✗';
      case 'start': return '▶';
      case 'output': return '◈';
      case 'single-block': return '■';
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

  const formatOutputSummary = (data: any): string => {
    if (!data) return '';
    if (typeof data === 'string') return data.slice(0, 100);
    
    // Create a brief summary of key fields
    const summary: string[] = [];
    if (data.host) summary.push(`host: ${data.host}`);
    if (data.reachable !== undefined) summary.push(`reachable: ${data.reachable}`);
    if (data.avg_latency_ms !== undefined) summary.push(`latency: ${data.avg_latency_ms}ms`);
    if (data.packets_received !== undefined) summary.push(`recv: ${data.packets_received}/${data.packets_sent}`);
    if (data.connected !== undefined) summary.push(`connected: ${data.connected}`);
    if (data.exit_code !== undefined) summary.push(`exit: ${data.exit_code}`);
    if (data.status) summary.push(`status: ${data.status}`);
    if (data.error) summary.push(`error: ${data.error}`);
    
    return summary.length > 0 ? summary.join(' | ') : JSON.stringify(data).slice(0, 80);
  };

  const clearLogs = () => {
    setLogs([]);
    prevResultsRef.current = {};
    prevConsoleLogsLengthRef.current = consoleLogs.length; // Reset to current to avoid re-adding
    setExpandedLogs(new Set());
    clearConsoleLogs(); // Also clear store logs
  };

  return (
    <div className="border-t border-cyber-gray/50 bg-cyber-darker flex flex-col shrink-0">
      {/* Header - Always visible */}
      <div 
        className="flex items-center justify-between px-4 py-2 bg-cyber-black/80 border-b border-cyber-gray/30 cursor-pointer hover:bg-cyber-black/90 transition-colors"
        onClick={onToggleMinimize}
      >
        <div className="flex items-center gap-4">
          <span className="text-cyber-purple font-mono text-sm flex items-center gap-2">
            <span className={execution?.status === 'running' ? 'animate-pulse' : ''}>⌘</span> 
            CONSOLE
          </span>
          {execution && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                execution.status === 'running' ? 'bg-cyber-blue animate-pulse' :
                execution.status === 'completed' ? 'bg-cyber-green' :
                execution.status === 'failed' ? 'bg-cyber-red' : 'bg-cyber-gray'
              }`}></span>
              <span className="text-xs text-cyber-gray-light font-mono">
                {execution.status.toUpperCase()}
              </span>
            </div>
          )}
          {logs.length > 0 && (
            <span className="px-1.5 py-0.5 bg-cyber-purple/30 rounded text-xs font-mono text-cyber-purple">
              {logs.length} entries
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {!isMinimized && (
            <>
              <label 
                className="flex items-center gap-2 text-xs text-cyber-gray-light cursor-pointer hover:text-cyber-purple transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 accent-cyber-purple"
                />
                Auto-scroll
              </label>
              <CyberButton 
                variant="gray" 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); clearLogs(); }}
              >
                Clear
              </CyberButton>
            </>
          )}
          <span className="text-cyber-gray-light text-sm">
            {isMinimized ? '▲' : '▼'}
          </span>
        </div>
      </div>

      {/* Log entries - Collapsible */}
      {!isMinimized && (
        <div
          ref={consoleRef}
          className="h-48 overflow-y-auto font-mono text-xs p-3 space-y-1 bg-cyber-black/40 custom-scrollbar"
        >
          {logs.length === 0 ? (
            <div className="text-cyber-gray text-center py-6">
              No execution logs yet. Click Execute to run the flow.
            </div>
          ) : (
            logs.map((log) => {
              const isExpanded = expandedLogs.has(log.id);
              const hasData = log.data && Object.keys(log.data).length > 0;
              
              return (
                <div key={log.id} className="space-y-1">
                  {/* Log entry header */}
                  <div 
                    className={`flex gap-2 px-1 rounded ${hasData ? 'cursor-pointer hover:bg-cyber-gray/20' : 'hover:bg-cyber-gray/10'}`}
                    onClick={() => hasData && toggleExpanded(log.id)}
                  >
                    {hasData && (
                      <span className="text-cyber-gray-light shrink-0 w-3 text-xs">
                        {isExpanded ? '▼' : '▶'}
                      </span>
                    )}
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
                    {hasData && !isExpanded && (
                      <span className="text-cyber-gray-light ml-2 truncate">
                        → {formatOutputSummary(log.data)}
                      </span>
                    )}
                  </div>
                  
                  {/* Expanded output */}
                  {hasData && isExpanded && (
                    <div className="ml-6 bg-cyber-black/60 rounded p-2 border-l-2 border-cyber-purple/50">
                      <pre className="text-cyber-gray-light whitespace-pre-wrap break-all text-[11px]">
                        {formatOutput(log.data)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ExecutionConsole;
