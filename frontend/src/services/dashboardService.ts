import axios from 'axios';

const API_URL = '/api/v1';

export interface DashboardStats {
  total_assets: number;
  online_assets: number;
  offline_assets: number;
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
}

export interface SystemEvent {
  id: string;
  event_type: string;
  severity: string;
  title: string;
  description?: string;
  timestamp: string;
}

export const dashboardService = {
  getAssetStats: async (token: string): Promise<DashboardStats> => {
    const response = await axios.get(`${API_URL}/assets/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  getTrafficStats: async (token: string): Promise<TrafficStats> => {
    const response = await axios.get(`${API_URL}/traffic/stats`, {
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
