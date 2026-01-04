import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { useScriptStore, ScriptStep, ScriptTemplate, ScriptStepType } from '../store/scriptStore';
import { CyberPageTitle } from '../components/CyberUI';

const Scripts: React.FC = () => {
  const { token: _token } = useAuthStore();
  const {
    scripts,
    templates,
    activeScriptId,
    createScript,
    deleteScript,
    duplicateScript,
    startScript,
    pauseScript,
    resumeScript,
    stopScript,
    addStep: _addStep,
    removeStep,
    updateStep: _updateStep,
    moveStep,
    updateStepStatus,
    setCurrentStep,
    addOutput,
    clearOutput,
    setActiveScript,
    getActiveScript
  } = useScriptStore();

  const [view, setView] = useState<'list' | 'builder' | 'executor'>('list');
  const [selectedTemplate, setSelectedTemplate] = useState<ScriptTemplate | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [scriptName, setScriptName] = useState('');
  const [scriptDescription, setScriptDescription] = useState('');
  const [editingStep, setEditingStep] = useState<ScriptStep | null>(null);
  const [showStepEditor, setShowStepEditor] = useState(false);
  
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scripts]);

  const activeScript = getActiveScript();

  const handleCreateScript = (template?: ScriptTemplate) => {
    const name = scriptName || (template ? template.name : 'New Script');
    const description = scriptDescription || (template ? template.description : '');
    
    createScript(name, description, template);
    setScriptName('');
    setScriptDescription('');
    setShowTemplateModal(false);
    setView('builder');
  };

  const handleExecuteScript = async (scriptId: string) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    setActiveScript(scriptId);
    setView('executor');
    startScript(scriptId);
    clearOutput(scriptId);
    addOutput(scriptId, `[*] Starting script: ${script.name}`);
    addOutput(scriptId, `[*] Total steps: ${script.steps.length}`);

    for (let i = 0; i < script.steps.length; i++) {
      const step = script.steps[i];
      setCurrentStep(scriptId, i);
      updateStepStatus(scriptId, step.id, 'running');
      addOutput(scriptId, `\n[${i + 1}/${script.steps.length}] ${step.name}`);

      try {
        const result = await executeStep(step);
        updateStepStatus(scriptId, step.id, 'completed', result.output);
        addOutput(scriptId, `[+] ${result.output}`);
      } catch (error: any) {
        updateStepStatus(scriptId, step.id, 'failed', undefined, error.message);
        addOutput(scriptId, `[-] ERROR: ${error.message}`);
        addOutput(scriptId, `[!] Script execution stopped due to error`);
        stopScript(scriptId);
        return;
      }
    }

    addOutput(scriptId, `\n[+] Script completed successfully`);
    stopScript(scriptId);
  };

  const executeStep = async (step: ScriptStep): Promise<{ output: string }> => {
    // Simulate execution for now - replace with actual API calls
    await new Promise(resolve => setTimeout(resolve, 1000));

    switch (step.type) {
      case 'login_ssh':
        return { output: `Connected to ${step.params.target || 'target'} via SSH` };
      case 'login_rdp':
        return { output: `Connected to ${step.params.target || 'target'} via RDP` };
      case 'login_vnc':
        return { output: `Connected to ${step.params.target || 'target'} via VNC` };
      case 'port_scan':
        return { output: `Scanned ports ${step.params.ports} on ${step.params.target}. Found 5 open ports.` };
      case 'vuln_scan':
        return { output: `Vulnerability scan completed. Found 2 vulnerabilities.` };
      case 'exploit':
        return { output: `Exploit executed successfully. Shell session opened.` };
      case 'command':
        return { output: `Command executed: ${step.params.command}` };
      case 'ping_test':
        return { output: `Ping test completed. All targets reachable.` };
      case 'port_disable':
        return { output: `Port ${step.params.port} disabled` };
      case 'port_enable':
        return { output: `Port ${step.params.port} enabled` };
      case 'delay':
        await new Promise(resolve => setTimeout(resolve, (step.params.seconds || 5) * 1000));
        return { output: `Waited ${step.params.seconds || 5} seconds` };
      case 'agent_download':
        return { output: `NOP agent downloaded from ${step.params.url}` };
      case 'agent_execute':
        return { output: `NOP agent started with args: ${step.params.args}` };
      default:
        return { output: 'Step completed' };
    }
  };

  const getStepIcon = (type: ScriptStepType) => {
    const icons: Record<ScriptStepType, string> = {
      login_ssh: '◈',
      login_rdp: '◈',
      login_vnc: '◈',
      port_scan: '◉',
      vuln_scan: '⬢',
      exploit: '◆',
      command: '▶',
      ping_test: '◎',
      port_disable: '◐',
      port_enable: '◑',
      delay: '⏱',
      agent_download: '⬇',
      agent_execute: '▣'
    };
    return icons[type] || '◈';
  };

  const getStepColor = (status: ScriptStep['status']) => {
    const colors = {
      pending: 'text-cyber-gray',
      running: 'text-cyber-blue animate-pulse',
      completed: 'text-cyber-green',
      failed: 'text-cyber-red',
      skipped: 'text-cyber-gray-light'
    };
    return colors[status] || 'text-cyber-gray';
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      network: 'border-cyber-blue text-cyber-blue',
      security: 'border-cyber-red text-cyber-red',
      automation: 'border-cyber-purple text-cyber-purple'
    };
    return colors[category as keyof typeof colors] || 'border-cyber-gray text-cyber-gray';
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <CyberPageTitle color="purple" className="flex items-center">
            <span className="mr-3 text-3xl">◈</span>
            Automation Scripts
          </CyberPageTitle>
          <p className="text-cyber-gray-light text-sm mt-1">Create and execute automated workflows</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setView('list');
              setActiveScript(null);
            }}
            className={`btn-cyber px-4 py-2 ${view === 'list' ? 'border-cyber-purple text-cyber-purple bg-cyber-purple bg-opacity-10' : 'border-cyber-gray text-cyber-gray hover:border-cyber-purple hover:text-cyber-purple'}`}
          >
            <span className="text-lg mr-1">◉</span> Scripts
          </button>
          {activeScript && (
            <>
              <button
                onClick={() => setView('builder')}
                className={`btn-cyber px-4 py-2 ${view === 'builder' ? 'border-cyber-blue text-cyber-blue bg-cyber-blue bg-opacity-10' : 'border-cyber-gray text-cyber-gray hover:border-cyber-blue hover:text-cyber-blue'}`}
              >
                <span className="text-lg mr-1">◈</span> Builder
              </button>
              <button
                onClick={() => setView('executor')}
                className={`btn-cyber px-4 py-2 ${view === 'executor' ? 'border-cyber-green text-cyber-green bg-cyber-green bg-opacity-10' : 'border-cyber-gray text-cyber-gray hover:border-cyber-green hover:text-cyber-green'}`}
              >
                <span className="text-lg mr-1">▶</span> Executor
              </button>
            </>
          )}
          <button
            onClick={() => setShowTemplateModal(true)}
            className="btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black px-4 py-2 font-bold"
          >
            <span className="text-lg mr-1">⊞</span> New Script
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 bg-cyber-darker border border-cyber-gray rounded-lg overflow-hidden">
        {/* Scripts List View */}
        {view === 'list' && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
              <h3 className="text-cyber-purple font-bold uppercase text-sm flex items-center">
                <span className="mr-2">◈</span>
                My Scripts ({scripts.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto">
              {scripts.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-6xl mb-4 opacity-20">◈</div>
                    <p className="text-cyber-gray-light">No scripts created yet</p>
                    <p className="text-xs text-cyber-gray mt-2">Click "New Script" to get started</p>
                  </div>
                </div>
              ) : (
                <div className="divide-y divide-cyber-gray">
                  {scripts.map(script => (
                    <div
                      key={script.id}
                      onClick={() => {
                        setActiveScript(script.id);
                        setView('builder');
                      }}
                      className={`p-4 cursor-pointer transition-all ${
                        activeScriptId === script.id
                          ? 'bg-cyber-darker border-l-4 border-cyber-purple'
                          : 'border-l-2 border-transparent hover:bg-cyber-dark hover:border-cyber-blue'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="text-cyber-blue font-bold text-sm">{script.name}</h4>
                            <span className={`px-2 py-0.5 text-xs border rounded ${
                              script.status === 'running' ? 'border-cyber-green text-cyber-green animate-pulse' :
                              script.status === 'completed' ? 'border-cyber-green text-cyber-green' :
                              script.status === 'failed' ? 'border-cyber-red text-cyber-red' :
                              script.status === 'paused' ? 'border-cyber-blue text-cyber-blue' :
                              'border-cyber-gray text-cyber-gray'
                            }`}>
                              {script.status.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-cyber-gray-light text-xs mb-2">{script.description}</p>
                          <div className="flex items-center space-x-4 text-xs">
                            <span className="text-cyber-gray-light">
                              Steps: <span className="text-cyber-purple font-bold">{script.steps.length}</span>
                            </span>
                            <span className="text-cyber-gray-light">
                              Created: <span className="text-cyber-blue">{script.createdAt.toLocaleDateString()}</span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteScript(script.id);
                            }}
                            disabled={script.status === 'running' || script.steps.length === 0}
                            className="btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black px-3 py-1 text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ▶ Run
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateScript(script.id);
                            }}
                            className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black px-3 py-1 text-xs"
                          >
                            ⧉ Copy
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Delete script "${script.name}"?`)) {
                                deleteScript(script.id);
                              }
                            }}
                            className="btn-cyber border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black px-3 py-1 text-xs"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Builder View */}
        {view === 'builder' && activeScript && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-cyber-blue font-bold text-sm">{activeScript.name}</h3>
                  <p className="text-cyber-gray-light text-xs mt-1">{activeScript.description}</p>
                </div>
                <button
                  onClick={() => setShowStepEditor(true)}
                  className="btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black px-3 py-1 text-sm font-bold"
                >
                  <span className="mr-1">⊞</span> Add Step
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto p-4 space-y-2">
              {activeScript.steps.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="text-4xl mb-2 opacity-20">◈</div>
                    <p className="text-cyber-gray-light text-sm">No steps added yet</p>
                    <p className="text-xs text-cyber-gray mt-2">Click "Add Step" to build your script</p>
                  </div>
                </div>
              ) : (
                activeScript.steps.map((step, index) => (
                  <div
                    key={step.id}
                    className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-purple transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-cyber-gray-light text-xs font-mono">#{index + 1}</span>
                        <span className={`text-lg ${getStepColor(step.status)}`}>
                          {getStepIcon(step.type)}
                        </span>
                        <div className="flex-1">
                          <div className="text-white font-semibold text-sm">{step.name}</div>
                          <div className="text-cyber-gray-light text-xs font-mono">{step.type}</div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => moveStep(activeScript.id, step.id, 'up')}
                          disabled={index === 0}
                          className="btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-blue hover:text-cyber-blue px-2 py-1 text-xs disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => moveStep(activeScript.id, step.id, 'down')}
                          disabled={index === activeScript.steps.length - 1}
                          className="btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-blue hover:text-cyber-blue px-2 py-1 text-xs disabled:opacity-30"
                        >
                          ▼
                        </button>
                        <button
                          onClick={() => {
                            setEditingStep(step);
                            setShowStepEditor(true);
                          }}
                          className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black px-2 py-1 text-xs"
                        >
                          ✎
                        </button>
                        <button
                          onClick={() => removeStep(activeScript.id, step.id)}
                          className="btn-cyber border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black px-2 py-1 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Executor View */}
        {view === 'executor' && activeScript && (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-cyber-green font-bold uppercase text-sm flex items-center">
                    <span className="mr-2">▣</span>
                    Script Executor
                  </h3>
                  <p className="text-xs text-cyber-blue mt-1">
                    {activeScript.name} - Step {activeScript.currentStepIndex + 1}/{activeScript.steps.length}
                  </p>
                </div>
                <div className="flex space-x-2">
                  {activeScript.status === 'running' && (
                    <button
                      onClick={() => pauseScript(activeScript.id)}
                      className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black px-3 py-1 text-sm"
                    >
                      ⏸ Pause
                    </button>
                  )}
                  {activeScript.status === 'paused' && (
                    <button
                      onClick={() => resumeScript(activeScript.id)}
                      className="btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black px-3 py-1 text-sm"
                    >
                      ▶ Resume
                    </button>
                  )}
                  <button
                    onClick={() => handleExecuteScript(activeScript.id)}
                    disabled={activeScript.status === 'running'}
                    className="btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black px-3 py-1 text-sm font-bold disabled:opacity-50"
                  >
                    ▶ Run
                  </button>
                  <button
                    onClick={() => clearOutput(activeScript.id)}
                    className="btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-red hover:text-cyber-red px-3 py-1 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 flex flex-col bg-black text-green-500 font-mono p-4 text-sm overflow-auto">
              {activeScript.outputs.map((line, i) => (
                <div key={i} className="whitespace-pre-wrap break-all">
                  {line.startsWith('[+]') && <span className="text-cyber-green">{line}</span>}
                  {line.startsWith('[*]') && <span className="text-cyber-blue">{line}</span>}
                  {line.startsWith('[-]') && <span className="text-cyber-red">{line}</span>}
                  {line.startsWith('[!]') && <span className="text-cyber-red font-bold">{line}</span>}
                  {!line.startsWith('[') && <span>{line}</span>}
                </div>
              ))}
              <div ref={outputEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Template Selection Modal */}
      {showTemplateModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowTemplateModal(false)}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-darker border border-cyber-purple rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-cyber-purple bg-cyber-dark">
                <h3 className="text-cyber-purple font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◈</span>
                  Create New Script
                </h3>
              </div>
              
              <div className="p-6 overflow-auto max-h-[calc(90vh-8rem)]">
                <div className="mb-6">
                  <label className="block text-cyber-blue text-sm mb-2">Script Name</label>
                  <input
                    type="text"
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    className="w-full bg-cyber-dark border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-purple outline-none"
                    placeholder="Enter script name..."
                  />
                </div>
                
                <div className="mb-6">
                  <label className="block text-cyber-blue text-sm mb-2">Description</label>
                  <textarea
                    value={scriptDescription}
                    onChange={(e) => setScriptDescription(e.target.value)}
                    className="w-full bg-cyber-dark border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-purple outline-none"
                    rows={3}
                    placeholder="Enter description..."
                  />
                </div>
                
                <div className="mb-4">
                  <h4 className="text-cyber-blue text-sm mb-3">Choose a Template</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {templates.map(template => (
                      <div
                        key={template.id}
                        onClick={() => {
                          setSelectedTemplate(template);
                          if (!scriptName) setScriptName(template.name);
                          if (!scriptDescription) setScriptDescription(template.description);
                        }}
                        className={`p-4 border rounded cursor-pointer transition-all ${
                          selectedTemplate?.id === template.id
                            ? 'border-cyber-purple bg-cyber-purple bg-opacity-10'
                            : 'border-cyber-gray hover:border-cyber-blue bg-cyber-dark'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="text-white font-bold text-sm">{template.name}</h5>
                          <span className={`px-2 py-0.5 text-xs border rounded ${getCategoryColor(template.category)}`}>
                            {template.category}
                          </span>
                        </div>
                        <p className="text-cyber-gray-light text-xs mb-2">{template.description}</p>
                        <div className="text-cyber-gray text-xs">
                          {template.steps.length} steps
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-cyber-gray bg-cyber-dark flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setShowTemplateModal(false);
                    setSelectedTemplate(null);
                    setScriptName('');
                    setScriptDescription('');
                  }}
                  className="btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-red hover:text-cyber-red px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleCreateScript(selectedTemplate || undefined)}
                  className="btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black px-4 py-2 font-bold"
                >
                  Create Script
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Step Editor Modal */}
      {showStepEditor && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowStepEditor(false);
              setEditingStep(null);
            }}
          />
          
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-cyber-darker border border-cyber-blue rounded-lg w-full max-w-2xl">
              <div className="p-4 border-b border-cyber-blue bg-cyber-dark">
                <h3 className="text-cyber-blue font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◈</span>
                  {editingStep ? 'Edit Step' : 'Add Step'}
                </h3>
              </div>
              
              <div className="p-6">
                <p className="text-cyber-gray-light text-sm mb-4">
                  Step editor coming soon. For now, use the predefined templates.
                </p>
              </div>
              
              <div className="p-4 border-t border-cyber-gray bg-cyber-dark flex justify-end">
                <button
                  onClick={() => {
                    setShowStepEditor(false);
                    setEditingStep(null);
                  }}
                  className="btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-red hover:text-cyber-red px-4 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Scripts;
