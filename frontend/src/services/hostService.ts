import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

export interface SystemInfo {
  hostname: string;
  platform: string;
  platform_release: string;
  platform_version: string;
  architecture: string;
  processor: string;
  python_version: string;
  boot_time: string;
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
    const response = await axios.get(`${API_URL}/api/v1/host/system/info`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getSystemMetrics: async (token: string): Promise<SystemMetrics> => {
    const response = await axios.get(`${API_URL}/api/v1/host/system/metrics`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  getProcesses: async (token: string, limit: number = 50): Promise<Process[]> => {
    const response = await axios.get(`${API_URL}/api/v1/host/system/processes`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit },
    });
    return response.data;
  },

  browseFileSystem: async (token: string, path: string = '/'): Promise<FileSystemBrowse> => {
    const response = await axios.get(`${API_URL}/api/v1/host/filesystem/browse`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  readFile: async (token: string, path: string): Promise<FileContent> => {
    const response = await axios.get(`${API_URL}/api/v1/host/filesystem/read`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  writeFile: async (token: string, path: string, content: string): Promise<{ status: string; path: string; message: string }> => {
    const response = await axios.post(
      `${API_URL}/api/v1/host/filesystem/write`,
      { path, content },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  },

  deletePath: async (token: string, path: string): Promise<{ status: string; message: string }> => {
    const response = await axios.delete(`${API_URL}/api/v1/host/filesystem/delete`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { path },
    });
    return response.data;
  },

  createTerminalConnection: (token: string): WebSocket => {
    const wsUrl = `${API_URL.replace('http', 'ws')}/api/v1/host/terminal?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);
    return ws;
  },
};
