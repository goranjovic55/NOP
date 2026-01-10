/**
 * WorkflowBuilder - Main workflow automation page
 * Visual canvas for building and executing automation workflows
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../store/workflowStore';
import { WorkflowCanvas, BlockPalette, ConfigPanel } from '../components/workflow';
import { Workflow, WorkflowCreate } from '../types/workflow';

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
      // Show success toast (would need toast system)
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
        alert(`Workflow is valid! ${result.totalLevels} execution levels.`);
      } else {
        alert(`Compilation errors:\n${result.errors.map(e => e.message).join('\n')}`);
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
    <div className="h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="h-14 border-b border-gray-800 flex items-center justify-between px-4">
        {/* Left: Workflow selector */}
        <div className="flex items-center gap-4">
          <select
            value={currentWorkflowId || ''}
            onChange={(e) => setCurrentWorkflow(e.target.value || null)}
            className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          >
            <option value="">Select workflow...</option>
            {workflows.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
          
          <button
            onClick={() => setShowNewWorkflowModal(true)}
            className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
          >
            + New
          </button>
          
          {currentWorkflow && (
            <span className="text-gray-400 text-sm">
              {nodes.length} nodes, {edges.length} edges
            </span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {currentWorkflow && (
            <>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                💾 Save
              </button>
              
              <button
                onClick={handleCompile}
                className="px-3 py-1.5 bg-yellow-600 hover:bg-yellow-700 text-white text-sm rounded transition-colors"
              >
                ✓ Validate
              </button>
              
              <button
                onClick={handleExecute}
                disabled={isExecuting}
                className={`px-3 py-1.5 text-white text-sm rounded transition-colors ${
                  isExecuting 
                    ? 'bg-gray-600 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isExecuting ? '⏳ Running...' : '▶ Execute'}
              </button>
              
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
              >
                🗑
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Palette */}
        <BlockPalette isOpen={isPaletteOpen} onToggle={togglePalette} />

        {/* Canvas */}
        <div className="flex-1 relative">
          {currentWorkflow ? (
            <WorkflowCanvas onNodeSelect={setSelectedNodeId} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-xl text-gray-400 mb-4">No workflow selected</h2>
                <button
                  onClick={() => setShowNewWorkflowModal(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Create New Workflow
                </button>
              </div>
            </div>
          )}

          {/* Execution Progress Overlay */}
          {execution && isExecuting && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="animate-spin">⏳</span>
                <span className="text-white text-sm">
                  Executing... {execution.progress.completed}/{execution.progress.total}
                </span>
                <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${execution.progress.percentage}%` }}
                  />
                </div>
              </div>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">New Workflow</h3>
            
            <input
              type="text"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              placeholder="Workflow name..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateWorkflow()}
            />
            
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowNewWorkflowModal(false);
                  setNewWorkflowName('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateWorkflow}
                disabled={!newWorkflowName.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowBuilder;
