/**
 * ConfigPanel - Right sidebar for node configuration
 */

import React, { useState, useEffect } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { getBlockDefinition } from '../../types/blocks';
import { ParameterDefinition } from '../../types/workflow';

interface ConfigPanelProps {
  nodeId: string | null;
  onClose: () => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ nodeId, onClose }) => {
  const { nodes, updateNode } = useWorkflowStore();
  const [localParams, setLocalParams] = useState<Record<string, any>>({});
  const [localLabel, setLocalLabel] = useState('');

  const node = nodes.find(n => n.id === nodeId);
  const definition = node ? getBlockDefinition(node.data.type) : null;

  // Sync local state when node changes
  useEffect(() => {
    if (node) {
      setLocalParams(node.data.parameters || {});
      setLocalLabel(node.data.label);
    }
  }, [node]);

  if (!nodeId || !node || !definition) {
    return (
      <div className="w-80 h-full bg-gray-900 border-l border-gray-700 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Select a node to configure</p>
      </div>
    );
  }

  const handleParamChange = (name: string, value: any) => {
    const newParams = { ...localParams, [name]: value };
    setLocalParams(newParams);
  };

  const handleSave = () => {
    updateNode(nodeId, {
      data: {
        ...node.data,
        label: localLabel,
        parameters: localParams,
      },
    });
  };

  const handleLabelChange = (value: string) => {
    setLocalLabel(value);
  };

  return (
    <div className="w-80 h-full bg-gray-900 border-l border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{definition.icon}</span>
          <h3 className="text-white font-semibold">{definition.label}</h3>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xl"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Block Info */}
        <div className="text-xs text-gray-500 mb-4">
          <p>{definition.description}</p>
          <p className="mt-1">Type: {node.data.type}</p>
        </div>

        {/* Label field */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            Label
          </label>
          <input
            type="text"
            value={localLabel}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Parameters */}
        {definition.parameters.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-300">Parameters</h4>
            {definition.parameters.map(param => (
              <ParameterField
                key={param.name}
                definition={param}
                value={localParams[param.name]}
                onChange={(value) => handleParamChange(param.name, value)}
              />
            ))}
          </div>
        )}

        {/* Handles info */}
        <div className="pt-4 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Connections</h4>
          <div className="space-y-1 text-xs">
            {definition.inputs.length > 0 && (
              <div className="text-gray-500">
                Inputs: {definition.inputs.map(i => i.label).join(', ')}
              </div>
            )}
            {definition.outputs.length > 0 && (
              <div className="text-gray-500">
                Outputs: {definition.outputs.map(o => o.label).join(', ')}
              </div>
            )}
          </div>
        </div>

        {/* API Info */}
        {definition.api && (
          <div className="pt-4 border-t border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">API</h4>
            <div className="text-xs text-gray-500 font-mono bg-gray-800 p-2 rounded">
              {definition.api.method} {definition.api.endpoint}
            </div>
          </div>
        )}
      </div>

      {/* Footer with Save */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleSave}
          className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
};

interface ParameterFieldProps {
  definition: ParameterDefinition;
  value: any;
  onChange: (value: any) => void;
}

const ParameterField: React.FC<ParameterFieldProps> = ({ definition, value, onChange }) => {
  const { name, label, type, required, placeholder, options, description } = definition;

  const inputClasses = "w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white focus:outline-none focus:border-blue-500";

  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>

      {type === 'select' && options ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClasses}
        >
          <option value="">Select...</option>
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
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded bg-gray-800 border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-400">Enabled</span>
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
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
  );
};

export default ConfigPanel;
