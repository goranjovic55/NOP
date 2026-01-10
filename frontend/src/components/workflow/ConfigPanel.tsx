/**
 * ConfigPanel - Cyberpunk-styled right sidebar for node configuration
 * Phase 3: Added credential selector support
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { getBlockDefinition, CATEGORY_COLORS, validateBlockParameters } from '../../types/blocks';
import { ParameterDefinition } from '../../types/workflow';
import { CyberButton } from '../CyberUI';

interface VaultCredential {
  id: string;
  name: string;
  host: string;
  protocol: string;
  username: string;
}

interface ConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNode } = useWorkflowStore();
  const [localParams, setLocalParams] = useState<Record<string, any>>({});
  const [localLabel, setLocalLabel] = useState('');
  const [credentials, setCredentials] = useState<VaultCredential[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const node = nodes.find(n => n.id === nodeId);
  const definition = node ? getBlockDefinition(node.data.type) : null;
  const categoryColor = node ? CATEGORY_COLORS[node.data.category] : '#8b5cf6';

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
    }
  }, [node]);

  if (!nodeId || !node || !definition) {
    return (
      <div className="w-80 h-full bg-cyber-darker border-l border-cyber-gray flex items-center justify-center">
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

  const handleSave = () => {
    // Validate before saving
    const result = validateBlockParameters(node.data.type, localParams);
    if (!result.valid) {
      setValidationErrors(result.errors);
      return;
    }
    
    updateNode(nodeId, {
      data: {
        ...node.data,
        label: localLabel,
        parameters: localParams,
      },
    });
    setValidationErrors([]);
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
    <div className="w-80 h-full bg-cyber-darker border-l border-cyber-gray flex flex-col overflow-hidden">
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
            </h4>
            {definition.parameters.map(param => (
              <ParameterField
                key={param.name}
                definition={param}
                value={localParams[param.name]}
                onChange={(value) => handleParamChange(param.name, value)}
                credentials={credentials}
                onApplyCredential={applyCredential}
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
              <span>⚡</span> API
            </h4>
            <div className="text-xs font-mono bg-cyber-dark p-2 rounded border border-cyber-gray">
              <span className="text-cyber-green">{definition.api.method}</span>{' '}
              <span className="text-cyber-gray-light">{definition.api.endpoint}</span>
            </div>
          </div>
        )}
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
}

const ParameterField: React.FC<ParameterFieldProps> = ({ 
  definition, 
  value, 
  onChange, 
  credentials,
  onApplyCredential 
}) => {
  const { name, label, type, required, placeholder, options, description } = definition;

  const inputClasses = "cyber-input w-full";

  // Handle credential type
  if (type === 'credential') {
    return (
      <div>
        <label className="block text-sm text-cyber-gray-light mb-1 font-mono">
          {label}
          {required && <span className="text-cyber-red ml-1">*</span>}
        </label>
        <select
          value={value ?? ''}
          onChange={(e) => {
            onChange(e.target.value);
            if (e.target.value) {
              onApplyCredential(e.target.value);
            }
          }}
          className="cyber-select w-full"
        >
          <option value="">[ SELECT CREDENTIAL ]</option>
          {credentials.map(cred => (
            <option key={cred.id} value={cred.id}>
              {cred.name} ({cred.host})
            </option>
          ))}
        </select>
        {description && (
          <p className="text-xs text-cyber-gray-light mt-1 font-mono">{description}</p>
        )}
        {credentials.length === 0 && (
          <p className="text-xs text-cyber-blue mt-1 font-mono">
            ◇ No saved credentials. Add in Settings → Credentials
          </p>
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
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className={inputClasses + ' resize-none'}
        />
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
