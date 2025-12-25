import React from 'react';
import { useAccessStore, Protocol } from '../store/accessStore';
import ProtocolConnection from '../components/ProtocolConnection';

const AccessHub: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, addTab } = useAccessStore();
  const activeTab = tabs.find(t => t.id === activeTabId);

  const handleNewConnection = () => {
    // For now, just a placeholder or a modal could be opened
    const ip = prompt("Enter IP address:");
    if (ip) {
      addTab(ip, 'ssh');
    }
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">Access Hub</h2>
        <button 
          onClick={handleNewConnection}
          className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white px-4 py-2"
        >
          New Connection
        </button>
      </div>

      {/* Tabs Header */}
      <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar">
        {tabs.map(tab => (
          <div 
            key={tab.id}
            className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t border-x transition-all ${
              activeTabId === tab.id 
                ? 'bg-cyber-darker border-cyber-blue text-cyber-blue' 
                : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="text-xs font-mono uppercase">{tab.protocol}</span>
            <span className="text-sm font-bold">{tab.hostname || tab.ip}</span>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className="hover:text-cyber-red ml-2"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 bg-cyber-darker border border-cyber-gray rounded-lg overflow-hidden relative">
        {activeTab ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-cyber-purple font-bold uppercase text-xs">Target: {activeTab.ip}</span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 border ${
                  activeTab.status === 'connected' ? 'border-cyber-green text-cyber-green' :
                  activeTab.status === 'connecting' ? 'border-cyber-blue text-cyber-blue animate-pulse' :
                  activeTab.status === 'failed' ? 'border-cyber-red text-cyber-red' :
                  'border-cyber-gray text-cyber-gray'
                }`}>
                  {activeTab.status}
                </span>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <ProtocolConnection tab={activeTab} />
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-center items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-cyber-gray opacity-20">
                <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-cyber-gray-light font-mono uppercase tracking-widest">No Active Connections</p>
              <p className="text-xs text-cyber-gray">Select an asset from the dashboard or click "New Connection"</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessHub;