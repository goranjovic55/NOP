import React from 'react';
import { CyberCard } from '../CyberUI';

interface AgentStatusWidgetProps {
  online: number;
  offline: number;
  error: number;
  total: number;
  onClick?: () => void;
}

const AgentStatusWidget: React.FC<AgentStatusWidgetProps> = ({
  online,
  offline,
  error,
  total,
  onClick
}) => {
  const getStatusIcon = () => {
    if (error > 0) return { icon: '⚠', color: 'text-cyber-red' };
    if (offline > 0 && online === 0) return { icon: '○', color: 'text-cyber-gray-light' };
    if (online === total) return { icon: '●', color: 'text-cyber-green' };
    return { icon: '◐', color: 'text-yellow-400' };
  };

  const status = getStatusIcon();

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-3"
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-mono text-cyber-gray-light uppercase tracking-wider mb-1">Agents</h4>
          <div className="flex items-center gap-2">
            <span className={`text-2xl ${status.color}`}>{status.icon}</span>
            <div>
              <span className="text-xl font-bold font-mono text-cyber-green">{online}</span>
              <span className="text-cyber-gray-light font-mono">/</span>
              <span className="text-lg font-mono text-cyber-gray-light">{total}</span>
            </div>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="w-2 h-2 rounded-full bg-cyber-green"></span>
            <span className="text-[10px] font-mono text-cyber-gray-light">Online: {online}</span>
          </div>
          <div className="flex items-center justify-end gap-1">
            <span className="w-2 h-2 rounded-full bg-cyber-gray"></span>
            <span className="text-[10px] font-mono text-cyber-gray-light">Offline: {offline}</span>
          </div>
          {error > 0 && (
            <div className="flex items-center justify-end gap-1">
              <span className="w-2 h-2 rounded-full bg-cyber-red"></span>
              <span className="text-[10px] font-mono text-cyber-red">Error: {error}</span>
            </div>
          )}
        </div>
      </div>
    </CyberCard>
  );
};

export default AgentStatusWidget;
