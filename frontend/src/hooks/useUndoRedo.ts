/**
 * useUndoRedo - Hook for undo/redo functionality in workflow editor
 */

import { useCallback, useRef } from 'react';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

interface HistoryState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface UseUndoRedoOptions {
  maxHistory?: number;
}

export function useUndoRedo(options: UseUndoRedoOptions = {}) {
  const { maxHistory = 50 } = options;
  
  const historyRef = useRef<HistoryState[]>([]);
  const currentIndexRef = useRef(-1);
  const isUndoRedoRef = useRef(false);

  // Save current state to history
  const saveState = useCallback((nodes: WorkflowNode[], edges: WorkflowEdge[]) => {
    // Don't save if this is an undo/redo operation
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // Remove any future states if we're not at the end
    if (currentIndexRef.current < historyRef.current.length - 1) {
      historyRef.current = historyRef.current.slice(0, currentIndexRef.current + 1);
    }

    // Add new state
    const newState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    historyRef.current.push(newState);

    // Limit history size
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    } else {
      currentIndexRef.current++;
    }
  }, [maxHistory]);

  // Undo - go back one state
  const undo = useCallback((): HistoryState | null => {
    if (currentIndexRef.current <= 0) {
      return null; // Nothing to undo
    }

    currentIndexRef.current--;
    isUndoRedoRef.current = true;
    
    const state = historyRef.current[currentIndexRef.current];
    return {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
  }, []);

  // Redo - go forward one state
  const redo = useCallback((): HistoryState | null => {
    if (currentIndexRef.current >= historyRef.current.length - 1) {
      return null; // Nothing to redo
    }

    currentIndexRef.current++;
    isUndoRedoRef.current = true;
    
    const state = historyRef.current[currentIndexRef.current];
    return {
      nodes: JSON.parse(JSON.stringify(state.nodes)),
      edges: JSON.parse(JSON.stringify(state.edges)),
    };
  }, []);

  // Check if undo is available
  const canUndo = useCallback(() => {
    return currentIndexRef.current > 0;
  }, []);

  // Check if redo is available
  const canRedo = useCallback(() => {
    return currentIndexRef.current < historyRef.current.length - 1;
  }, []);

  // Clear history
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    currentIndexRef.current = -1;
  }, []);

  // Get history length for debugging
  const getHistoryLength = useCallback(() => {
    return historyRef.current.length;
  }, []);

  return {
    saveState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
    getHistoryLength,
  };
}

export default useUndoRedo;
