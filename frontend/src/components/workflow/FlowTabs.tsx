/**
 * FlowTabs - Tab bar for multiple open flows
 * Supports switching between flows and closing tabs
 */

import React from 'react';

interface FlowTab {
  workflowId: string;
  name: string;
  isDirty: boolean;
}

interface FlowTabsProps {
  tabs: FlowTab[];
  activeTabId: string | null;
  onSwitchTab: (id: string) => void;
  onCloseTab: (id: string) => void;
}

const FlowTabs: React.FC<FlowTabsProps> = ({ 
  tabs, 
  activeTabId, 
  onSwitchTab, 
  onCloseTab 
}) => {
  if (tabs.length === 0) return null;

  const handleClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    onCloseTab(tabId);
  };

  return (
    <div className="flex items-center gap-1 bg-cyber-darker border-b border-cyber-gray px-2 py-1 overflow-x-auto">
      {tabs.map((tab, index) => (
        <div
          key={tab.workflowId}
          onClick={() => onSwitchTab(tab.workflowId)}
          className={`
            group flex items-center gap-2 px-3 py-1.5 cursor-pointer
            border-b-2 transition-all min-w-0 max-w-[180px]
            ${tab.workflowId === activeTabId
              ? 'border-cyber-purple bg-cyber-dark text-cyber-purple'
              : 'border-transparent text-cyber-gray-light hover:text-cyber-purple hover:bg-cyber-dark/50'
            }
          `}
        >
          {/* Tab index shortcut hint */}
          {index < 9 && (
            <span className="text-[10px] text-cyber-gray/50 font-mono">
              ⌘{index + 1}
            </span>
          )}
          
          {/* Flow icon */}
          <span className="text-sm">◇</span>
          
          {/* Tab name */}
          <span className="font-mono text-sm truncate flex-1">
            {tab.name}
          </span>
          
          {/* Dirty indicator */}
          {tab.isDirty && (
            <span className="w-2 h-2 bg-cyber-purple rounded-full" title="Unsaved changes" />
          )}
          
          {/* Close button */}
          <button
            onClick={(e) => handleClose(e, tab.workflowId)}
            className="opacity-0 group-hover:opacity-100 text-cyber-gray hover:text-cyber-red transition-all p-0.5"
            title="Close tab"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default FlowTabs;
