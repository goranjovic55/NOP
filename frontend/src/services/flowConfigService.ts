/**
 * FlowConfigService - Provides NOP resource data for flow block configuration
 * Fetches discovered IPs, open ports, vault credentials for dynamic dropdowns
 */

import axios from 'axios';

const API_URL = '/api/v1';

// Helper to get auth token from persisted auth store
const getAuthToken = (): string | null => {
  try {
    const authData = localStorage.getItem('nop-auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      return parsed.state?.token || null;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
};

export interface DiscoveredHost {
  ip: string;
  hostname?: string;
  mac?: string;
  vendor?: string;
  status: 'online' | 'offline' | 'unknown';
}

export interface DiscoveredPort {
  port: number;
  protocol: string;
  service?: string;
  version?: string;
  host: string;
}

export interface VaultCredential {
  id: string;
  name: string;
  host: string;
  protocol: string;
  username: string;
  hasPassword: boolean;
  hasPrivateKey: boolean;
}

export interface FlowBlockConfig {
  nodeId: string;
  blockType: string;
  label: string;
  parameters: Record<string, any>;
}

export interface FlowConfigExport {
  version: string;
  flowId?: string;
  flowName: string;
  exportedAt: string;
  blocks: FlowBlockConfig[];
}

export const flowConfigService = {
  /**
   * Get all discovered hosts/IPs from NOP assets
   */
  getDiscoveredHosts: async (agentPOV?: string): Promise<DiscoveredHost[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (agentPOV) {
        headers['X-Agent-POV'] = agentPOV;
      }

      const response = await axios.get(`${API_URL}/assets/`, {
        headers,
        params: { page: 1, size: 500 }
      });

      const assets = response.data.assets || [];
      return assets.map((asset: any) => ({
        ip: asset.ip_address,
        hostname: asset.hostname,
        mac: asset.mac_address,
        vendor: asset.vendor,
        status: asset.status || 'unknown',
      }));
    } catch (error) {
      console.error('Failed to fetch discovered hosts:', error);
      return [];
    }
  },

  /**
   * Get all discovered open ports from NOP assets
   */
  getDiscoveredPorts: async (hostFilter?: string, agentPOV?: string): Promise<DiscoveredPort[]> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (agentPOV) {
        headers['X-Agent-POV'] = agentPOV;
      }

      const response = await axios.get(`${API_URL}/assets/`, {
        headers,
        params: { page: 1, size: 500 }
      });

      const assets = response.data.assets || [];
      const ports: DiscoveredPort[] = [];

      assets.forEach((asset: any) => {
        if (hostFilter && asset.ip_address !== hostFilter) return;

        // Get open ports array
        if (asset.open_ports) {
          asset.open_ports.forEach((port: number) => {
            const serviceInfo = asset.services?.[String(port)];
            ports.push({
              port,
              protocol: 'tcp',
              service: serviceInfo?.service,
              version: serviceInfo?.version,
              host: asset.ip_address,
            });
          });
        }
      });

      return ports;
    } catch (error) {
      console.error('Failed to fetch discovered ports:', error);
      return [];
    }
  },

  /**
   * Get saved credentials from vault (localStorage for now)
   */
  getVaultCredentials: async (): Promise<VaultCredential[]> => {
    try {
      // Check localStorage vault (current implementation)
      const stored = localStorage.getItem('vaultCredentials');
      if (stored) {
        const creds = JSON.parse(stored);
        return creds.map((c: any) => ({
          id: c.id,
          name: c.name || `${c.username}@${c.host}`,
          host: c.host,
          protocol: c.protocol || 'ssh',
          username: c.username,
          hasPassword: !!c.password,
          hasPrivateKey: !!c.privateKey,
        }));
      }
    } catch (e) {
      console.error('Failed to load vault credentials', e);
    }

    // Also try to get from backend API
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await axios.get(`${API_URL}/credentials/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return (response.data.credentials || []).map((c: any) => ({
        id: c.id,
        name: c.name || c.label || `${c.username}@${c.host}`,
        host: c.host || '*',
        protocol: c.protocol || c.type || 'ssh',
        username: c.username,
        hasPassword: !!c.password || !!c.encrypted_password,
        hasPrivateKey: !!c.private_key,
      }));
    } catch (error) {
      console.error('Failed to fetch credentials from API:', error);
      return [];
    }
  },

  /**
   * Export block configurations to a config file
   */
  exportBlockConfig: (
    flowName: string,
    blocks: FlowBlockConfig[],
    flowId?: string
  ): FlowConfigExport => {
    return {
      version: '1.0',
      flowId,
      flowName,
      exportedAt: new Date().toISOString(),
      blocks,
    };
  },

  /**
   * Parse and validate imported block config
   */
  parseBlockConfig: (jsonString: string): FlowConfigExport | null => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate structure
      if (!parsed.version || !parsed.blocks || !Array.isArray(parsed.blocks)) {
        console.error('Invalid config format');
        return null;
      }

      return parsed as FlowConfigExport;
    } catch (error) {
      console.error('Failed to parse config:', error);
      return null;
    }
  },

  /**
   * Download config as JSON file
   */
  downloadConfig: (config: FlowConfigExport): void => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flow-config-${config.flowName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  /**
   * Import config from file
   */
  importConfig: (): Promise<FlowConfigExport> => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) {
          reject(new Error('No file selected'));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          const config = flowConfigService.parseBlockConfig(reader.result as string);
          if (config) {
            resolve(config);
          } else {
            reject(new Error('Invalid config file'));
          }
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
      };

      input.click();
    });
  },

  /**
   * Get common port suggestions based on service type
   */
  getCommonPorts: (serviceType?: string): Array<{ port: number; label: string }> => {
    const allPorts = [
      { port: 22, label: 'SSH (22)' },
      { port: 23, label: 'Telnet (23)' },
      { port: 21, label: 'FTP (21)' },
      { port: 80, label: 'HTTP (80)' },
      { port: 443, label: 'HTTPS (443)' },
      { port: 3389, label: 'RDP (3389)' },
      { port: 5900, label: 'VNC (5900)' },
      { port: 3306, label: 'MySQL (3306)' },
      { port: 5432, label: 'PostgreSQL (5432)' },
      { port: 6379, label: 'Redis (6379)' },
      { port: 27017, label: 'MongoDB (27017)' },
      { port: 8080, label: 'HTTP Alt (8080)' },
      { port: 8443, label: 'HTTPS Alt (8443)' },
      { port: 445, label: 'SMB (445)' },
      { port: 139, label: 'NetBIOS (139)' },
      { port: 53, label: 'DNS (53)' },
      { port: 25, label: 'SMTP (25)' },
      { port: 110, label: 'POP3 (110)' },
      { port: 143, label: 'IMAP (143)' },
      { port: 161, label: 'SNMP (161)' },
    ];

    if (!serviceType) return allPorts;

    // Filter by service type
    const servicePortMap: Record<string, number[]> = {
      ssh: [22],
      rdp: [3389],
      vnc: [5900, 5901, 5902],
      ftp: [21, 22], // SFTP uses 22
      http: [80, 8080, 8000],
      https: [443, 8443],
      database: [3306, 5432, 6379, 27017],
    };

    const relevantPorts = servicePortMap[serviceType.toLowerCase()];
    if (relevantPorts) {
      return allPorts.filter(p => relevantPorts.includes(p.port));
    }

    return allPorts;
  },

  /**
   * Get network interfaces (for traffic blocks)
   */
  getNetworkInterfaces: async (): Promise<Array<{ name: string; description: string }>> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await axios.get(`${API_URL}/traffic/interfaces`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return (response.data.interfaces || []).map((iface: any) => ({
        name: iface.name || iface,
        description: iface.description || iface.name || iface,
      }));
    } catch (error) {
      console.error('Failed to fetch interfaces:', error);
      // Return common defaults
      return [
        { name: 'eth0', description: 'eth0 (Primary)' },
        { name: 'lo', description: 'lo (Loopback)' },
      ];
    }
  },

  /**
   * Get active agents for agent blocks
   */
  getActiveAgents: async (): Promise<Array<{ id: string; name: string; status: string }>> => {
    const token = getAuthToken();
    if (!token) return [];

    try {
      const response = await axios.get(`${API_URL}/agents/`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      return (response.data.agents || response.data || []).map((agent: any) => ({
        id: agent.id,
        name: agent.name || `Agent ${agent.id.slice(0, 8)}`,
        status: agent.status || 'unknown',
      }));
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      return [];
    }
  },
};

export default flowConfigService;
