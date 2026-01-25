/**
 * DPI Topology Panel Component - Cyberpunk Styled
 * 
 * Displays Deep Packet Inspection information including:
 * - VLAN topology
 * - LLDP/CDP discovered network devices
 * - Multicast group membership
 * - Device classifications
 */

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { 
  protocolAnalysisService, 
  TopologySummary, 
  VLANTopology, 
  MulticastGroup, 
  LLDPNeighbor,
  CDPNeighbor
} from '../services/protocolAnalysisService';

interface DPITopologyPanelProps {
  collapsed?: boolean;
  onToggle?: () => void;
  className?: string;
}

export const DPITopologyPanel: React.FC<DPITopologyPanelProps> = ({ 
  collapsed = false, 
  onToggle,
  className = ''
}) => {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  // DPI data state
  const [summary, setSummary] = useState<TopologySummary | null>(null);
  const [vlans, setVlans] = useState<VLANTopology | null>(null);
  const [multicastGroups, setMulticastGroups] = useState<MulticastGroup[]>([]);
  const [lldpNeighbors, setLldpNeighbors] = useState<LLDPNeighbor[]>([]);
  const [cdpNeighbors, setCdpNeighbors] = useState<CDPNeighbor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'summary' | 'vlans' | 'multicast' | 'neighbors'>('summary');

  // Fetch DPI data
  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const [summaryData, vlanData, multicastData, lldpData, cdpData] = await Promise.all([
          protocolAnalysisService.getTopologySummary(token, activeAgent),
          protocolAnalysisService.getVLANTopology(token, activeAgent),
          protocolAnalysisService.getMulticastGroups(token, activeAgent),
          protocolAnalysisService.getLLDPNeighbors(token, activeAgent),
          protocolAnalysisService.getCDPNeighbors(token, activeAgent)
        ]);
        
        setSummary(summaryData);
        setVlans(vlanData);
        setMulticastGroups(multicastData);
        setLldpNeighbors(lldpData);
        setCdpNeighbors(cdpData);
      } catch (err) {
        console.error('Failed to fetch DPI data:', err);
        setError('Failed to load DPI data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh every 5 seconds
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token, activeAgent]);

  if (collapsed) {
    return (
      <div 
        className={`bg-cyber-black border border-cyber-red/30 p-2 cursor-pointer hover:border-cyber-red hover:shadow-cyber transition-all ${className}`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-cyber-red font-mono font-bold uppercase tracking-wider">DPI</span>
          <span className="text-cyber-gray-light text-xs">▸</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-cyber-black border border-cyber-red/30 flex flex-col shadow-cyber ${className}`}>
      {/* Header - Cyberpunk styled */}
      <div className="p-3 border-b border-cyber-red/30 flex items-center justify-between bg-cyber-dark/50">
        <span 
          className="text-xs text-cyber-red font-mono font-bold uppercase tracking-widest flex items-center"
          style={{ textShadow: '0 0 8px rgba(255, 0, 64, 0.5)' }}
        >
          <span className="mr-2">◆</span> DEEP PACKET INSPECTION
        </span>
        {onToggle && (
          <button 
            onClick={onToggle}
            className="text-cyber-gray-light hover:text-cyber-red text-xs transition-colors"
          >
            ◂
          </button>
        )}
      </div>

      {/* Section Tabs - Cyberpunk styled */}
      <div className="flex border-b border-cyber-gray/50 bg-cyber-dark/30">
        {[
          { id: 'summary', label: 'SUMMARY', color: 'red' },
          { id: 'vlans', label: 'VLANS', color: 'blue' },
          { id: 'multicast', label: 'MCAST', color: 'green' },
          { id: 'neighbors', label: 'NEIGHBOR', color: 'purple' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex-1 px-2 py-2 text-[9px] font-mono font-bold uppercase tracking-wider transition-all ${
              activeSection === tab.id 
                ? `text-cyber-${tab.color} border-b-2 border-cyber-${tab.color} bg-cyber-${tab.color}/10` 
                : 'text-cyber-gray-light hover:text-cyber-gray-light hover:bg-cyber-gray/10'
            }`}
            style={activeSection === tab.id ? { textShadow: `0 0 6px var(--tw-shadow-color)` } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading && !summary ? (
          <div className="flex items-center justify-center py-4">
            <span className="text-cyber-red text-xs font-mono animate-pulse">LOADING DPI DATA...</span>
          </div>
        ) : error ? (
          <div className="text-cyber-red text-xs text-center py-4 font-mono">{error}</div>
        ) : (
          <>
            {/* Summary Section */}
            {activeSection === 'summary' && summary && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-cyber-dark p-3 border border-cyber-blue/30 hover:border-cyber-blue transition-colors">
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider">VLANs</div>
                    <div 
                      className="text-xl text-cyber-blue font-mono font-bold"
                      style={{ textShadow: '0 0 10px #00d4ff' }}
                    >
                      {summary.vlans.length}
                    </div>
                  </div>
                  <div className="bg-cyber-dark p-3 border border-cyber-green/30 hover:border-cyber-green transition-colors">
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider">Multicast</div>
                    <div 
                      className="text-xl text-cyber-green font-mono font-bold"
                      style={{ textShadow: '0 0 10px #00ff88' }}
                    >
                      {summary.multicast_groups}
                    </div>
                  </div>
                  <div className="bg-cyber-dark p-3 border border-cyber-purple/30 hover:border-cyber-purple transition-colors">
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider">LLDP</div>
                    <div 
                      className="text-xl text-cyber-purple font-mono font-bold"
                      style={{ textShadow: '0 0 10px #8b5cf6' }}
                    >
                      {summary.lldp_neighbors}
                    </div>
                  </div>
                  <div className="bg-cyber-dark p-3 border border-cyber-yellow/30 hover:border-cyber-yellow transition-colors">
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider">CDP</div>
                    <div 
                      className="text-xl text-cyber-yellow font-mono font-bold"
                      style={{ textShadow: '0 0 10px #ffff00' }}
                    >
                      {summary.cdp_neighbors}
                    </div>
                  </div>
                </div>
                
                {summary.stp_root_bridge && (
                  <div className="bg-cyber-dark p-3 border border-cyber-red/50">
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider">STP ROOT BRIDGE</div>
                    <div 
                      className="text-xs text-cyber-red font-mono mt-1"
                      style={{ textShadow: '0 0 6px #ff0040' }}
                    >
                      {summary.stp_root_bridge}
                    </div>
                  </div>
                )}

                {Object.keys(summary.classified_devices).length > 0 && (
                  <div>
                    <div className="text-[9px] text-cyber-gray-light uppercase font-mono tracking-wider mb-2">CLASSIFIED DEVICES</div>
                    <div className="space-y-1">
                      {Object.entries(summary.classified_devices).map(([id, type]) => (
                        <div key={id} className="flex justify-between text-xs font-mono bg-cyber-dark/50 p-1.5 border border-cyber-gray/20">
                          <span className="text-cyber-blue truncate max-w-[140px]">{id}</span>
                          <span className={`font-bold uppercase tracking-wider ${
                            type === 'switch' ? 'text-cyber-purple' :
                            type === 'router' ? 'text-cyber-yellow' :
                            'text-cyber-green'
                          }`}>{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* VLANs Section */}
            {activeSection === 'vlans' && vlans && (
              <div className="space-y-2">
                {vlans.total_vlans === 0 ? (
                  <div className="text-cyber-gray-light text-xs text-center py-4 font-mono">
                    NO VLANS DETECTED
                  </div>
                ) : (
                  Object.entries(vlans.vlans).map(([vlanId, macs]) => (
                    <div key={vlanId} className="bg-cyber-dark p-2 border border-cyber-blue/30 hover:border-cyber-blue transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span 
                          className="text-xs text-cyber-blue font-mono font-bold"
                          style={{ textShadow: '0 0 6px #00d4ff' }}
                        >
                          VLAN {vlanId}
                        </span>
                        <span className="text-[9px] text-cyber-gray-light font-mono">{macs.length} devices</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {macs.slice(0, 5).map(mac => (
                          <span key={mac} className="text-[8px] text-cyber-gray-light font-mono bg-cyber-black px-1 border border-cyber-gray/30">
                            {mac}
                          </span>
                        ))}
                        {macs.length > 5 && (
                          <span className="text-[8px] text-cyber-purple font-mono">+{macs.length - 5}</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Multicast Section */}
            {activeSection === 'multicast' && (
              <div className="space-y-2">
                {multicastGroups.length === 0 ? (
                  <div className="text-cyber-gray-light text-xs text-center py-4 font-mono">
                    NO MULTICAST GROUPS DETECTED
                  </div>
                ) : (
                  multicastGroups.map(group => (
                    <div key={group.group_address} className="bg-cyber-dark p-2 border border-cyber-green/30 hover:border-cyber-green transition-colors">
                      <div className="flex justify-between items-center mb-1">
                        <span 
                          className="text-xs text-cyber-green font-mono"
                          style={{ textShadow: '0 0 6px #00ff88' }}
                        >
                          {group.group_address}
                        </span>
                        <span className={`text-[8px] font-mono font-bold uppercase px-1.5 py-0.5 ${
                          group.protocol === 'mDNS' ? 'text-cyber-blue bg-cyber-blue/20 border border-cyber-blue/30' :
                          group.protocol === 'SSDP' ? 'text-cyber-purple bg-cyber-purple/20 border border-cyber-purple/30' :
                          group.protocol === 'IGMP' ? 'text-cyber-yellow bg-cyber-yellow/20 border border-cyber-yellow/30' :
                          'text-cyber-gray-light bg-cyber-gray/20 border border-cyber-gray/30'
                        }`}>{group.protocol}</span>
                      </div>
                      <div className="flex justify-between text-[9px] font-mono">
                        <span className="text-cyber-gray-light">{group.members.length} members</span>
                        <span className="text-cyber-gray-light">{group.packet_count} pkts</span>
                      </div>
                      {group.members.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.members.slice(0, 3).map(member => (
                            <span key={member} className="text-[8px] text-cyber-blue font-mono">
                              {member}
                            </span>
                          ))}
                          {group.members.length > 3 && (
                            <span className="text-[8px] text-cyber-purple font-mono">+{group.members.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Neighbors Section (LLDP/CDP) */}
            {activeSection === 'neighbors' && (
              <div className="space-y-3">
                {/* LLDP Neighbors */}
                <div>
                  <div 
                    className="text-[9px] text-cyber-purple font-mono font-bold uppercase tracking-wider mb-2"
                    style={{ textShadow: '0 0 6px #8b5cf6' }}
                  >
                    LLDP NEIGHBORS
                  </div>
                  {lldpNeighbors.length === 0 ? (
                    <div className="text-cyber-gray-light text-[10px] text-center py-2 font-mono">
                      NO LLDP NEIGHBORS
                    </div>
                  ) : (
                    lldpNeighbors.map(neighbor => (
                      <div key={neighbor.chassis_id} className="bg-cyber-dark p-2 border border-cyber-purple/30 mb-1 hover:border-cyber-purple transition-colors">
                        <div className="text-xs text-cyber-purple font-mono font-bold">
                          {neighbor.system_name || neighbor.chassis_id}
                        </div>
                        <div className="text-[8px] text-cyber-gray-light font-mono mt-1">
                          Chassis: {neighbor.chassis_id}
                        </div>
                        {neighbor.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {neighbor.capabilities.map(cap => (
                              <span key={cap} className="text-[7px] text-cyber-blue font-mono bg-cyber-blue/20 px-1 border border-cyber-blue/30">
                                {cap}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* CDP Neighbors */}
                <div>
                  <div 
                    className="text-[9px] text-cyber-yellow font-mono font-bold uppercase tracking-wider mb-2"
                    style={{ textShadow: '0 0 6px #ffff00' }}
                  >
                    CDP NEIGHBORS
                  </div>
                  {cdpNeighbors.length === 0 ? (
                    <div className="text-cyber-gray-light text-[10px] text-center py-2 font-mono">
                      NO CDP NEIGHBORS
                    </div>
                  ) : (
                    cdpNeighbors.map(neighbor => (
                      <div key={neighbor.device_id} className="bg-cyber-dark p-2 border border-cyber-yellow/30 mb-1 hover:border-cyber-yellow transition-colors">
                        <div className="text-xs text-cyber-yellow font-mono font-bold">{neighbor.device_id}</div>
                        {neighbor.platform && (
                          <div className="text-[8px] text-cyber-gray-light font-mono mt-1">{neighbor.platform}</div>
                        )}
                        {neighbor.addresses.length > 0 && (
                          <div className="text-[8px] text-cyber-blue font-mono mt-1">
                            {neighbor.addresses.join(', ')}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DPITopologyPanel;
