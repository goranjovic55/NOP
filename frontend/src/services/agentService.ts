/**
 * Agent API Service
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:12001';

export interface Agent {
  id: string;
  name: string;
  description?: string;
  agent_type: 'python' | 'go';
  status: 'online' | 'offline' | 'disconnected' | 'error';
  connection_url: string;
  auth_token: string;
  capabilities: {
    asset?: boolean;
    traffic?: boolean;
    host?: boolean;
    access?: boolean;
  };
  obfuscate: boolean;
  startup_mode: 'auto' | 'single';
  persistence_level: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
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
  capabilities: {
    asset?: boolean;
    traffic?: boolean;
    host?: boolean;
    access?: boolean;
  };
  obfuscate?: boolean;
  startup_mode?: 'auto' | 'single';
  persistence_level?: 'low' | 'medium' | 'high';
  metadata?: Record<string, any>;
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
  metadata?: Record<string, any>;
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
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(agentData),
    });
    if (!response.ok) throw new Error('Failed to create agent');
    return response.json();
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

  async generateAgent(token: string, agentId: string): Promise<{ content: string; filename: string; agent_type: string }> {
    const response = await fetch(`${API_BASE_URL}/api/v1/agents/${agentId}/generate`, {
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
