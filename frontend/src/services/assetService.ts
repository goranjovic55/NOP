import axios from 'axios';

// Use relative path so Nginx proxy handles it
const API_URL = '/api/v1';

export interface Asset {
  id: string;
  ip_address: string;
  mac_address?: string;
  hostname?: string;
  asset_type: string;
  status: 'online' | 'offline' | 'unknown';
  last_seen: string;
  vendor?: string;
  model?: string;
  os_name?: string;
  open_ports?: number[];
  discovery_method?: string;
  services?: Record<string, { service: string; version?: string }>;
  vulnerable_count?: number;
  has_been_accessed?: boolean;
  has_been_exploited?: boolean;
}

export const assetService = {
  getAssets: async (token: string, status?: string, agentPOV?: string): Promise<Asset[]> => {
    const params: any = { page: 1, size: 500 };  // Increased from 100 to handle more assets
    if (status) {
      params.status = status;
    }

    const headers: any = { Authorization: `Bearer ${token}` };
    if (agentPOV) {
      headers['X-Agent-POV'] = agentPOV;
    }

    try {
      const response = await axios.get(`${API_URL}/assets/`, {
        headers,
        params
      });
      return response.data.assets || [];
    } catch (error) {
      console.error('Asset fetch error:', error);
      throw error;
    }
  },

  startScan: async (token: string, network: string = '172.21.0.0/24', scanType: string = 'basic'): Promise<any> => {
    const response = await axios.post(`${API_URL}/discovery/scan`, {
      network: network,
      scan_type: scanType
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  deleteAllAssets: async (token: string): Promise<void> => {
    await axios.delete(`${API_URL}/assets/clear-all`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getScanStatus: async (token: string, scanId: string): Promise<any> => {
    const response = await axios.get(`${API_URL}/discovery/scans/${scanId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  importPassiveDiscovery: async (token: string): Promise<void> => {
    await axios.post(`${API_URL}/discovery/passive-discovery/import`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
