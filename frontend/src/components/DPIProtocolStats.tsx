/**
 * DPI Protocol Stats Component
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
      <div className={`flex items-center gap-4 text-xs ${className}`}>
        <span className="text-cyber-gray-light animate-pulse">Loading DPI stats...</span>
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
    <div className={`flex items-center gap-3 ${className}`}>
      {/* DPI Badge */}
      <span className="text-[9px] text-cyber-purple font-bold uppercase bg-cyber-purple/20 px-1.5 py-0.5 border border-cyber-purple">
        DPI
      </span>
      
      {/* VLANs */}
      <div className="flex items-center gap-1" title="VLAN IDs detected">
        <span className="text-cyber-blue font-bold">{summary.vlans.length}</span>
        <span className="text-cyber-gray-light text-[10px]">VLANs</span>
      </div>
      
      {/* Multicast Groups */}
      <div className="flex items-center gap-1" title="Multicast groups detected">
        <span className="text-cyber-green font-bold">{summary.multicast_groups}</span>
        <span className="text-cyber-gray-light text-[10px]">MCast</span>
      </div>
      
      {/* LLDP/CDP Neighbors */}
      <div className="flex items-center gap-1" title="Network devices discovered via LLDP/CDP">
        <span className="text-cyber-purple font-bold">{summary.lldp_neighbors + summary.cdp_neighbors}</span>
        <span className="text-cyber-gray-light text-[10px]">Nbrs</span>
      </div>
      
      {/* Device Classification */}
      {(deviceCounts.switches > 0 || deviceCounts.routers > 0) && (
        <div className="flex items-center gap-1 border-l border-cyber-gray pl-2" title="Classified network devices">
          {deviceCounts.switches > 0 && (
            <span className="text-cyber-purple text-[10px]">{deviceCounts.switches} sw</span>
          )}
          {deviceCounts.routers > 0 && (
            <span className="text-cyber-yellow text-[10px]">{deviceCounts.routers} rt</span>
          )}
        </div>
      )}
      
      {/* STP Root Bridge */}
      {summary.stp_root_bridge && (
        <div className="flex items-center gap-1 border-l border-cyber-gray pl-2" title={`STP Root Bridge: ${summary.stp_root_bridge}`}>
          <span className="text-cyber-yellow text-[10px]">STP</span>
          <span className="text-cyber-yellow">●</span>
        </div>
      )}
    </div>
  );
};

export default DPIProtocolStats;
