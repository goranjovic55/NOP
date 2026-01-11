/**
 * WorkflowBuilder - Main workflow automation page
 * Visual canvas for building and executing automation workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { WorkflowCanvas, BlockPalette, ConfigPanel, FlowTemplates, FlowTabs } from '../components/workflow';
import ExecutionOverlay from '../components/workflow/ExecutionOverlay';
import ExecutionConsole from '../components/workflow/ExecutionConsole';
import { WorkflowCreate, NodeExecutionStatus, WorkflowNode, WorkflowEdge } from '../types/workflow';
import { CyberCard, CyberButton, CyberInput, CyberPageTitle } from '../components/CyberUI';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useClipboard } from '../hooks/useClipboard';
import { exportWorkflow, triggerImport, regenerateIds, validateWorkflow } from '../utils/workflowExport';

// Compact shortcuts for persistent legend
const SHORTCUT_LEGEND = [
  { keys: '⌘S', desc: 'Save' },
  { keys: '⌘Z', desc: 'Undo' },
  { keys: '⌘⇧Z', desc: 'Redo' },
  { keys: 'Del', desc: 'Delete' },
  { keys: '⌘D', desc: 'Duplicate' },
  { keys: '⌘C/V/X', desc: 'Copy/Paste/Cut' },
  { keys: 'Esc', desc: 'Deselect' },
  { keys: 'F5', desc: 'Run' },
];

const WorkflowBuilder: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [showExecutionOverlay, setShowExecutionOverlay] = useState(false);
  
  // Console state - persisted in localStorage
  const [isConsoleMinimized, setIsConsoleMinimized] = useState(() => {
    const saved = localStorage.getItem('flows-console-minimized');
    return saved === 'true';
  });
  
  // Persist console state
  const handleToggleConsole = () => {
    const newState = !isConsoleMinimized;
    setIsConsoleMinimized(newState);
    localStorage.setItem('flows-console-minimized', String(newState));
  };
  
  const {
    workflows,
    currentWorkflowId,
    nodes,
    edges,
    isPaletteOpen,
    isTemplatesOpen,
    openTabs,
    activeTabId,
    loadWorkflows,
    createWorkflow,
    setCurrentWorkflow,
    deleteWorkflow,
    saveCurrentWorkflow,
    compileWorkflow,
    togglePalette,
    toggleTemplates,
    getCurrentWorkflow,
    updateNode,
    setNodes,
    setEdges,
    removeNode,
    selectNode,
    selectedNodeId: storeSelectedNodeId,
    openWorkflowTab,
    closeTab,
    switchToTab,
    markTabDirty,
  } = useWorkflowStore();

  // Undo/Redo
  const { saveState, undo, redo, clearHistory } = useUndoRedo();
  
  // Clipboard
  const { copy, cut, paste, duplicate, hasContent: hasClipboardContent } = useClipboard();

  // Save state for undo on significant changes
  const saveUndoState = useCallback(() => {
    saveState([...nodes], [...edges]);
  }, [nodes, edges, saveState]);

  // Handle undo
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [undo, setNodes, setEdges]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const state = redo();
    if (state) {
      setNodes(state.nodes);
      setEdges(state.edges);
    }
  }, [redo, setNodes, setEdges]);

  // Handle delete selected nodes
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0 && storeSelectedNodeId) {
      selectedIds.push(storeSelectedNodeId);
    }
    if (selectedIds.length > 0) {
      saveUndoState();
      selectedIds.forEach(id => removeNode(id));
      setSelectedNodeId(null);
    }
  }, [nodes, storeSelectedNodeId, saveUndoState, removeNode]);

  // Handle copy
  const handleCopy = useCallback(() => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0 && storeSelectedNodeId) {
      selectedIds.push(storeSelectedNodeId);
    }
    if (selectedIds.length > 0) {
      copy(selectedIds, nodes, edges);
    }
  }, [nodes, edges, storeSelectedNodeId, copy]);

  // Handle cut
  const handleCut = useCallback(() => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0 && storeSelectedNodeId) {
      selectedIds.push(storeSelectedNodeId);
    }
    if (selectedIds.length > 0) {
      saveUndoState();
      const result = cut(selectedIds, nodes, edges);
      if (result) {
        result.nodeIdsToDelete.forEach(id => removeNode(id));
      }
      setSelectedNodeId(null);
    }
  }, [nodes, edges, storeSelectedNodeId, saveUndoState, cut, removeNode]);

  // Handle paste
  const handlePaste = useCallback(() => {
    const result = paste();
    if (result) {
      saveUndoState();
      // Deselect existing nodes
      const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));
      setNodes([...deselectedNodes, ...result.nodes]);
      setEdges([...edges, ...result.edges]);
    }
  }, [paste, saveUndoState, nodes, edges, setNodes, setEdges]);

  // Handle duplicate
  const handleDuplicate = useCallback(() => {
    const selectedIds = nodes.filter(n => n.selected).map(n => n.id);
    if (selectedIds.length === 0 && storeSelectedNodeId) {
      selectedIds.push(storeSelectedNodeId);
    }
    if (selectedIds.length > 0) {
      const result = duplicate(selectedIds, nodes, edges);
      if (result) {
        saveUndoState();
        // Deselect existing nodes
        const deselectedNodes = nodes.map(n => ({ ...n, selected: false }));
        setNodes([...deselectedNodes, ...result.nodes]);
        setEdges([...edges, ...result.edges]);
      }
    }
  }, [nodes, edges, storeSelectedNodeId, duplicate, saveUndoState, setNodes, setEdges]);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    setNodes(nodes.map(n => ({ ...n, selected: true })));
  }, [nodes, setNodes]);

  // Handle escape
  const handleEscape = useCallback(() => {
    selectNode(null);
    setSelectedNodeId(null);
    setNodes(nodes.map(n => ({ ...n, selected: false })));
  }, [selectNode, nodes, setNodes]);

  // Handle export
  const handleExport = useCallback(() => {
    const workflow = getCurrentWorkflow();
    if (!workflow) return;
    exportWorkflow(
      workflow.name,
      workflow.description || '',
      nodes,
      edges,
      {},
      currentWorkflowId || undefined
    );
  }, [getCurrentWorkflow, nodes, edges, currentWorkflowId]);

  // Handle import
  const handleImport = useCallback(async () => {
    try {
      const data = await triggerImport();
      const { nodes: newNodes, edges: newEdges } = regenerateIds(
        data.workflow.nodes,
        data.workflow.edges
      );
      
      // If no workflow, create one with imported name
      if (!currentWorkflowId) {
        const workflowData: WorkflowCreate = {
          name: data.workflow.name || 'Imported Workflow',
          description: data.workflow.description || '',
          nodes: newNodes,
          edges: newEdges,
        };
        await createWorkflow(workflowData);
      } else {
        // Add to existing workflow
        saveUndoState();
        setNodes([...nodes, ...newNodes]);
        setEdges([...edges, ...newEdges]);
      }
    } catch (error) {
      console.error('Import failed:', error);
      window.alert(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [currentWorkflowId, nodes, edges, saveUndoState, setNodes, setEdges, createWorkflow]);

  // Execution hook with node status callbacks
  const onNodeStatusChange = useCallback((nodeId: string, status: NodeExecutionStatus) => {
    updateNode(nodeId, { 
      data: { 
        ...nodes.find(n => n.id === nodeId)?.data,
        executionStatus: status 
      } as any
    });
  }, [nodes, updateNode]);

  const {
    execution,
    isExecuting,
    start: startExecution,
    pause: pauseExecution,
    resume: resumeExecution,
    cancel: cancelExecution,
    reset: resetExecution,
  } = useWorkflowExecution({
    onNodeStatusChange,
    onComplete: () => {
      // Clear node execution statuses after completion
      setTimeout(() => {
        nodes.forEach(node => {
          updateNode(node.id, {
            data: { ...node.data, executionStatus: undefined } as any
          });
        });
      }, 3000);
    },
  });

  const currentWorkflow = getCurrentWorkflow();

  // Reset execution state when switching workflows
  useEffect(() => {
    resetExecution();
    setShowExecutionOverlay(false);
  }, [currentWorkflowId, resetExecution]);

  // Handle save
  const handleSave = useCallback(async () => {
    try {
      await saveCurrentWorkflow();
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  }, [saveCurrentWorkflow]);

  // Handle execute
  const handleExecute = useCallback(async () => {
    if (!currentWorkflowId) return;
    
    try {
      // Save first
      await saveCurrentWorkflow();
      // Compile and validate
      const compileResult = await compileWorkflow(currentWorkflowId);
      if (!compileResult.valid) {
        window.alert(`Cannot execute - compilation errors:\n${compileResult.errors.map(e => e.message).join('\n')}`);
        return;
      }
      // Start execution - console is always visible
      await startExecution(currentWorkflowId);
      setShowExecutionOverlay(true);
      // Expand console if minimized
      if (isConsoleMinimized) {
        setIsConsoleMinimized(false);
        localStorage.setItem('flows-console-minimized', 'false');
      }
    } catch (error: any) {
      console.error('Execution failed:', error);
      window.alert(`Execution failed: ${error.message || 'Unknown error'}`);
    }
  }, [currentWorkflowId, saveCurrentWorkflow, compileWorkflow, startExecution, isConsoleMinimized]);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onSave: handleSave,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onDelete: handleDeleteSelected,
    onDuplicate: handleDuplicate,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onCut: handleCut,
    onSelectAll: handleSelectAll,
    onEscape: handleEscape,
    onRun: handleExecute,
    onZoomIn: () => {},  // Handled by React Flow
    onZoomOut: () => {}, // Handled by React Flow
    onFitView: () => {}, // Handled by React Flow
  });

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  // Clear history when workflow changes
  useEffect(() => {
    clearHistory();
  }, [currentWorkflowId, clearHistory]);

  // Handle create new workflow
  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) return;
    
    const data: WorkflowCreate = {
      name: newWorkflowName.trim(),
      description: '',
      nodes: [],
      edges: [],
    };
    
    try {
      await createWorkflow(data);
      setNewWorkflowName('');
      setShowNewWorkflowModal(false);
    } catch (error) {
      console.error('Failed to create workflow:', error);
    }
  };

  // Handle compile
  const handleCompile = async () => {
    if (!currentWorkflowId) return;
    
    try {
      const result = await compileWorkflow(currentWorkflowId);
      if (result.valid) {
        window.alert(`Workflow is valid! ${result.totalLevels} execution levels.`);
      } else {
        window.alert(`Compilation errors:\n${result.errors.map(e => e.message).join('\n')}`);
      }
    } catch (error) {
      console.error('Compile failed:', error);
    }
  };

  // Handle pause
  const handlePause = () => {
    if (!currentWorkflowId || !execution) return;
    pauseExecution(currentWorkflowId, execution.id);
  };

  // Handle resume
  const handleResume = () => {
    if (!currentWorkflowId || !execution) return;
    resumeExecution(currentWorkflowId, execution.id);
  };

  // Handle cancel
  const handleCancel = () => {
    if (!currentWorkflowId || !execution) return;
    cancelExecution(currentWorkflowId, execution.id);
  };

  // Handle delete workflow
  const handleDeleteWorkflow = async () => {
    if (!currentWorkflowId) return;
    if (!window.confirm('Delete this workflow?')) return;
    
    try {
      await deleteWorkflow(currentWorkflowId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Handle insert template
  const handleInsertTemplate = useCallback((
    templateNodes: Partial<WorkflowNode>[],
    templateEdges: Partial<WorkflowEdge>[]
  ) => {
    if (!currentWorkflowId) {
      window.alert('Please select or create a flow first');
      return;
    }

    saveUndoState();

    // Generate unique IDs for new nodes
    const nodeIdMap: Record<string, string> = {};
    const newNodes: WorkflowNode[] = templateNodes.map((node, idx) => {
      const newId = `template_${Date.now()}_${idx}`;
      nodeIdMap[String(idx + 1)] = newId;
      
      // Extract block type from node data or fallback
      const blockType = node.data?.type || 'control.start';
      const blockCategory = node.data?.category || 'control';
      
      return {
        id: newId,
        type: node.type || 'block',
        position: {
          x: (node.position?.x || 0) + 200, // Offset from existing nodes
          y: (node.position?.y || 0) + 100,
        },
        data: node.data || { 
          label: 'Block', 
          type: blockType as any,
          category: blockCategory as any,
          parameters: {} 
        },
        selected: false,
      };
    });

    // Map edge sources and targets to new IDs
    const newEdges: WorkflowEdge[] = templateEdges.map((edge, idx) => ({
      id: `edge_template_${Date.now()}_${idx}`,
      source: nodeIdMap[edge.source || '1'] || edge.source || '',
      target: nodeIdMap[edge.target || '2'] || edge.target || '',
      sourceHandle: edge.sourceHandle || 'out',
      targetHandle: edge.targetHandle || 'in',
      type: 'smoothstep',
    }));

    setNodes([...nodes, ...newNodes]);
    setEdges([...edges, ...newEdges]);
    
    // Mark tab as dirty
    if (currentWorkflowId) {
      markTabDirty(currentWorkflowId, true);
    }
  }, [currentWorkflowId, nodes, edges, saveUndoState, setNodes, setEdges, markTabDirty]);

  return (
    <div className="h-full flex flex-col bg-cyber-black">
      {/* Header */}
      <div className="p-4 border-b border-cyber-gray flex items-center justify-between">
        {/* Left: Title and Flow selector */}
        <div className="flex items-center gap-4">
          <CyberPageTitle color="purple">◇ FLOWS</CyberPageTitle>
          
          <select
            value={currentWorkflowId || ''}
            onChange={(e) => setCurrentWorkflow(e.target.value || null)}
            className="cyber-select min-w-[200px]"
          >
            <option value="">[ SELECT FLOW ]</option>
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          
          <CyberButton
            variant="green"
            size="sm"
            onClick={() => setShowNewWorkflowModal(true)}
          >
            + NEW
          </CyberButton>
          
          <CyberButton
            variant="gray"
            size="sm"
            onClick={handleImport}
          >
            ↓ IMPORT
          </CyberButton>
          
          <CyberButton
            variant={isTemplatesOpen ? 'purple' : 'gray'}
            size="sm"
            onClick={toggleTemplates}
          >
            ◈ TEMPLATES
          </CyberButton>
          
          {currentWorkflow && (
            <span className="text-cyber-gray-light text-sm font-mono">
              <span className="text-cyber-purple">{nodes.length}</span> nodes · 
              <span className="text-cyber-blue ml-1">{edges.length}</span> edges
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {currentWorkflow && (
            <>
              <CyberButton variant="gray" size="sm" onClick={handleExport}>
                ↑ EXPORT
              </CyberButton>
              
              <CyberButton variant="gray" size="sm" onClick={handleSave}>
                ◇ SAVE
              </CyberButton>
              
              <CyberButton variant="purple" size="sm" onClick={handleCompile}>
                ◈ VALIDATE
              </CyberButton>
              
              <CyberButton 
                variant="blue" 
                size="sm" 
                onClick={handleExecute}
                disabled={isExecuting}
              >
                {isExecuting ? '◎ RUNNING...' : '▶ EXECUTE'}
              </CyberButton>
              
              <CyberButton variant="red" size="sm" onClick={handleDeleteWorkflow}>
                ✕
              </CyberButton>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Flow Tabs */}
        {openTabs.length > 0 && (
          <FlowTabs
            tabs={openTabs}
            activeTabId={activeTabId}
            onSwitchTab={switchToTab}
            onCloseTab={closeTab}
          />
        )}

        {/* Canvas + Panels Row */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Palette */}
          <BlockPalette isOpen={isPaletteOpen} onToggle={togglePalette} />

          {/* Canvas Area - flex column to include shortcuts */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Canvas */}
            <div className="flex-1 relative bg-cyber-darker">
              {currentWorkflow ? (
                <WorkflowCanvas onNodeSelect={setSelectedNodeId} />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CyberCard className="p-8 text-center">
                    <div className="text-cyber-purple text-4xl mb-4">◇</div>
                    <h2 className="text-xl text-cyber-gray-light mb-4 font-mono">NO FLOW SELECTED</h2>
                    <CyberButton
                      variant="purple"
                      onClick={() => setShowNewWorkflowModal(true)}
                    >
                      + CREATE NEW FLOW
                    </CyberButton>
                  </CyberCard>
                </div>
              )}

              {/* Execution Overlay */}
              {showExecutionOverlay && (
                <ExecutionOverlay
                  execution={execution}
                  isExecuting={isExecuting}
                  onStart={handleExecute}
                  onPause={handlePause}
                  onResume={handleResume}
                  onCancel={handleCancel}
                  onClose={() => setShowExecutionOverlay(false)}
                />
              )}

              {/* Keyboard Shortcuts Legend */}
              <div className="absolute bottom-4 right-4 z-10">
                <div className="bg-cyber-darker/90 border border-cyber-gray/50 rounded px-3 py-2">
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {SHORTCUT_LEGEND.map((s, i) => (
                      <div key={i} className="flex items-center gap-1 text-xs">
                        <kbd className="px-1 py-0.5 bg-cyber-black border border-cyber-gray/40 rounded text-[10px] font-mono text-cyber-blue">
                          {s.keys}
                        </kbd>
                        <span className="text-cyber-gray-light">{s.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Execution Console - Always present, minimizable */}
            <ExecutionConsole
              execution={execution}
              isMinimized={isConsoleMinimized}
              onToggleMinimize={handleToggleConsole}
            />
          </div>

          {/* Right Config Panel */}
          {selectedNodeId && (
            <ConfigPanel 
              nodeId={selectedNodeId} 
              onClose={() => setSelectedNodeId(null)} 
            />
          )}

          {/* Right Templates Panel */}
          {!selectedNodeId && (
            <FlowTemplates
              isOpen={isTemplatesOpen}
              onClose={toggleTemplates}
              onInsertTemplate={handleInsertTemplate}
            />
          )}
        </div>
      </div>

      {/* New Workflow Modal */}
      {showNewWorkflowModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <CyberCard className="p-6 w-96 border-cyber-purple">
            <h3 className="text-lg font-mono text-cyber-purple mb-4 flex items-center gap-2">
              <span>◇</span> NEW FLOW
            </h3>
            
            <CyberInput
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Flow name..."
              className="w-full mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
            />
            
            <div className="flex justify-end gap-2">
              <CyberButton
                variant="gray"
                size="sm"
                onClick={() => {
                  setShowNewWorkflowModal(false);
                  setNewWorkflowName('');
                }}
              >
                CANCEL
              </CyberButton>
              <CyberButton
                variant="purple"
                size="sm"
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim()}
              >
                CREATE
              </CyberButton>
            </div>
          </CyberCard>
        </div>
      )}

      </div>
  );
};

export default WorkflowBuilder;
