/**
 * WorkflowCanvas - Main React Flow canvas component
 */

import React, { useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

import BlockNode from './BlockNode';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowNode, WorkflowEdge, NodeData } from '../../types/workflow';

// Define custom node types
const nodeTypes = {
  block: BlockNode,
};

interface WorkflowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void;
}

const WorkflowCanvasInner: React.FC<WorkflowCanvasProps> = ({ onNodeSelect }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const { 
    nodes, 
    edges, 
    setNodes, 
    setEdges, 
    addNode,
    addEdge: storeAddEdge,
    selectedNodeId,
    selectNode,
  } = useWorkflowStore();

  // Convert store nodes to React Flow format
  const flowNodes = useMemo(() => 
    nodes.map(node => ({
      ...node,
      type: 'block',
      selected: node.id === selectedNodeId,
    })),
    [nodes, selectedNodeId]
  );

  const flowEdges = useMemo(() => 
    edges.map(edge => ({
      ...edge,
      animated: false,
      style: { stroke: '#6B7280', strokeWidth: 2 },
    })),
    [edges]
  );

  // Handle node changes (drag, select, remove)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, flowNodes);
      setNodes(updatedNodes as WorkflowNode[]);
      
      // Handle selection
      const selectChange = changes.find(c => c.type === 'select');
      if (selectChange && selectChange.type === 'select') {
        onNodeSelect(selectChange.selected ? selectChange.id : null);
        selectNode(selectChange.selected ? selectChange.id : null);
      }
    },
    [flowNodes, setNodes, onNodeSelect, selectNode]
  );

  // Handle edge changes
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      const updatedEdges = applyEdgeChanges(changes, flowEdges);
      setEdges(updatedEdges as WorkflowEdge[]);
    },
    [flowEdges, setEdges]
  );

  // Handle new connections
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

  // Handle drop from palette
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
            label: blockData.label,
            type: blockData.type,
            category: blockData.category,
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

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    onNodeSelect(null);
  }, [selectNode, onNodeSelect]);

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
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          style: { stroke: '#6B7280', strokeWidth: 2 },
          type: 'smoothstep',
        }}
        className="bg-gray-950"
      >
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#374151"
        />
        <Controls 
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
          showZoom
          showFitView
          showInteractive={false}
        />
        <MiniMap 
          className="!bg-gray-800 !border-gray-700 !rounded-lg"
          nodeColor={(node) => {
            const data = node.data as NodeData;
            return data?.color || '#6B7280';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
        />
      </ReactFlow>
    </div>
  );
};

// Wrap with ReactFlowProvider
const WorkflowCanvas: React.FC<WorkflowCanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
};

export default WorkflowCanvas;
