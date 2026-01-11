/**
 * useWorkflowExecution - Hook for managing workflow execution with WebSocket updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  WorkflowExecution,
  ExecutionStatus,
  NodeExecutionStatus,
  ExecutionOptions,
  CompileResult,
} from '../types/workflow';

interface ExecutionEvent {
  type: string;
  timestamp: string;
  [key: string]: any;
}

interface UseWorkflowExecutionOptions {
  onEvent?: (event: ExecutionEvent) => void;
  onNodeStatusChange?: (nodeId: string, status: NodeExecutionStatus) => void;
  onComplete?: (execution: WorkflowExecution) => void;
  onError?: (error: string) => void;
}

export function useWorkflowExecution(options: UseWorkflowExecutionOptions = {}) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [events, setEvents] = useState<ExecutionEvent[]>([]);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track current workflow for polling
  const currentWorkflowIdRef = useRef<string | null>(null);
  
  // Poll for execution status (for fast executions that complete before WS connects)
  const pollExecutionStatus = useCallback(async (workflowId: string, executionId: string) => {
    try {
      const response = await fetch(`/api/v1/workflows/${workflowId}/executions/${executionId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
          // Execution already finished
          setIsExecuting(false);
          setExecution({
            id: data.id,
            workflowId: data.workflow_id,
            status: data.status,
            currentLevel: data.current_level,
            totalLevels: data.total_levels,
            nodeStatuses: data.node_statuses || {},
            nodeResults: data.node_results || {},
            progress: {
              completed: data.progress?.completed || 0,
              total: data.progress?.total || 0,
              percentage: data.status === 'completed' ? 100 : (data.progress?.percentage || 0),
            },
            startedAt: data.started_at,
            completedAt: data.completed_at,
            errors: data.errors || [],
            variables: data.variables || {},
          });
          if (options.onComplete && data.status === 'completed') {
            options.onComplete(data);
          }
        }
      }
    } catch (err) {
      console.error('Failed to poll execution status:', err);
    }
  }, [options]);

  // Connect to WebSocket
  const connect = useCallback((executionId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      // Already connected, just subscribe
      wsRef.current.send(JSON.stringify({
        action: 'subscribe',
        executionId,
      }));
      return;
    }
    
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/workflow/execution?execution_id=${executionId}`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log('Execution WebSocket connected');
      setIsConnected(true);
      // Poll for status in case execution completed before WS connected
      if (currentWorkflowIdRef.current) {
        setTimeout(() => {
          pollExecutionStatus(currentWorkflowIdRef.current!, executionId);
        }, 200);
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const data: ExecutionEvent = JSON.parse(event.data);
        setEvents(prev => [...prev.slice(-99), data]); // Keep last 100 events
        
        // Handle different event types
        switch (data.type) {
          case 'node_started':
            if (options.onNodeStatusChange) {
              options.onNodeStatusChange(data.nodeId, 'running');
            }
            setExecution(prev => prev ? {
              ...prev,
              nodeStatuses: {
                ...prev.nodeStatuses,
                [data.nodeId]: 'running',
              },
            } : null);
            break;
            
          case 'node_completed':
            if (options.onNodeStatusChange) {
              const status: NodeExecutionStatus = data.status === 'success' ? 'completed' : 'failed';
              options.onNodeStatusChange(data.nodeId, status);
            }
            setExecution(prev => prev ? {
              ...prev,
              nodeStatuses: {
                ...prev.nodeStatuses,
                [data.nodeId]: data.status === 'success' ? 'completed' : 'failed',
              },
              nodeResults: {
                ...prev.nodeResults,
                [data.nodeId]: {
                  nodeId: data.nodeId,
                  success: data.status === 'success',
                  output: data.output,
                  error: data.error,
                  duration: data.durationMs,
                },
              },
              progress: {
                ...prev.progress,
                completed: prev.progress.completed + 1,
                percentage: ((prev.progress.completed + 1) / prev.progress.total) * 100,
              },
            } : null);
            break;
            
          case 'level_started':
            setExecution(prev => prev ? {
              ...prev,
              currentLevel: data.level,
            } : null);
            break;
            
          case 'execution_completed':
            setIsExecuting(false);
            setExecution(prev => {
              if (prev) {
                const updated = {
                  ...prev,
                  status: data.status as ExecutionStatus,
                  completedAt: new Date().toISOString(),
                  // Force progress to 100% on completion
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.total,
                    percentage: 100,
                  },
                };
                if (options.onComplete) {
                  options.onComplete(updated);
                }
                return updated;
              }
              return null;
            });
            break;
            
          case 'error':
            if (options.onError) {
              options.onError(data.message);
            }
            break;
        }
        
        if (options.onEvent) {
          options.onEvent(data);
        }
      } catch (err) {
        console.error('Failed to parse execution event:', err);
      }
    };
    
    ws.onclose = () => {
      console.log('Execution WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;
      
      // Attempt to reconnect if still executing
      if (isExecuting) {
        reconnectTimeoutRef.current = setTimeout(() => {
          connect(executionId);
        }, 2000);
      }
    };
    
    ws.onerror = (error) => {
      console.error('Execution WebSocket error:', error);
      if (options.onError) {
        options.onError('WebSocket connection error');
      }
    };
    
    wsRef.current = ws;
  }, [isExecuting, options]);
  
  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);
  
  // Compile workflow
  const compile = useCallback(async (workflowId: string): Promise<CompileResult> => {
    const response = await fetch(`/api/v1/workflows/${workflowId}/compile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error('Compilation failed');
    }
    
    return response.json();
  }, []);
  
  // Start execution
  const start = useCallback(async (
    workflowId: string,
    executionOptions: ExecutionOptions = {}
  ): Promise<WorkflowExecution> => {
    setIsExecuting(true);
    setEvents([]);
    currentWorkflowIdRef.current = workflowId;
    
    const response = await fetch(`/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(executionOptions),
    });
    
    if (!response.ok) {
      setIsExecuting(false);
      const error = await response.json();
      throw new Error(error.detail || 'Failed to start execution');
    }
    
    const exec = await response.json();
    setExecution(exec);
    
    // Connect to WebSocket for updates
    connect(exec.id);
    
    return exec;
  }, [connect]);
  
  // Pause execution
  const pause = useCallback(async (workflowId: string, executionId: string) => {
    const response = await fetch(
      `/api/v1/workflows/${workflowId}/executions/${executionId}/pause`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      setExecution(prev => prev ? { ...prev, status: 'paused' } : null);
    }
  }, []);
  
  // Resume execution
  const resume = useCallback(async (workflowId: string, executionId: string) => {
    const response = await fetch(
      `/api/v1/workflows/${workflowId}/executions/${executionId}/resume`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      setExecution(prev => prev ? { ...prev, status: 'running' } : null);
    }
  }, []);
  
  // Cancel execution
  const cancel = useCallback(async (workflowId: string, executionId: string) => {
    const response = await fetch(
      `/api/v1/workflows/${workflowId}/executions/${executionId}/cancel`,
      { method: 'POST' }
    );
    
    if (response.ok) {
      setIsExecuting(false);
      setExecution(prev => prev ? { ...prev, status: 'cancelled' } : null);
      disconnect();
    }
  }, [disconnect]);
  
  // Reset execution state
  const reset = useCallback(() => {
    disconnect();
    setExecution(null);
    setIsExecuting(false);
    setEvents([]);
  }, [disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  return {
    execution,
    isConnected,
    isExecuting,
    events,
    compile,
    start,
    pause,
    resume,
    cancel,
    connect,
    disconnect,
    reset,
  };
}

export default useWorkflowExecution;
