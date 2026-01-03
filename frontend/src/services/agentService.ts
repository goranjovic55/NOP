/**
 * Agent API Service
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || '';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  agent_type: 'python' | 'go';
  status: 'online' | 'offline' | 'disconnected' | 'error';
  connection_url: string;
  auth_token: string;
  encryption_key: string;
  download_token: string;
  capabilities: {
    asset?: boolean;
    traffic?: boolean;
    host?: boolean;
    access?: boolean;
  };
  obfuscate: boolean;
  startup_mode: 'auto' | 'single';
  persistence_level: 'low' | 'medium' | 'high';
  agent_metadata?: Record<string, any>;
  last_seen?: string;
  connected_at?: string;
  created_at: string;
  updated_at?: string;
}

export interface AgentCreate {
  name: string;
  description?: string;
  agent_type: 'python' | 'go';
  connection_url: string;
  target_platform?: string;
  capabilities: {
    asset?: boolean;
    traffic?: boolean;
    host?: boolean;
    access?: boolean;
  };
  obfuscate?: boolean;
  startup_mode?: 'auto' | 'single';
  persistence_level?: 'low' | 'medium' | 'high';
  agent_metadata?: Record<string, any>;
}

export interface AgentUpdate {
  name?: string;
  description?: string;
  connection_url?: string;
  capabilities?: {
    asset?: boolean;
    traffic?: boolean;
    host?: boolean;
    access?: boolean;
  };
  agent_metadata?: Record<string, any>;
  status?: 'online' | 'offline' | 'disconnected' | 'error';
}

export const agentService = {
  async getAgents(token: string): Promise<Agent[]> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch agents');
    const data = await response.json();
    return data.agents || [];
  },

  async getAgent(token: string, agentId: string): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch agent');
    return response.json();
  },

  async createAgent(token: string, agentData: AgentCreate): Promise<Agent> {
    console.log('[agentService] Creating agent with data:', agentData);
    console.log('[agentService] Token:', token ? `${token.substring(0, 20)}...` : 'MISSING');
    console.log('[agentService] API URL:', `${API_BASE_URL}/api/v1/agents/`);
    
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(agentData),
    });
    
    console.log('[agentService] Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[agentService] Error response:', errorText);
      throw new Error(`Failed to create agent: ${response.status} ${errorText}`);
    }
    
    const result = await response.json();
    console.log('[agentService] Agent created successfully:', result);
    return result;
  },

  async updateAgent(token: string, agentId: string, agentData: AgentUpdate): Promise<Agent> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(agentData),
    });
    if (!response.ok) throw new Error('Failed to update agent');
    return response.json();
  },

  async deleteAgent(token: string, agentId: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to delete agent');
  },

  async generateAgent(token: string, agentId: string, platform?: string): Promise<{ content: string; filename: string; agent_type: string; is_binary?: boolean }> {
    let url = `${API_BASE_URL}/api/v1/agents/${agentId}/generate`;
    if (platform) {
      url += `?platform=${encodeURIComponent(platform)}`;
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to generate agent');
    return response.json();
  },

  async getAgentStatus(token: string, agentId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) throw new Error('Failed to fetch agent status');
    return response.json();
  },
};
