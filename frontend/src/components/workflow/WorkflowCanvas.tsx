/**
 * WorkflowCanvas - React Flow canvas with debugging
 */

import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  useReactFlow,
  Connection,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  BackgroundVariant,
  Node,
  Edge,
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import BlockNode from './BlockNode';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowNode, WorkflowEdge, NodeExecutionStatus } from '../../types/workflow';

// Define custom node types
const nodeTypes = {
  block: BlockNode,
};

// Cyberpunk edge styling
const cyberEdgeStyle = { 
  stroke: '#8b5cf6', 
  strokeWidth: 2,
};

const WorkflowCanvasInner: React.FC = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<Set<string>>(new Set());
  
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    addNode,
    addEdge: storeAddEdge,
    removeNode,
    removeEdge,
    selectedNodeId,
    selectNode,
    execution, // Get execution state for node status highlighting
  } = useWorkflowStore();

  // Handle keyboard events for Ctrl (selection mode) and Delete (remove nodes/edges)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true);
      
      // Delete key - remove selected nodes and edges
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if focus is on an input element
        const activeElement = document.activeElement;
        if (activeElement && (
          activeElement.tagName === 'INPUT' || 
          activeElement.tagName === 'TEXTAREA' ||
          (activeElement as HTMLElement).isContentEditable
        )) {
          return;
        }
        
        e.preventDefault();
        
        // Delete selected edges first
        if (selectedEdgeIds.size > 0) {
          selectedEdgeIds.forEach(edgeId => {
            removeEdge(edgeId);
          });
          setSelectedEdgeIds(new Set());
          return; // Only delete edges if edges are selected
        }
        
        // Get all selected nodes from flowNodes
        const selectedNodes = nodes.filter(n => n.selected || n.id === selectedNodeId);
        
        if (selectedNodes.length > 0) {
          // Remove all selected nodes
          selectedNodes.forEach(node => {
            removeNode(node.id);
          });
          selectNode(null);
        } else if (selectedNodeId) {
          // Fallback: remove the single selected node
          removeNode(selectedNodeId);
          selectNode(null);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(false);
    };
    const handleBlur = () => setIsCtrlPressed(false);
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [nodes, edges, selectedNodeId, selectedEdgeIds, removeNode, removeEdge, selectNode]);

  // Convert store nodes to React Flow format - merge execution status into node data
  const flowNodes = useMemo(() => {
    if (!Array.isArray(nodes)) return [];
    
    // Get execution state for node highlighting
    const nodeStatuses = execution?.nodeStatuses || {};
    const nodeResults = execution?.nodeResults || {};
    
    // Debug: Log when execution state changes
    console.log('[DEBUG] flowNodes useMemo: execution status=', execution?.status, 'nodeStatuses=', Object.keys(nodeStatuses));
    
    return nodes.map(node => {
      const status = nodeStatuses[node.id] as NodeExecutionStatus | undefined;
      const result = nodeResults[node.id];
      
      // Debug: Log status for each node
      if (status) {
        console.log('[DEBUG] flowNodes: node', node.id, 'status=', status);
      }
      
      return {
        ...node,
        type: 'block',
        selected: node.id === selectedNodeId,
        // Merge execution data into node data for BlockNode to render
        data: {
          ...node.data,
          executionStatus: status,
          executionResult: result,
          executionDuration: result?.duration,
          executionOutput: result?.output,
          executionCount: (result as any)?.executionCount || (status === 'completed' || status === 'failed' ? 1 : 0),
        },
      };
    });
  }, [nodes, selectedNodeId, execution]);

  const flowEdges = useMemo(() => {
    if (!Array.isArray(edges)) return [];
    return edges.map(edge => ({
      ...edge,
      animated: selectedEdgeIds.has(edge.id),
      selected: selectedEdgeIds.has(edge.id),
      style: selectedEdgeIds.has(edge.id) 
        ? { stroke: '#f43f5e', strokeWidth: 3 } // Red highlight when selected
        : cyberEdgeStyle,
    }));
  }, [edges, selectedEdgeIds]);

  // Handle edge click - select for deletion
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      // Toggle selection
      setSelectedEdgeIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(edge.id)) {
          newSet.delete(edge.id);
        } else {
          newSet.clear(); // Single selection only
          newSet.add(edge.id);
        }
        return newSet;
      });
      // Clear node selection when selecting edge
      selectNode(null);
    },
    [selectNode]
  );

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, flowNodes);
      setNodes(updatedNodes as WorkflowNode[]);
      
      changes.forEach(change => {
        if (change.type === 'select' && change.selected) {
          selectNode(change.id);
        }
      });
    },
    [flowNodes, setNodes, selectNode]
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, flowEdges);
      setEdges(updatedEdges as WorkflowEdge[]);
    },
    [flowEdges, setEdges]
  );

  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newEdge: WorkflowEdge = {
          id: `e-${connection.source}-${connection.target}-${Date.now()}`,
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        };
        storeAddEdge(newEdge);
      }
    },
    [storeAddEdge]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const data = event.dataTransfer.getData('application/reactflow');
      if (!data) return;

      try {
        const blockData = JSON.parse(data);
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        const newNode: WorkflowNode = {
          id: `node-${Date.now()}`,
          type: 'block',
          position,
          data: {
            label: blockData.label || 'New Block',
            type: blockData.type || 'control.start',
            category: blockData.category || 'control',
            parameters: {},
            icon: blockData.icon,
            color: blockData.color,
          },
        };
        addNode(newNode);
      } catch (error) {
        console.error('Failed to parse dropped block:', error);
      }
    },
    [screenToFlowPosition, addNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
    setSelectedEdgeIds(new Set()); // Clear edge selection too
  }, [selectNode]);

  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  return (
    <div ref={reactFlowWrapper} className="w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onEdgeClick={onEdgeClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onPaneClick={onPaneClick}
        onNodeDoubleClick={onNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        selectionOnDrag={isCtrlPressed}
        selectionMode={SelectionMode.Partial}
        panOnDrag={!isCtrlPressed}
        zoomOnScroll={!isCtrlPressed}
        panOnScroll={isCtrlPressed}
        deleteKeyCode={null}
        defaultEdgeOptions={{
          style: cyberEdgeStyle,
          type: 'smoothstep',
        }}
        className="bg-cyber-black"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#2a2a3a"
        />
        <Controls 
          className="!bg-cyber-darker !border !border-cyber-gray !rounded"
          showZoom
          showFitView
          showInteractive={false}
        />
      </ReactFlow>
    </div>
  );
};

// Wrap with ReactFlowProvider - no props needed
const WorkflowCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;
