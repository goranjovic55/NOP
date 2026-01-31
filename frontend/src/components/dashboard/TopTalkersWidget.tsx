import React, { useState } from 'react';
import { CyberCard } from '../CyberUI';

interface TopTalker {
  ip_address: string;
  hostname?: string;
  bytes_sent: number;
  bytes_received: number;
  total_bytes: number;
  connection_count: number;
}

interface TopVulnerableHost {
  ip_address: string;
  hostname?: string;
  critical_count: number;
  high_count: number;
  total_count: number;
}

interface TopTalkersWidgetProps {
  talkers: TopTalker[];
  vulnerableHosts: TopVulnerableHost[];
  onClick?: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const TopTalkersWidget: React.FC<TopTalkersWidgetProps> = ({
  talkers,
  vulnerableHosts,
  onClick
}) => {
  const [activeTab, setActiveTab] = useState<'talkers' | 'vulns'>('talkers');

  return (
    <CyberCard 
      interactive={!!onClick}
      onClick={onClick}
      className="p-3 h-full"
    >
      {/* Tab Headers */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('talkers'); }}
          className={`text-[10px] font-mono uppercase px-2 py-1 border transition-colors ${
            activeTab === 'talkers'
              ? 'border-cyber-blue text-cyber-blue bg-cyber-blue/10'
              : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue'
          }`}
        >
          Top Talkers
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); setActiveTab('vulns'); }}
          className={`text-[10px] font-mono uppercase px-2 py-1 border transition-colors ${
            activeTab === 'vulns'
              ? 'border-cyber-red text-cyber-red bg-cyber-red/10'
              : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
          }`}
        >
          Most Vulnerable
        </button>
      </div>

      {/* Tab Content */}
      <div className="space-y-2">
        {activeTab === 'talkers' ? (
          talkers.length > 0 ? (
            talkers.slice(0, 5).map((talker, idx) => {
              const maxBytes = Math.max(...talkers.map(t => t.total_bytes), 1);
              const pct = (talker.total_bytes / maxBytes) * 100;
              return (
                <div key={talker.ip_address} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyber-gray-light w-3">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-cyber-blue truncate max-w-[120px]">
                        {talker.hostname || talker.ip_address}
                      </span>
                      <span className="text-[10px] font-mono text-cyber-green">
                        {formatBytes(talker.total_bytes)}
                      </span>
                    </div>
                    <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyber-blue transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-cyber-gray-light text-xs font-mono text-center py-4">No traffic data</p>
          )
        ) : (
          vulnerableHosts.length > 0 ? (
            vulnerableHosts.slice(0, 5).map((host, idx) => {
              const maxVulns = Math.max(...vulnerableHosts.map(h => h.total_count), 1);
              const pct = (host.total_count / maxVulns) * 100;
              return (
                <div key={host.ip_address} className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-cyber-gray-light w-3">{idx + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-cyber-blue truncate max-w-[120px]">
                        {host.hostname || host.ip_address}
                      </span>
                      <div className="flex items-center gap-1">
                        {host.critical_count > 0 && (
                          <span className="text-[10px] font-mono text-cyber-red">C:{host.critical_count}</span>
                        )}
                        {host.high_count > 0 && (
                          <span className="text-[10px] font-mono text-orange-500">H:{host.high_count}</span>
                        )}
                        <span className="text-[10px] font-mono text-yellow-400">T:{host.total_count}</span>
                      </div>
                    </div>
                    <div className="h-1 bg-cyber-dark rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyber-red transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-cyber-gray-light text-xs font-mono text-center py-4">No vulnerabilities</p>
          )
        )}
      </div>
    </CyberCard>
  );
};

export default TopTalkersWidget;
