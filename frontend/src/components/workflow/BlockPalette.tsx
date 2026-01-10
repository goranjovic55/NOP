/**
 * BlockPalette - Cyberpunk-styled sidebar with draggable blocks
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
        className="w-8 h-full bg-cyber-dark border-r border-cyber-gray flex items-center justify-center hover:bg-cyber-purple/20 transition-all"
      >
        <span className="text-cyber-purple">▶</span>
      </button>
    );
  }

  return (
    <div className="w-64 h-full bg-cyber-darker border-r border-cyber-gray flex flex-col overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-cyber-gray flex items-center justify-between">
        <h3 className="text-cyber-purple font-mono flex items-center gap-2">
          <span>◈</span> BLOCKS
        </h3>
        <button 
          onClick={onToggle}
          className="text-cyber-gray-light hover:text-cyber-purple transition-colors"
        >
          ◀
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-cyber-gray">
        <input
          type="text"
          placeholder="[ SEARCH... ]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="cyber-input w-full text-sm"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto cyber-scrollbar">
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
              <div className="text-cyber-gray-light text-sm text-center py-4 font-mono">
                NO BLOCKS FOUND
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
      <div className="p-2 border-t border-cyber-gray text-xs text-cyber-gray-light text-center font-mono">
        ◇ DRAG TO CANVAS
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
    <div className="border-b border-cyber-gray/50">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-cyber-dark transition-colors group"
      >
        <span className="group-hover:animate-pulse">{icon}</span>
        <span 
          className="text-sm font-mono uppercase tracking-wide"
          style={{ color }}
        >
          {category}
        </span>
        <span className="text-cyber-gray-light text-xs ml-auto font-mono">
          [{blocks.length}]
        </span>
        <span className="text-cyber-gray-light">
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
      className="flex items-center gap-2 px-2 py-1.5 rounded cursor-grab bg-cyber-dark hover:bg-cyber-purple/20 border border-cyber-gray hover:border-cyber-purple/50 transition-all group"
      title={block.description}
    >
      <span className="text-sm group-hover:animate-pulse">{block.icon}</span>
      <span className="text-xs text-cyber-gray-light group-hover:text-white font-mono truncate">
        {block.label}
      </span>
    </div>
  );
};

export default BlockPalette;
