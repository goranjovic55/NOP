/**
 * WorkflowCanvas - Cyberpunk-styled React Flow canvas component
 */

import React, { useCallback, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
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
} from 'reactflow';
import 'reactflow/dist/style.css';

import BlockNode from './BlockNode';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowNode, WorkflowEdge, NodeData } from '../../types/workflow';

// Define custom node types
const nodeTypes = {
  block: BlockNode,
};

// Cyberpunk edge styling
const cyberEdgeStyle = { 
  stroke: '#8b5cf6', 
  strokeWidth: 2,
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
      style: cyberEdgeStyle,
    })),
    [edges]
  );

  // Handle node changes (drag, select, remove)
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      const updatedNodes = applyNodeChanges(changes, flowNodes);
      setNodes(updatedNodes as WorkflowNode[]);
      
      // Handle selection - single click should open config panel
      changes.forEach(change => {
        if (change.type === 'select' && change.selected) {
          selectNode(change.id);
          onNodeSelect(change.id);
        }
      });
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

  // Handle node double-click (open config panel)
  const onNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      selectNode(node.id);
      onNodeSelect(node.id);
    },
    [selectNode, onNodeSelect]
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
        <MiniMap 
          className="!bg-cyber-darker !border !border-cyber-gray !rounded"
          nodeColor={(node) => {
            const data = node.data as NodeData;
            return data?.color || '#8b5cf6';
          }}
          maskColor="rgba(10, 10, 10, 0.9)"
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
