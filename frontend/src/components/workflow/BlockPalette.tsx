/**
 * BlockPalette - Sidebar with draggable blocks
 */

import React, { useState } from 'react';
import { 
  BLOCK_DEFINITIONS, 
  CATEGORY_COLORS, 
  CATEGORY_ICONS,
  getAllCategories 
} from '../../types/blocks';
import { BlockCategory, BlockDefinition } from '../../types/workflow';

interface BlockPaletteProps {
  isOpen: boolean;
  onToggle: () => void;
}

const BlockPalette: React.FC<BlockPaletteProps> = ({ isOpen, onToggle }) => {
  const [expandedCategory, setExpandedCategory] = useState<BlockCategory | null>('control');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = getAllCategories();

  const filteredBlocks = searchTerm
    ? BLOCK_DEFINITIONS.filter(b => 
        b.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : BLOCK_DEFINITIONS;

  const onDragStart = (event: React.DragEvent, block: BlockDefinition) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify({
      type: block.type,
      label: block.label,
      category: block.category,
      icon: block.icon,
      color: block.color,
    }));
    event.dataTransfer.effectAllowed = 'move';
  };

  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed left-0 top-1/2 -translate-y-1/2 bg-gray-800 p-2 rounded-r-lg border border-l-0 border-gray-700 hover:bg-gray-700 z-50"
      >
        <span className="text-white">→</span>
      </button>
    );
  }

  return (
    <div className="w-64 h-full bg-gray-900 border-r border-gray-700 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold">Blocks</h3>
        <button 
          onClick={onToggle}
          className="text-gray-400 hover:text-white"
        >
          ←
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-700">
        <input
          type="text"
          placeholder="Search blocks..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto">
        {searchTerm ? (
          // Show flat list when searching
          <div className="p-2 space-y-1">
            {filteredBlocks.map(block => (
              <BlockItem 
                key={block.type} 
                block={block} 
                onDragStart={onDragStart} 
              />
            ))}
            {filteredBlocks.length === 0 && (
              <div className="text-gray-500 text-sm text-center py-4">
                No blocks found
              </div>
            )}
          </div>
        ) : (
          // Show categorized list
          categories.map(category => (
            <CategorySection
              key={category}
              category={category}
              isExpanded={expandedCategory === category}
              onToggle={() => setExpandedCategory(
                expandedCategory === category ? null : category
              )}
              blocks={BLOCK_DEFINITIONS.filter(b => b.category === category)}
              onDragStart={onDragStart}
            />
          ))
        )}
      </div>

      {/* Help text */}
      <div className="p-2 border-t border-gray-700 text-xs text-gray-500 text-center">
        Drag blocks to canvas
      </div>
    </div>
  );
};

interface CategorySectionProps {
  category: BlockCategory;
  isExpanded: boolean;
  onToggle: () => void;
  blocks: BlockDefinition[];
  onDragStart: (e: React.DragEvent, block: BlockDefinition) => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  category,
  isExpanded,
  onToggle,
  blocks,
  onDragStart,
}) => {
  const color = CATEGORY_COLORS[category];
  const icon = CATEGORY_ICONS[category];

  return (
    <div className="border-b border-gray-800">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-800 transition-colors"
      >
        <span>{icon}</span>
        <span 
          className="text-sm font-medium capitalize"
          style={{ color }}
        >
          {category}
        </span>
        <span className="text-gray-500 text-xs ml-auto">
          {blocks.length}
        </span>
        <span className="text-gray-500">
          {isExpanded ? '▼' : '▶'}
        </span>
      </button>
      
      {isExpanded && (
        <div className="px-2 pb-2 space-y-1">
          {blocks.map(block => (
            <BlockItem 
              key={block.type} 
              block={block} 
              onDragStart={onDragStart} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface BlockItemProps {
  block: BlockDefinition;
  onDragStart: (e: React.DragEvent, block: BlockDefinition) => void;
}

const BlockItem: React.FC<BlockItemProps> = ({ block, onDragStart }) => {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, block)}
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-gray-600 transition-colors"
      title={block.description}
    >
      <span className="text-sm">{block.icon}</span>
      <span className="text-xs text-white truncate">{block.label}</span>
    </div>
  );
};

export default BlockPalette;
