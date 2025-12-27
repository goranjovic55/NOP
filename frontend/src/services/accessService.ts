import apiClient from '../utils/apiClient';

export interface Credential {
  id: string;
  username: string;
  password?: string;
  private_key?: string;
}

export const accessService = {
  getCredentials: async (token: string, assetId: string, protocol: string): Promise<Credential[]> => {
    try {
      const response = await apiClient.get(`/access/credentials/${assetId}/${protocol}`);
      return response.data.credentials || [];
    } catch (error) {
      console.error('Credential fetch error:', error);
      return [];
    }
  },

  saveCredential: async (token: string, data: any) => {
    const response = await apiClient.post('/access/credentials', data);
    return response.data;
  },

  testSSH: async (token: string, data: any) => {
    const response = await apiClient.post('/access/test/ssh', data);
    return response.data;
  },

  executeSSH: async (token: string, data: any) => {
    const response = await apiClient.post('/access/execute/ssh', data);
    return response.data;
  },

  testTCP: async (token: string, data: any) => {
    const response = await apiClient.post('/access/test/tcp', data);
    return response.data;
  },

  testRDP: async (token: string, data: any) => {
    const response = await apiClient.post('/access/test/rdp', data);
    return response.data;
  },

  listFTP: async (token: string, data: any) => {
    const response = await apiClient.post('/access/ftp/list', data);
    return response.data;
  },

  downloadFTP: async (token: string, data: any) => {
    const response = await apiClient.post('/access/ftp/download', data);
    return response.data;
  },

  uploadFTP: async (token: string, data: any) => {
    const response = await apiClient.post('/access/ftp/upload', data);
    return response.data;
  }
};
