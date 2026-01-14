/**
 * WorkflowSettingsModal - Configure workflow settings and variables
 * 
 * Features:
 * - General settings (name, description, category)
 * - Workflow variables (define reusable variables)
 * - Execution settings (timeout, error handling)
 * - Extensible tabs for future workflow types
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { WorkflowVariable, WorkflowSettings, ErrorHandlingMode } from '../../types/workflow';
import { CyberButton } from '../CyberUI';

type VariableType = 'string' | 'number' | 'boolean' | 'array' | 'object';

interface WorkflowSettingsModalProps {
  workflowId: string;
  isOpen: boolean;
  onClose: () => void;
}

type TabId = 'general' | 'variables' | 'execution' | 'triggers';

const WorkflowSettingsModal: React.FC<WorkflowSettingsModalProps> = ({
  workflowId,
  isOpen,
  onClose,
}) => {
  const { workflows, updateWorkflow } = useWorkflowStore();
  const workflow = workflows.find(w => w.id === workflowId);

  const [activeTab, setActiveTab] = useState<TabId>('variables');
  const [isSaving, setIsSaving] = useState(false);

  // Local state for editing
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [variables, setVariables] = useState<WorkflowVariable[]>([]);
  const [settings, setSettings] = useState<WorkflowSettings>({
    timeout: 300000,
    onError: 'stop',
    maxParallel: 5,
  });

  // Initialize from workflow
  useEffect(() => {
    if (workflow) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setCategory(workflow.category || '');
      setTags(workflow.tags || []);
      setVariables(workflow.variables || []);
      setSettings(workflow.settings || { timeout: 300000, onError: 'stop', maxParallel: 5 });
    }
  }, [workflow]);

  // Check if there are unsaved changes
  const hasChanges = useMemo(() => {
    if (!workflow) return false;
    return (
      name !== workflow.name ||
      description !== (workflow.description || '') ||
      category !== (workflow.category || '') ||
      JSON.stringify(tags) !== JSON.stringify(workflow.tags || []) ||
      JSON.stringify(variables) !== JSON.stringify(workflow.variables || []) ||
      JSON.stringify(settings) !== JSON.stringify(workflow.settings)
    );
  }, [workflow, name, description, category, tags, variables, settings]);

  if (!isOpen || !workflow) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateWorkflow(workflowId, {
        name,
        description,
        category,
        tags,
        variables,
        settings,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save workflow settings:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const addVariable = () => {
    setVariables([
      ...variables,
      { name: '', type: 'string', default: '' },
    ]);
  };

  const updateVariable = (index: number, field: keyof WorkflowVariable, value: any) => {
    const updated = [...variables];
    updated[index] = { ...updated[index], [field]: value };
    setVariables(updated);
  };

  const removeVariable = (index: number) => {
    setVariables(variables.filter((_, i) => i !== index));
  };

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'general', label: 'GENERAL', icon: '◇' },
    { id: 'variables', label: 'VARIABLES', icon: '◈' },
    { id: 'execution', label: 'EXECUTION', icon: '▶' },
    { id: 'triggers', label: 'TRIGGERS', icon: '⚡' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="bg-cyber-darker border border-cyber-purple rounded-lg shadow-2xl w-[700px] max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-gray bg-cyber-dark">
          <div className="flex items-center gap-3">
            <span className="text-cyber-purple text-xl">⚙</span>
            <h2 className="text-lg font-mono text-cyber-purple">WORKFLOW SETTINGS</h2>
            <span className="text-xs font-mono text-cyber-gray-light px-2 py-0.5 bg-cyber-gray/20 rounded">
              {workflow.name}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-cyber-gray-light hover:text-cyber-red text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyber-gray bg-cyber-dark/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-mono transition-colors ${
                activeTab === tab.id
                  ? 'text-cyber-purple border-b-2 border-cyber-purple bg-cyber-purple/10'
                  : 'text-cyber-gray-light hover:text-white hover:bg-cyber-gray/10'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 cyber-scrollbar">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                  NAME <span className="text-cyber-red">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="cyber-input w-full"
                  placeholder="Workflow name..."
                />
              </div>

              <div>
                <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                  DESCRIPTION
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="cyber-input w-full resize-none"
                  rows={3}
                  placeholder="What does this workflow do?"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                    CATEGORY
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="cyber-select w-full"
                  >
                    <option value="">[ SELECT ]</option>
                    <option value="network">Network Operations</option>
                    <option value="security">Security Audit</option>
                    <option value="monitoring">Monitoring</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="discovery">Discovery</option>
                    <option value="automation">Automation</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                    TAGS
                  </label>
                  <input
                    type="text"
                    value={tags.join(', ')}
                    onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    className="cyber-input w-full"
                    placeholder="tag1, tag2, tag3..."
                  />
                </div>
              </div>
            </div>
          )}

          {/* Variables Tab */}
          {activeTab === 'variables' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-mono text-cyber-blue">WORKFLOW VARIABLES</h3>
                  <p className="text-xs text-cyber-gray-light mt-1">
                    Define variables accessible via {'{{ $vars.name }}'} syntax
                  </p>
                </div>
                <CyberButton variant="green" size="sm" onClick={addVariable}>
                  + ADD VARIABLE
                </CyberButton>
              </div>

              {variables.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-cyber-gray rounded">
                  <p className="text-cyber-gray-light font-mono text-sm mb-2">No variables defined</p>
                  <p className="text-cyber-gray text-xs">
                    Add variables to use across all blocks in this workflow
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 px-2 text-xs font-mono text-cyber-gray-light">
                    <div className="col-span-4">NAME</div>
                    <div className="col-span-2">TYPE</div>
                    <div className="col-span-5">DEFAULT VALUE</div>
                    <div className="col-span-1"></div>
                  </div>

                  {/* Variables */}
                  {variables.map((variable, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-12 gap-2 p-2 bg-cyber-dark rounded border border-cyber-gray/30 hover:border-cyber-purple/30 transition-colors"
                    >
                      <div className="col-span-4">
                        <input
                          type="text"
                          value={variable.name}
                          onChange={(e) => updateVariable(index, 'name', e.target.value)}
                          className="cyber-input w-full text-sm"
                          placeholder="variableName"
                        />
                      </div>
                      <div className="col-span-2">
                        <select
                          value={variable.type}
                          onChange={(e) => updateVariable(index, 'type', e.target.value as VariableType)}
                          className="cyber-select w-full text-sm"
                        >
                          <option value="string">String</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="array">Array</option>
                          <option value="object">Object</option>
                        </select>
                      </div>
                      <div className="col-span-5">
                        {variable.type === 'boolean' ? (
                          <select
                            value={variable.default === true ? 'true' : 'false'}
                            onChange={(e) => updateVariable(index, 'default', e.target.value === 'true')}
                            className="cyber-select w-full text-sm"
                          >
                            <option value="true">true</option>
                            <option value="false">false</option>
                          </select>
                        ) : variable.type === 'number' ? (
                          <input
                            type="number"
                            value={variable.default ?? ''}
                            onChange={(e) => updateVariable(index, 'default', e.target.value ? Number(e.target.value) : undefined)}
                            className="cyber-input w-full text-sm"
                            placeholder="0"
                          />
                        ) : variable.type === 'array' || variable.type === 'object' ? (
                          <input
                            type="text"
                            value={typeof variable.default === 'object' ? JSON.stringify(variable.default) : variable.default ?? ''}
                            onChange={(e) => {
                              try {
                                updateVariable(index, 'default', JSON.parse(e.target.value));
                              } catch {
                                updateVariable(index, 'default', e.target.value);
                              }
                            }}
                            className="cyber-input w-full text-sm"
                            placeholder={variable.type === 'array' ? '["item1", "item2"]' : '{"key": "value"}'}
                          />
                        ) : (
                          <input
                            type="text"
                            value={variable.default ?? ''}
                            onChange={(e) => updateVariable(index, 'default', e.target.value)}
                            className="cyber-input w-full text-sm"
                            placeholder="default value"
                          />
                        )}
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => removeVariable(index)}
                          className="text-cyber-gray-light hover:text-cyber-red transition-colors p-1"
                          title="Remove variable"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Usage hint */}
              {variables.length > 0 && (
                <div className="mt-4 p-3 bg-cyber-purple/10 border border-cyber-purple/30 rounded">
                  <h4 className="text-xs font-mono text-cyber-purple mb-2">USAGE:</h4>
                  <div className="text-xs font-mono text-cyber-gray-light space-y-1">
                    {variables.filter(v => v.name).slice(0, 3).map((v, i) => (
                      <div key={i}>
                        <span className="text-cyber-blue">{'{{ $vars.'}{v.name}{' }}'}</span>
                        <span className="text-cyber-gray ml-2">→ {v.type}</span>
                        {v.default !== undefined && v.default !== '' && (
                          <span className="text-cyber-green ml-2">(default: {JSON.stringify(v.default)})</span>
                        )}
                      </div>
                    ))}
                    {variables.filter(v => v.name).length > 3 && (
                      <div className="text-cyber-gray">... and {variables.filter(v => v.name).length - 3} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Execution Tab */}
          {activeTab === 'execution' && (
            <div className="space-y-4">
              <h3 className="text-sm font-mono text-cyber-blue mb-4">EXECUTION SETTINGS</h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                    TIMEOUT (ms)
                  </label>
                  <input
                    type="number"
                    value={settings.timeout}
                    onChange={(e) => setSettings({ ...settings, timeout: Number(e.target.value) })}
                    className="cyber-input w-full"
                    min={1000}
                    step={1000}
                  />
                  <p className="text-xs text-cyber-gray mt-1">
                    {Math.floor(settings.timeout / 60000)}m {Math.floor((settings.timeout % 60000) / 1000)}s
                  </p>
                </div>

                <div>
                  <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                    MAX PARALLEL EXECUTIONS
                  </label>
                  <input
                    type="number"
                    value={settings.maxParallel}
                    onChange={(e) => setSettings({ ...settings, maxParallel: Number(e.target.value) })}
                    className="cyber-input w-full"
                    min={1}
                    max={50}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
                  ON ERROR BEHAVIOR
                </label>
                <div className="flex gap-2">
                  {(['stop', 'continue', 'skip-branch'] as ErrorHandlingMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setSettings({ ...settings, onError: mode })}
                      className={`flex-1 px-3 py-2 text-sm font-mono rounded transition-colors ${
                        settings.onError === mode
                          ? 'bg-cyber-purple text-white'
                          : 'bg-cyber-dark text-cyber-gray-light border border-cyber-gray hover:border-cyber-purple'
                      }`}
                    >
                      {mode.toUpperCase().replace('-', ' ')}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-cyber-gray mt-2">
                  {settings.onError === 'stop' && 'Stop workflow execution on first error'}
                  {settings.onError === 'continue' && 'Continue executing remaining blocks even if one fails'}
                  {settings.onError === 'skip-branch' && 'Skip the current branch on error, continue others'}
                </p>
              </div>
            </div>
          )}

          {/* Triggers Tab */}
          {activeTab === 'triggers' && (
            <div className="space-y-4">
              <h3 className="text-sm font-mono text-cyber-blue mb-4">WORKFLOW TRIGGERS</h3>

              <div className="text-center py-8 border border-dashed border-cyber-gray rounded">
                <span className="text-3xl mb-2 block">⚡</span>
                <p className="text-cyber-gray-light font-mono text-sm mb-2">Coming Soon</p>
                <p className="text-cyber-gray text-xs">
                  Schedule workflows, trigger on events, or integrate with external systems
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-cyber-dark/50 border border-cyber-gray/30 rounded opacity-50">
                  <h4 className="text-xs font-mono text-cyber-gray-light mb-1">⏰ SCHEDULE</h4>
                  <p className="text-[10px] text-cyber-gray">Run on cron schedule</p>
                </div>
                <div className="p-3 bg-cyber-dark/50 border border-cyber-gray/30 rounded opacity-50">
                  <h4 className="text-xs font-mono text-cyber-gray-light mb-1">🔔 EVENT</h4>
                  <p className="text-[10px] text-cyber-gray">Trigger on system events</p>
                </div>
                <div className="p-3 bg-cyber-dark/50 border border-cyber-gray/30 rounded opacity-50">
                  <h4 className="text-xs font-mono text-cyber-gray-light mb-1">🌐 WEBHOOK</h4>
                  <p className="text-[10px] text-cyber-gray">HTTP endpoint trigger</p>
                </div>
                <div className="p-3 bg-cyber-dark/50 border border-cyber-gray/30 rounded opacity-50">
                  <h4 className="text-xs font-mono text-cyber-gray-light mb-1">📡 ALERT</h4>
                  <p className="text-[10px] text-cyber-gray">Trigger on monitoring alerts</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-cyber-gray bg-cyber-dark">
          <div className="text-xs font-mono text-cyber-gray-light">
            {hasChanges && (
              <span className="text-cyber-orange">● Unsaved changes</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CyberButton variant="gray" onClick={onClose}>
              CANCEL
            </CyberButton>
            <CyberButton
              variant="purple"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving ? '◎ SAVING...' : '◇ SAVE SETTINGS'}
            </CyberButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowSettingsModal;
