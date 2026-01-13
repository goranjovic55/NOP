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
  SelectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';

import BlockNode from './BlockNode';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowNode, WorkflowEdge } from '../../types/workflow';

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
  
  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    addNode,
    addEdge: storeAddEdge,
    removeNode,
    selectedNodeId,
    selectNode,
  } = useWorkflowStore();

  // Handle keyboard events for Ctrl (selection mode) and Delete (remove nodes)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control') setIsCtrlPressed(true);
      
      // Delete key - remove selected nodes
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
  }, [nodes, selectedNodeId, removeNode, selectNode]);

  // Convert store nodes to React Flow format - keep original data
  const flowNodes = useMemo(() => {
    if (!Array.isArray(nodes)) return [];
    return nodes.map(node => ({
      ...node,
      type: 'block',
      selected: node.id === selectedNodeId,
    }));
  }, [nodes, selectedNodeId]);

  const flowEdges = useMemo(() => {
    if (!Array.isArray(edges)) return [];
    return edges.map(edge => ({
      ...edge,
      animated: edge.selected || false,
      style: cyberEdgeStyle,
    }));
  }, [edges]);

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
