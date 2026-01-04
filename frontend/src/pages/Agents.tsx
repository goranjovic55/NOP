import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { agentService, Agent, AgentCreate } from '../services/agentService';
import { CyberPageTitle } from '../components/CyberUI';

const Agents: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, setActiveAgent } = usePOV();
  const navigate = useNavigate();
  
  // Agent lists
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  
  // Modals and UI state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarAgent, setSidebarAgent] = useState<Agent | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedAgent, setEditedAgent] = useState<Agent | null>(null);
  
  // Network config
  const [localIP, setLocalIP] = useState<string>('localhost');
  const [publicIP, setPublicIP] = useState<string>('');
  const [usePublicIP, setUsePublicIP] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linux-amd64');
  const [c2Host, setC2Host] = useState<string>('localhost');
  const [c2Port, setC2Port] = useState<string>('8000');
  const [c2Protocol, setC2Protocol] = useState<'ws' | 'wss'>('ws');
  
  // Sorting and filtering
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'status' | 'last_seen'>('last_seen');
  const [newAgent, setNewAgent] = useState<AgentCreate>({
    name: '',
    description: '',
    agent_type: 'python',
    connection_url: 'ws://localhost:8000/api/v1/agents/{agent_id}/connect',
    target_platform: 'linux-amd64',
    capabilities: {
      asset: true,
      traffic: true,
      host: true,
      access: false,
    },
    obfuscate: true,
    startup_mode: 'auto',
    persistence_level: 'medium',
    agent_metadata: {
      connectback_interval: 30,
      heartbeat_interval: 30,
      data_interval: 60,
      connection_strategy: 'constant',
      max_reconnect_attempts: -1,
    },
  });

  useEffect(() => {
    // Small delay to ensure zustand persistence is hydrated
    const timeout = setTimeout(() => {
      loadAgents();
      detectIPs();
    }, 100);
    
    // Poll for agent status updates
    const interval = setInterval(loadAgents, 10000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [token]);

  const detectIPs = async () => {
    // Detect if running in Codespaces and get forwarded URL
    const hostname = window.location.hostname;
    if (hostname.includes('github.dev') || hostname.includes('app.github.dev')) {
      // Extract codespace name and construct backend URL
      const codespaceName = hostname.split('-12000')[0];
      const backendUrl = `${codespaceName}-8000.app.github.dev`;
      setLocalIP(backendUrl);
      setC2Host(backendUrl);
      setC2Port('');
      setC2Protocol('wss');
      setPublicIP('');
    } else {
      // Set default local IP for docker internal network
      setLocalIP('172.28.0.1');
      setC2Host('172.28.0.1');
      setC2Port('8000');
      setC2Protocol('ws');
      
      // Detect public IP
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          setPublicIP(data.ip);
        }
      } catch (error) {
        console.error('Failed to detect public IP:', error);
      }
    }
  };

  // Build connection URL from components
  const buildConnectionUrl = (host: string, port: string, protocol: 'ws' | 'wss' = 'ws') => {
    const portSuffix = port ? `:${port}` : '';
    return `${protocol}://${host}${portSuffix}/api/v1/agents/{agent_id}/connect`;
  };

  // Update connection URL when host/port/protocol changes
  useEffect(() => {
    const url = buildConnectionUrl(c2Host, c2Port, c2Protocol);
    setNewAgent(prev => ({ ...prev, connection_url: url }));
  }, [c2Host, c2Port, c2Protocol]);

  const loadAgents = async () => {
    if (!token) {
      console.warn('[Agents] No token available, skipping agent load');
      return;
    }
    try {
      const data = await agentService.getAgents(token);
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
      // If 401, user might need to re-login
      if (error instanceof Error && error.message.includes('401')) {
        console.error('[Agents] Authentication failed - token may be invalid');
      }
    }
  };

  const handleCreateAgent = async () => {
    console.log('handleCreateAgent called, token:', token ? 'exists' : 'MISSING', 'name:', newAgent.name);
    if (!token) {
      alert('Not authenticated! Please log in first.');
      return;
    }
    if (!newAgent.name) {
      alert('Please enter an agent name');
      return;
    }
    setLoading(true);
    let createdAgent: Agent | null = null;
    
    try {
      console.log('Creating agent...', newAgent);
      createdAgent = await agentService.createAgent(token, newAgent);
      console.log('Agent created:', createdAgent);
      
      // Auto-download agent file with platform for Go
      try {
        const platform = newAgent.agent_type === 'go' ? selectedPlatform : undefined;
        console.log('Generating agent file...');
        const { content, filename, is_binary } = await agentService.generateAgent(token, createdAgent.id, platform);
        
        let blob: Blob;
        if (is_binary) {
          // Decode base64 to binary
          const binaryString = atob(content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          blob = new Blob([bytes], { type: 'application/octet-stream' });
        } else {
          blob = new Blob([content], { type: 'text/plain' });
        }
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        console.log('Agent file downloaded successfully');
      } catch (generateError) {
        console.error('Failed to generate/download agent file:', generateError);
        // Agent was created successfully, but file generation failed
        alert(`Agent created successfully, but failed to generate file: ${generateError instanceof Error ? generateError.message : 'Unknown error'}\n\nYou can download the agent file from the agent template card.`);
      }
      
      console.log('Reloading agents...');
      // Reload agents to get the fresh agent with download token
      await loadAgents();
      
      setShowCreateModal(false);
      setNewAgent({
        name: '',
        description: '',
        agent_type: 'python',
        connection_url: `ws://${usePublicIP ? publicIP : localIP}:12001/api/v1/agents/{agent_id}/connect`,
        target_platform: 'linux-amd64',
        capabilities: {
          asset: true,
          traffic: true,
          host: true,
          access: false,
        },
        obfuscate: true,
        startup_mode: 'auto',
        persistence_level: 'medium',
        agent_metadata: {
          connectback_interval: 30,
          heartbeat_interval: 30,
          data_interval: 60,
          connection_strategy: 'constant',
          max_reconnect_attempts: -1,
        },
      });
      setUsePublicIP(false);
      setSelectedPlatform('linux-amd64');
      console.log('Agent creation flow complete!');
    } catch (error) {
      console.error('Failed to create agent:', error);
      // Only show this error if agent creation actually failed (not file generation)
      if (!createdAgent) {
        alert(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!token || !window.confirm('Are you sure you want to delete this agent?')) return;
    try {
      await agentService.deleteAgent(token, agentId);
      setAgents(agents.filter(a => a.id !== agentId));
      if (activeAgent?.id === agentId) {
        setActiveAgent(null);
      }
    } catch (error) {
      console.error('Failed to delete agent:', error);
    }
  };

  const handleTerminateAgent = async (agentId: string, agentName: string) => {
    if (!token || !window.confirm(`Send terminate command to agent "${agentName}"?\n\nThis will shut down the agent process.`)) return;
    try {
      const result = await agentService.terminateAgent(token, agentId);
      alert(`Terminate command status: ${result.status}\n${result.message || ''}`);
      // Reload agents to update status
      setTimeout(() => loadAgents(), 2000);
    } catch (error) {
      console.error('Failed to terminate agent:', error);
      alert(`Failed to terminate agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleGenerateAgent = async (agent: Agent, platform?: string) => {
    if (!token) return;
    try {
      const { content, filename, is_binary } = await agentService.generateAgent(token, agent.id, platform);
      
      // Download the file
      let blob: Blob;
      if (is_binary) {
        // Decode base64 to binary
        const binaryString = atob(content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: 'application/octet-stream' });
      } else {
        blob = new Blob([content], { type: 'text/plain' });
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate agent:', error);
    }
  };

  const handleSwitchPOV = (agent: Agent) => {
    // Set agent POV and navigate to dashboard
    setActiveAgent(agent);
    navigate('/dashboard');
  };

  const formatUptime = (connectedAt?: string) => {
    if (!connectedAt) return 'N/A';
    const start = new Date(connectedAt).getTime();
    const now = Date.now();
    const diff = now - start;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const getAgentIP = (agent: Agent) => {
    // Extract IP from connection URL or metadata
    try {
      const url = new URL(agent.connection_url.replace('ws://', 'http://').replace('wss://', 'https://'));
      return url.hostname;
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-cyber-green';
      case 'offline': return 'bg-cyber-gray';
      case 'disconnected': return 'bg-cyber-yellow';
      case 'error': return 'bg-cyber-red';
      default: return 'bg-cyber-gray';
    }
  };

  const getStatusText = (status: string) => {
    return status.toUpperCase();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'python': return '🐍';
      case 'go': return '🔷';
      default: return '◈';
    }
  };

  const getConnectedAgents = () => {
    return agents.filter(a => a.last_seen).sort((a, b) => {
      if (sortBy === 'last_seen') {
        const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return bTime - aTime;
      }
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'type') return a.agent_type.localeCompare(b.agent_type);
      if (sortBy === 'status') {
        const statusOrder = { online: 0, disconnected: 1, offline: 2, error: 3 };
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return 0;
    });
  };

  const getCreatedAgents = () => {
    return agents.filter(a => !a.last_seen);
  };

  const formatLastSeen = (lastSeen?: string) => {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="h-full flex gap-4">
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <CyberPageTitle color="red" className="flex items-center">
              <span className="mr-3 text-3xl">◆</span>
              Agent Management
            </CyberPageTitle>
            <p className="text-cyber-gray-light text-sm mt-1">Deploy and manage proxy agents for distributed network operations</p>
          </div>
          
          {/* POV Mode Indicator */}
          {activeAgent && (
            <div className="flex items-center space-x-3 px-4 py-2 bg-cyber-purple/20 border border-cyber-purple">
              <div className="w-3 h-3 bg-cyber-purple rounded-full animate-pulse"></div>
              <span className="text-cyber-purple font-bold uppercase text-sm">
                POV: {activeAgent.name}
              </span>
              <button
                onClick={() => setActiveAgent(null)}
                className="px-3 py-1 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white transition-all text-xs uppercase"
              >
                Exit POV
              </button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Side - Created Agents (Templates) */}
          <div className="w-1/3 bg-cyber-darker border border-cyber-gray rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-cyber-blue font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◈</span>
                  Agent Templates ({getCreatedAgents().length})
                </h3>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="px-3 py-1 bg-cyber-red border border-cyber-red text-white text-xs uppercase hover:bg-cyber-red-dark transition"
                >
                  + Create
                </button>
              </div>
              <p className="text-cyber-gray-light text-xs">
                Created agents waiting for deployment
              </p>
            </div>

            {/* Agent Templates List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              {getCreatedAgents().map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSidebarAgent(agent);
                    setShowSidebar(true);
                  }}
                  className={`p-4 border cursor-pointer transition-all relative ${
                    sidebarAgent?.id === agent.id && showSidebar
                      ? 'bg-cyber-blue/20 border-cyber-blue'
                      : 'bg-cyber-dark border-cyber-gray hover:border-cyber-blue'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start space-x-3 pr-8">
                      <span className="text-3xl mt-1">{getTypeIcon(agent.agent_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-bold text-base truncate">{agent.name}</div>
                        <div className="text-cyber-gray-light text-xs uppercase mt-1">{agent.agent_type} Agent</div>
                      </div>
                    </div>

                    {/* Description */}
                    {agent.description && (
                      <p className="text-cyber-gray-light text-sm line-clamp-2">{agent.description}</p>
                    )}

                    {/* Status Badge */}
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow text-xs uppercase font-bold">
                        Ready to Deploy
                      </span>
                      <span className="text-cyber-gray-light text-xs">
                        Created {new Date(agent.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Capabilities */}
                    <div className="flex flex-wrap gap-1.5">
                      {agent.capabilities.asset && (
                        <span className="px-2 py-0.5 bg-cyber-blue/20 border border-cyber-blue text-cyber-blue text-xs uppercase">Asset</span>
                      )}
                      {agent.capabilities.traffic && (
                        <span className="px-2 py-0.5 bg-cyber-green/20 border border-cyber-green text-cyber-green text-xs uppercase">Traffic</span>
                      )}
                      {agent.capabilities.host && (
                        <span className="px-2 py-0.5 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple text-xs uppercase">Host</span>
                      )}
                      {agent.capabilities.access && (
                        <span className="px-2 py-0.5 bg-cyber-red/20 border border-cyber-red text-cyber-red text-xs uppercase">Access</span>
                      )}
                    </div>

                    {/* Download Token Preview */}
                    <div className="border-t border-cyber-gray pt-2 space-y-1">
                      <div className="text-cyber-gray-light text-xs uppercase">Download Token:</div>
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-green text-xs font-mono truncate">
                          {agent.download_token}
                        </code>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(agent.download_token);
                          }}
                          className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-green hover:text-cyber-green text-xs transition"
                          title="Copy token"
                        >
                          📋
                        </button>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateAgent(agent);
                        }}
                        className="px-3 py-1.5 bg-cyber-blue border border-cyber-blue text-white text-xs uppercase hover:bg-cyber-blue-dark transition"
                      >
                        Download
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete agent template "${agent.name}"?\n\nThis will permanently remove the agent and its credentials.`)) {
                            handleDeleteAgent(agent.id);
                          }
                        }}
                        className="px-3 py-1.5 border border-cyber-red text-cyber-red text-xs uppercase hover:bg-cyber-red hover:text-white transition"
                        title="Delete agent template"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {getCreatedAgents().length === 0 && (
                <div className="text-center py-8 text-cyber-gray-light text-sm">
                  No agent templates yet
                  <br />
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-2 text-cyber-blue hover:underline"
                  >
                    Create your first agent
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Side - Connected Agents */}
          <div className="flex-1 bg-cyber-darker border border-cyber-gray rounded-lg flex flex-col overflow-hidden">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
              <div className="flex items-center justify-between">
                <h3 className="text-cyber-green font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◉</span>
                  Active Agents ({getConnectedAgents().length})
                </h3>
                <div className="flex items-center space-x-2">
                  <span className="text-cyber-gray-light text-xs uppercase">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-cyber-black border border-cyber-gray text-white text-xs px-2 py-1 focus:outline-none focus:border-cyber-blue"
                  >
                    <option value="last_seen">Last Seen</option>
                    <option value="name">Name</option>
                    <option value="type">Type</option>
                    <option value="status">Status</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Connected Agents List */}
            <div className="flex-1 overflow-y-auto">
              {getConnectedAgents().map((agent) => (
                <div
                  key={agent.id}
                  onClick={() => {
                    setSidebarAgent(agent);
                    setShowSidebar(true);
                  }}
                  className={`p-4 border-b border-cyber-gray cursor-pointer transition-all ${
                    sidebarAgent?.id === agent.id && showSidebar
                      ? 'bg-cyber-blue/10'
                      : activeAgent?.id === agent.id
                      ? 'bg-cyber-purple/10'
                      : 'hover:bg-cyber-dark'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <span className="text-2xl mt-1">{getTypeIcon(agent.agent_type)}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <div className="text-white font-bold">{agent.name}</div>
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} ${
                            agent.status === 'online' ? 'animate-pulse' : ''
                          }`}></div>
                        </div>
                        <div className="text-cyber-gray-light text-xs mt-1">
                          {formatLastSeen(agent.last_seen)}
                        </div>
                        {agent.description && (
                          <div className="text-cyber-gray-light text-sm mt-1">{agent.description}</div>
                        )}
                        
                        {/* Capabilities */}
                        <div className="flex items-center space-x-2 mt-2">
                          {agent.capabilities.asset && (
                            <span className="px-2 py-0.5 bg-cyber-blue/20 border border-cyber-blue text-cyber-blue text-xs uppercase">Asset</span>
                          )}
                          {agent.capabilities.traffic && (
                            <span className="px-2 py-0.5 bg-cyber-green/20 border border-cyber-green text-cyber-green text-xs uppercase">Traffic</span>
                          )}
                          {agent.capabilities.host && (
                            <span className="px-2 py-0.5 bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow text-xs uppercase">Host</span>
                          )}
                          {agent.capabilities.access && (
                            <span className="px-2 py-0.5 bg-cyber-red/20 border border-cyber-red text-cyber-red text-xs uppercase">Access</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      {activeAgent?.id === agent.id ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveAgent(null);
                          }}
                          className="px-3 py-1 bg-cyber-purple border border-cyber-purple text-white text-xs uppercase hover:bg-cyber-purple-dark transition"
                        >
                          Exit POV
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchPOV(agent);
                          }}
                          className="px-3 py-1 border border-cyber-purple text-cyber-purple text-xs uppercase hover:bg-cyber-purple hover:text-white transition"
                        >
                          Switch POV
                        </button>
                      )}
                      {agent.status === 'online' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTerminateAgent(agent.id, agent.name);
                          }}
                          className="px-2 py-1 border border-cyber-red text-cyber-red text-xs uppercase hover:bg-cyber-red hover:text-white transition"
                          title="Send terminate command to agent"
                        >
                          ⚠ Kill
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {getConnectedAgents().length === 0 && (
                <div className="text-center py-12 text-cyber-gray-light">
                  <span className="text-4xl block mb-3">◈</span>
                  <p className="text-sm">No agents have connected yet</p>
                  <p className="text-xs mt-2">Deploy an agent template to see it appear here</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-red max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-cyber-darker border-b border-cyber-red p-4 flex items-center justify-between sticky top-0">
              <h3 className="text-cyber-red font-bold text-xl uppercase tracking-wide">
                Create New Agent
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-cyber-red hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Agent Name *
                </label>
                <input
                  type="text"
                  value={newAgent.name}
                  onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                  className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-red"
                  placeholder="e.g., Remote Office Alpha"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Description
                </label>
                <textarea
                  value={newAgent.description}
                  onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                  className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-red resize-none"
                  rows={3}
                  placeholder="Optional description"
                />
              </div>

              {/* Agent Type */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Agent Type * (Python for ease, Go for cross-platform)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['python', 'go'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAgent({ ...newAgent, agent_type: type as any })}
                      className={`px-4 py-3 border text-center transition-all duration-300 ${
                        newAgent.agent_type === type
                          ? 'border-cyber-red bg-cyber-red text-white'
                          : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue'
                      }`}
                    >
                      <div className="text-2xl mb-1">{getTypeIcon(type)}</div>
                      <div className="text-xs uppercase font-bold">{type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Platform Selection (Go only) */}
              {newAgent.agent_type === 'go' && (
                <div className="border border-cyber-purple p-4 bg-cyber-purple/10">
                  <label className="block text-cyber-purple text-sm uppercase mb-3 font-bold">
                    🔷 Target Platform (Compiled Binary)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'linux-amd64', label: 'Linux x64', icon: '🐧' },
                      { value: 'windows-amd64', label: 'Windows x64', icon: '🪟' },
                      { value: 'darwin-amd64', label: 'macOS Intel', icon: '🍎' },
                      { value: 'darwin-arm64', label: 'macOS M1/M2', icon: '🍏' },
                      { value: 'linux-arm64', label: 'Linux ARM', icon: '🔧' },
                    ].map((platform) => (
                      <button
                        key={platform.value}
                        type="button"
                        onClick={() => {
                          setSelectedPlatform(platform.value);
                          setNewAgent({ ...newAgent, target_platform: platform.value });
                        }}
                        className={`px-3 py-2 border text-xs transition-all ${
                          selectedPlatform === platform.value
                            ? 'border-cyber-purple bg-cyber-purple/30 text-white'
                            : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-purple'
                        }`}
                      >
                        <div className="text-lg mb-1">{platform.icon}</div>
                        <div className="font-bold uppercase">{platform.label}</div>
                      </button>
                    ))}
                  </div>
                  <p className="text-cyber-gray-light text-xs mt-3">
                    Agent will be compiled to native binary for the selected platform
                  </p>
                </div>
              )}

              {/* Connection URL */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Connection URL * <span className="text-cyber-gray text-xs normal-case">(Editable)</span>
                </label>
                
                {/* Quick Select */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUsePublicIP(false);
                      const isCodespaces = localIP.includes('github.dev');
                      const protocol = isCodespaces ? 'wss' : 'ws';
                      const port = isCodespaces ? '' : '8000';
                      setC2Protocol(protocol as 'ws' | 'wss');
                      setC2Host(localIP);
                      setC2Port(port);
                    }}
                    className={`px-3 py-2 border text-xs uppercase transition-all ${
                      !usePublicIP && c2Host !== 'nop-backend-1'
                        ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue'
                    }`}
                  >
                    <div className="font-bold mb-1">{localIP.includes('github.dev') ? 'Codespaces' : 'Local'}</div>
                    <div className="font-mono text-[10px] truncate">{localIP}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsePublicIP(false);
                      setC2Protocol('ws');
                      setC2Host('172.28.0.1');
                      setC2Port('8000');
                    }}
                    className={`px-3 py-2 border text-xs uppercase transition-all ${
                      c2Host === '172.28.0.1'
                        ? 'border-cyber-purple bg-cyber-purple/20 text-cyber-purple'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-purple'
                    }`}
                  >
                    <div className="font-bold mb-1">🐳 Internal</div>
                    <div className="font-mono text-[10px]">172.28.0.1</div>
                  </button>
                  {publicIP && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsePublicIP(true);
                        setC2Protocol('ws');
                        setC2Host(publicIP);
                        setC2Port('8000');
                      }}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        usePublicIP
                          ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue'
                          : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue'
                      }`}
                    >
                      <div className="font-bold mb-1">Public IP</div>
                      <div className="font-mono text-[10px]">{publicIP}</div>
                    </button>
                  )}
                </div>

                {/* Protocol, Host, Port Inputs */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <div className="col-span-1">
                    <label className="block text-cyber-gray-light text-xs uppercase mb-1">Protocol</label>
                    <select
                      value={c2Protocol}
                      onChange={(e) => setC2Protocol(e.target.value as 'ws' | 'wss')}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-2 py-2 focus:outline-none focus:border-cyber-blue text-sm"
                    >
                      <option value="ws">WS</option>
                      <option value="wss">WSS</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-cyber-gray-light text-xs uppercase mb-1">Host / Domain</label>
                    <input
                      type="text"
                      value={c2Host}
                      onChange={(e) => setC2Host(e.target.value)}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-blue font-mono text-sm"
                      placeholder="your-server.com"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-cyber-gray-light text-xs uppercase mb-1">Port</label>
                    <input
                      type="text"
                      value={c2Port}
                      onChange={(e) => setC2Port(e.target.value)}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-blue font-mono text-sm"
                      placeholder="8000"
                    />
                  </div>
                </div>

                {/* Full URL Display */}
                <div className="bg-cyber-black/50 border border-cyber-gray p-3 rounded">
                  <div className="text-cyber-gray-light text-xs uppercase mb-1">Full WebSocket URL:</div>
                  <div className="font-mono text-sm text-cyber-green break-all">
                    {newAgent.connection_url}
                  </div>
                </div>
                <p className="text-cyber-gray-light text-xs mt-2">
                  Agent will connect back to this WebSocket URL (agent_id is auto-replaced)
                </p>
              </div>

              {/* Schedule Settings */}
              <div className="border border-cyber-gray p-4 bg-cyber-black/50">
                <h4 className="text-cyber-green font-bold uppercase text-sm mb-3">Connection Schedule</h4>
                
                {/* Connection Strategy */}
                <div className="mb-4">
                  <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                    Connection Strategy
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, connection_strategy: 'constant', max_reconnect_attempts: -1 }
                      })}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        newAgent.agent_metadata?.connection_strategy === 'constant'
                          ? 'border-cyber-green bg-cyber-green/20 text-cyber-green'
                          : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-green'
                      }`}
                    >
                      Constant
                      <div className="text-[10px] mt-1 normal-case">Always retry connection</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, connection_strategy: 'scheduled', max_reconnect_attempts: 10 }
                      })}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        newAgent.agent_metadata?.connection_strategy === 'scheduled'
                          ? 'border-cyber-yellow bg-cyber-yellow/20 text-cyber-yellow'
                          : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-yellow'
                      }`}
                    >
                      Scheduled
                      <div className="text-[10px] mt-1 normal-case">Limited reconnect attempts</div>
                    </button>
                  </div>
                </div>

                {/* Reconnect Attempts (only for scheduled) */}
                {newAgent.agent_metadata?.connection_strategy === 'scheduled' && (
                  <div className="mb-4">
                    <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                      Max Reconnect Attempts
                    </label>
                    <input
                      type="number"
                      value={newAgent.agent_metadata?.max_reconnect_attempts || 10}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, max_reconnect_attempts: parseInt(e.target.value) }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-yellow"
                      min="1"
                      max="1000"
                    />
                    <p className="text-cyber-gray-light text-[10px] mt-1">
                      Agent will stop after this many failed attempts
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                      Connectback (s)
                    </label>
                    <input
                      type="number"
                      value={newAgent.agent_metadata?.connectback_interval || 30}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, connectback_interval: parseInt(e.target.value) }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-blue text-sm"
                      min="5"
                      max="3600"
                    />
                    <p className="text-cyber-gray-light text-[10px] mt-1">Reconnect interval</p>
                  </div>
                  <div>
                    <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                      Heartbeat (s)
                    </label>
                    <input
                      type="number"
                      value={newAgent.agent_metadata?.heartbeat_interval || 30}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, heartbeat_interval: parseInt(e.target.value) }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-blue text-sm"
                      min="10"
                      max="300"
                    />
                    <p className="text-cyber-gray-light text-[10px] mt-1">Heartbeat freq.</p>
                  </div>
                  <div>
                    <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                      Data Sync (s)
                    </label>
                    <input
                      type="number"
                      value={newAgent.agent_metadata?.data_interval || 60}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        agent_metadata: { ...newAgent.agent_metadata, data_interval: parseInt(e.target.value) }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-3 py-2 focus:outline-none focus:border-cyber-blue text-sm"
                      min="30"
                      max="3600"
                    />
                    <p className="text-cyber-gray-light text-[10px] mt-1">Data collection</p>
                  </div>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Modules (Agent relays data to C2 server)
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'asset', label: 'Asset Module', color: 'cyber-blue', desc: 'Network asset discovery' },
                    { key: 'traffic', label: 'Traffic Module', color: 'cyber-purple', desc: 'Traffic monitoring' },
                    { key: 'host', label: 'Host Module', color: 'cyber-green', desc: 'System information' },
                    { key: 'access', label: 'Access Module', color: 'cyber-yellow', desc: 'Remote command execution' },
                  ].map((cap) => (
                    <label
                      key={cap.key}
                      className="flex items-center space-x-3 cursor-pointer p-3 border border-cyber-gray hover:border-cyber-blue transition-all duration-300"
                    >
                      <input
                        type="checkbox"
                        checked={newAgent.capabilities[cap.key as keyof typeof newAgent.capabilities]}
                        onChange={(e) =>
                          setNewAgent({
                            ...newAgent,
                            capabilities: {
                              ...newAgent.capabilities,
                              [cap.key]: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className={`text-${cap.color} uppercase text-sm font-bold block`}>
                          {cap.label}
                        </span>
                        <span className="text-cyber-gray-light text-xs">{cap.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-cyber-gray p-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-6 py-2 border border-cyber-gray text-cyber-gray-light hover:border-white hover:text-white transition-all duration-300 uppercase"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateAgent}
                className="px-6 py-2 bg-cyber-red border border-cyber-red-dark text-white font-bold uppercase tracking-wide cyber-glow-red hover:bg-cyber-red-dark transition-all duration-300 disabled:opacity-50"
                disabled={loading || !newAgent.name}
              >
                {loading ? 'Creating...' : 'Create Agent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Agent Details Sidebar */}
      {showSidebar && sidebarAgent && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowSidebar(false)}
          />
          
          {/* Sliding Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-3/5 lg:w-2/5 bg-cyber-darker border-l border-cyber-blue z-50 overflow-y-auto animate-slideIn">
            {/* Panel Header */}
            <div className="sticky top-0 bg-cyber-dark border-b border-cyber-blue p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-cyber-blue font-bold uppercase text-sm flex items-center">
                  <span className="mr-2 text-2xl">{getTypeIcon(sidebarAgent.agent_type)}</span>
                  Agent Details
                </h3>
                <p className="text-xs text-cyber-gray-light mt-1">
                  {sidebarAgent.name}
                </p>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-cyber-gray hover:text-cyber-blue text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-4 space-y-4">
              {/* Connected Agent: Operational Details */}
              {sidebarAgent.last_seen ? (
                <>
                  {/* Live Status */}
                  <div className="bg-cyber-dark border border-cyber-green rounded p-4">
                    <h4 className="text-cyber-green font-bold uppercase mb-3 text-xs flex items-center">
                      <span className="mr-2">●</span>
                      Live Agent Status
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Agent Name:</span>
                        <span className="text-white font-bold text-sm">{sidebarAgent.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Status:</span>
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(sidebarAgent.status)} animate-pulse`}></span>
                          <span className="text-cyber-green text-sm uppercase font-bold">
                            {getStatusText(sidebarAgent.status)}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Uptime:</span>
                        <span className="text-cyber-green text-sm font-mono">{formatUptime(sidebarAgent.connected_at || '')}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Last Heartbeat:</span>
                        <span className="text-white text-sm">{formatLastSeen(sidebarAgent.last_seen)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Network Info */}
                  <div className="bg-cyber-dark border border-cyber-blue rounded p-4">
                    <h4 className="text-cyber-blue font-bold uppercase mb-3 text-xs">Network Information</h4>
                    <div className="space-y-2">
                      <div>
                        <span className="text-cyber-gray-light text-xs uppercase block mb-1">Agent IP Address:</span>
                        <code className="block bg-cyber-black border border-cyber-blue px-3 py-2 text-cyber-blue text-sm font-mono">
                          {getAgentIP(sidebarAgent)}
                        </code>
                      </div>
                      <div>
                        <span className="text-cyber-gray-light text-xs uppercase block mb-1">Connection Endpoint:</span>
                        <code className="block bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-green text-xs font-mono break-all">
                          {sidebarAgent.connection_url}
                        </code>
                      </div>
                      <div className="flex justify-between items-center pt-2">
                        <span className="text-cyber-gray-light text-xs uppercase">Connected Since:</span>
                        <span className="text-white text-sm">{sidebarAgent.connected_at ? new Date(sidebarAgent.connected_at).toLocaleString() : 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Active Modules */}
                  <div className="bg-cyber-dark border border-cyber-purple rounded p-4">
                    <h4 className="text-cyber-purple font-bold uppercase mb-3 text-xs">Active Modules</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {sidebarAgent.capabilities.asset && (
                        <div className="bg-cyber-blue/20 border border-cyber-blue text-cyber-blue px-3 py-2 text-xs uppercase text-center font-bold">
                          ◈ Asset Discovery
                        </div>
                      )}
                      {sidebarAgent.capabilities.traffic && (
                        <div className="bg-cyber-green/20 border border-cyber-green text-cyber-green px-3 py-2 text-xs uppercase text-center font-bold">
                          ≋ Traffic Monitor
                        </div>
                      )}
                      {sidebarAgent.capabilities.host && (
                        <div className="bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow px-3 py-2 text-xs uppercase text-center font-bold">
                          ◐ Host Intel
                        </div>
                      )}
                      {sidebarAgent.capabilities.access && (
                        <div className="bg-cyber-red/20 border border-cyber-red text-cyber-red px-3 py-2 text-xs uppercase text-center font-bold">
                          ⬡ Remote Access
                        </div>
                      )}
                    </div>
                  </div>

                  {/* POV Action */}
                  <div className="bg-cyber-purple/10 border border-cyber-purple rounded p-4">
                    <h4 className="text-cyber-purple font-bold uppercase mb-3 text-xs">Point of View</h4>
                    <p className="text-cyber-gray-light text-xs mb-3">
                      Switch to this agent's perspective to see only data collected by this agent.
                    </p>
                    {activeAgent?.id === sidebarAgent.id ? (
                      <button
                        onClick={() => {
                          setActiveAgent(null);
                          setShowSidebar(false);
                        }}
                        className="w-full px-4 py-2 bg-cyber-purple border border-cyber-purple text-white uppercase text-sm font-bold hover:bg-cyber-purple-dark transition"
                      >
                        ✓ Currently in POV - Click to Exit
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleSwitchPOV(sidebarAgent);
                          setShowSidebar(false);
                        }}
                        className="w-full px-4 py-2 border border-cyber-purple text-cyber-purple uppercase text-sm font-bold hover:bg-cyber-purple hover:text-white transition"
                      >
                        → Enter Agent POV
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Template Agent: Configuration Details */}
                  {/* Agent Overview */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                    <h4 className="text-cyber-blue font-bold uppercase mb-3 text-xs">Agent Template</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Name:</span>
                        <span className="text-white font-bold text-sm">{sidebarAgent.name}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Type:</span>
                        <span className="text-white text-sm uppercase">{sidebarAgent.agent_type}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Status:</span>
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-cyber-gray"></span>
                          <span className="text-cyber-gray-light text-sm uppercase font-bold">
                            Template Only
                          </span>
                        </div>
                      </div>
                      {sidebarAgent.description && (
                        <div className="pt-2 border-t border-cyber-gray">
                          <span className="text-cyber-gray-light text-xs uppercase">Description:</span>
                          <p className="text-white text-sm mt-1">{sidebarAgent.description}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Agent Credentials & Download */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                <h4 className="text-cyber-purple font-bold uppercase mb-3 text-xs flex items-center">
                  <span className="mr-2">🔐</span>
                  Credentials & Download
                </h4>
                <div className="space-y-3">
                  {/* Agent ID */}
                  <div>
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-1">Agent ID:</span>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-blue text-xs font-mono break-all">
                        {sidebarAgent.id}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(sidebarAgent.id);
                        }}
                        className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue text-xs transition"
                        title="Copy ID"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Auth Token */}
                  <div>
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-1">Auth Token:</span>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-green text-xs font-mono truncate">
                        {sidebarAgent.auth_token}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(sidebarAgent.auth_token);
                        }}
                        className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-green hover:text-cyber-green text-xs transition"
                        title="Copy token"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Encryption Key */}
                  <div>
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-1">Encryption Key:</span>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-yellow text-xs font-mono truncate">
                        {sidebarAgent.encryption_key}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(sidebarAgent.encryption_key);
                        }}
                        className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-yellow hover:text-cyber-yellow text-xs transition"
                        title="Copy key"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Download Token */}
                  <div>
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-1">Download Token:</span>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-red text-xs font-mono truncate">
                        {sidebarAgent.download_token}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(sidebarAgent.download_token);
                        }}
                        className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-red hover:text-cyber-red text-xs transition"
                        title="Copy token"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Download URL */}
                  <div>
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-1">Download URL:</span>
                    <div className="flex items-center space-x-2">
                      <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-purple text-xs font-mono truncate">
                        {window.location.protocol}//{window.location.host}/api/v1/agents/download/{sidebarAgent.download_token}
                      </code>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/v1/agents/download/${sidebarAgent.download_token}`);
                        }}
                        className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple text-xs transition"
                        title="Copy URL"
                      >
                        📋
                      </button>
                    </div>
                  </div>

                  {/* Quick Download Commands */}
                  <div className="border-t border-cyber-gray pt-3 mt-2">
                    <span className="text-cyber-gray-light text-[10px] uppercase block mb-2">External Download:</span>
                    <p className="text-cyber-gray-light text-[9px] mb-2">Use backend API port (8000) for external systems:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const hostname = window.location.hostname;
                          const protocol = window.location.protocol;
                          // For Codespaces, replace port 12000 with 8000
                          const backendUrl = `${protocol}//${hostname.replace('-12000', '-8000')}`;
                          navigator.clipboard.writeText(`wget -O agent.py "${backendUrl}/api/v1/agents/download/${sidebarAgent.download_token}"`);
                        }}
                        className="flex-1 px-2 py-1 border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black text-xs transition"
                      >
                        Copy wget
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const hostname = window.location.hostname;
                          const protocol = window.location.protocol;
                          // For Codespaces, replace port 12000 with 8000
                          const backendUrl = `${protocol}//${hostname.replace('-12000', '-8000')}`;
                          navigator.clipboard.writeText(`curl -o agent.py "${backendUrl}/api/v1/agents/download/${sidebarAgent.download_token}"`);
                        }}
                        className="flex-1 px-2 py-1 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white text-xs transition"
                      >
                        Copy curl
                      </button>
                    </div>
                  </div>

                  {/* Internal Download (Docker) */}
                  <div className="border-t border-cyber-gray pt-3 mt-2">
                    <span className="text-cyber-purple text-[10px] uppercase block mb-2">🐳 Internal Download (Docker):</span>
                    <p className="text-cyber-gray-light text-[9px] mb-2">Use internal hostname for containers in same network:</p>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`wget -O agent.py "http://nop-backend-1:8000/api/v1/agents/download/${sidebarAgent.download_token}"`);
                        }}
                        className="flex-1 px-2 py-1 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white text-xs transition"
                      >
                        Copy wget
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(`curl -o agent.py "http://nop-backend-1:8000/api/v1/agents/download/${sidebarAgent.download_token}"`);
                        }}
                        className="flex-1 px-2 py-1 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white text-xs transition"
                      >
                        Copy curl
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Capabilities */}
              <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                <h4 className="text-cyber-green font-bold uppercase mb-3 text-xs">Template Capabilities</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 border rounded text-center ${
                    sidebarAgent.capabilities.asset 
                      ? 'border-cyber-blue bg-cyber-blue/20' 
                      : 'border-cyber-gray bg-cyber-gray/10'
                  }`}>
                    <div className={`text-xs uppercase font-bold ${
                      sidebarAgent.capabilities.asset ? 'text-cyber-blue' : 'text-cyber-gray-light'
                    }`}>
                      Asset
                    </div>
                    <div className={`text-[10px] ${
                      sidebarAgent.capabilities.asset ? 'text-cyber-blue' : 'text-cyber-gray'
                    }`}>
                      {sidebarAgent.capabilities.asset ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div className={`p-2 border rounded text-center ${
                    sidebarAgent.capabilities.traffic 
                      ? 'border-cyber-green bg-cyber-green/20' 
                      : 'border-cyber-gray bg-cyber-gray/10'
                  }`}>
                    <div className={`text-xs uppercase font-bold ${
                      sidebarAgent.capabilities.traffic ? 'text-cyber-green' : 'text-cyber-gray-light'
                    }`}>
                      Traffic
                    </div>
                    <div className={`text-[10px] ${
                      sidebarAgent.capabilities.traffic ? 'text-cyber-green' : 'text-cyber-gray'
                    }`}>
                      {sidebarAgent.capabilities.traffic ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div className={`p-2 border rounded text-center ${
                    sidebarAgent.capabilities.host 
                      ? 'border-cyber-purple bg-cyber-purple/20' 
                      : 'border-cyber-gray bg-cyber-gray/10'
                  }`}>
                    <div className={`text-xs uppercase font-bold ${
                      sidebarAgent.capabilities.host ? 'text-cyber-purple' : 'text-cyber-gray-light'
                    }`}>
                      Host
                    </div>
                    <div className={`text-[10px] ${
                      sidebarAgent.capabilities.host ? 'text-cyber-purple' : 'text-cyber-gray'
                    }`}>
                      {sidebarAgent.capabilities.host ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                  <div className={`p-2 border rounded text-center ${
                    sidebarAgent.capabilities.access 
                      ? 'border-cyber-red bg-cyber-red/20' 
                      : 'border-cyber-gray bg-cyber-gray/10'
                  }`}>
                    <div className={`text-xs uppercase font-bold ${
                      sidebarAgent.capabilities.access ? 'text-cyber-red' : 'text-cyber-gray-light'
                    }`}>
                      Access
                    </div>
                    <div className={`text-[10px] ${
                      sidebarAgent.capabilities.access ? 'text-cyber-red' : 'text-cyber-gray'
                    }`}>
                      {sidebarAgent.capabilities.access ? 'Enabled' : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Schedule Settings */}
              {sidebarAgent.agent_metadata && (
                <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                  <h4 className="text-cyber-yellow font-bold uppercase mb-3 text-xs">Schedule Configuration</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-gray-light text-xs uppercase">Strategy:</span>
                      <span className="text-white text-sm uppercase">{sidebarAgent.agent_metadata.connection_strategy || 'constant'}</span>
                    </div>
                    {sidebarAgent.agent_metadata.connection_strategy === 'scheduled' && (
                      <div className="flex justify-between items-center">
                        <span className="text-cyber-gray-light text-xs uppercase">Max Retries:</span>
                        <span className="text-white text-sm">{sidebarAgent.agent_metadata.max_reconnect_attempts || 'N/A'}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-gray-light text-xs uppercase">Connectback:</span>
                      <span className="text-white text-sm">{sidebarAgent.agent_metadata.connectback_interval || 30}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-gray-light text-xs uppercase">Heartbeat:</span>
                      <span className="text-white text-sm">{sidebarAgent.agent_metadata.heartbeat_interval || 30}s</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-cyber-gray-light text-xs uppercase">Data Sync:</span>
                      <span className="text-white text-sm">{sidebarAgent.agent_metadata.data_interval || 60}s</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                <h4 className="text-cyber-red font-bold uppercase mb-3 text-xs">Security Configuration</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-cyber-gray-light text-xs uppercase">Obfuscation:</span>
                    <span className={`text-sm uppercase font-bold ${
                      sidebarAgent.obfuscate ? 'text-cyber-green' : 'text-cyber-red'
                    }`}>
                      {sidebarAgent.obfuscate ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyber-gray-light text-xs uppercase">Persistence:</span>
                    <span className="text-white text-sm uppercase">{sidebarAgent.persistence_level || 'medium'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-cyber-gray-light text-xs uppercase">Startup Mode:</span>
                    <span className="text-white text-sm uppercase">{sidebarAgent.startup_mode || 'auto'}</span>
                  </div>
                </div>
              </div>

              {/* Template Actions */}
              <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                <h4 className="text-white font-bold uppercase mb-3 text-xs">Template Actions</h4>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handleGenerateAgent(sidebarAgent);
                    }}
                    className="w-full px-4 py-2 border border-cyber-blue text-cyber-blue uppercase text-sm hover:bg-cyber-blue hover:text-white transition"
                  >
                    Download Agent
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete agent template "${sidebarAgent.name}"?\\n\\nThis action cannot be undone.`)) {
                        handleDeleteAgent(sidebarAgent.id);
                        setShowSidebar(false);
                        setSidebarAgent(null);
                      }
                    }}
                    className="w-full px-4 py-2 border border-cyber-red text-cyber-red uppercase text-sm hover:bg-cyber-red hover:text-white transition"
                  >
                    Delete Template
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Common Metadata - Shown for both connected and template agents */}
          <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                <h4 className="text-cyber-gray-light font-bold uppercase mb-3 text-xs">Metadata</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-cyber-gray">Created:</span>
                    <span className="text-cyber-gray-light">{new Date(sidebarAgent.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-cyber-gray">Agent ID:</span>
                    <code className="text-cyber-gray-light font-mono">{sidebarAgent.id}</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Agents;
