import axios from 'axios';

// Use relative path so Nginx proxy handles it
const API_URL = '/api/v1';

export interface Asset {
  id: string;
  ip_address: string;
  mac_address?: string;
  hostname?: string;
  asset_type: string;
  status: 'online' | 'offline';
  last_seen: string;
  vendor?: string;
  model?: string;
  os_name?: string;
  open_ports?: number[];
}

export const assetService = {
  getAssets: async (token: string, status?: string): Promise<Asset[]> => {
    const params: any = { page: 1, size: 100 };
    if (status) {
      params.status = status;
    }
    
    try {
      const response = await axios.get(`${API_URL}/assets/`, {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      return response.data.assets || [];
    } catch (error) {
      console.error('Asset fetch error:', error);
      throw error;
    }
  },

  startScan: async (token: string): Promise<void> => {
    // The backend expects a POST to /api/v1/discovery/scan with a network range
    // We'll scan the test network range
    await axios.post(`${API_URL}/discovery/scan`, {
      network: '172.21.0.0/24',
      scan_type: 'basic'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};
