import axios from 'axios';

const API_URL = '/api/v1/access';

export interface Credential {
  id: string;
  username: string;
  password?: string;
  private_key?: string;
}

export const accessService = {
  getCredentials: async (token: string, assetId: string, protocol: string): Promise<Credential[]> => {
    try {
      const response = await axios.get(`${API_URL}/credentials/${assetId}/${protocol}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data.credentials || [];
    } catch (error) {
      console.error('Credential fetch error:', error);
      return [];
    }
  },

  saveCredential: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/credentials`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  testSSH: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/test/ssh`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  executeSSH: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/execute/ssh`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  testTCP: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/test/tcp`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  testRDP: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/test/rdp`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  listFTP: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/ftp/list`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  downloadFTP: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/ftp/download`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  },

  uploadFTP: async (token: string, data: any) => {
    const response = await axios.post(`${API_URL}/ftp/upload`, data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
