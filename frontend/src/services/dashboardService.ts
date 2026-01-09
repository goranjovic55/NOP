import axios from 'axios';

const API_URL = '/api/v1';

export interface DashboardStats {
  total_assets: number;
  online_assets: number;
  offline_assets: number;
  scanned_assets: number;
  accessed_assets: number;
  vulnerable_assets: number;
  exploited_assets: number;
  by_type: Record<string, number>;
  by_vendor: Record<string, number>;
  recently_discovered: number;
  active_scans: number;
  active_connections: number;
}

export interface TrafficStats {
  total_flows: number;
  total_bytes: number;
  top_talkers: any[];
  protocols: Record<string, number>;
  traffic_history: { time: string; value: number }[];
  connections: { source: string; target: string; value: number; protocols?: string[]; last_seen?: number | string; first_seen?: number | string; packet_count?: number }[];
  current_time?: number;
}

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  description?: string;
  timestamp: string;
}

export interface ProtocolBreakdown {
  totals: { tcp: number; udp: number; icmp: number; other: number };
  time_series: { timestamp: string; tcp: number; udp: number; icmp: number; other: number }[];
}

export const dashboardService = {
  getAssetStats: async (token: string, agentPOV?: string): Promise<DashboardStats> => {
    const headers: any = { Authorization: `Bearer ${token}` };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/assets/stats`, { headers });
    return response.data;
  },

  getTrafficStats: async (token: string, agentPOV?: string): Promise<TrafficStats> => {
    const headers: any = { Authorization: `Bearer ${token}` };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/traffic/stats`, { headers });
    return response.data;
  },

  getProtocolBreakdown: async (token: string): Promise<ProtocolBreakdown> => {
    const response = await axios.get(`${API_URL}/traffic/protocol-breakdown`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getAccessStatus: async (token: string) => {
    const response = await axios.get(`${API_URL}/access/status`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getEvents: async (token: string, limit: number = 10): Promise<SystemEvent[]> => {
    const response = await axios.get(`${API_URL}/events/`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit }
    });
    return response.data;
  }
};
