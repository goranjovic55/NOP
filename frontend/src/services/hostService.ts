import axios from 'axios';

// Use relative URL to go through the React dev server proxy
const API_URL = '/api/v1/host';

export interface SystemInfo {
  hostname: string;
  platform: string;
  platform_release: string;
  platform_version: string;
  architecture: string;
  processor: string;
  python_version: string;
  boot_time: string;
  network_interfaces?: Array<{
    name: string;
    address: string;
  }>;
}

export interface SystemMetrics {
  cpu: {
    percent_total: number;
    percent_per_core: number[];
    core_count: number;
    thread_count: number;
    frequency?: {
      current: number;
      min: number;
      max: number;
    };
  };
  memory: {
    total: number;
    available: number;
    used: number;
    free: number;
    percent: number;
    swap_total: number;
    swap_used: number;
    swap_free: number;
    swap_percent: number;
  };
  disk: Array<{
    device: string;
    mountpoint: string;
    fstype: string;
    total: number;
    used: number;
    free: number;
    percent: number;
  }>;
  network: {
    bytes_sent: number;
    bytes_recv: number;
    packets_sent: number;
    packets_recv: number;
    errin: number;
    errout: number;
    dropin: number;
    dropout: number;
  };
  processes: number;
  timestamp: string;
}

export interface Process {
  pid: number;
  name: string;
  username: string;
  cpu_percent: number;
  memory_percent: number;
  status: string;
}

export interface NetworkConnection {
  local_address: string;
  remote_address: string;
  status: string;
  pid: number | null;
  process: string;
  family: string;
  type: string;
}

export interface DiskIO {
  [disk: string]: {
    read_count: number;
    write_count: number;
    read_bytes: number;
    write_bytes: number;
    read_time: number;
    write_time: number;
  };
}

export interface FileSystemItem {
  name: string;
  path: string;
  type: 'file' | 'directory' | 'unknown';
  size?: number;
  modified?: string;
  permissions?: string;
  error?: string;
}

export interface FileSystemBrowse {
  current_path: string;
  parent_path: string | null;
  items: FileSystemItem[];
}

export interface FileContent {
  path: string;
  content: string;
  is_binary: boolean;
  size: number;
}

export const hostService = {
  getSystemInfo: async (token: string): Promise<SystemInfo> => {
    const url = `${API_URL}/system/info`;
    try {
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error: any) {
      console.error('[hostService.getSystemInfo] Error:', error.response?.status, error.message);
      throw error;
    }
  },

  getSystemMetrics: async (token: string): Promise<SystemMetrics> => {
    const response = await axios.get(`${API_URL}/system/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getProcesses: async (token: string, limit: number = 50): Promise<Process[]> => {
    const response = await axios.get(`${API_URL}/system/processes`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit },
    });
    return response.data;
  },

  getNetworkConnections: async (token: string, limit: number = 50): Promise<NetworkConnection[]> => {
    const response = await axios.get(`${API_URL}/system/connections`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit },
    });
    return response.data;
  },

  getDiskIO: async (token: string): Promise<DiskIO> => {
    const response = await axios.get(`${API_URL}/system/disk-io`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  browseFileSystem: async (token: string, path: string = '/'): Promise<FileSystemBrowse> => {
    const response = await axios.get(`${API_URL}/filesystem/browse`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  readFile: async (token: string, path: string): Promise<FileContent> => {
    const response = await axios.get(`${API_URL}/filesystem/read`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  writeFile: async (token: string, path: string, content: string): Promise<{ status: string; path: string; message: string }> => {
    const response = await axios.post(
      `${API_URL}/filesystem/write`,
      { path, content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  deletePath: async (token: string, path: string): Promise<{ status: string; message: string }> => {
    const response = await axios.delete(`${API_URL}/filesystem/delete`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  createTerminalConnection: (token: string): WebSocket => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/v1/host/terminal?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    return ws;
  },
};
