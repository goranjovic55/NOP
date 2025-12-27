import apiClient from '../utils/apiClient';

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
      const response = await apiClient.get('/assets/', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      return response.data.assets || [];
    } catch (error) {
      console.error('Asset fetch error:', error);
      throw error;
    }
  },

  startScan: async (token: string, network: string = '172.21.0.0/24', scanType: string = 'basic'): Promise<any> => {
    const response = await apiClient.post('/discovery/scan', {
      network: network,
      scan_type: scanType
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  deleteAllAssets: async (token: string): Promise<void> => {
    await apiClient.delete('/assets/clear-all', {
      headers: { Authorization: `Bearer ${token}` }
    });
  },

  getScanStatus: async (token: string, scanId: string): Promise<any> => {
    const response = await apiClient.get(`/discovery/scans/${scanId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
