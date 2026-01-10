/**
 * WorkflowBuilder - Main workflow automation page
 * Visual canvas for building and executing automation workflows
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { WorkflowCanvas, BlockPalette, ConfigPanel } from '../components/workflow';
import { WorkflowCreate } from '../types/workflow';
import { CyberCard, CyberButton, CyberInput, CyberPageTitle } from '../components/CyberUI';

const WorkflowBuilder: React.FC = () => {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showNewWorkflowModal, setShowNewWorkflowModal] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  
  const {
    workflows,
    currentWorkflowId,
    nodes,
    edges,
    isPaletteOpen,
    isExecuting,
    execution,
    loadWorkflows,
    createWorkflow,
    setCurrentWorkflow,
    deleteWorkflow,
    saveCurrentWorkflow,
    compileWorkflow,
    executeWorkflow,
    togglePalette,
    getCurrentWorkflow,
  } = useWorkflowStore();

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
      await executeWorkflow(currentWorkflowId);
    } catch (error) {
      console.error('Execution failed:', error);
    }
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

          {/* Execution Progress Overlay */}
          {execution && isExecuting && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
              <CyberCard className="px-6 py-3 border-cyber-purple">
                <div className="flex items-center gap-4">
                  <span className="text-cyber-purple animate-pulse">◎</span>
                  <span className="text-cyber-gray-light text-sm font-mono">
                    EXECUTING... {execution.progress.completed}/{execution.progress.total}
                  </span>
                  <div className="w-32 h-2 bg-cyber-dark border border-cyber-gray overflow-hidden">
                    <div 
                      className="h-full bg-cyber-purple transition-all"
                      style={{ width: `${execution.progress.percentage}%` }}
                    />
                  </div>
                </div>
              </CyberCard>
            </div>
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
