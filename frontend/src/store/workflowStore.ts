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

interface WorkflowTab {
  workflowId: string;
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  isDirty: boolean;
}

// Console log entry for execution tracking
export interface ConsoleLogEntry {
  id: string;
  timestamp: Date;
  nodeId: string;
  nodeLabel?: string;
  type: 'start' | 'success' | 'error' | 'output' | 'info' | 'single-block';
  message: string;
  data?: any;
}

interface WorkflowState {
  // Workflow list
  workflows: Workflow[];
  currentWorkflowId: string | null;
  lastWorkflowId: string | null; // Remember last opened flow
  
  // Tab management - multiple open flows
  openTabs: WorkflowTab[];
  activeTabId: string | null;
  
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
  isTemplatesOpen: boolean;
  zoom: number;
  
  // Console logs (shared between workflow execution and single block runs)
  consoleLogs: ConsoleLogEntry[];
  addConsoleLog: (log: Omit<ConsoleLogEntry, 'id' | 'timestamp'>) => void;
  clearConsoleLogs: () => void;
  
  // Workflow CRUD
  loadWorkflows: () => Promise<void>;
  createWorkflow: (data: WorkflowCreate) => Promise<Workflow>;
  updateWorkflow: (id: string, data: Partial<Workflow>) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  setCurrentWorkflow: (id: string | null) => void;
  
  // Tab management
  openWorkflowTab: (id: string) => void;
  closeTab: (id: string) => void;
  switchToTab: (id: string) => void;
  markTabDirty: (id: string, dirty: boolean) => void;
  
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
  toggleTemplates: () => void;
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
      lastWorkflowId: null,
      openTabs: [],
      activeTabId: null,
      nodes: [],
      edges: [],
      selectedNodeId: null,
      execution: null,
      isExecuting: false,
      isPaletteOpen: true,
      isConfigPanelOpen: false,
      isTemplatesOpen: false,
      zoom: 1,
      consoleLogs: [],

      // Load workflows from API
      loadWorkflows: async () => {
        try {
          const token = getAuthToken();
          const response = await fetch(API_BASE, {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (response.ok) {
            const data = await response.json();
            const workflows = data.workflows || [];
            
            // Get the persisted lastWorkflowId from storage
            const { lastWorkflowId } = get();
            
            // If we have a last workflow and it exists in the loaded workflows, restore it
            const lastWorkflow = lastWorkflowId ? workflows.find((w: Workflow) => w.id === lastWorkflowId) : null;
            
            if (lastWorkflow) {
              const newTab: WorkflowTab = {
                workflowId: lastWorkflow.id,
                name: lastWorkflow.name,
                nodes: lastWorkflow.nodes || [],
                edges: lastWorkflow.edges || [],
                isDirty: false,
              };
              set({ 
                workflows,
                currentWorkflowId: lastWorkflow.id,
                openTabs: [newTab],
                activeTabId: lastWorkflow.id,
                nodes: lastWorkflow.nodes || [],
                edges: lastWorkflow.edges || [],
              });
            } else {
              set({ workflows });
            }
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
        const newTab: WorkflowTab = {
          workflowId: workflow.id,
          name: workflow.name,
          nodes: workflow.nodes || [],
          edges: workflow.edges || [],
          isDirty: false,
        };
        
        set(state => ({
          workflows: [...state.workflows, workflow],
          currentWorkflowId: workflow.id,
          openTabs: [...state.openTabs, newTab],
          activeTabId: workflow.id,
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
          openTabs: state.openTabs.map(t => 
            t.workflowId === id ? { ...t, isDirty: false } : t
          ),
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
        
        const { openTabs, activeTabId } = get();
        const remainingTabs = openTabs.filter(t => t.workflowId !== id);
        const newActiveTab = activeTabId === id 
          ? (remainingTabs[0]?.workflowId || null)
          : activeTabId;
        
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id),
          currentWorkflowId: state.currentWorkflowId === id ? newActiveTab : state.currentWorkflowId,
          openTabs: remainingTabs,
          activeTabId: newActiveTab,
          nodes: state.currentWorkflowId === id ? [] : state.nodes,
          edges: state.currentWorkflowId === id ? [] : state.edges,
        }));
      },

      // Set current workflow
      setCurrentWorkflow: (id) => {
        const { workflows, openTabs } = get();
        const workflow = workflows.find(w => w.id === id);
        
        if (id && workflow) {
          // Check if already open in a tab
          const existingTab = openTabs.find(t => t.workflowId === id);
          if (!existingTab) {
            const newTab: WorkflowTab = {
              workflowId: id,
              name: workflow.name,
              nodes: workflow.nodes || [],
              edges: workflow.edges || [],
              isDirty: false,
            };
            set(state => ({
              currentWorkflowId: id,
              openTabs: [...state.openTabs, newTab],
              activeTabId: id,
              nodes: workflow?.nodes || [],
              edges: workflow?.edges || [],
              selectedNodeId: null,
              execution: null,
            }));
          } else {
            set({
              currentWorkflowId: id,
              activeTabId: id,
              nodes: existingTab.nodes,
              edges: existingTab.edges,
              selectedNodeId: null,
              execution: null,
            });
          }
        } else {
          set({
            currentWorkflowId: null,
            activeTabId: null,
            nodes: [],
            edges: [],
            selectedNodeId: null,
            execution: null,
          });
        }
      },
      
      // Tab management
      openWorkflowTab: (id) => {
        const { workflows, openTabs } = get();
        const workflow = workflows.find(w => w.id === id);
        if (!workflow) return;
        
        const existingTab = openTabs.find(t => t.workflowId === id);
        if (existingTab) {
          // Just switch to it
          set({
            currentWorkflowId: id,
            activeTabId: id,
            nodes: existingTab.nodes,
            edges: existingTab.edges,
          });
        } else {
          // Open new tab
          const newTab: WorkflowTab = {
            workflowId: id,
            name: workflow.name,
            nodes: workflow.nodes || [],
            edges: workflow.edges || [],
            isDirty: false,
          };
          set(state => ({
            currentWorkflowId: id,
            openTabs: [...state.openTabs, newTab],
            activeTabId: id,
            nodes: workflow.nodes || [],
            edges: workflow.edges || [],
          }));
        }
      },
      
      closeTab: (id) => {
        const { openTabs, activeTabId } = get();
        const remainingTabs = openTabs.filter(t => t.workflowId !== id);
        const newActiveId = activeTabId === id 
          ? (remainingTabs[remainingTabs.length - 1]?.workflowId || null)
          : activeTabId;
        
        const newActiveTab = remainingTabs.find(t => t.workflowId === newActiveId);
        
        set({
          openTabs: remainingTabs,
          activeTabId: newActiveId,
          currentWorkflowId: newActiveId,
          nodes: newActiveTab?.nodes || [],
          edges: newActiveTab?.edges || [],
        });
      },
      
      switchToTab: (id) => {
        const { openTabs, nodes, edges, activeTabId } = get();
        
        // Save current tab state before switching
        if (activeTabId) {
          const updatedTabs = openTabs.map(t => 
            t.workflowId === activeTabId 
              ? { ...t, nodes, edges }
              : t
          );
          
          const targetTab = updatedTabs.find(t => t.workflowId === id);
          if (targetTab) {
            set({
              openTabs: updatedTabs,
              activeTabId: id,
              currentWorkflowId: id,
              nodes: targetTab.nodes,
              edges: targetTab.edges,
              selectedNodeId: null,
            });
          }
        } else {
          const targetTab = openTabs.find(t => t.workflowId === id);
          if (targetTab) {
            set({
              activeTabId: id,
              currentWorkflowId: id,
              nodes: targetTab.nodes,
              edges: targetTab.edges,
              selectedNodeId: null,
            });
          }
        }
      },
      
      markTabDirty: (id, dirty) => {
        set(state => ({
          openTabs: state.openTabs.map(t => 
            t.workflowId === id ? { ...t, isDirty: dirty } : t
          ),
        }));
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
      toggleTemplates: () => set(state => ({ isTemplatesOpen: !state.isTemplatesOpen })),
      setZoom: (zoom) => set({ zoom }),
      
      // Console log management
      addConsoleLog: (log) => set(state => ({
        consoleLogs: [...state.consoleLogs, {
          ...log,
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          timestamp: new Date(),
        }].slice(-500), // Keep last 500 entries
      })),
      clearConsoleLogs: () => set({ consoleLogs: [] }),

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
        // Persist UI preferences and last workflow
        isPaletteOpen: state.isPaletteOpen,
        zoom: state.zoom,
        lastWorkflowId: state.currentWorkflowId, // Remember last opened flow
      }),
    }
  )
);
