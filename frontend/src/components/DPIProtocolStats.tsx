/**
 * DPI Protocol Stats Component - Cyberpunk Styled
 * 
 * A compact stats bar showing protocol classification statistics
 * from Deep Packet Inspection data. Used in the Traffic page.
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { protocolAnalysisService, TopologySummary } from '../services/protocolAnalysisService';

interface DPIProtocolStatsProps {
  className?: string;
}

export const DPIProtocolStats: React.FC<DPIProtocolStatsProps> = ({ className = '' }) => {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  const [summary, setSummary] = useState<TopologySummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) return;
      
      try {
        const data = await protocolAnalysisService.getTopologySummary(token, activeAgent);
        setSummary(data);
      } catch (err) {
        console.error('Failed to fetch DPI stats:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [token, activeAgent]);

  if (loading && !summary) {
    return (
      <div className={`flex items-center gap-4 text-xs font-mono ${className}`}>
        <span className="text-cyber-red animate-pulse uppercase tracking-wider">Loading DPI...</span>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  // Count device types
  const deviceCounts = {
    switches: Object.values(summary.classified_devices).filter(t => t === 'switch').length,
    routers: Object.values(summary.classified_devices).filter(t => t === 'router').length,
    hosts: Object.values(summary.classified_devices).filter(t => t === 'host').length
  };

  return (
    <div className={`flex items-center gap-3 font-mono ${className}`}>
      {/* DPI Badge - Cyberpunk styled */}
      <span 
        className="text-[9px] text-cyber-red font-bold uppercase bg-cyber-red/20 px-2 py-0.5 border border-cyber-red/50 tracking-wider"
        style={{ textShadow: '0 0 6px rgba(255, 0, 64, 0.5)' }}
      >
        ◆ DPI
      </span>
      
      {/* VLANs */}
      <div className="flex items-center gap-1" title="VLAN IDs detected">
        <span 
          className="text-cyber-blue font-bold"
          style={{ textShadow: '0 0 6px #00d4ff' }}
        >
          {summary.vlans.length}
        </span>
        <span className="text-cyber-gray-light text-[9px] uppercase tracking-wider">VLANs</span>
      </div>
      
      {/* Multicast Groups */}
      <div className="flex items-center gap-1" title="Multicast groups detected">
        <span 
          className="text-cyber-green font-bold"
          style={{ textShadow: '0 0 6px #00ff88' }}
        >
          {summary.multicast_groups}
        </span>
        <span className="text-cyber-gray-light text-[9px] uppercase tracking-wider">MCast</span>
      </div>
      
      {/* LLDP/CDP Neighbors */}
      <div className="flex items-center gap-1" title="Network devices discovered via LLDP/CDP">
        <span 
          className="text-cyber-purple font-bold"
          style={{ textShadow: '0 0 6px #8b5cf6' }}
        >
          {summary.lldp_neighbors + summary.cdp_neighbors}
        </span>
        <span className="text-cyber-gray-light text-[9px] uppercase tracking-wider">Nbrs</span>
      </div>
      
      {/* Device Classification */}
      {(deviceCounts.switches > 0 || deviceCounts.routers > 0) && (
        <div className="flex items-center gap-2 border-l border-cyber-red/30 pl-3" title="Classified network devices">
          {deviceCounts.switches > 0 && (
            <span className="flex items-center gap-1">
              <span 
                className="text-cyber-purple text-[9px] font-bold"
                style={{ textShadow: '0 0 4px #8b5cf6' }}
              >
                {deviceCounts.switches}
              </span>
              <span className="text-cyber-gray-light text-[8px] uppercase">SW</span>
            </span>
          )}
          {deviceCounts.routers > 0 && (
            <span className="flex items-center gap-1">
              <span 
                className="text-cyber-yellow text-[9px] font-bold"
                style={{ textShadow: '0 0 4px #ffff00' }}
              >
                {deviceCounts.routers}
              </span>
              <span className="text-cyber-gray-light text-[8px] uppercase">RT</span>
            </span>
          )}
        </div>
      )}
      
      {/* STP Root Bridge */}
      {summary.stp_root_bridge && (
        <div 
          className="flex items-center gap-1 border-l border-cyber-red/30 pl-3" 
          title={`STP Root Bridge: ${summary.stp_root_bridge}`}
        >
          <span 
            className="text-cyber-yellow text-[9px] font-bold uppercase tracking-wider"
            style={{ textShadow: '0 0 4px #ffff00' }}
          >
            STP
          </span>
          <span className="text-cyber-yellow animate-pulse">●</span>
        </div>
      )}
    </div>
  );
};

export default DPIProtocolStats;
