/**
 * ConfigPanel - Cyberpunk-styled right sidebar for node configuration
 * Phase 3: Added credential selector support
 * Phase 4: Added execution results display with loop iteration tracking
 * Phase 5: Added dynamic dropdowns for IPs, ports, and credentials from NOP data
 * Phase 6: Added "Run Single Block" with manual input injection
 * Phase 7: Added Variable Picker for block-to-block parameter passing
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { getBlockDefinition, CATEGORY_COLORS, validateBlockParameters } from '../../types/blocks';
import { ParameterDefinition, NodeResult } from '../../types/workflow';
import { CyberButton } from '../CyberUI';
import DynamicDropdown from './DynamicDropdown';
import VariableInput from './VariableInput';

// Extended result type for loop iterations
interface IterationResult {
  iteration: number;
  success: boolean;
  output?: any;
  error?: string;
  completedAt?: string;
}

interface ExtendedNodeResult extends NodeResult {
  iterations?: IterationResult[];
}

interface VaultCredential {
  id: string;
  name: string;
  host: string;
  protocol: string;
  username: string;
}

interface BlockExecuteResponse {
  success: boolean;
  output?: any;
  error?: string;
  duration_ms?: number;
  route?: string;
}

interface ConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, edges, updateNode, execution, saveCurrentWorkflow, addConsoleLog } = useWorkflowStore();
  const [localParams, setLocalParams] = useState<Record<string, any>>({});
  const [localLabel, setLocalLabel] = useState('');
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(true);
  
  // Single block execution state
  const [isRunningBlock, setIsRunningBlock] = useState(false);
  const [blockResult, setBlockResult] = useState<BlockExecuteResponse | null>(null);
  const [showInputInjection, setShowInputInjection] = useState(false);
  const [injectedInput, setInjectedInput] = useState<string>('');
  const [inputSource, setInputSource] = useState<'none' | 'previous' | 'manual'>('none');

  const node = nodes.find(n => n.id === nodeId);
  const definition = node ? getBlockDefinition(node.data.type) : null;
  const categoryColor = node ? CATEGORY_COLORS[node.data.category] : '#8b5cf6';
  
  // Get execution result for this node
  const nodeResult = execution?.nodeResults?.[nodeId || ''] as ExtendedNodeResult | undefined;
  const nodeStatus = execution?.nodeStatuses?.[nodeId || ''];
  
  // Find previous block(s) connected to this node
  const getPreviousBlocks = () => {
    if (!nodeId) return [];
    const incomingEdges = edges.filter(e => e.target === nodeId);
    return incomingEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const sourceResult = execution?.nodeResults?.[edge.source];
      return {
        nodeId: edge.source,
        label: sourceNode?.data.label || 'Unknown',
        output: sourceResult?.output,
        hasOutput: !!sourceResult?.output
      };
    });
  };
  
  const previousBlocks = getPreviousBlocks();

  // Load credentials from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('vaultCredentials');
      if (stored) {
        setCredentials(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load credentials', e);
    }
  }, []);

  // Sync local state when node changes
  useEffect(() => {
    if (node) {
      setLocalParams(node.data.parameters || {});
      setLocalLabel(node.data.label);
      setValidationErrors([]);
      setBlockResult(null);
      setInjectedInput('');
      setInputSource('none');
    }
  }, [node]);

  // Run single block with optional input injection
  const runSingleBlock = async () => {
    if (!node) return;
    
    // Capture current parameters BEFORE any async operations or state updates
    const paramsToUse = { ...localParams };
    const labelToUse = localLabel;
    const blockType = node.data.type;
    
    // Validate before running
    const result = validateBlockParameters(blockType, paramsToUse);
    if (!result.valid) {
      setValidationErrors(result.errors);
      setBlockResult({
        success: false,
        error: `Validation failed: ${result.errors.join(', ')}`,
      });
      addConsoleLog({
        nodeId: nodeId!,
        nodeLabel: labelToUse,
        type: 'error',
        message: `Validation failed: ${result.errors.join(', ')}`,
      });
      return;
    }
    
    // Auto-save current parameters before execution
    updateNode(nodeId!, {
      data: {
        ...node.data,
        label: labelToUse,
        parameters: paramsToUse,
      },
    });
    setValidationErrors([]);
    
    setIsRunningBlock(true);
    setBlockResult(null);
    
    // Log start
    addConsoleLog({
      nodeId: nodeId!,
      nodeLabel: labelToUse,
      type: 'single-block',
      message: `Running block: ${labelToUse} (${blockType})`,
      data: { parameters: paramsToUse },
    });
    
    try {
      // Build context with injected input
      let context: Record<string, any> = {};
      
      if (inputSource === 'previous' && previousBlocks.length > 0) {
        // Use output from previous block
        const prevBlock = previousBlocks[0];
        if (prevBlock.output) {
          context = { 
            previous: { output: prevBlock.output },
            input: prevBlock.output 
          };
        }
      } else if (inputSource === 'manual' && injectedInput.trim()) {
        // Parse manual input as JSON
        try {
          const parsed = JSON.parse(injectedInput);
          context = { previous: { output: parsed }, input: parsed };
        } catch {
          // If not valid JSON, use as string
          context = { previous: { output: injectedInput }, input: injectedInput };
        }
      }
      
      // Get auth token from persisted auth store (same pattern as workflowStore)
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
      
      const response = await fetch('/api/v1/workflows/block/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken() || ''}`,
        },
        body: JSON.stringify({
          block_type: blockType,
          parameters: paramsToUse,
          context: context,
        }),
      });
      
      const result = await response.json();
      setBlockResult(result);
      
      // Log result to console
      addConsoleLog({
        nodeId: nodeId!,
        nodeLabel: labelToUse,
        type: result.success ? 'success' : 'error',
        message: result.success 
          ? `Completed in ${result.duration_ms || 0}ms`
          : (result.error || 'Block execution failed'),
        data: result.output,
      });
      
      // Update node with execution result for visual feedback
      updateNode(nodeId!, {
        data: {
          ...node.data,
          executionStatus: result.success ? 'completed' : 'failed',
          executionOutput: result.output,
          executionError: result.error,
          executionDuration: result.duration_ms,
        }
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute block';
      setBlockResult({
        success: false,
        error: errorMessage,
      });
      addConsoleLog({
        nodeId: nodeId!,
        nodeLabel: labelToUse,
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsRunningBlock(false);
    }
  };

  if (!nodeId || !node || !definition) {
    return (
      <div className="w-[480px] h-full bg-cyber-darker border-l border-cyber-gray flex items-center justify-center">
        <p className="text-cyber-gray-light text-sm font-mono">◇ SELECT NODE</p>
      </div>
    );
  }

  const handleParamChange = (name: string, value: any) => {
    const newParams = { ...localParams, [name]: value };
    setLocalParams(newParams);
    
    // Clear validation errors when user makes changes
    if (validationErrors.length > 0) {
      const result = validateBlockParameters(node.data.type, newParams);
      setValidationErrors(result.errors);
    }
  };

  const handleSave = async () => {
    // Validate before saving
    const result = validateBlockParameters(node.data.type, localParams);
    if (!result.valid) {
      setValidationErrors(result.errors);
      return;
    }
    
    // Update node in store
    updateNode(nodeId, {
      data: {
        ...node.data,
        label: localLabel,
        parameters: localParams,
      },
    });
    setValidationErrors([]);
    
    // Also persist to backend
    try {
      await saveCurrentWorkflow();
    } catch (error) {
      console.error('Failed to save workflow to backend:', error);
    }
  };

  const handleLabelChange = (value: string) => {
    setLocalLabel(value);
  };

  // Apply credential to parameters
  const applyCredential = (credentialId: string) => {
    const cred = credentials.find(c => c.id === credentialId);
    if (cred) {
      const newParams = { ...localParams };
      if (cred.host) newParams.host = cred.host;
      if (cred.username) newParams.username = cred.username;
      newParams.credential = credentialId;
      setLocalParams(newParams);
    }
  };

  return (
    <div className="w-[480px] h-full bg-cyber-darker border-l border-cyber-gray flex flex-col overflow-hidden">
      {/* Header */}
      <div 
        className="p-4 border-b flex items-center justify-between"
        style={{ borderColor: categoryColor }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{definition.icon}</span>
          <h3 className="font-mono text-sm" style={{ color: categoryColor }}>
            {definition.label.toUpperCase()}
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="text-cyber-gray-light hover:text-cyber-red text-xl transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 cyber-scrollbar">
        {/* Block Info */}
        <div className="text-xs text-cyber-gray-light font-mono mb-4 p-2 bg-cyber-dark border border-cyber-gray rounded">
          <p className="mb-1">{definition.description}</p>
          <p className="text-cyber-purple">TYPE: {node.data.type}</p>
        </div>

        {/* Label field */}
        <div>
          <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
            ◇ LABEL
          </label>
          <input
            type="text"
            value={localLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="cyber-input w-full"
          />
        </div>

        {/* Parameters */}
        {definition.parameters.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-mono text-cyber-blue flex items-center gap-2">
              <span>◈</span> PARAMETERS
              <span className="text-[10px] text-cyber-gray-light ml-auto">use {'{{ }}'} for variables</span>
            </h4>
            {definition.parameters.map(param => (
              <ParameterField
                key={param.name}
                definition={param}
                value={localParams[param.name]}
                onChange={(value) => handleParamChange(param.name, value)}
                credentials={credentials}
                onApplyCredential={applyCredential}
                allParams={localParams}
                blockType={node.data.type}
                nodeId={nodeId}
              />
            ))}
          </div>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="p-3 bg-cyber-red/10 border border-cyber-red rounded">
            <h4 className="text-sm font-mono text-cyber-red mb-2 flex items-center gap-2">
              <span>⚠</span> VALIDATION ERRORS
            </h4>
            <ul className="text-xs text-cyber-red space-y-1">
              {validationErrors.map((error, idx) => (
                <li key={idx}>• {error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Handles info */}
        <div className="pt-4 border-t border-cyber-gray">
          <h4 className="text-sm font-mono text-cyber-green mb-2 flex items-center gap-2">
            <span>◎</span> CONNECTIONS
          </h4>
          <div className="space-y-1 text-xs font-mono">
            {definition.inputs.length > 0 && (
              <div className="text-cyber-gray-light">
                <span className="text-cyber-blue">IN:</span> {definition.inputs.map(i => i.label).join(', ')}
              </div>
            )}
            {definition.outputs.length > 0 && (
              <div className="text-cyber-gray-light">
                <span className="text-cyber-green">OUT:</span> {definition.outputs.map(o => o.label).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* API Info */}
        {definition.api && (
          <div className="pt-4 border-t border-cyber-gray">
            <h4 className="text-sm font-mono text-cyber-purple mb-2 flex items-center gap-2">
              <span>◈</span> API
            </h4>
            <div className="text-xs font-mono bg-cyber-dark p-2 rounded border border-cyber-gray">
              <span className="text-cyber-green">{definition.api.method}</span>{' '}
              <span className="text-cyber-gray-light">{definition.api.endpoint}</span>
            </div>
          </div>
        )}

        {/* Execution Results */}
        {(nodeResult || nodeStatus) && (
          <div className="pt-4 border-t border-cyber-gray">
            <h4 
              className="text-sm font-mono mb-2 flex items-center justify-between cursor-pointer"
              onClick={() => setShowResults(!showResults)}
            >
              <span className={`flex items-center gap-2 ${nodeResult?.success ? 'text-cyber-green' : nodeResult?.error ? 'text-cyber-red' : 'text-cyber-blue'}`}>
                <span>{nodeResult?.success ? '✓' : nodeResult?.error ? '✗' : '◎'}</span> 
                EXECUTION RESULTS
              </span>
              <span className="text-cyber-gray-light text-xs">
                {showResults ? '▼' : '▶'}
              </span>
            </h4>
            
            {showResults && (
              <div className="space-y-2">
                {/* Status Badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-cyber-gray-light font-mono">STATUS:</span>
                  <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                    nodeStatus === 'completed' ? 'bg-cyber-green/20 text-cyber-green border border-cyber-green/30' :
                    nodeStatus === 'failed' ? 'bg-cyber-red/20 text-cyber-red border border-cyber-red/30' :
                    nodeStatus === 'running' ? 'bg-cyber-blue/20 text-cyber-blue border border-cyber-blue/30 animate-pulse' :
                    'bg-cyber-gray/20 text-cyber-gray-light border border-cyber-gray/30'
                  }`}>
                    {nodeStatus?.toUpperCase() || 'PENDING'}
                  </span>
                </div>

                {/* Duration */}
                {nodeResult?.duration && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-cyber-gray-light font-mono">DURATION:</span>
                    <span className="text-xs font-mono text-cyber-purple">
                      {nodeResult.duration}ms
                    </span>
                  </div>
                )}

                {/* Loop Iterations */}
                {nodeResult?.iterations && nodeResult.iterations.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-cyber-gray-light font-mono mb-1">
                      ITERATIONS ({nodeResult.iterations.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto cyber-scrollbar space-y-1">
                      {nodeResult.iterations.map((iter, idx) => (
                        <div 
                          key={idx}
                          className={`text-xs font-mono p-2 rounded border ${
                            iter.success 
                              ? 'bg-cyber-green/10 border-cyber-green/30' 
                              : 'bg-cyber-red/10 border-cyber-red/30'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={iter.success ? 'text-cyber-green' : 'text-cyber-red'}>
                              {iter.success ? '✓' : '✗'} #{iter.iteration}
                            </span>
                            {iter.completedAt && (
                              <span className="text-cyber-gray-light text-[10px]">
                                {new Date(iter.completedAt).toLocaleTimeString()}
                              </span>
                            )}
                          </div>
                          {iter.output && (
                            <div className="text-cyber-gray-light mt-1 truncate">
                              {typeof iter.output === 'object' 
                                ? JSON.stringify(iter.output).slice(0, 50) + '...'
                                : String(iter.output).slice(0, 50)
                              }
                            </div>
                          )}
                          {iter.error && (
                            <div className="text-cyber-red mt-1 truncate">
                              {iter.error}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Output (non-loop) */}
                {nodeResult?.output && !nodeResult.iterations && (
                  <div className="mt-2">
                    <p className="text-xs text-cyber-gray-light font-mono mb-1">OUTPUT:</p>
                    <div className="text-xs font-mono bg-cyber-dark p-3 rounded border border-cyber-green/30 max-h-80 overflow-y-auto cyber-scrollbar">
                      <pre className="text-cyber-green whitespace-pre-wrap break-words text-sm">
                        {typeof nodeResult.output === 'object' 
                          ? JSON.stringify(nodeResult.output, null, 2)
                          : String(nodeResult.output)
                        }
                      </pre>
                    </div>
                  </div>
                )}

                {/* Error */}
                {nodeResult?.error && (
                  <div className="mt-2">
                    <p className="text-xs text-cyber-gray-light font-mono mb-1">ERROR:</p>
                    <div className="text-xs font-mono bg-cyber-dark p-2 rounded border border-cyber-red/30">
                      <span className="text-cyber-red">{nodeResult.error}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Run Single Block Section */}
        <div className="pt-4 border-t border-cyber-gray">
          <h4 
            className="text-sm font-mono text-cyber-orange mb-2 flex items-center justify-between cursor-pointer"
            onClick={() => setShowInputInjection(!showInputInjection)}
          >
            <span className="flex items-center gap-2">
              <span>▶</span> RUN SINGLE BLOCK
            </span>
            <span className="text-cyber-gray-light text-xs">
              {showInputInjection ? '▼' : '▶'}
            </span>
          </h4>
          
          {/* Info: Block uses configured parameters */}
          <p className="text-xs text-cyber-gray-light mb-2 font-mono">
            Uses parameters configured above
          </p>
          
          {showInputInjection && (
            <div className="space-y-3 mb-3">
              {/* Context Injection Selection (optional) */}
              <div>
                <label className="block text-xs text-cyber-gray-light mb-1 font-mono">
                  INJECT CONTEXT (optional):
                </label>
                <div className="flex gap-1">
                  <button
                    onClick={() => setInputSource('none')}
                    className={`flex-1 px-2 py-1 text-xs font-mono transition-colors ${
                      inputSource === 'none'
                        ? 'bg-cyber-purple text-white'
                        : 'bg-cyber-darker text-cyber-gray-light hover:bg-cyber-gray/20 border border-cyber-gray'
                    }`}
                  >
                    NONE
                  </button>
                  <button
                    onClick={() => setInputSource('previous')}
                    disabled={previousBlocks.length === 0 || !previousBlocks.some(p => p.hasOutput)}
                    className={`flex-1 px-2 py-1 text-xs font-mono transition-colors ${
                      inputSource === 'previous'
                        ? 'bg-cyber-purple text-white'
                        : previousBlocks.length === 0 || !previousBlocks.some(p => p.hasOutput)
                          ? 'bg-cyber-darker text-cyber-gray/50 border border-cyber-gray/30 cursor-not-allowed'
                          : 'bg-cyber-darker text-cyber-gray-light hover:bg-cyber-gray/20 border border-cyber-gray'
                    }`}
                  >
                    PREVIOUS
                  </button>
                  <button
                    onClick={() => setInputSource('manual')}
                    className={`flex-1 px-2 py-1 text-xs font-mono transition-colors ${
                      inputSource === 'manual'
                        ? 'bg-cyber-purple text-white'
                        : 'bg-cyber-darker text-cyber-gray-light hover:bg-cyber-gray/20 border border-cyber-gray'
                    }`}
                  >
                    MANUAL
                  </button>
                </div>
                <p className="text-[10px] text-cyber-gray mt-1 font-mono">
                  Context is passed as input to the block (for chaining)
                </p>
              </div>
              
              {/* Previous Block Output Preview */}
              {inputSource === 'previous' && previousBlocks.length > 0 && (
                <div>
                  <label className="block text-xs text-cyber-gray-light mb-1 font-mono">
                    FROM: {previousBlocks[0].label}
                  </label>
                  <div className="text-xs font-mono bg-cyber-dark p-2 rounded border border-cyber-blue/30 max-h-24 overflow-y-auto cyber-scrollbar">
                    <pre className="text-cyber-blue whitespace-pre-wrap break-words">
                      {previousBlocks[0].output 
                        ? JSON.stringify(previousBlocks[0].output, null, 2)
                        : '(no output yet - run previous block first)'
                      }
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Manual Input */}
              {inputSource === 'manual' && (
                <div>
                  <label className="block text-xs text-cyber-gray-light mb-1 font-mono">
                    INJECT INPUT (JSON or text):
                  </label>
                  <textarea
                    value={injectedInput}
                    onChange={(e) => setInjectedInput(e.target.value)}
                    placeholder='{"host": "192.168.1.1", "port": 22}'
                    className="w-full h-20 px-2 py-1 text-xs font-mono bg-cyber-dark border border-cyber-gray rounded text-cyber-gray-light focus:border-cyber-purple focus:outline-none resize-none"
                  />
                </div>
              )}
            </div>
          )}
          
          {/* Run Button */}
          <CyberButton
            variant="green"
            className="w-full"
            onClick={runSingleBlock}
            disabled={isRunningBlock}
          >
            {isRunningBlock ? '◎ RUNNING...' : '▶ RUN THIS BLOCK'}
          </CyberButton>
          
          {/* Single Block Result */}
          {blockResult && (
            <div className={`mt-3 p-2 rounded border ${
              blockResult.success 
                ? 'bg-cyber-green/10 border-cyber-green/30' 
                : 'bg-cyber-red/10 border-cyber-red/30'
            }`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-mono ${blockResult.success ? 'text-cyber-green' : 'text-cyber-red'}`}>
                  {blockResult.success ? '✓ PASSED' : '✗ FAILED'}
                </span>
                {blockResult.duration_ms && (
                  <span className="text-xs text-cyber-gray-light font-mono">
                    {blockResult.duration_ms}ms
                  </span>
                )}
              </div>
              {blockResult.output && (
                <div className="text-xs font-mono bg-cyber-darker p-2 rounded max-h-64 overflow-y-auto cyber-scrollbar border border-cyber-green/20">
                  <pre className="text-cyber-green whitespace-pre-wrap break-words">
                    {JSON.stringify(blockResult.output, null, 2)}
                  </pre>
                </div>
              )}
              {blockResult.error && (
                <div className="text-xs font-mono text-cyber-red mt-1">
                  {blockResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer with Save */}
      <div className="p-4 border-t border-cyber-gray">
        <CyberButton
          variant="purple"
          className="w-full"
          onClick={handleSave}
        >
          ◇ SAVE CHANGES
        </CyberButton>
      </div>
    </div>
  );
};

interface ParameterFieldProps {
  definition: ParameterDefinition;
  value: any;
  onChange: (value: any) => void;
  credentials: VaultCredential[];
  onApplyCredential: (credentialId: string) => void;
  allParams: Record<string, any>;  // Access to all params for context-aware dropdowns
  blockType: string;  // Block type for determining dropdown behavior
  nodeId: string | null;  // For variable picker context
}

const ParameterField: React.FC<ParameterFieldProps> = ({ 
  definition, 
  value, 
  onChange, 
  credentials,
  onApplyCredential,
  allParams,
  blockType,
  nodeId,
}) => {
  const { name, label, type, required, placeholder, options, description } = definition;
  
  // Track whether to show variable input vs dropdown for dynamic fields
  const [useVariableMode, setUseVariableMode] = useState(false);
  
  // Check if value contains variable expression - auto-switch to variable mode
  const hasVariableExpression = typeof value === 'string' && value.includes('{{');
  const effectiveVariableMode = useVariableMode || hasVariableExpression;

  const inputClasses = "cyber-input w-full";

  // Determine if this field should use a dynamic dropdown
  const isDynamicHost = name === 'host' && type === 'string';
  const isDynamicTarget = name === 'target' && type === 'string';
  const isDynamicPort = name === 'port' && type === 'number';
  const isDynamicInterface = name === 'interface' && type === 'string';

  // Get service filter for port dropdowns based on block type
  const getServiceFilter = (): string | undefined => {
    if (blockType.includes('ssh')) return 'ssh';
    if (blockType.includes('rdp')) return 'rdp';
    if (blockType.includes('vnc')) return 'vnc';
    if (blockType.includes('ftp')) return 'ftp';
    return undefined;
  };
  
  // Render mode toggle button for fields that support both dropdown and variable modes
  const renderModeToggle = () => (
    <button
      type="button"
      onClick={() => setUseVariableMode(!effectiveVariableMode)}
      className={`ml-2 px-2 py-0.5 text-xs font-mono rounded transition-colors ${
        effectiveVariableMode
          ? 'bg-cyber-purple/30 text-cyber-purple border border-cyber-purple/50'
          : 'bg-cyber-gray/20 text-cyber-gray-light border border-cyber-gray/30 hover:bg-cyber-purple/20 hover:text-cyber-purple'
      }`}
      title={effectiveVariableMode ? 'Switch to dropdown' : 'Switch to variable mode'}
    >
      {effectiveVariableMode ? '◇ VAR' : '{ }'}
    </button>
  );

  // Handle credential type with DynamicDropdown
  if (type === 'credential') {
    return (
      <div>
        <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
          {label}
          {required && <span className="text-cyber-red ml-1">*</span>}
        </label>
        <DynamicDropdown
          type="credential"
          value={value ?? ''}
          onChange={(val) => {
            onChange(val);
            if (val) {
              onApplyCredential(val);
            }
          }}
          placeholder="Select saved credential..."
          allowCustom={false}
        />
        {description && (
          <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
        )}
      </div>
    );
  }

  // Handle host field with DynamicDropdown (discovered IPs) or VariableInput
  if (isDynamicHost || isDynamicTarget) {
    return (
      <div>
        <label className="block text-sm text-cyber-gray-light mb-1 font-mono flex items-center">
          <span>
            {label}
            {required && <span className="text-cyber-red ml-1">*</span>}
          </span>
          {nodeId && renderModeToggle()}
        </label>
        {effectiveVariableMode && nodeId ? (
          <VariableInput
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder || 'e.g., {{ $prev.output.ip }} or {{ $loop.item }}'}
            nodeId={nodeId}
          />
        ) : (
          <DynamicDropdown
            type="ip"
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder || 'Select or enter IP address...'}
            allowCustom={true}
          />
        )}
        {description && (
          <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
        )}
      </div>
    );
  }

  // Handle port field with DynamicDropdown (discovered ports) or VariableInput
  if (isDynamicPort) {
    return (
      <div>
        <label className="block text-sm text-cyber-gray-light mb-1 font-mono flex items-center">
          <span>
            {label}
            {required && <span className="text-cyber-red ml-1">*</span>}
          </span>
          {nodeId && renderModeToggle()}
        </label>
        {effectiveVariableMode && nodeId ? (
          <VariableInput
            value={value?.toString() ?? ''}
            onChange={(val) => onChange(val.includes('{{') ? val : (val ? Number(val) : undefined))}
            placeholder={placeholder || 'e.g., {{ $prev.output.port }}'}
            nodeId={nodeId}
          />
        ) : (
          <DynamicDropdown
            type="port"
            value={value?.toString() ?? ''}
            onChange={(val) => onChange(val ? Number(val) : undefined)}
            placeholder={placeholder || 'Select or enter port...'}
            hostFilter={allParams.host}  // Filter ports by selected host
            serviceFilter={getServiceFilter()}
            allowCustom={true}
          />
        )}
        {description && (
          <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
        )}
      </div>
    );
  }

  // Handle interface field with DynamicDropdown or VariableInput
  if (isDynamicInterface) {
    return (
      <div>
        <label className="block text-sm text-cyber-gray-light mb-1 font-mono flex items-center">
          <span>
            {label}
            {required && <span className="text-cyber-red ml-1">*</span>}
          </span>
          {nodeId && renderModeToggle()}
        </label>
        {effectiveVariableMode && nodeId ? (
          <VariableInput
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder || 'e.g., {{ $prev.output.interface }}'}
            nodeId={nodeId}
          />
        ) : (
          <DynamicDropdown
            type="interface"
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder || 'Select network interface...'}
            allowCustom={true}
          />
        )}
        {description && (
          <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
        {label}
        {required && <span className="text-cyber-red ml-1">*</span>}
      </label>

      {type === 'select' && options ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="cyber-select w-full"
        >
          <option value="">[ SELECT ]</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : type === 'textarea' ? (
        nodeId ? (
          <VariableInput
            value={value ?? ''}
            onChange={onChange}
            placeholder={placeholder}
            nodeId={nodeId}
            multiline={true}
            rows={3}
          />
        ) : (
          <textarea
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={inputClasses + ' resize-none'}
          />
        )
      ) : type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded bg-cyber-dark border-cyber-gray text-cyber-purple focus:ring-cyber-purple"
          />
          <span className="text-sm text-cyber-gray-light group-hover:text-white font-mono">
            {value ? 'ENABLED' : 'DISABLED'}
          </span>
        </label>
      ) : type === 'number' ? (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={placeholder}
          className={inputClasses}
        />
      ) : type === 'password' ? (
        <input
          type="password"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      ) : nodeId ? (
        <VariableInput
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          nodeId={nodeId}
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}

      {description && (
        <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
      )}
    </div>
  );
};

export default ConfigPanel;
