/**
 * DPI Topology Panel Component
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
        className={`bg-cyber-darker border border-cyber-gray p-2 cursor-pointer hover:border-cyber-purple transition-colors ${className}`}
        onClick={onToggle}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs text-cyber-purple font-bold uppercase">DPI</span>
          <span className="text-cyber-gray-light text-xs">▸</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-cyber-darker border border-cyber-gray flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-cyber-gray flex items-center justify-between">
        <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest flex items-center">
          <span className="mr-2">◆</span> Deep Packet Inspection
        </span>
        {onToggle && (
          <button 
            onClick={onToggle}
            className="text-cyber-gray-light hover:text-cyber-purple text-xs"
          >
            ◂
          </button>
        )}
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-cyber-gray">
        {[
          { id: 'summary', label: 'Summary' },
          { id: 'vlans', label: 'VLANs' },
          { id: 'multicast', label: 'Multicast' },
          { id: 'neighbors', label: 'Neighbors' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id as any)}
            className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase transition-colors ${
              activeSection === tab.id 
                ? 'text-cyber-purple border-b-2 border-cyber-purple bg-cyber-purple/10' 
                : 'text-cyber-gray-light hover:text-cyber-blue'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        {loading && !summary ? (
          <div className="flex items-center justify-center py-4">
            <span className="text-cyber-gray-light text-xs animate-pulse">Loading DPI data...</span>
          </div>
        ) : error ? (
          <div className="text-cyber-red text-xs text-center py-4">{error}</div>
        ) : (
          <>
            {/* Summary Section */}
            {activeSection === 'summary' && summary && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-cyber-dark p-2 border border-cyber-gray">
                    <div className="text-[10px] text-cyber-gray-light uppercase">VLANs</div>
                    <div className="text-lg text-cyber-blue font-bold">{summary.vlans.length}</div>
                  </div>
                  <div className="bg-cyber-dark p-2 border border-cyber-gray">
                    <div className="text-[10px] text-cyber-gray-light uppercase">Multicast Groups</div>
                    <div className="text-lg text-cyber-green font-bold">{summary.multicast_groups}</div>
                  </div>
                  <div className="bg-cyber-dark p-2 border border-cyber-gray">
                    <div className="text-[10px] text-cyber-gray-light uppercase">LLDP Neighbors</div>
                    <div className="text-lg text-cyber-purple font-bold">{summary.lldp_neighbors}</div>
                  </div>
                  <div className="bg-cyber-dark p-2 border border-cyber-gray">
                    <div className="text-[10px] text-cyber-gray-light uppercase">CDP Neighbors</div>
                    <div className="text-lg text-cyber-yellow font-bold">{summary.cdp_neighbors}</div>
                  </div>
                </div>
                
                {summary.stp_root_bridge && (
                  <div className="bg-cyber-dark p-2 border border-cyber-purple">
                    <div className="text-[10px] text-cyber-gray-light uppercase">STP Root Bridge</div>
                    <div className="text-xs text-cyber-purple font-mono mt-1">{summary.stp_root_bridge}</div>
                  </div>
                )}

                {Object.keys(summary.classified_devices).length > 0 && (
                  <div>
                    <div className="text-[10px] text-cyber-gray-light uppercase mb-2">Classified Devices</div>
                    <div className="space-y-1">
                      {Object.entries(summary.classified_devices).map(([id, type]) => (
                        <div key={id} className="flex justify-between text-xs font-mono">
                          <span className="text-cyber-blue truncate max-w-[150px]">{id}</span>
                          <span className={`font-bold ${
                            type === 'switch' ? 'text-cyber-purple' :
                            type === 'router' ? 'text-cyber-yellow' :
                            'text-cyber-gray-light'
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
                  <div className="text-cyber-gray-light text-xs text-center py-4">
                    No VLANs detected. Capture VLAN-tagged traffic to see VLANs.
                  </div>
                ) : (
                  Object.entries(vlans.vlans).map(([vlanId, macs]) => (
                    <div key={vlanId} className="bg-cyber-dark p-2 border border-cyber-gray">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-cyber-blue font-bold">VLAN {vlanId}</span>
                        <span className="text-[10px] text-cyber-gray-light">{macs.length} devices</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {macs.slice(0, 5).map(mac => (
                          <span key={mac} className="text-[9px] text-cyber-gray-light font-mono bg-cyber-darker px-1">
                            {mac}
                          </span>
                        ))}
                        {macs.length > 5 && (
                          <span className="text-[9px] text-cyber-purple">+{macs.length - 5} more</span>
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
                  <div className="text-cyber-gray-light text-xs text-center py-4">
                    No multicast groups detected. Capture multicast traffic to see groups.
                  </div>
                ) : (
                  multicastGroups.map(group => (
                    <div key={group.group_address} className="bg-cyber-dark p-2 border border-cyber-gray">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-cyber-green font-mono">{group.group_address}</span>
                        <span className={`text-[9px] font-bold uppercase px-1 ${
                          group.protocol === 'mDNS' ? 'text-cyber-blue bg-cyber-blue/20' :
                          group.protocol === 'SSDP' ? 'text-cyber-purple bg-cyber-purple/20' :
                          group.protocol === 'IGMP' ? 'text-cyber-yellow bg-cyber-yellow/20' :
                          'text-cyber-gray-light bg-cyber-gray/20'
                        }`}>{group.protocol}</span>
                      </div>
                      <div className="flex justify-between text-[10px]">
                        <span className="text-cyber-gray-light">{group.members.length} members</span>
                        <span className="text-cyber-gray-light">{group.packet_count} packets</span>
                      </div>
                      {group.members.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {group.members.slice(0, 3).map(member => (
                            <span key={member} className="text-[9px] text-cyber-blue font-mono">
                              {member}
                            </span>
                          ))}
                          {group.members.length > 3 && (
                            <span className="text-[9px] text-cyber-purple">+{group.members.length - 3}</span>
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
                  <div className="text-[10px] text-cyber-purple font-bold uppercase mb-2">LLDP Neighbors</div>
                  {lldpNeighbors.length === 0 ? (
                    <div className="text-cyber-gray-light text-[10px] text-center py-2">
                      No LLDP neighbors detected
                    </div>
                  ) : (
                    lldpNeighbors.map(neighbor => (
                      <div key={neighbor.chassis_id} className="bg-cyber-dark p-2 border border-cyber-purple mb-1">
                        <div className="text-xs text-cyber-purple font-bold">
                          {neighbor.system_name || neighbor.chassis_id}
                        </div>
                        <div className="text-[9px] text-cyber-gray-light font-mono mt-1">
                          Chassis: {neighbor.chassis_id}
                        </div>
                        {neighbor.capabilities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {neighbor.capabilities.map(cap => (
                              <span key={cap} className="text-[8px] text-cyber-blue bg-cyber-blue/20 px-1">
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
                  <div className="text-[10px] text-cyber-yellow font-bold uppercase mb-2">CDP Neighbors</div>
                  {cdpNeighbors.length === 0 ? (
                    <div className="text-cyber-gray-light text-[10px] text-center py-2">
                      No CDP neighbors detected
                    </div>
                  ) : (
                    cdpNeighbors.map(neighbor => (
                      <div key={neighbor.device_id} className="bg-cyber-dark p-2 border border-cyber-yellow mb-1">
                        <div className="text-xs text-cyber-yellow font-bold">{neighbor.device_id}</div>
                        {neighbor.platform && (
                          <div className="text-[9px] text-cyber-gray-light mt-1">{neighbor.platform}</div>
                        )}
                        {neighbor.addresses.length > 0 && (
                          <div className="text-[9px] text-cyber-blue font-mono mt-1">
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
