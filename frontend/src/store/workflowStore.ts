/**
 * Workflow Store - Zustand state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  WorkflowExecution,
  ExecutionStatus,
  NodeExecutionStatus,
  WorkflowSettings,
  WorkflowCreate,
  CompileResult,
} from '../types/workflow';

interface WorkflowState {
  // Workflow list
  workflows: Workflow[];
  currentWorkflowId: string | null;
  
  // Canvas state (current workflow)
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  
  // Execution state
  execution: WorkflowExecution | null;
  isExecuting: boolean;
  
  // UI state
  isPaletteOpen: boolean;
  isConfigPanelOpen: boolean;
  zoom: number;
  
  // Workflow CRUD
  loadWorkflows: () => Promise<void>;
  createWorkflow: (data: WorkflowCreate) => Promise<Workflow>;
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  setCurrentWorkflow: (id: string | null) => void;
  
  // Canvas operations
  addNode: (node: WorkflowNode) => void;
  updateNode: (id: string, data: Partial<WorkflowNode>) => void;
  removeNode: (id: string) => void;
  addEdge: (edge: WorkflowEdge) => void;
  removeEdge: (id: string) => void;
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: WorkflowEdge[]) => void;
  
  // Selection
  selectNode: (id: string | null) => void;
  
  // Execution
  compileWorkflow: (id: string) => Promise<CompileResult>;
  executeWorkflow: (id: string) => Promise<void>;
  cancelExecution: () => void;
  updateNodeStatus: (nodeId: string, status: NodeExecutionStatus) => void;
  
  // UI
  togglePalette: () => void;
  toggleConfigPanel: () => void;
  setZoom: (zoom: number) => void;
  
  // Helpers
  getCurrentWorkflow: () => Workflow | null;
  saveCurrentWorkflow: () => Promise<void>;
}

const API_BASE = '/api/v1/workflows/';

// Helper to get auth token from persisted auth store
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('nop-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
      // Initial state
      workflows: [],
      currentWorkflowId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      execution: null,
      isExecuting: false,
      isPaletteOpen: true,
      isConfigPanelOpen: false,
      zoom: 1,

      // Load workflows from API
      loadWorkflows: async () => {
        try {
          const token = getAuthToken();
          const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            set({ workflows: data.workflows || [] });
          }
        } catch (error) {
          console.error('Failed to load workflows:', error);
        }
      },

      // Create new workflow
      createWorkflow: async (data) => {
        const token = getAuthToken();
        const response = await fetch(API_BASE, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create workflow');
        }
        
        const workflow = await response.json();
        set(state => ({
          workflows: [...state.workflows, workflow],
          currentWorkflowId: workflow.id,
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
        }));
        
        return workflow;
      },

      // Update workflow
      updateWorkflow: async (id, data) => {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update workflow');
        }
        
        const updated = await response.json();
        set(state => ({
          workflows: state.workflows.map(w => w.id === id ? updated : w),
        }));
      },

      // Delete workflow
      deleteWorkflow: async (id) => {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete workflow');
        }
        
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id),
          currentWorkflowId: state.currentWorkflowId === id ? null : state.currentWorkflowId,
          nodes: state.currentWorkflowId === id ? [] : state.nodes,
          edges: state.currentWorkflowId === id ? [] : state.edges,
        }));
      },

      // Set current workflow
      setCurrentWorkflow: (id) => {
        const { workflows } = get();
        const workflow = workflows.find(w => w.id === id);
        
        set({
          currentWorkflowId: id,
          nodes: workflow?.nodes || [],
          edges: workflow?.edges || [],
          selectedNodeId: null,
          execution: null,
        });
      },

      // Canvas: Add node
      addNode: (node) => {
        set(state => ({
          nodes: [...state.nodes, node],
        }));
      },

      // Canvas: Update node
      updateNode: (id, data) => {
        set(state => ({
          nodes: state.nodes.map(n => 
            n.id === id ? { ...n, ...data } : n
          ),
        }));
      },

      // Canvas: Remove node
      removeNode: (id) => {
        set(state => ({
          nodes: state.nodes.filter(n => n.id !== id),
          edges: state.edges.filter(e => e.source !== id && e.target !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));
      },

      // Canvas: Add edge
      addEdge: (edge) => {
        set(state => ({
          edges: [...state.edges, edge],
        }));
      },

      // Canvas: Remove edge
      removeEdge: (id) => {
        set(state => ({
          edges: state.edges.filter(e => e.id !== id),
        }));
      },

      // Canvas: Set all nodes
      setNodes: (nodes) => set({ nodes }),

      // Canvas: Set all edges
      setEdges: (edges) => set({ edges }),

      // Selection
      selectNode: (id) => {
        set({ 
          selectedNodeId: id,
          isConfigPanelOpen: id !== null,
        });
      },

      // Compile workflow
      compileWorkflow: async (id) => {
        const token = getAuthToken();
        const response = await fetch(`${API_BASE}${id}/compile`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
        });
        
        if (!response.ok) {
          throw new Error('Compilation failed');
        }
        
        return await response.json();
      },

      // Execute workflow
      executeWorkflow: async (id) => {
        const token = getAuthToken();
        
        set({ isExecuting: true });
        
        try {
          const response = await fetch(`${API_BASE}${id}/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });
          
          if (!response.ok) {
            throw new Error('Execution failed');
          }
          
          const execution = await response.json();
          set({ execution });
          
        } catch (error) {
          set({ isExecuting: false });
          throw error;
        }
      },

      // Cancel execution
      cancelExecution: () => {
        set({ 
          isExecuting: false,
          execution: null,
        });
      },

      // Update node execution status
      updateNodeStatus: (nodeId, status) => {
        set(state => {
          if (!state.execution) return state;
          
          return {
            execution: {
              ...state.execution,
              nodeStatuses: {
                ...state.execution.nodeStatuses,
                [nodeId]: status,
              },
            },
          };
        });
      },

      // UI toggles
      togglePalette: () => set(state => ({ isPaletteOpen: !state.isPaletteOpen })),
      toggleConfigPanel: () => set(state => ({ isConfigPanelOpen: !state.isConfigPanelOpen })),
      setZoom: (zoom) => set({ zoom }),

      // Get current workflow
      getCurrentWorkflow: () => {
        const { workflows, currentWorkflowId } = get();
        return workflows.find(w => w.id === currentWorkflowId) || null;
      },

      // Save current workflow to API
      saveCurrentWorkflow: async () => {
        const { currentWorkflowId, nodes, edges, updateWorkflow } = get();
        if (!currentWorkflowId) return;
        
        await updateWorkflow(currentWorkflowId, { nodes, edges });
      },
    }),
    {
      name: 'nop-workflow-store',
      partialize: (state) => ({
        // Only persist UI preferences, not data
        isPaletteOpen: state.isPaletteOpen,
        zoom: state.zoom,
      }),
    }
  )
);
