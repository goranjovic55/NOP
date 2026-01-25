/**
 * Protocol Analysis Service
 * 
 * Provides frontend access to DPI (Deep Packet Inspection) features
 * including topology discovery, protocol statistics, and VLAN/multicast tracking.
 */

import { getPOVHeaders } from '../context/POVContext';

// Types matching the backend DPI service

export interface VLANTopology {
  vlans: Record<number, string[]>;  // vlan_id -> list of MAC addresses
  total_vlans: number;
}

export interface MulticastGroup {
  group_address: string;
  protocol: string;
  members: string[];
  packet_count: number;
  first_seen: number;
  last_seen: number;
}

export interface LLDPNeighbor {
  chassis_id: string;
  port_id: string;
  ttl: number;
  system_name: string | null;
  system_description: string | null;
  capabilities: string[];
  source_mac: string | null;
  first_seen: number;
  last_seen: number;
}

export interface CDPNeighbor {
  device_id: string;
  platform: string | null;
  addresses: string[];
  capabilities: string[];
  source_mac: string | null;
  first_seen: number;
  last_seen: number;
}

export interface TopologySummary {
  lldp_neighbors: number;
  cdp_neighbors: number;
  vlans: number[];
  multicast_groups: number;
  stp_bridges: number;
  stp_root_bridge: string | null;
  classified_devices: Record<string, string>;  // mac/ip -> device_type
}

export interface DeviceType {
  identifier: string;
  device_type: 'switch' | 'router' | 'host';
}

export interface ProtocolPort {
  port: number;
  protocol: string;
  category: string;
  confidence: number;
}

export interface DPICapabilities {
  layers: {
    l2: {
      ethernet: boolean;
      vlan_8021q: boolean;
      lldp: boolean;
      cdp: boolean;
      stp: boolean;
    };
    l3: {
      ipv4: boolean;
      arp: boolean;
      icmp: boolean;
      igmp: boolean;
    };
    l4: {
      tcp: boolean;
      udp: boolean;
    };
    l7: {
      dns: boolean;
      http_detection: boolean;
      ssh_detection: boolean;
      tls_detection: boolean;
      industrial_protocols: string[];
    };
  };
  features: {
    vlan_tracking: boolean;
    multicast_tracking: boolean;
    device_classification: boolean;
    protocol_classification: boolean;
    topology_inference: boolean;
  };
}

class ProtocolAnalysisService {
  private baseUrl = '/api/v1/protocol-analysis';

  /**
   * Get topology summary with DPI-discovered network information
   */
  async getTopologySummary(token: string, activeAgent?: string | null): Promise<TopologySummary> {
    const response = await fetch(`${this.baseUrl}/topology/summary`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch topology summary: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get VLAN topology showing MAC addresses per VLAN
   */
  async getVLANTopology(token: string, activeAgent?: string | null): Promise<VLANTopology> {
    const response = await fetch(`${this.baseUrl}/topology/vlans`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch VLAN topology: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get multicast groups and their members
   */
  async getMulticastGroups(token: string, activeAgent?: string | null): Promise<MulticastGroup[]> {
    const response = await fetch(`${this.baseUrl}/topology/multicast`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch multicast groups: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get LLDP-discovered network devices (switches, routers)
   */
  async getLLDPNeighbors(token: string, activeAgent?: string | null): Promise<LLDPNeighbor[]> {
    const response = await fetch(`${this.baseUrl}/topology/lldp`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch LLDP neighbors: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get CDP-discovered Cisco devices
   */
  async getCDPNeighbors(token: string, activeAgent?: string | null): Promise<CDPNeighbor[]> {
    const response = await fetch(`${this.baseUrl}/topology/cdp`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch CDP neighbors: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get device type classification for a MAC or IP address
   */
  async getDeviceType(identifier: string, token: string, activeAgent?: string | null): Promise<DeviceType> {
    const response = await fetch(`${this.baseUrl}/device-type/${encodeURIComponent(identifier)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch device type: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get known protocols and their port mappings
   */
  async getKnownProtocols(token: string, activeAgent?: string | null): Promise<{ protocols: ProtocolPort[], total: number }> {
    const response = await fetch(`${this.baseUrl}/protocols/ports`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch known protocols: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Get DPI service capabilities
   */
  async getCapabilities(token: string, activeAgent?: string | null): Promise<DPICapabilities> {
    const response = await fetch(`${this.baseUrl}/capabilities`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch DPI capabilities: ${response.statusText}`);
    }
    
    return response.json();
  }

  /**
   * Clear topology tracking data
   */
  async clearTopologyData(token: string, activeAgent?: string | null): Promise<void> {
    const response = await fetch(`${this.baseUrl}/topology/clear`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        ...getPOVHeaders(activeAgent)
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear topology data: ${response.statusText}`);
    }
  }
}

export const protocolAnalysisService = new ProtocolAnalysisService();
