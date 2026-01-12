/**
 * ExecutionResultsView - Main container for workflow execution results
 * 
 * This component provides:
 * - Summary dashboard with pass/fail metrics
 * - Tree visualization of execution flow
 * - Details panel for selected nodes
 * - Real-time updates during execution
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ExecutionSummary } from './ExecutionSummary';
import { ExecutionTree } from './ExecutionTree';
import { StepDetails } from './StepDetails';
import {
  ExecutionResult,
  ExecutionNode,
  ExecutionEvent,
  ExecutionViewerState,
} from '../../types/executionResults';

interface ExecutionResultsViewProps {
  executionId: string;
  onClose?: () => void;
  isLive?: boolean;
}

export const ExecutionResultsView: React.FC<ExecutionResultsViewProps> = ({
  executionId,
  onClose,
  isLive = false,
}) => {
  // State
  const [state, setState] = useState<ExecutionViewerState>({
    execution: null,
    isLoading: true,
    error: null,
    expandedNodes: new Set(),
    expandedIterations: new Map(),
    filter: {
      showPassed: true,
      showFailed: true,
      showSkipped: true,
      showWarnings: true,
      searchText: '',
    },
    selectedNodeId: null,
    viewMode: 'tree',
    isLive,
    wsConnected: false,
  });

  // Load execution data
  const loadExecution = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const response = await fetch(`/api/v1/workflows/executions/${executionId}`);
      if (!response.ok) {
        throw new Error(`Failed to load execution: ${response.statusText}`);
      }
      const data: ExecutionResult = await response.json();
      setState(prev => ({ ...prev, execution: data, isLoading: false }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [executionId]);

  // Load data on mount
  useEffect(() => {
    loadExecution();
  }, [loadExecution]);

  // WebSocket connection for live updates
  useEffect(() => {
    if (!isLive || !state.execution) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/workflows/executions/${executionId}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      setState(prev => ({ ...prev, wsConnected: true }));
    };
    
    ws.onclose = () => {
      setState(prev => ({ ...prev, wsConnected: false }));
    };
    
    ws.onmessage = (event) => {
      try {
        const execEvent: ExecutionEvent = JSON.parse(event.data);
        handleExecutionEvent(execEvent);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
    
    return () => {
      ws.close();
    };
  }, [isLive, executionId, state.execution]);

  // Handle real-time execution events
  const handleExecutionEvent = useCallback((event: ExecutionEvent) => {
    setState(prev => {
      if (!prev.execution) return prev;
      
      // Clone execution for immutable update
      const execution = { ...prev.execution };
      
      switch (event.type) {
        case 'execution_completed':
        case 'execution_failed':
          execution.status = event.type === 'execution_completed' ? 'completed' : 'failed';
          execution.completedAt = event.timestamp;
          break;
          
        case 'node_started':
        case 'node_completed':
        case 'node_failed':
          // Update node status in tree
          updateNodeInTree(execution.rootNode, event);
          break;
          
        case 'log':
          // Add log to node
          if (event.nodeId && event.data?.log) {
            addLogToNode(execution.rootNode, event.nodeId, event.data.log);
          }
          break;
      }
      
      return { ...prev, execution };
    });
  }, []);

  // Helper: Update node status in tree
  const updateNodeInTree = (node: ExecutionNode, event: ExecutionEvent) => {
    if (node.id === event.nodeId) {
      node.status = event.data?.status || node.status;
      if (event.type === 'node_started') {
        node.startedAt = event.timestamp;
      } else if (event.type === 'node_completed' || event.type === 'node_failed') {
        node.completedAt = event.timestamp;
      }
      return;
    }
    
    // Recurse into children
    node.children.forEach(child => updateNodeInTree(child, event));
    
    // Check iterations
    if (node.iterations) {
      node.iterations.forEach(iter => {
        iter.children.forEach(child => updateNodeInTree(child, event));
      });
    }
  };

  // Helper: Add log entry to node
  const addLogToNode = (node: ExecutionNode, nodeId: string, log: any) => {
    if (node.id === nodeId) {
      if (!node.result) {
        node.result = { success: false, logs: [] };
      }
      if (!node.result.logs) {
        node.result.logs = [];
      }
      node.result.logs.push(log);
      return;
    }
    
    node.children.forEach(child => addLogToNode(child, nodeId, log));
    if (node.iterations) {
      node.iterations.forEach(iter => {
        iter.children.forEach(child => addLogToNode(child, nodeId, log));
      });
    }
  };

  // Toggle node expansion
  const toggleNodeExpanded = (nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { ...prev, expandedNodes: newExpanded };
    });
  };

  // Toggle iteration expansion
  const toggleIterationExpanded = (nodeId: string, iterationIndex: number) => {
    setState(prev => {
      const newIterations = new Map(prev.expandedIterations);
      const nodeIterations = newIterations.get(nodeId) || new Set();
      
      if (nodeIterations.has(iterationIndex)) {
        nodeIterations.delete(iterationIndex);
      } else {
        nodeIterations.add(iterationIndex);
      }
      
      newIterations.set(nodeId, nodeIterations);
      return { ...prev, expandedIterations: newIterations };
    });
  };

  // Select node for details view
  const selectNode = (nodeId: string | null) => {
    setState(prev => ({ ...prev, selectedNodeId: nodeId }));
  };

  // Find selected node in tree
  const findNode = (node: ExecutionNode, id: string): ExecutionNode | null => {
    if (node.id === id) return node;
    
    for (const child of node.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
    
    if (node.iterations) {
      for (const iter of node.iterations) {
        for (const child of iter.children) {
          const found = findNode(child, id);
          if (found) return found;
        }
      }
    }
    
    return null;
  };

  const selectedNode = state.execution && state.selectedNodeId
    ? findNode(state.execution.rootNode, state.selectedNodeId)
    : null;

  // Loading state
  if (state.isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyan-400 animate-pulse">Loading execution results...</div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="bg-red-900/20 border border-red-500 p-4 rounded-lg">
        <h3 className="text-red-400 font-bold mb-2">Error Loading Execution</h3>
        <p className="text-red-300">{state.error}</p>
        <button
          onClick={loadExecution}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  // No data
  if (!state.execution) {
    return (
      <div className="text-gray-400 text-center py-8">
        No execution data available
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold text-cyan-400">
            {state.execution.workflowName}
          </h2>
          <span
            className={`px-2 py-1 text-xs font-mono rounded ${
              state.execution.status === 'completed'
                ? 'bg-green-900/50 text-green-400 border border-green-500'
                : state.execution.status === 'failed'
                ? 'bg-red-900/50 text-red-400 border border-red-500'
                : state.execution.status === 'running'
                ? 'bg-cyan-900/50 text-cyan-400 border border-cyan-500 animate-pulse'
                : 'bg-gray-800 text-gray-400 border border-gray-600'
            }`}
          >
            {state.execution.status.toUpperCase()}
          </span>
          {state.wsConnected && (
            <span className="text-xs text-green-400">● LIVE</span>
          )}
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* Summary Dashboard */}
      <ExecutionSummary execution={state.execution} />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Execution Tree */}
        <div className="flex-1 overflow-auto p-4">
          <ExecutionTree
            rootNode={state.execution.rootNode}
            expandedNodes={state.expandedNodes}
            expandedIterations={state.expandedIterations}
            selectedNodeId={state.selectedNodeId}
            filter={state.filter}
            onToggleNode={toggleNodeExpanded}
            onToggleIteration={toggleIterationExpanded}
            onSelectNode={selectNode}
          />
        </div>

        {/* Details Panel */}
        {selectedNode && (
          <div className="w-96 border-l border-gray-700 overflow-auto">
            <StepDetails
              node={selectedNode}
              onClose={() => selectNode(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionResultsView;
