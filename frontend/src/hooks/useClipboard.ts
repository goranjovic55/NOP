/**
 * useClipboard - Hook for copy/paste workflow nodes
 */

import { useState, useCallback } from 'react';
import { WorkflowNode, WorkflowEdge } from '../types/workflow';

interface ClipboardData {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  timestamp: number;
}

const CLIPBOARD_KEY = 'nop-workflow-clipboard';

export function useClipboard() {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(null);

  // Copy nodes and their connecting edges
  const copy = useCallback((
    selectedNodeIds: string[],
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[]
  ) => {
    if (selectedNodeIds.length === 0) return;

    // Get selected nodes
    const nodesToCopy = allNodes.filter(n => selectedNodeIds.includes(n.id));
    
    // Get edges that connect selected nodes
    const edgesToCopy = allEdges.filter(
      e => selectedNodeIds.includes(e.source) && selectedNodeIds.includes(e.target)
    );

    const data: ClipboardData = {
      nodes: JSON.parse(JSON.stringify(nodesToCopy)),
      edges: JSON.parse(JSON.stringify(edgesToCopy)),
      timestamp: Date.now(),
    };

    setClipboardData(data);

    // Also save to localStorage for cross-tab paste
    try {
      localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }

    return data;
  }, []);

  // Cut nodes (copy + return IDs for deletion)
  const cut = useCallback((
    selectedNodeIds: string[],
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[]
  ) => {
    const data = copy(selectedNodeIds, allNodes, allEdges);
    return { data, nodeIdsToDelete: selectedNodeIds };
  }, [copy]);

  // Paste nodes with offset
  const paste = useCallback((
    offsetX: number = 50,
    offsetY: number = 50
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null => {
    // Try to get from state first, then localStorage
    let data = clipboardData;
    
    if (!data) {
      try {
        const stored = localStorage.getItem(CLIPBOARD_KEY);
        if (stored) {
          data = JSON.parse(stored);
        }
      } catch (e) {
        console.warn('Failed to read from localStorage:', e);
      }
    }

    if (!data || data.nodes.length === 0) {
      return null;
    }

    // Generate new IDs and apply offset
    const idMap: Record<string, string> = {};
    const timestamp = Date.now();

    const newNodes: WorkflowNode[] = data.nodes.map((node, index) => {
      const newId = `node-${timestamp}-${index}`;
      idMap[node.id] = newId;

      return {
        ...node,
        id: newId,
        position: {
          x: node.position.x + offsetX,
          y: node.position.y + offsetY,
        },
        selected: true,
        data: {
          ...node.data,
          label: `${node.data.label} (copy)`,
        },
      };
    });

    const newEdges: WorkflowEdge[] = data.edges.map((edge, index) => ({
      ...edge,
      id: `edge-${timestamp}-${index}`,
      source: idMap[edge.source] || edge.source,
      target: idMap[edge.target] || edge.target,
    }));

    return { nodes: newNodes, edges: newEdges };
  }, [clipboardData]);

  // Duplicate selected nodes
  const duplicate = useCallback((
    selectedNodeIds: string[],
    allNodes: WorkflowNode[],
    allEdges: WorkflowEdge[],
    offsetX: number = 50,
    offsetY: number = 50
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } | null => {
    if (selectedNodeIds.length === 0) return null;

    // Copy to clipboard temporarily
    copy(selectedNodeIds, allNodes, allEdges);
    
    // Paste with offset
    return paste(offsetX, offsetY);
  }, [copy, paste]);

  // Check if clipboard has content
  const hasContent = useCallback(() => {
    if (clipboardData && clipboardData.nodes.length > 0) {
      return true;
    }

    try {
      const stored = localStorage.getItem(CLIPBOARD_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        return data.nodes && data.nodes.length > 0;
      }
    } catch (e) {
      // Ignore
    }

    return false;
  }, [clipboardData]);

  // Clear clipboard
  const clear = useCallback(() => {
    setClipboardData(null);
    try {
      localStorage.removeItem(CLIPBOARD_KEY);
    } catch (e) {
      // Ignore
    }
  }, []);

  return {
    copy,
    cut,
    paste,
    duplicate,
    hasContent,
    clear,
  };
}

export default useClipboard;
