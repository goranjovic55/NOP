/**
 * VariablePicker - Context-aware variable insertion for workflow parameters
 * 
 * Features:
 * - Shows variables from previous blocks (connected nodes)
 * - Parses actual output structure when available
 * - Shows loop context variables when inside a loop
 * - Shows workflow-level variables
 * - Shows other named blocks for cross-reference
 * 
 * Template Syntax:
 * - {{ $prev.output.field }}    - Previous node output
 * - {{ $node.nodeId.field }}    - Specific node by ID
 * - {{ $loop.item }}            - Current loop item
 * - {{ $loop.index }}           - Loop iteration index
 * - {{ $vars.name }}            - Workflow variable
 * 
 * Filters: | first, | last, | trim, | default('value'), | split, | join, | json
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useWorkflowStore } from '../../store/workflowStore';

interface VariableItem {
  label: string;
  value: string;
  description?: string;
  children?: VariableItem[];
  type?: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'unknown';
}

interface VariablePickerProps {
  nodeId: string;
  onSelect: (variable: string) => void;
  onClose: () => void;
  position?: { top: number; left: number };
}

const VariablePicker: React.FC<VariablePickerProps> = ({
  nodeId,
  onSelect,
  onClose,
  position,
}) => {
  const { nodes, edges, execution, workflows, currentWorkflowId } = useWorkflowStore();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['previous', 'loop', 'variables']));
  const [searchTerm, setSearchTerm] = useState('');
  const pickerRef = useRef<HTMLDivElement>(null);

  // Get current workflow's variables
  const workflowVariables = useMemo(() => {
    const workflow = workflows.find(w => w.id === currentWorkflowId);
    return workflow?.variables || [];
  }, [workflows, currentWorkflowId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Get previous blocks connected to this node
  const previousBlocks = useMemo(() => {
    const incomingEdges = edges.filter(e => e.target === nodeId);
    return incomingEdges.map(edge => {
      const sourceNode = nodes.find(n => n.id === edge.source);
      const sourceResult = execution?.nodeResults?.[edge.source];
      return {
        nodeId: edge.source,
        label: sourceNode?.data.label || 'Unknown',
        type: sourceNode?.data.type || '',
        output: sourceResult?.output,
      };
    });
  }, [nodeId, nodes, edges, execution]);

  // Check if current node is inside a loop
  const isInsideLoop = useMemo(() => {
    // Check if any ancestor is a loop block
    const visited = new Set<string>();
    const queue = [nodeId];
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);
      
      const incomingEdges = edges.filter(e => e.target === current);
      for (const edge of incomingEdges) {
        const sourceNode = nodes.find(n => n.id === edge.source);
        if (sourceNode?.data.type === 'control.loop') {
          return true;
        }
        queue.push(edge.source);
      }
    }
    return false;
  }, [nodeId, nodes, edges]);

  // Get all other named blocks in the workflow
  const otherBlocks = useMemo(() => {
    return nodes
      .filter(n => n.id !== nodeId && n.data.type !== 'control.start' && n.data.type !== 'control.end')
      .map(n => ({
        nodeId: n.id,
        label: n.data.label || n.data.type,
        type: n.data.type,
        output: execution?.nodeResults?.[n.id]?.output,
      }));
  }, [nodeId, nodes, execution]);

  // Parse an object into variable items
  const parseOutputToVariables = (
    output: any,
    prefix: string,
    maxDepth: number = 3,
    currentDepth: number = 0
  ): VariableItem[] => {
    if (currentDepth >= maxDepth || output === null || output === undefined) {
      return [];
    }

    const items: VariableItem[] = [];

    if (typeof output === 'object' && !Array.isArray(output)) {
      Object.keys(output).forEach(key => {
        const value = output[key];
        const path = `${prefix}.${key}`;
        const type = Array.isArray(value) ? 'array' : typeof value as any;
        
        const item: VariableItem = {
          label: key,
          value: `{{ ${path} }}`,
          type,
          description: type === 'array' ? `[${value.length} items]` : 
                       type === 'object' ? '{...}' : 
                       String(value).slice(0, 30),
        };

        if (type === 'object' || type === 'array') {
          item.children = parseOutputToVariables(value, path, maxDepth, currentDepth + 1);
        }

        items.push(item);
      });
    } else if (Array.isArray(output)) {
      // For arrays, show first, last, and length patterns
      items.push({
        label: '| first',
        value: `{{ ${prefix} | first }}`,
        description: 'First element',
        type: 'unknown',
      });
      items.push({
        label: '| last',
        value: `{{ ${prefix} | last }}`,
        description: 'Last element',
        type: 'unknown',
      });
      items.push({
        label: '| length',
        value: `{{ ${prefix} | length }}`,
        description: `Count: ${output.length}`,
        type: 'number',
      });
      
      // Show first few array indices
      output.slice(0, 3).forEach((_, idx) => {
        const item: VariableItem = {
          label: `[${idx}]`,
          value: `{{ ${prefix}.${idx} }}`,
          type: typeof output[idx] as any,
          description: String(output[idx]).slice(0, 30),
        };
        if (typeof output[idx] === 'object') {
          item.children = parseOutputToVariables(output[idx], `${prefix}.${idx}`, maxDepth, currentDepth + 1);
        }
        items.push(item);
      });
      
      if (output.length > 3) {
        items.push({
          label: `... ${output.length - 3} more`,
          value: '',
          description: 'Use [index] to access',
          type: 'unknown',
        });
      }
    }

    return items;
  };

  // Build the variable tree
  const variableTree = useMemo(() => {
    const sections: { id: string; label: string; icon: string; items: VariableItem[] }[] = [];

    // Previous Block(s)
    if (previousBlocks.length > 0) {
      const prevItems: VariableItem[] = [];
      
      previousBlocks.forEach((block, idx) => {
        const prefix = previousBlocks.length === 1 ? '$prev' : `$node.${block.nodeId}`;
        
        // Base output reference
        prevItems.push({
          label: previousBlocks.length === 1 ? 'output' : block.label,
          value: `{{ ${prefix}.output }}`,
          description: block.type,
          type: 'object',
          children: block.output ? parseOutputToVariables(block.output, `${prefix}.output`) : [
            {
              label: '(run block to see output)',
              value: '',
              description: 'Execute workflow to populate',
              type: 'unknown',
            }
          ],
        });
      });

      // Add common patterns
      prevItems.push({
        label: 'Common Patterns',
        value: '',
        type: 'object',
        children: [
          { label: '$prev.output.ip', value: '{{ $prev.output.ip }}', description: 'IP address field' },
          { label: '$prev.output.host', value: '{{ $prev.output.host }}', description: 'Hostname field' },
          { label: '$prev.output.hosts', value: '{{ $prev.output.hosts }}', description: 'Host list' },
          { label: '$prev.output.ports', value: '{{ $prev.output.ports }}', description: 'Port list' },
          { label: '$prev.output.success', value: '{{ $prev.output.success }}', description: 'Success flag' },
        ],
      });

      sections.push({
        id: 'previous',
        label: 'PREVIOUS BLOCK',
        icon: '◀',
        items: prevItems,
      });
    }

    // Loop Context
    if (isInsideLoop) {
      sections.push({
        id: 'loop',
        label: 'LOOP CONTEXT',
        icon: '↻',
        items: [
          { label: 'item', value: '{{ $loop.item }}', description: 'Current iteration item', type: 'unknown' },
          { label: 'index', value: '{{ $loop.index }}', description: 'Current iteration index (0-based)', type: 'number' },
          { label: 'total', value: '{{ $loop.total }}', description: 'Total iterations', type: 'number' },
          { label: 'isFirst', value: '{{ $loop.isFirst }}', description: 'Is first iteration', type: 'boolean' },
          { label: 'isLast', value: '{{ $loop.isLast }}', description: 'Is last iteration', type: 'boolean' },
        ],
      });
    }

    // Workflow Variables
    const varItems: VariableItem[] = [];
    
    if (workflowVariables.length > 0) {
      workflowVariables.forEach(v => {
        if (v.name) {
          varItems.push({
            label: v.name,
            value: `{{ $vars.${v.name} }}`,
            description: v.default !== undefined ? `default: ${JSON.stringify(v.default)}` : undefined,
            type: v.type as any,
          });
        }
      });
    }
    
    // Add helper text if no variables defined
    if (varItems.length === 0) {
      varItems.push({
        label: 'No variables defined',
        value: '',
        description: 'Click ⚙ SETTINGS to add variables',
        type: 'unknown',
      });
    }
    
    // Add example patterns
    varItems.push({
      label: 'Examples',
      value: '',
      type: 'object',
      children: [
        { label: '$vars.targetIP', value: '{{ $vars.targetIP }}', description: 'Example: IP address' },
        { label: '$vars.username', value: '{{ $vars.username }}', description: 'Example: username' },
        { label: '$vars.ports', value: '{{ $vars.ports }}', description: 'Example: port list' },
      ],
    });
    
    sections.push({
      id: 'variables',
      label: `WORKFLOW VARIABLES ${workflowVariables.length > 0 ? `(${workflowVariables.length})` : ''}`,
      icon: '◈',
      items: varItems,
    });

    // Other Blocks
    if (otherBlocks.length > 0) {
      const otherItems: VariableItem[] = otherBlocks.slice(0, 10).map(block => ({
        label: block.label,
        value: `{{ $node.${block.nodeId}.output }}`,
        description: block.type,
        type: 'object',
        children: block.output ? parseOutputToVariables(block.output, `$node.${block.nodeId}.output`) : undefined,
      }));

      sections.push({
        id: 'blocks',
        label: 'OTHER BLOCKS',
        icon: '◇',
        items: otherItems,
      });
    }

    // Filters
    sections.push({
      id: 'filters',
      label: 'FILTERS',
      icon: '|',
      items: [
        { label: '| first', value: ' | first }}', description: 'Get first element of array' },
        { label: '| last', value: ' | last }}', description: 'Get last element of array' },
        { label: '| length', value: ' | length }}', description: 'Get array/string length' },
        { label: '| trim', value: ' | trim }}', description: 'Remove whitespace' },
        { label: '| lower', value: ' | lower }}', description: 'Lowercase string' },
        { label: '| upper', value: ' | upper }}', description: 'Uppercase string' },
        { label: '| json', value: ' | json }}', description: 'JSON stringify' },
        { label: '| split(\',\')', value: ' | split(\',\') }}', description: 'Split string to array' },
        { label: '| join(\',\')', value: ' | join(\',\') }}', description: 'Join array to string' },
        { label: '| default(\'value\')', value: ' | default(\'\') }}', description: 'Default if empty' },
      ],
    });

    return sections;
  }, [previousBlocks, isInsideLoop, otherBlocks]);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleSelect = (variable: string) => {
    if (variable) {
      onSelect(variable);
      onClose();
    }
  };

  // Filter items by search term
  const filterItems = (items: VariableItem[]): VariableItem[] => {
    if (!searchTerm) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.label.toLowerCase().includes(term) ||
      item.value.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      (item.children && filterItems(item.children).length > 0)
    ).map(item => ({
      ...item,
      children: item.children ? filterItems(item.children) : undefined,
    }));
  };

  // Render a single variable item (extracted as separate component to use hooks properly)
  const VariableItemRow: React.FC<{ item: VariableItem; depth: number; onSelect: (v: string) => void }> = ({ 
    item, 
    depth, 
    onSelect: handleItemSelect 
  }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isClickable = !!item.value;
    const [isExpanded, setIsExpanded] = useState(depth < 1);

    return (
      <div className="select-none">
        <div
          className={`flex items-center gap-2 px-2 py-1 text-xs font-mono rounded ${
            isClickable 
              ? 'hover:bg-cyber-purple/20 cursor-pointer' 
              : 'text-cyber-gray'
          }`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => {
            if (hasChildren) {
              setIsExpanded(!isExpanded);
            }
            if (isClickable) {
              handleItemSelect(item.value);
            }
          }}
        >
          {hasChildren && (
            <span className="text-cyber-gray-light text-[10px] w-3">
              {isExpanded ? '▼' : '▶'}
            </span>
          )}
          {!hasChildren && <span className="w-3" />}
          
          <span className={`${isClickable ? 'text-cyber-blue' : 'text-cyber-gray'}`}>
            {item.label}
          </span>
          
          {item.type && item.type !== 'unknown' && (
            <span className={`text-[10px] px-1 rounded ${
              item.type === 'array' ? 'text-cyber-green bg-cyber-green/10' :
              item.type === 'object' ? 'text-cyber-purple bg-cyber-purple/10' :
              item.type === 'number' ? 'text-cyber-orange bg-cyber-orange/10' :
              item.type === 'boolean' ? 'text-cyber-red bg-cyber-red/10' :
              'text-cyber-gray-light bg-cyber-gray/10'
            }`}>
              {item.type}
            </span>
          )}
          
          {item.description && (
            <span className="text-cyber-gray-light text-[10px] truncate flex-1">
              {item.description}
            </span>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {item.children!.map((child, idx) => (
              <VariableItemRow 
                key={child.label + child.value + idx} 
                item={child} 
                depth={depth + 1} 
                onSelect={handleItemSelect} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      ref={pickerRef}
      className="fixed z-50 w-80 max-h-96 bg-cyber-darker border border-cyber-purple rounded-lg shadow-xl overflow-hidden"
      style={{
        top: position?.top ?? 100,
        left: position?.left ?? 100,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-cyber-gray bg-cyber-dark">
        <span className="text-sm font-mono text-cyber-purple flex items-center gap-2">
          <span>{'{{ }}'}</span> INSERT VARIABLE
        </span>
        <button
          onClick={onClose}
          className="text-cyber-gray-light hover:text-cyber-red text-lg transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-cyber-gray">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search variables..."
          className="w-full px-2 py-1 text-xs font-mono bg-cyber-dark border border-cyber-gray rounded text-cyber-gray-light focus:border-cyber-purple focus:outline-none"
          autoFocus
        />
      </div>

      {/* Variable Sections */}
      <div className="overflow-y-auto max-h-72 cyber-scrollbar">
        {variableTree.map(section => {
          const filteredItems = filterItems(section.items);
          if (searchTerm && filteredItems.length === 0) return null;

          return (
            <div key={section.id} className="border-b border-cyber-gray/30 last:border-b-0">
              {/* Section Header */}
              <div
                className="flex items-center gap-2 px-3 py-2 bg-cyber-dark cursor-pointer hover:bg-cyber-gray/10"
                onClick={() => toggleSection(section.id)}
              >
                <span className="text-cyber-purple">{section.icon}</span>
                <span className="text-xs font-mono text-cyber-gray-light flex-1">
                  {section.label}
                </span>
                <span className="text-cyber-gray-light text-xs">
                  {expandedSections.has(section.id) ? '▼' : '▶'}
                </span>
              </div>

              {/* Section Items */}
              {expandedSections.has(section.id) && (
                <div className="py-1">
                  {(searchTerm ? filteredItems : section.items).map((item, idx) => (
                    <VariableItemRow 
                      key={item.label + item.value + idx} 
                      item={item} 
                      depth={0} 
                      onSelect={handleSelect} 
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Help */}
      <div className="p-2 border-t border-cyber-gray bg-cyber-dark">
        <p className="text-[10px] text-cyber-gray font-mono">
          Click to insert • Variables resolve at runtime
        </p>
      </div>
    </div>
  );
};

export default VariablePicker;
