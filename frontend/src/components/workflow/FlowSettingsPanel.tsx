/**
 * FlowSettingsPanel - Sliding right sidebar for bulk block configuration
 * Shows all block parameters in a list for easy editing without clicking each block
 * Supports config export/import for reusing flows on different networks
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';
import { getBlockDefinition, CATEGORY_COLORS } from '../../types/blocks';
import { CyberButton } from '../CyberUI';
import DynamicDropdown from './DynamicDropdown';
import { flowConfigService, FlowBlockConfig } from '../../services/flowConfigService';

interface FlowSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const FlowSettingsPanel: React.FC<FlowSettingsPanelProps> = ({ isOpen, onClose }) => {
  const { nodes, updateNode, getCurrentWorkflow } = useWorkflowStore();
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'connection' | 'command' | 'traffic' | 'scanning' | 'agent'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const workflow = getCurrentWorkflow();

  // Filter and search nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter(node => {
      // Skip control blocks (start, end, etc.) - they don't usually need config
      if (node.data.category === 'control') return false;

      // Filter by category
      if (filter !== 'all' && node.data.category !== filter) return false;

      // Search by label, type, or parameters
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesLabel = node.data.label?.toLowerCase().includes(term);
        const matchesType = node.data.type?.toLowerCase().includes(term);
        const matchesParams = Object.values(node.data.parameters || {}).some(
          v => String(v).toLowerCase().includes(term)
        );
        if (!matchesLabel && !matchesType && !matchesParams) return false;
      }

      return true;
    });
  }, [nodes, filter, searchTerm]);

  // Toggle node expansion
  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  // Expand/collapse all
  const expandAll = () => {
    setExpandedNodes(new Set(filteredNodes.map(n => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  // Handle parameter change
  const handleParamChange = useCallback((nodeId: string, paramName: string, value: any) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    updateNode(nodeId, {
      data: {
        ...node.data,
        parameters: {
          ...node.data.parameters,
          [paramName]: value,
        },
      },
    });
  }, [nodes, updateNode]);

  // Export block configurations
  const handleExportConfig = useCallback(() => {
    if (!workflow) return;

    const blockConfigs: FlowBlockConfig[] = filteredNodes.map(node => ({
      nodeId: node.id,
      blockType: node.data.type,
      label: node.data.label,
      parameters: node.data.parameters || {},
    }));

    const config = flowConfigService.exportBlockConfig(
      workflow.name,
      blockConfigs,
      workflow.id
    );

    flowConfigService.downloadConfig(config);
    setImportMessage({ type: 'success', text: `Exported ${blockConfigs.length} block configurations` });
    setTimeout(() => setImportMessage(null), 3000);
  }, [workflow, filteredNodes]);

  // Import block configurations
  const handleImportConfig = useCallback(async () => {
    try {
      const config = await flowConfigService.importConfig();
      
      let updated = 0;
      let skipped = 0;

      config.blocks.forEach(blockConfig => {
        // Find matching node by type and label, or by nodeId
        const matchingNode = nodes.find(n => 
          n.id === blockConfig.nodeId ||
          (n.data.type === blockConfig.blockType && n.data.label === blockConfig.label)
        );

        if (matchingNode) {
          updateNode(matchingNode.id, {
            data: {
              ...matchingNode.data,
              parameters: {
                ...matchingNode.data.parameters,
                ...blockConfig.parameters,
              },
            },
          });
          updated++;
        } else {
          skipped++;
        }
      });

      setImportMessage({ 
        type: 'success', 
        text: `Imported ${updated} configs${skipped > 0 ? `, skipped ${skipped} (no match)` : ''}` 
      });
      setTimeout(() => setImportMessage(null), 5000);
    } catch (error) {
      setImportMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Import failed' 
      });
      setTimeout(() => setImportMessage(null), 5000);
    }
  }, [nodes, updateNode]);

  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    nodes.forEach(node => {
      if (node.data.category === 'control') return;
      counts.all = (counts.all || 0) + 1;
      counts[node.data.category] = (counts[node.data.category] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  if (!isOpen) return null;

  return (
    <div className="w-96 h-full bg-cyber-darker border-l border-cyber-gray flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-cyber-purple bg-cyber-dark">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-mono text-cyber-purple flex items-center gap-2">
            <span>⚙</span> FLOW SETTINGS
          </h3>
          <button 
            onClick={onClose}
            className="text-cyber-gray-light hover:text-cyber-red text-xl transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-cyber-gray-light">◇</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search blocks..."
            className="cyber-input w-full pl-8 text-sm"
          />
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-1 text-xs">
          {(['all', 'connection', 'command', 'traffic', 'scanning', 'agent'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2 py-1 rounded font-mono transition-colors ${
                filter === cat
                  ? cat === 'all' 
                    ? 'bg-cyber-purple text-white'
                    : 'text-white'
                  : 'bg-cyber-dark text-cyber-gray-light hover:text-white'
              }`}
              style={{
                backgroundColor: filter === cat && cat !== 'all' ? CATEGORY_COLORS[cat] + '40' : undefined,
                borderColor: cat !== 'all' ? CATEGORY_COLORS[cat] : undefined,
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            >
              {cat.toUpperCase()} ({categoryCounts[cat] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-2 border-b border-cyber-gray bg-cyber-dark/50 flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={expandAll}
            className="text-xs text-cyber-gray-light hover:text-cyber-blue px-2 py-1 font-mono"
          >
            ▼ Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-cyber-gray-light hover:text-cyber-blue px-2 py-1 font-mono"
          >
            ▶ Collapse All
          </button>
        </div>
        <div className="flex gap-1">
          <CyberButton variant="gray" size="sm" onClick={handleImportConfig}>
            ↓ Import
          </CyberButton>
          <CyberButton variant="purple" size="sm" onClick={handleExportConfig}>
            ↑ Export
          </CyberButton>
        </div>
      </div>

      {/* Import/Export message */}
      {importMessage && (
        <div className={`px-4 py-2 text-sm font-mono ${
          importMessage.type === 'success' 
            ? 'bg-cyber-green/20 text-cyber-green border-b border-cyber-green/30' 
            : 'bg-cyber-red/20 text-cyber-red border-b border-cyber-red/30'
        }`}>
          {importMessage.type === 'success' ? '✓' : '✗'} {importMessage.text}
        </div>
      )}

      {/* Block list */}
      <div className="flex-1 overflow-y-auto cyber-scrollbar">
        {filteredNodes.length === 0 ? (
          <div className="p-8 text-center text-cyber-gray-light font-mono">
            <div className="text-2xl mb-2">◇</div>
            <p>No configurable blocks found</p>
            {nodes.length === 0 && (
              <p className="text-xs mt-2">Add blocks to your flow first</p>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {filteredNodes.map(node => {
              const definition = getBlockDefinition(node.data.type);
              if (!definition) return null;

              const isExpanded = expandedNodes.has(node.id);
              const categoryColor = CATEGORY_COLORS[node.data.category];
              const configParams = definition.parameters.filter(
                p => !['name', 'description', 'status', 'message'].includes(p.name)
              );

              return (
                <div 
                  key={node.id}
                  className="bg-cyber-dark border rounded overflow-hidden"
                  style={{ borderColor: categoryColor + '60' }}
                >
                  {/* Block header */}
                  <button
                    onClick={() => toggleNode(node.id)}
                    className="w-full p-3 flex items-center justify-between hover:bg-cyber-gray/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span style={{ color: categoryColor }}>{definition.icon}</span>
                      <div className="text-left">
                        <div className="font-mono text-sm text-white">
                          {node.data.label || definition.label}
                        </div>
                        <div className="text-xs text-cyber-gray-light">
                          {definition.label} · {configParams.length} params
                        </div>
                      </div>
                    </div>
                    <span className="text-cyber-gray-light">
                      {isExpanded ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Parameters */}
                  {isExpanded && configParams.length > 0 && (
                    <div className="p-3 pt-0 space-y-3 border-t border-cyber-gray/30">
                      {configParams.map(param => (
                        <BlockParamField
                          key={param.name}
                          nodeId={node.id}
                          param={param}
                          value={node.data.parameters?.[param.name]}
                          onChange={(val) => handleParamChange(node.id, param.name, val)}
                          hostValue={node.data.parameters?.host}
                          blockType={node.data.type}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="p-3 border-t border-cyber-gray bg-cyber-dark text-xs font-mono text-cyber-gray-light">
        <div className="flex justify-between">
          <span>{filteredNodes.length} blocks</span>
          <span>{workflow?.name || 'No flow selected'}</span>
        </div>
      </div>
    </div>
  );
};

// Simplified parameter field for the settings panel
interface BlockParamFieldProps {
  nodeId: string;
  param: {
    name: string;
    label: string;
    type: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ label: string; value: string }>;
  };
  value: any;
  onChange: (value: any) => void;
  hostValue?: string;
  blockType: string;
}

const BlockParamField: React.FC<BlockParamFieldProps> = ({
  param,
  value,
  onChange,
  hostValue,
  blockType,
}) => {
  const { name, label, type, required, placeholder, options } = param;

  // Determine dropdown type
  const isDynamicHost = name === 'host' && type === 'string';
  const isDynamicPort = name === 'port' && type === 'number';
  const isDynamicCredential = type === 'credential';
  const isDynamicInterface = name === 'interface' && type === 'string';

  // Get service filter for ports
  const getServiceFilter = (): string | undefined => {
    if (blockType.includes('ssh')) return 'ssh';
    if (blockType.includes('rdp')) return 'rdp';
    if (blockType.includes('vnc')) return 'vnc';
    if (blockType.includes('ftp')) return 'ftp';
    return undefined;
  };

  return (
    <div>
      <label className="block text-xs text-cyber-gray-light mb-1 font-mono">
        {label}
        {required && <span className="text-cyber-red ml-1">*</span>}
      </label>

      {isDynamicHost ? (
        <DynamicDropdown
          type="ip"
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder || 'Select host...'}
          allowCustom={true}
        />
      ) : isDynamicPort ? (
        <DynamicDropdown
          type="port"
          value={value?.toString() ?? ''}
          onChange={(val) => onChange(val ? Number(val) : undefined)}
          placeholder={placeholder || 'Select port...'}
          hostFilter={hostValue}
          serviceFilter={getServiceFilter()}
          allowCustom={true}
        />
      ) : isDynamicCredential ? (
        <DynamicDropdown
          type="credential"
          value={value ?? ''}
          onChange={onChange}
          placeholder="Select credential..."
          allowCustom={false}
        />
      ) : isDynamicInterface ? (
        <DynamicDropdown
          type="interface"
          value={value ?? ''}
          onChange={onChange}
          placeholder="Select interface..."
          allowCustom={true}
        />
      ) : type === 'select' && options ? (
        <select
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className="cyber-select w-full text-sm"
        >
          <option value="">[ SELECT ]</option>
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : type === 'boolean' ? (
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={value ?? false}
            onChange={(e) => onChange(e.target.checked)}
            className="w-4 h-4 rounded bg-cyber-dark border-cyber-gray"
          />
          <span className="text-sm text-cyber-gray-light">
            {value ? 'Yes' : 'No'}
          </span>
        </label>
      ) : type === 'number' ? (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
          placeholder={placeholder}
          className="cyber-input w-full text-sm"
        />
      ) : type === 'textarea' ? (
        <textarea
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="cyber-input w-full text-sm resize-none"
        />
      ) : type === 'password' ? (
        <input
          type="password"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="cyber-input w-full text-sm"
        />
      ) : (
        <input
          type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="cyber-input w-full text-sm"
        />
      )}
    </div>
  );
};

export default FlowSettingsPanel;
