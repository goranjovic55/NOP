/**
 * WorkflowExecutionTree - Comprehensive workflow execution visualization
 * 
 * Features:
 * - Shows every block with pass/fail/output status
 * - Expandable tree structure for loops
 * - Summary at each level
 * - Click to expand and see outputs
 * - Color-coded status indicators
 * 
 * This is the main component for viewing workflow execution results
 * with the 3-output model (pass, fail, output).
 */

import React, { useState, useCallback } from 'react';
import {
  ExecutionResult,
  ExecutionNode,
  LoopIteration,
  NodeStatus,
  BlockOutputs,
  STATUS_ICONS,
  EXECUTION_STATUS_COLORS,
  BLOCK_CATEGORY_COLORS,
} from '../../../types/executionResults';

interface WorkflowExecutionTreeProps {
  execution: ExecutionResult;
  onNodeClick?: (node: ExecutionNode) => void;
}

interface TreeNodeState {
  expanded: Set<string>;
  expandedIterations: Map<string, Set<number>>;
  selectedNodeId: string | null;
}

export const WorkflowExecutionTree: React.FC<WorkflowExecutionTreeProps> = ({
  execution,
  onNodeClick,
}) => {
  const [state, setState] = useState<TreeNodeState>({
    expanded: new Set(['root']),
    expandedIterations: new Map(),
    selectedNodeId: null,
  });

  const [showOutputFor, setShowOutputFor] = useState<string | null>(null);

  // Toggle node expansion
  const toggleNode = useCallback((nodeId: string) => {
    setState(prev => {
      const newExpanded = new Set(prev.expanded);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return { ...prev, expanded: newExpanded };
    });
  }, []);

  // Toggle iteration expansion
  const toggleIteration = useCallback((nodeId: string, iterIndex: number) => {
    setState(prev => {
      const newMap = new Map(prev.expandedIterations);
      const nodeIters = newMap.get(nodeId) || new Set();
      const newNodeIters = new Set(nodeIters);
      if (newNodeIters.has(iterIndex)) {
        newNodeIters.delete(iterIndex);
      } else {
        newNodeIters.add(iterIndex);
      }
      newMap.set(nodeId, newNodeIters);
      return { ...prev, expandedIterations: newMap };
    });
  }, []);

  // Format duration
  const formatDuration = (ms?: number): string => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  // Get status icon and color
  const getStatusDisplay = (status: NodeStatus) => ({
    icon: STATUS_ICONS[status] || '○',
    color: EXECUTION_STATUS_COLORS[status] || '#888',
  });

  // Calculate summary for a node and its children
  const calculateSummary = (node: ExecutionNode): { passed: number; failed: number; total: number } => {
    let passed = 0;
    let failed = 0;
    let total = 1;

    if (node.status === 'passed') passed++;
    else if (node.status === 'failed') failed++;

    for (const child of node.children) {
      const childSummary = calculateSummary(child);
      passed += childSummary.passed;
      failed += childSummary.failed;
      total += childSummary.total;
    }

    if (node.iterations) {
      for (const iter of node.iterations) {
        total++;
        if (iter.status === 'passed') passed++;
        else if (iter.status === 'failed') failed++;
        for (const child of iter.children) {
          const childSummary = calculateSummary(child);
          passed += childSummary.passed;
          failed += childSummary.failed;
          total += childSummary.total;
        }
      }
    }

    return { passed, failed, total };
  };

  // Render a single tree node
  const renderTreeNode = (node: ExecutionNode, depth: number = 0): React.ReactNode => {
    const isExpanded = state.expanded.has(node.id);
    const hasChildren = node.children.length > 0 || (node.iterations && node.iterations.length > 0);
    const { icon, color } = getStatusDisplay(node.status);
    const summary = hasChildren ? calculateSummary(node) : null;
    const showingOutput = showOutputFor === node.id;

    return (
      <div key={node.id} className="font-mono text-sm">
        {/* Node Row */}
        <div 
          className={`flex items-center gap-2 py-1 px-2 hover:bg-gray-800 rounded cursor-pointer ${
            state.selectedNodeId === node.id ? 'bg-cyan-900/30 border border-cyan-600' : ''
          }`}
          style={{ paddingLeft: `${depth * 20 + 8}px` }}
          onClick={() => {
            setState(prev => ({ ...prev, selectedNodeId: node.id }));
            onNodeClick?.(node);
          }}
        >
          {/* Expand/Collapse */}
          {hasChildren ? (
            <button
              onClick={(e) => { e.stopPropagation(); toggleNode(node.id); }}
              className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white"
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {/* Status Icon */}
          <span style={{ color }} className="text-lg">{icon}</span>

          {/* Block Name */}
          <span className="text-gray-100 flex-1">{node.blockName}</span>

          {/* 3-Output Badges */}
          <div className="flex items-center gap-1">
            {/* Pass Badge */}
            <span 
              className={`px-1.5 py-0.5 text-xs rounded ${
                node.status === 'passed' ? 'bg-green-900/50 text-green-400 border border-green-600' : 'bg-gray-800 text-gray-500'
              }`}
              title="Pass status"
            >
              {node.status === 'passed' ? '✓ PASS' : 'PASS'}
            </span>
            
            {/* Fail Badge */}
            <span 
              className={`px-1.5 py-0.5 text-xs rounded ${
                node.status === 'failed' ? 'bg-red-900/50 text-red-400 border border-red-600' : 'bg-gray-800 text-gray-500'
              }`}
              title="Fail status"
            >
              {node.status === 'failed' ? '✗ FAIL' : 'FAIL'}
            </span>
            
            {/* Output Badge - Clickable */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowOutputFor(showingOutput ? null : node.id);
              }}
              className={`px-1.5 py-0.5 text-xs rounded border ${
                node.result?.output ? 'bg-cyan-900/50 text-cyan-400 border-cyan-600 hover:bg-cyan-800/50' : 'bg-gray-800 text-gray-500 border-gray-700'
              }`}
              title="View output"
            >
              OUTPUT {showingOutput ? '▲' : '▼'}
            </button>
          </div>

          {/* Duration */}
          <span className="text-xs text-gray-500 w-16 text-right">
            {formatDuration(node.duration)}
          </span>

          {/* Summary for nodes with children */}
          {summary && (
            <span className="text-xs text-gray-400 ml-2">
              ({summary.passed}✓ {summary.failed}✗)
            </span>
          )}
        </div>

        {/* Output Panel - Expandable */}
        {showingOutput && node.result && (
          <div 
            className="ml-8 mr-4 my-1 p-2 bg-gray-900 border border-gray-700 rounded text-xs"
            style={{ marginLeft: `${depth * 20 + 40}px` }}
          >
            <div className="text-gray-400 mb-1">Output:</div>
            <pre className="text-cyan-300 whitespace-pre-wrap overflow-auto max-h-40">
              {typeof node.result.output === 'string' 
                ? node.result.output 
                : JSON.stringify(node.result.output, null, 2)}
            </pre>
            {node.result.rawOutput && (
              <>
                <div className="text-gray-400 mt-2 mb-1">Raw Output:</div>
                <pre className="text-gray-300 whitespace-pre-wrap overflow-auto max-h-40">
                  {node.result.rawOutput}
                </pre>
              </>
            )}
            {node.result.interpretation && (
              <div className="mt-2 p-2 bg-gray-800 rounded">
                <div className="text-gray-400">Interpretation:</div>
                <div className={node.result.interpretation.passed ? 'text-green-400' : 'text-red-400'}>
                  {node.result.interpretation.reason}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Children - when expanded */}
        {isExpanded && node.children.map(child => renderTreeNode(child, depth + 1))}

        {/* Loop Iterations - when expanded */}
        {isExpanded && node.iterations && node.iterations.length > 0 && (
          <div className="border-l border-gray-700" style={{ marginLeft: `${depth * 20 + 20}px` }}>
            {node.iterations.map((iter, idx) => {
              const iterExpanded = state.expandedIterations.get(node.id)?.has(idx);
              const iterStatus = getStatusDisplay(iter.status);
              
              return (
                <div key={idx}>
                  {/* Iteration Header */}
                  <div 
                    className="flex items-center gap-2 py-1 px-2 hover:bg-gray-800 rounded cursor-pointer"
                    onClick={() => toggleIteration(node.id, idx)}
                  >
                    <button className="w-4 h-4 flex items-center justify-center text-gray-400 hover:text-white">
                      {iterExpanded ? '−' : '+'}
                    </button>
                    <span style={{ color: iterStatus.color }}>{iterStatus.icon}</span>
                    <span className="text-gray-300">
                      Iteration {idx + 1}
                      {iter.iterationLabel && (
                        <span className="text-cyan-400 ml-1">: {iter.iterationLabel}</span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {formatDuration(iter.duration)}
                    </span>
                  </div>
                  
                  {/* Iteration Children */}
                  {iterExpanded && iter.children.map(child => renderTreeNode(child, depth + 2))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Overall summary
  const overallSummary = calculateSummary(execution.rootNode);
  const successRate = overallSummary.total > 0 
    ? Math.round((overallSummary.passed / overallSummary.total) * 100) 
    : 0;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header with Overall Summary */}
      <div className="bg-gray-800 px-4 py-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">
            {execution.workflowName}
          </h3>
          <div className="flex items-center gap-4">
            {/* Overall Status */}
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              execution.status === 'completed' ? 'bg-green-900/50 text-green-400' :
              execution.status === 'failed' ? 'bg-red-900/50 text-red-400' :
              'bg-yellow-900/50 text-yellow-400'
            }`}>
              {execution.status.toUpperCase()}
            </div>
            
            {/* Summary Stats */}
            <div className="flex items-center gap-3 text-sm">
              <span className="text-green-400">✓ {overallSummary.passed}</span>
              <span className="text-red-400">✗ {overallSummary.failed}</span>
              <span className="text-gray-400">Total: {overallSummary.total}</span>
              <span className={`font-medium ${
                successRate >= 80 ? 'text-green-400' : 
                successRate >= 50 ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {successRate}% Success
              </span>
            </div>
          </div>
        </div>
        
        {/* Duration and Agent Info */}
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>Duration: {formatDuration(execution.duration)}</span>
          <span>Started: {new Date(execution.startedAt).toLocaleString()}</span>
          {execution.agentName && <span>Agent: {execution.agentName}</span>}
        </div>
      </div>

      {/* Tree Content */}
      <div className="p-2 max-h-[600px] overflow-auto">
        {renderTreeNode(execution.rootNode)}
      </div>

      {/* Legend */}
      <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 text-xs text-gray-400">
        <span className="mr-4">3-Output Model:</span>
        <span className="mr-3 text-green-400">PASS</span>
        <span className="mr-3 text-red-400">FAIL</span>
        <span className="text-cyan-400">OUTPUT (click to expand)</span>
      </div>
    </div>
  );
};

export default WorkflowExecutionTree;
