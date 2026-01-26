import axios from 'axios';

const API_URL = '/api/v1';

export interface BurstCaptureConnection {
  source: string;
  target: string;
  value: number;
  protocols?: string[];
  last_seen?: number;
  first_seen?: number;
  packet_count?: number;
}

export interface BurstCaptureResult {
  success: boolean;
  duration: number;
  connections: BurstCaptureConnection[];
  connection_count: number;
  current_time?: number;
}

export interface TrafficConnection {
  source: string;
  target: string;
  value: number;
  protocols?: string[];
  last_seen?: number | string;
  first_seen?: number | string;
  packet_count?: number;
}

export interface TrafficStats {
  total_flows: number;
  total_bytes: number;
  top_talkers: { ip: string; bytes: number }[];
  protocols: Record<string, number>;
  traffic_history: { time: string; value: number }[];
  connections: TrafficConnection[];
  current_time?: number;
  is_sniffing?: boolean;
  interface?: string;
}

export interface CaptureStatus {
  is_sniffing: boolean;
  interface: string | null;
  filter: string | null;
}

export const trafficService = {
  /**
   * Perform a burst capture for live topology updates.
   * This captures fresh traffic for the specified duration (1-10 seconds).
   */
  burstCapture: async (
    token: string, 
    durationSeconds: number = 1,
    agentPOV?: string,
    iface?: string
  ): Promise<BurstCaptureResult> => {
    const headers: Record<string, string> = { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const body: { duration_seconds: number; interface?: string } = { duration_seconds: durationSeconds };
    if (iface) {
      body.interface = iface;
    }
    const response = await axios.post(
      `${API_URL}/traffic/burst-capture`,
      body,
      { headers }
    );
    return response.data;
  },

  /**
   * Get current traffic stats (includes connections with timestamps)
   */
  getStats: async (token: string, agentPOV?: string): Promise<TrafficStats> => {
    const headers: Record<string, string> = { 
      Authorization: `Bearer ${token}` 
    };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/traffic/stats`, { headers });
    return response.data;
  },

  /**
   * Start persistent packet capture (continues when leaving page)
   */
  startCapture: async (
    token: string,
    iface: string = 'eth0',
    filter: string = ''
  ): Promise<{ success: boolean; is_sniffing: boolean }> => {
    const response = await axios.post(
      `${API_URL}/traffic/start-capture`,
      { interface: iface, filter },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  },

  /**
   * Stop persistent packet capture
   */
  stopCapture: async (token: string): Promise<{ success: boolean; was_sniffing: boolean }> => {
    const response = await axios.post(
      `${API_URL}/traffic/stop-capture`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  /**
   * Get current capture status
   */
  getCaptureStatus: async (token: string): Promise<CaptureStatus> => {
    const response = await axios.get(`${API_URL}/traffic/capture-status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Calculate visual properties for topology based on traffic data
   */
  calculateLinkVisuals: (
    link: { value: number; reverseValue?: number; last_seen?: number | string },
    currentTime: number
  ) => {
    const totalTraffic = link.value + (link.reverseValue || 0);
    
    // Link width: logarithmic scale, max 8px
    const MIN_WIDTH = 0.5;
    const MAX_WIDTH = 8;
    const width = totalTraffic > 0 
      ? Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.log10(totalTraffic + 1) * 2))
      : MIN_WIDTH;
    
    // Link brightness/opacity based on recency
    // 100% if traffic < 5 seconds ago, fades to 30% at 60+ seconds
    let opacity = 0.3; // Default dim for old/no timestamp
    if (link.last_seen) {
      const lastSeenTime = typeof link.last_seen === 'string' 
        ? new Date(link.last_seen).getTime() / 1000 
        : link.last_seen;
      const secondsAgo = currentTime - lastSeenTime;
      if (secondsAgo < 5) {
        opacity = 1.0;
      } else if (secondsAgo < 60) {
        opacity = 1.0 - (secondsAgo - 5) * (0.7 / 55); // Fade from 1.0 to 0.3
      } else {
        opacity = 0.3;
      }
    }
    
    return { width, opacity };
  },

  /**
   * Calculate node size based on connection count
   */
  calculateNodeSize: (connectionCount: number): number => {
    const MIN_SIZE = 4;
    const MAX_SIZE = 15;
    // Base size + log scale of connections
    return Math.min(MAX_SIZE, MIN_SIZE + Math.log10(connectionCount + 1) * 4);
  },

  /**
   * Get available network interfaces
   */
  getInterfaces: async (token: string, agentPOV?: string): Promise<NetworkInterface[]> => {
    const headers: Record<string, string> = { 
      Authorization: `Bearer ${token}` 
    };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/traffic/interfaces`, { headers });
    return response.data;
  }
};

/**
 * Network interface with activity data
 */
export interface NetworkInterface {
  name: string;
  ip?: string;
  mac?: string;
  is_up?: boolean;
  activity?: number[];
}

/**
 * L2 Entity (MAC-level)
 */
export interface L2Entity {
  mac: string;
  first_seen: number;
  last_seen: number;
  ips: string[];
  packets: number;
  bytes: number;
  vlans?: number[];         // VLAN IDs this entity belongs to
  device_type?: string;     // switch, cisco_device, ring_member, network_device
  hostname?: string;        // From LLDP/CDP
  platform?: string;        // From CDP
  ring_protocol?: string;   // REP, MRP, DLR, etc.
  ring_id?: string;
  stp_info?: {
    is_root: boolean;
    version: string;
  };
}

/**
 * L2 Connection (MAC to MAC)
 */
export interface L2Connection {
  src_mac: string;
  dst_mac: string;
  packets: number;
  bytes: number;
  ethertypes: string[];
  l2_protocols?: string[];  // Human-readable protocol names (STP, LLDP, CDP)
  is_control?: boolean;     // True if this is a control protocol connection
  vlan_ids?: number[];      // VLANs seen on this connection
  first_seen: number;
  last_seen: number;
}

/**
 * VLAN information
 */
export interface L2Vlan {
  vlan_id: number;
  name: string;
  members: string[];      // MAC addresses
  trunk_ports: string[];  // MACs that send tagged traffic
  packets: number;
  bytes: number;
  tagged: boolean;
}

/**
 * STP Bridge information
 */
export interface L2StpBridge {
  bridge_mac: string;
  root_id: number;
  root_mac: string;
  bridge_id: number;
  path_cost: number;
  port_id: number;
  is_root: boolean;
  topology_change: boolean;
  protocol_version: string;  // STP, RSTP, MSTP
  last_seen: number;
}

/**
 * LLDP Neighbor information
 */
export interface L2LldpNeighbor {
  mac: string;
  chassis_id?: string;
  port_id?: string;
  system_name?: string;
  system_description?: string;
  mgmt_ip?: string;
  capabilities?: string[];
  last_seen: number;
}

/**
 * CDP Neighbor information (Cisco)
 */
export interface L2CdpNeighbor {
  mac: string;
  device_id?: string;
  platform?: string;
  port_id?: string;
  ip?: string;
  software_version?: string;
  capabilities?: string[];
  last_seen: number;
}

/**
 * Ring topology information
 */
export interface L2RingTopology {
  ring_id: string;
  protocol: string;         // REP, MRP, DLR, PRP, HSR
  members: string[];        // MAC addresses
  state: string;
  primary_edge?: string;
  secondary_edge?: string;
  vlan_id?: number;
  last_seen: number;
}

/**
 * Multicast group for bus topology detection
 */
export interface MulticastGroup {
  group_mac: string;
  sources: string[];
  source_count: number;
  packets: number;
  bytes: number;
}

/**
 * L2 Topology data
 */
export interface L2Topology {
  entities: L2Entity[];
  connections: L2Connection[];
  multicast_groups: MulticastGroup[];
  vlans: L2Vlan[];
  stp_bridges: L2StpBridge[];
  lldp_neighbors: L2LldpNeighbor[];
  cdp_neighbors: L2CdpNeighbor[];
  ring_topologies: L2RingTopology[];
  entity_count: number;
  connection_count: number;
  multicast_group_count: number;
}

/**
 * Pattern analysis details
 */
export interface PatternInfo {
  classification: string;
  fingerprint: string;
  confidence: number;
  structure: {
    has_fixed_header: boolean;
    header_length: number;
    has_length_field: boolean;
    has_message_type: boolean;
    has_sequence: boolean;
    is_binary: boolean;
    entropy: number;
  };
  communication?: {
    type: string;
    confidence: number;
    details: Record<string, any>;
  };
  encapsulation?: {
    outer: string;
    inner_type: string;
    inner_offset: number;
  };
  evidence: Record<string, any>;
}

/**
 * Flow pattern (cyclic, master-slave, etc.)
 */
export interface FlowPattern {
  packet_count: number;
  bytes: number;
  cyclic?: {
    is_cyclic: boolean;
    period_ms: number;
    regularity: number;
    samples: number;
  };
  master_slave?: {
    is_master_slave: boolean;
    request_response_ratio: number;
    common_sizes: number[];
    samples: number;
  };
}

// Add L2 topology methods to trafficService
export const l2Service = {
  /**
   * Get L2 topology data (MAC-level)
   */
  getL2Topology: async (token: string): Promise<L2Topology> => {
    const response = await axios.get(`${API_URL}/traffic/l2/topology`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get L2 entities only
   */
  getL2Entities: async (token: string): Promise<{ entities: L2Entity[]; count: number }> => {
    const response = await axios.get(`${API_URL}/traffic/l2/entities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get L2 connections only
   */
  getL2Connections: async (token: string): Promise<{ connections: L2Connection[]; count: number }> => {
    const response = await axios.get(`${API_URL}/traffic/l2/connections`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get multicast groups for bus detection
   */
  getMulticastGroups: async (token: string): Promise<{ groups: MulticastGroup[]; count: number }> => {
    const response = await axios.get(`${API_URL}/traffic/l2/multicast-groups`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};

// Pattern detection service
export const patternService = {
  /**
   * Get detected flow patterns (cyclic, master-slave, etc.)
   */
  getFlowPatterns: async (token: string): Promise<{ patterns: Record<string, FlowPattern> }> => {
    const response = await axios.get(`${API_URL}/traffic/patterns/flows`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Get multicast bus groups from pattern detection
   */
  getMulticastBusTopology: async (token: string): Promise<{ bus_groups: Record<string, any> }> => {
    const response = await axios.get(`${API_URL}/traffic/patterns/multicast-bus`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  /**
   * Label a detected protocol fingerprint with a custom name
   */
  labelFingerprint: async (token: string, fingerprint: string, label: string): Promise<{ success: boolean }> => {
    const response = await axios.post(
      `${API_URL}/traffic/patterns/label`,
      { fingerprint, label },
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } }
    );
    return response.data;
  }
};
