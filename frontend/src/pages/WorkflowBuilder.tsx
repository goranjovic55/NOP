/**
 * WorkflowBuilder - Flow automation page with execution visualization
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { CyberPageTitle, CyberButton } from '../components/CyberUI';
import FlowTabs from '../components/workflow/FlowTabs';
import WorkflowCanvas from '../components/workflow/WorkflowCanvas';
import BlockPalette from '../components/workflow/BlockPalette';
import ExecutionConsole from '../components/workflow/ExecutionConsole';
import ConfigPanel from '../components/workflow/ConfigPanel';
import FlowTemplates from '../components/workflow/FlowTemplates';
import ExecutionOverlay from '../components/workflow/ExecutionOverlay';
import WorkflowSettingsModal from '../components/workflow/WorkflowSettingsModal';

interface FlowTab {
  workflowId: string;
  name: string;
  isDirty: boolean;
}

const WorkflowBuilder: React.FC = () => {
  const {
    workflows,
    currentWorkflowId,
    selectedNodeId,
    loadWorkflows,
    setCurrentWorkflow,
    selectNode,
    updateNode,
    createWorkflow,
    setExecution: setStoreExecution,
  } = useWorkflowStore();

  const [openTabs, setOpenTabs] = useState<FlowTab[]>([]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(true);
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showExecutionOverlay, setShowExecutionOverlay] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  // Use the execution hook for proper WebSocket/polling support
  const {
    execution,
    isExecuting,
    start: startExecution,
    cancel: cancelExecution,
    reset: resetExecution,
  } = useWorkflowExecution({
    onNodeStatusChange: useCallback((nodeId: string, status: string, result?: any) => {
      // Update node visual status in store for block highlighting
      // Use getState() to always get fresh node data, avoiding stale closure
      console.log('[DEBUG] onNodeStatusChange called:', nodeId, status, result ? 'with result' : 'no result');
      const currentNodes = useWorkflowStore.getState().nodes;
      
      // Log all available node IDs for debugging
      console.log('[DEBUG] Available node IDs:', currentNodes.map(n => n.id));
      
      const node = currentNodes.find(n => n.id === nodeId);
      if (node) {
        console.log('[DEBUG] Updating node:', nodeId, 'to status:', status);
        updateNode(nodeId, {
          data: {
            ...node.data,
            executionStatus: status,
            executionOutput: result?.output,
            executionError: result?.error,
            executionDuration: result?.duration,
          }
        });
      } else {
        console.log('[DEBUG] Node not found:', nodeId);
        console.log('[DEBUG] All current nodes:', currentNodes.map(n => ({ id: n.id, type: n.data?.type, label: n.data?.label })));
      }
    }, [updateNode]),
    onComplete: useCallback((exec: any) => {
      console.log('Workflow execution completed:', exec);
      
      // Mark any nodes that weren't executed as "skipped"
      // This helps users understand which nodes weren't reached
      // Check both snake_case (from API) and camelCase (from hook state)
      // Note: empty object {} is truthy, so we must check for keys
      const snakeStatuses = exec.node_statuses || {};
      const camelStatuses = exec.nodeStatuses || {};
      const nodeStatuses = Object.keys(snakeStatuses).length > 0 ? snakeStatuses : camelStatuses;
      const executedNodeIds = new Set(Object.keys(nodeStatuses));
      
      console.log('[DEBUG] executedNodeIds:', Array.from(executedNodeIds));
      
      const currentNodes = useWorkflowStore.getState().nodes;
      
      currentNodes.forEach(node => {
        if (!executedNodeIds.has(node.id)) {
          // Node was not executed - mark as skipped
          console.log('[DEBUG] Marking node as skipped:', node.id, node.data?.label);
          updateNode(node.id, {
            data: {
              ...node.data,
              executionStatus: 'skipped',
            }
          });
        }
      });
    }, [updateNode]),
    onError: useCallback((error: string) => {
      console.error('Workflow execution error:', error);
    }, []),
  });

  // Sync hook's execution state to store for WorkflowCanvas to read
  useEffect(() => {
    console.log('[DEBUG] Syncing execution to store:', execution?.status, 'nodeStatuses:', execution?.nodeStatuses ? Object.keys(execution.nodeStatuses) : 'none');
    setStoreExecution(execution);
  }, [execution, setStoreExecution]);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  useEffect(() => {
    if (currentWorkflowId) {
      const workflow = workflows.find(w => w.id === currentWorkflowId);
      if (workflow && !openTabs.find(t => t.workflowId === currentWorkflowId)) {
        setOpenTabs(prev => [...prev, {
          workflowId: workflow.id,
          name: String(workflow.name),
          isDirty: false
        }]);
      }
      // Reset execution state when switching workflows
      resetExecution();
    }
  }, [currentWorkflowId, workflows, openTabs, resetExecution]);

  // Show overlay when execution starts
  useEffect(() => {
    if (isExecuting) {
      setShowExecutionOverlay(true);
    }
  }, [isExecuting]);

  const handleSwitchTab = (id: string) => setCurrentWorkflow(id);
  const handleCloseTab = (id: string) => {
    setOpenTabs(prev => prev.filter(t => t.workflowId !== id));
    if (currentWorkflowId === id) {
      const remaining = openTabs.filter(t => t.workflowId !== id);
      setCurrentWorkflow(remaining.length > 0 ? remaining[0].workflowId : null);
    }
  };

  const handleNewWorkflow = useCallback(async () => {
    try {
      const name = `Workflow ${workflows.length + 1}`;
      await createWorkflow({ name, description: '' });
      console.log('Created new workflow:', name);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  }, [createWorkflow, workflows.length]);

  const handleInsertTemplate = useCallback(async (templateNodes: any[], templateEdges: any[]) => {
    // Auto-create workflow if none selected
    let workflowId = currentWorkflowId;
    if (!workflowId) {
      try {
        const name = `Template Flow ${workflows.length + 1}`;
        const newWorkflow = await createWorkflow({ name, description: '' });
        workflowId = newWorkflow.id;
        console.log('Auto-created workflow for template:', name);
      } catch (error) {
        console.error('Failed to create workflow for template:', error);
        return;
      }
    }
    
    // Generate unique IDs for nodes and edges
    const timestamp = Date.now();
    const nodeIdMap = new Map<string, string>();
    
    // Create new nodes with unique IDs
    const newNodes = templateNodes.map((node, index) => {
      const oldId = node.id || `${index + 1}`;
      const newId = `node-${timestamp}-${index}`;
      nodeIdMap.set(oldId, newId);
      
      return {
        id: newId,
        type: node.type || 'block',
        position: node.position || { x: 100, y: 50 + index * 100 },
        data: {
          ...node.data,
          label: node.data?.label || 'Block',
          type: node.data?.type || 'control.start',
          category: node.data?.category || 'control',
          parameters: node.data?.parameters || {},
        },
      };
    });
    
    // Create new edges with remapped IDs
    const newEdges = templateEdges.map((edge, index) => {
      const sourceId = nodeIdMap.get(edge.source) || edge.source;
      const targetId = nodeIdMap.get(edge.target) || edge.target;
      
      return {
        id: `edge-${timestamp}-${index}`,
        source: sourceId,
        target: targetId,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      };
    });
    
    // Add nodes and edges to the store
    const store = useWorkflowStore.getState();
    newNodes.forEach(node => store.addNode(node));
    newEdges.forEach(edge => store.addEdge(edge));
    
    console.log('Inserted template:', newNodes.length, 'nodes,', newEdges.length, 'edges');
    setShowTemplates(false);
  }, [currentWorkflowId, workflows.length, createWorkflow]);

  const handleStartExecution = async () => {
    if (currentWorkflowId) {
      try {
        await startExecution(currentWorkflowId);
      } catch (error) {
        console.error('Failed to start execution:', error);
      }
    }
  };

  const handleCancelExecution = () => {
    if (currentWorkflowId && execution?.id) {
      cancelExecution(currentWorkflowId, execution.id);
    }
  };

  return (
    <div className="h-full flex flex-col bg-cyber-black">
      {/* Header */}
      <div className="p-4 border-b border-cyber-gray flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CyberPageTitle color="purple">◇ FLOWS</CyberPageTitle>
          <select
            value={currentWorkflowId || ''}
            onChange={(e) => setCurrentWorkflow(e.target.value || null)}
            className="cyber-select min-w-[200px]"
          >
            <option value="">[ SELECT FLOW ]</option>
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{String(w.name)}</option>
            ))}
          </select>
          <CyberButton variant="green" size="sm" onClick={handleNewWorkflow}>+ NEW</CyberButton>
          <CyberButton 
            variant="purple" 
            size="sm" 
            onClick={() => setShowTemplates(true)}
          >
            TEMPLATES
          </CyberButton>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono text-cyber-gray">
          {currentWorkflowId && workflows.find(w => w.id === currentWorkflowId) && (
            <span className="text-cyber-purple">
              {workflows.find(w => w.id === currentWorkflowId)?.nodes?.length || 0} blocks
            </span>
          )}
        </div>
      </div>

      {/* FlowTabs */}
      <FlowTabs
        tabs={openTabs}
        activeTabId={currentWorkflowId}
        onSwitchTab={handleSwitchTab}
        onCloseTab={handleCloseTab}
      />

      {/* Canvas Toolbar - Quick Actions */}
      <div className="px-4 py-2 border-b border-cyber-gray/50 bg-cyber-darker flex items-center justify-between">
        {/* Left side - Flow actions */}
        <div className="flex items-center gap-2">
          <CyberButton 
            variant="blue" 
            size="sm" 
            onClick={() => {
              if (currentWorkflowId) {
                const workflow = workflows.find(w => w.id === currentWorkflowId);
                if (workflow) {
                  // Save current state
                  useWorkflowStore.getState().saveCurrentWorkflow();
                  console.log('Flow saved:', currentWorkflowId);
                }
              }
            }}
            disabled={!currentWorkflowId}
            title="Save Flow (Ctrl+S)"
          >
            ◆ SAVE
          </CyberButton>
          <div className="w-px h-5 bg-cyber-gray/30" />
          <CyberButton 
            variant="gray" 
            size="sm"
            disabled // TODO: Implement undo
            title="Undo (Ctrl+Z)"
          >
            ↩ UNDO
          </CyberButton>
          <CyberButton 
            variant="gray" 
            size="sm"
            disabled // TODO: Implement redo
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪ REDO
          </CyberButton>
          <div className="w-px h-5 bg-cyber-gray/30" />
          <CyberButton 
            variant="gray" 
            size="sm"
            onClick={() => {
              // Compile/validate flow
              if (currentWorkflowId) {
                useWorkflowStore.getState().compileWorkflow(currentWorkflowId);
              }
            }}
            disabled={!currentWorkflowId}
            title="Validate Flow"
          >
            ✓ VALIDATE
          </CyberButton>
          <div className="w-px h-5 bg-cyber-gray/30" />
          <CyberButton 
            variant="purple" 
            size="sm"
            onClick={() => setShowSettings(true)}
            disabled={!currentWorkflowId}
            title="Workflow Settings & Variables"
          >
            ⚙ SETTINGS
          </CyberButton>
        </div>

        {/* Center - Execution status */}
        <div className="flex items-center gap-3">
          {isExecuting && (
            <span className="text-cyber-blue animate-pulse font-mono text-sm">
              ● EXECUTING...
            </span>
          )}
          {execution?.status === 'completed' && !isExecuting && (
            <span className="text-cyber-green font-mono text-sm">
              ✓ COMPLETED
            </span>
          )}
          {execution?.status === 'failed' && !isExecuting && (
            <span className="text-cyber-red font-mono text-sm">
              ✗ FAILED
            </span>
          )}
        </div>

        {/* Right side - Run controls */}
        <div className="flex items-center gap-2">
          <CyberButton
            variant={isExecuting ? 'gray' : 'green'}
            size="sm"
            onClick={handleStartExecution}
            disabled={!currentWorkflowId || isExecuting}
            title="Run Flow (F5)"
          >
            ▶ RUN
          </CyberButton>
          <CyberButton
            variant="red"
            size="sm"
            onClick={handleCancelExecution}
            disabled={!isExecuting}
            title="Stop Execution (Escape)"
          >
            ◼ STOP
          </CyberButton>
          <div className="w-px h-5 bg-cyber-gray/30" />
          <CyberButton
            variant="purple"
            size="sm"
            onClick={() => setShowExecutionOverlay(!showExecutionOverlay)}
            title="Toggle Execution Panel"
          >
            ◎ PANEL
          </CyberButton>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex">
          {/* Left sidebar - BlockPalette */}
          <BlockPalette 
            isOpen={isPaletteOpen} 
            onToggle={() => setIsPaletteOpen(!isPaletteOpen)} 
          />
          
          {/* Canvas */}
          <WorkflowCanvas />

          {/* Right sidebar - ConfigPanel or Templates */}
          {selectedNodeId && !showTemplates && (
            <ConfigPanel 
              nodeId={selectedNodeId}
              onClose={() => selectNode(null)}
            />
          )}
          
          {/* Templates Panel - in sidebar */}
          {showTemplates && (
            <FlowTemplates
              isOpen={showTemplates}
              onClose={() => setShowTemplates(false)}
              onInsertTemplate={handleInsertTemplate}
            />
          )}
        </div>
        
        {/* Bottom console */}
        <ExecutionConsole
          execution={execution}
          isMinimized={isConsoleMinimized}
          onToggleMinimize={() => setIsConsoleMinimized(!isConsoleMinimized)}
        />
      </div>

      {/* Execution Overlay */}
      {showExecutionOverlay && (
        <ExecutionOverlay
          execution={execution}
          isExecuting={isExecuting}
          onStart={handleStartExecution}
          onPause={() => setIsPaused(true)}
          onResume={() => setIsPaused(false)}
          onCancel={handleCancelExecution}
          onClose={() => setShowExecutionOverlay(false)}
        />
      )}

      {/* Workflow Settings Modal */}
      {currentWorkflowId && (
        <WorkflowSettingsModal
          workflowId={currentWorkflowId}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

export default WorkflowBuilder;
