import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const API_URL = API_BASE_URL;

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

// Phase 1: New Dashboard Types
export interface HealthScore {
  score: number;
  components: { hosts: number; vulns: number; agents: number };
  trend: 'up' | 'down' | 'stable';
}

export interface AlertSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface AgentSummary {
  online: number;
  offline: number;
  error: number;
  total: number;
}

export interface VulnerabilitySummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  total: number;
}

export interface TopTalker {
  ip_address: string;
  hostname?: string;
  bytes_sent: number;
  bytes_received: number;
  total_bytes: number;
  connection_count: number;
}

export interface TopVulnerableHost {
  ip_address: string;
  hostname?: string;
  critical_count: number;
  high_count: number;
  total_count: number;
}

export interface SparklineData {
  metric: string;
  values: number[];
  trend: 'up' | 'down' | 'stable';
  change_percent: number;
}

export interface SparklineResponse {
  discovered: SparklineData;
  online: SparklineData;
  scanned: SparklineData;
  vulnerable: SparklineData;
}

export interface DiscoveryTrendPoint {
  date: string;
  count: number;
}

export interface DiscoveryTrend {
  trend: DiscoveryTrendPoint[];
  total_period: number;
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
  },

  // Phase 1: New Dashboard Endpoints
  getHealthScore: async (token: string, agentPOV?: string): Promise<HealthScore> => {
    const headers: any = { Authorization: `Bearer ${token}` };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }
    const response = await axios.get(`${API_URL}/dashboard/health-score`, { headers });
    return response.data;
  },

  getAlertSummary: async (token: string, hours: number = 24): Promise<AlertSummary> => {
    const response = await axios.get(`${API_URL}/dashboard/alert-summary`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { hours }
    });
    return response.data;
  },

  getAgentSummary: async (token: string): Promise<AgentSummary> => {
    const response = await axios.get(`${API_URL}/dashboard/agent-summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getVulnerabilitySummary: async (token: string): Promise<VulnerabilitySummary> => {
    const response = await axios.get(`${API_URL}/dashboard/vulnerability-summary`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getTopTalkers: async (token: string, limit: number = 5): Promise<{ talkers: TopTalker[] }> => {
    const response = await axios.get(`${API_URL}/dashboard/top-talkers`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit }
    });
    return response.data;
  },

  getTopVulnerableHosts: async (token: string, limit: number = 5): Promise<{ hosts: TopVulnerableHost[] }> => {
    const response = await axios.get(`${API_URL}/dashboard/top-vulnerable`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit }
    });
    return response.data;
  },

  getSparklines: async (token: string, days: number = 7): Promise<SparklineResponse> => {
    const response = await axios.get(`${API_URL}/dashboard/sparklines`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { days }
    });
    return response.data;
  },

  getDiscoveryTrend: async (token: string, days: number = 30): Promise<DiscoveryTrend> => {
    const response = await axios.get(`${API_URL}/dashboard/discovery-trend`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { days }
    });
    return response.data;
  }
};
