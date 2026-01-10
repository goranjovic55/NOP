/**
 * WorkflowBuilder - Main workflow automation page
 * Visual canvas for building and executing automation workflows
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { WorkflowCanvas, BlockPalette, ConfigPanel } from '../components/workflow';
import ExecutionOverlay from '../components/workflow/ExecutionOverlay';
import { WorkflowCreate, NodeExecutionStatus } from '../types/workflow';
import { CyberCard, CyberButton, CyberInput, CyberPageTitle } from '../components/CyberUI';
import { useWorkflowExecution } from '../hooks/useWorkflowExecution';

const WorkflowBuilder: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [showExecutionOverlay, setShowExecutionOverlay] = useState(false);
  
  const {
    workflows,
    currentWorkflowId,
    nodes,
    edges,
    isPaletteOpen,
    loadWorkflows,
    createWorkflow,
    setCurrentWorkflow,
    deleteWorkflow,
    saveCurrentWorkflow,
    compileWorkflow,
    togglePalette,
    getCurrentWorkflow,
    updateNode,
  } = useWorkflowStore();

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

  // Load workflows on mount
  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const currentWorkflow = getCurrentWorkflow();

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

  // Handle save
  const handleSave = async () => {
    try {
      await saveCurrentWorkflow();
    } catch (error) {
      console.error('Failed to save workflow:', error);
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

  // Handle execute
  const handleExecute = async () => {
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
      // Start execution
      await startExecution(currentWorkflowId);
      setShowExecutionOverlay(true);
    } catch (error) {
      console.error('Execution failed:', error);
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

  // Handle delete
  const handleDelete = async () => {
    if (!currentWorkflowId) return;
    if (!window.confirm('Delete this workflow?')) return;
    
    try {
      await deleteWorkflow(currentWorkflowId);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-cyber-black">
      {/* Header */}
      <div className="p-4 border-b border-cyber-gray flex items-center justify-between">
        {/* Left: Title and Workflow selector */}
        <div className="flex items-center gap-4">
          <CyberPageTitle color="purple">◇ WORKFLOWS</CyberPageTitle>
          
          <select
            value={currentWorkflowId || ''}
            onChange={(e) => setCurrentWorkflow(e.target.value || null)}
            className="cyber-select min-w-[200px]"
          >
            <option value="">[ SELECT WORKFLOW ]</option>
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
              
              <CyberButton variant="red" size="sm" onClick={handleDelete}>
                ✕
              </CyberButton>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Palette */}
        <BlockPalette isOpen={isPaletteOpen} onToggle={togglePalette} />

        {/* Canvas */}
        <div className="flex-1 relative bg-cyber-darker">
          {currentWorkflow ? (
            <WorkflowCanvas onNodeSelect={setSelectedNodeId} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CyberCard className="p-8 text-center">
                <div className="text-cyber-purple text-4xl mb-4">◇</div>
                <h2 className="text-xl text-cyber-gray-light mb-4 font-mono">NO WORKFLOW SELECTED</h2>
                <CyberButton
                  variant="purple"
                  onClick={() => setShowNewWorkflowModal(true)}
                >
                  + CREATE NEW WORKFLOW
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
        </div>

        {/* Right Config Panel */}
        {selectedNodeId && (
          <ConfigPanel 
            nodeId={selectedNodeId} 
            onClose={() => setSelectedNodeId(null)} 
          />
        )}
      </div>

      {/* New Workflow Modal */}
      {showNewWorkflowModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <CyberCard className="p-6 w-96 border-cyber-purple">
            <h3 className="text-lg font-mono text-cyber-purple mb-4 flex items-center gap-2">
              <span>◇</span> NEW WORKFLOW
            </h3>
            
            <CyberInput
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Workflow name..."
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
