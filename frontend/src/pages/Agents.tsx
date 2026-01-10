import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { agentService, Agent, AgentCreate } from '../services/agentService';
import { CyberPageTitle } from '../components/CyberUI';

const Agents: React.FC = () => {
  const { token, logout, _hasHydrated } = useAuthStore();
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
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [sourceCode, setSourceCode] = useState<{ code: string; filename: string; language: string } | null>(null);
  
  // Network config
  const [localIP, setLocalIP] = useState<string>('localhost');
  const [publicIP, setPublicIP] = useState<string>('');
  const [usePublicIP, setUsePublicIP] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('linux-amd64');
  const [c2Host, setC2Host] = useState<string>('localhost');
  const [c2Port, setC2Port] = useState<string>('12001');
  const [c2Protocol, setC2Protocol] = useState<'ws' | 'wss'>('ws');
  
  // Sorting and filtering
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'status' | 'last_seen'>('last_seen');
  const [newAgent, setNewAgent] = useState<AgentCreate>({
    name: '',
    description: '',
    agent_type: 'python',
    connection_url: 'ws://localhost:12001/api/v1/agents/{agent_id}/connect',
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
    // Wait for zustand persistence to hydrate before accessing token
    if (!_hasHydrated) return;
    
    loadAgents();
    detectIPs();
    
    // Poll for agent status updates
    const interval = setInterval(loadAgents, 10000);
    return () => {
      clearInterval(interval);
    };
  }, [token, _hasHydrated]);

  const detectIPs = async () => {
    // Detect if running in Codespaces and get forwarded URL
    const hostname = window.location.hostname;
    if (hostname.includes('github.dev') || hostname.includes('app.github.dev')) {
      // Extract codespace name and construct backend URL
      const codespaceName = hostname.split('-12000')[0];
      const backendUrl = `${codespaceName}-12001.app.github.dev`;
      setLocalIP(backendUrl);
      setC2Host(backendUrl);
      setC2Port('');
      setC2Protocol('wss');
      setPublicIP('');
    } else {
      // Set default local IP for docker internal network
      setLocalIP('172.54.0.1');
      setC2Host('172.54.0.1');
      setC2Port('12001');
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
    } catch (error: any) {
      console.error('Failed to load agents:', error);
      // If 401, session expired - logout to trigger redirect to login
      if (error?.response?.status === 401 || (error instanceof Error && error.message.includes('401'))) {
        console.error('[Agents] Authentication failed - session expired, logging out');
        logout();
        return;
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

  const handleKillAgent = async (agentId: string, agentName: string) => {
    if (!token || !window.confirm(`Kill and delete agent "${agentName}"?\n\nThis will:\n- Send terminate command to agent\n- Remove from database\n- Permanently delete the agent record`)) return;
    try {
      // Kill agent (sends terminate + removes from DB)
      const result = await agentService.killAgent(token, agentId);
      // Update local state
      setAgents(agents.filter(a => a.id !== agentId));
      if (activeAgent?.id === agentId) {
        setActiveAgent(null);
      }
      alert(`Agent killed and deleted: ${result.status}`);
    } catch (error) {
      console.error('Failed to kill agent:', error);
      alert('Failed to kill agent');
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

  const handleViewSource = async (agent: Agent) => {
    if (!token) return;
    try {
      const { source_code, filename, language } = await agentService.getAgentSource(token, agent.id);
      setSourceCode({ code: source_code, filename, language });
      setShowSourceModal(true);
    } catch (error) {
      console.error('Failed to get agent source:', error);
      alert('Failed to load agent source code');
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
    <div className="h-full flex flex-col p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
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
              className="btn-base btn-sm btn-gray"
            >
              Exit POV
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        {/* Left Side - Created Agents (Templates) */}
        <div className="dashboard-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-cyber-gray shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cyber-blue font-bold uppercase text-sm flex items-center">
                <span className="mr-2">◈</span>
                Agent Templates ({getCreatedAgents().length})
              </h3>
              <button
                onClick={() => setShowCreateModal(true)}
                className="btn-base btn-md btn-gray"
              >
                + Create
              </button>
            </div>
            <p className="text-cyber-gray-light text-xs">
              Created agents waiting for deployment
            </p>
          </div>

          {/* Agent Templates List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
            {getCreatedAgents().map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  setSidebarAgent(agent);
                  setShowSidebar(true);
                }}
                className={`px-3 py-2 cursor-pointer border-l-4 transition-all ${
                  sidebarAgent?.id === agent.id && showSidebar
                    ? 'border-l-cyber-red bg-cyber-darker'
                    : 'border-l-cyber-gray hover:border-l-cyber-blue hover:bg-cyber-dark'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-lg">{getTypeIcon(agent.agent_type)}</span>
                    <div className={`font-mono text-sm font-bold truncate ${
                      sidebarAgent?.id === agent.id && showSidebar ? 'text-cyber-red' : 'text-cyber-blue'
                    }`}>
                      {agent.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2 py-0.5 bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow text-[10px] uppercase">
                      Template
                    </span>
                  </div>
                </div>
                {agent.description && (
                  <div className="text-cyber-gray-light text-xs truncate mt-1">{agent.description}</div>
                )}
                <div className="flex items-center gap-1 mt-1">
                  {agent.capabilities.asset && (
                    <span className="w-2 h-2 rounded-full bg-cyber-blue" title="Asset Discovery" />
                  )}
                  {agent.capabilities.traffic && (
                    <span className="w-2 h-2 rounded-full bg-cyber-green" title="Traffic Analysis" />
                  )}
                  {agent.capabilities.host && (
                    <span className="w-2 h-2 rounded-full bg-cyber-purple" title="Host Info" />
                  )}
                  {agent.capabilities.access && (
                    <span className="w-2 h-2 rounded-full bg-cyber-red" title="Remote Access" />
                  )}
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
        <div className="dashboard-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-cyber-gray shrink-0">
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
          <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
            {getConnectedAgents().map((agent) => (
              <div
                key={agent.id}
                onClick={() => {
                  setSidebarAgent(agent);
                  setShowSidebar(true);
                }}
                className={`px-3 py-2 cursor-pointer border-l-4 transition-all ${
                  sidebarAgent?.id === agent.id && showSidebar
                    ? 'border-l-cyber-red bg-cyber-darker'
                    : activeAgent?.id === agent.id
                    ? 'border-l-cyber-purple bg-cyber-dark'
                    : 'border-l-cyber-gray hover:border-l-cyber-blue hover:bg-cyber-dark'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)} ${
                      agent.status === 'online' ? 'animate-pulse' : ''
                    }`}></span>
                    <div className={`font-mono text-sm font-bold truncate ${
                      sidebarAgent?.id === agent.id && showSidebar ? 'text-cyber-red' : 'text-cyber-blue'
                    }`}>
                      {agent.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {activeAgent?.id === agent.id && (
                      <span className="px-2 py-0.5 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple text-[10px] uppercase">
                        POV
                      </span>
                    )}
                    <span className="text-lg">{getTypeIcon(agent.agent_type)}</span>
                  </div>
                </div>
                <div className="text-cyber-gray-light text-xs truncate mt-1">
                  {formatLastSeen(agent.last_seen)}
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {agent.capabilities.asset && (
                    <span className="w-2 h-2 rounded-full bg-cyber-blue" title="Asset Discovery" />
                  )}
                  {agent.capabilities.traffic && (
                    <span className="w-2 h-2 rounded-full bg-cyber-green" title="Traffic Analysis" />
                  )}
                  {agent.capabilities.host && (
                    <span className="w-2 h-2 rounded-full bg-cyber-purple" title="Host Info" />
                  )}
                  {agent.capabilities.access && (
                    <span className="w-2 h-2 rounded-full bg-cyber-red" title="Remote Access" />
                  )}
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

      {/* Create Agent Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-red max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-cyber-darker border-b border-cyber-red p-4 flex items-center justify-between sticky top-0">
              <h3 className="text-cyber-red font-bold text-xl uppercase tracking-wide flex items-center">
                <span className="mr-2">◆</span>
                Create New Agent
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-cyber-red hover:text-white text-2xl border-2 border-cyber-gray hover:border-cyber-red w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-cyber-red text-sm uppercase mb-2 font-bold">
                  ◆ Agent Name *
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
                <label className="block text-cyber-red text-sm uppercase mb-2 font-bold">
                  ◈ Description
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
                <label className="block text-cyber-red text-sm uppercase mb-2 font-bold">
                  ◆ Agent Type * <span className="text-cyber-gray-light text-xs normal-case font-normal">(Python for ease, Go for cross-platform)</span>
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
                <div className="border border-cyber-gray p-4 bg-cyber-dark">
                  <label className="block text-cyber-red text-sm uppercase mb-3 font-bold">
                    ◆ Target Platform <span className="text-cyber-gray-light text-xs normal-case font-normal">(Compiled Binary)</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'linux-amd64', label: 'Linux x64', icon: '◆' },
                      { value: 'windows-amd64', label: 'Windows x64', icon: '◇' },
                      { value: 'darwin-amd64', label: 'macOS Intel', icon: '◈' },
                      { value: 'darwin-arm64', label: 'macOS M1/M2', icon: '◉' },
                      { value: 'linux-arm64', label: 'Linux ARM', icon: '◊' },
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
                            ? 'border-cyber-red bg-cyber-red/20 text-white'
                            : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
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
                <label className="block text-cyber-red text-sm uppercase mb-2 font-bold">
                  ◆ Connection URL * <span className="text-cyber-gray-light text-xs normal-case font-normal">(Editable)</span>
                </label>
                
                {/* Quick Select */}
                <div className="mb-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUsePublicIP(false);
                      const isCodespaces = localIP.includes('github.dev');
                      const protocol = isCodespaces ? 'wss' : 'ws';
                      const port = isCodespaces ? '' : '12001';
                      setC2Protocol(protocol as 'ws' | 'wss');
                      setC2Host(localIP);
                      setC2Port(port);
                    }}
                    className={`px-3 py-2 border text-xs uppercase transition-all ${
                      !usePublicIP && c2Host !== 'nop-backend-1'
                        ? 'border-cyber-red bg-cyber-red/20 text-cyber-red'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
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
                      setC2Host('172.54.0.1');
                      setC2Port('12001');
                    }}
                    className={`px-3 py-2 border text-xs uppercase transition-all ${
                      c2Host === '172.54.0.1'
                        ? 'border-cyber-red bg-cyber-red/20 text-cyber-red'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
                    }`}
                  >
                    <div className="font-bold mb-1">◈ Internal</div>
                    <div className="font-mono text-[10px]">172.54.0.1</div>
                  </button>
                  {publicIP && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsePublicIP(true);
                        setC2Protocol('ws');
                        setC2Host(publicIP);
                        setC2Port('12001');
                      }}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        usePublicIP
                          ? 'border-cyber-red bg-cyber-red/20 text-cyber-red'
                          : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
                      }`}
                    >
                      <div className="font-bold mb-1">◉ Public IP</div>
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
                      placeholder="12001"
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
                <label className="block text-cyber-red text-sm uppercase mb-2 font-bold">
                  ◆ Modules <span className="text-cyber-gray-light text-xs normal-case font-normal">(Agent relays data to C2 server)</span>
                </label>
                <div className="space-y-2">
                  {[
                    { key: 'asset', label: 'Asset Module', icon: '◆', desc: 'Network asset discovery' },
                    { key: 'traffic', label: 'Traffic Module', icon: '◈', desc: 'Traffic monitoring' },
                    { key: 'host', label: 'Host Module', icon: '◉', desc: 'System information' },
                    { key: 'access', label: 'Access Module', icon: '⬡', desc: 'Remote command execution' },
                  ].map((cap) => (
                    <label
                      key={cap.key}
                      className="flex items-center space-x-3 cursor-pointer p-3 border border-cyber-gray hover:border-cyber-red transition-all duration-300"
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
                        className="w-4 h-4 accent-cyber-red"
                      />
                      <div className="flex-1">
                        <span className="text-white uppercase text-sm font-bold block">
                          {cap.icon} {cap.label}
                        </span>
                        <span className="text-cyber-gray-light text-xs">{cap.desc}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-cyber-red p-4 flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-base btn-md btn-gray border-2 border-cyber-gray hover:border-cyber-red"
                disabled={loading}
              >
                ✕ Cancel
              </button>
              <button
                onClick={handleCreateAgent}
                className="btn-base btn-md btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                disabled={loading || !newAgent.name}
              >
                {loading ? '◈ Creating...' : '◆ Create Agent'}
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
          <div className="fixed right-0 top-0 h-full w-full md:w-3/5 lg:w-2/5 bg-cyber-darker border-l border-cyber-red z-50 overflow-y-auto animate-slideIn">
            {/* Panel Header */}
            <div className="sticky top-0 bg-cyber-dark border-b border-cyber-red p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-cyber-red font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◆</span>
                  Agent Details
                </h3>
                <p className="text-xs text-cyber-gray-light mt-1">
                  {sidebarAgent.name}
                </p>
              </div>
              <button
                onClick={() => setShowSidebar(false)}
                className="text-cyber-gray hover:text-cyber-red text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-3 space-y-3">
              {/* Connected Agent: Operational Details */}
              {sidebarAgent.last_seen ? (
                <>
                  {/* Live Status - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Live Status</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Name:</span>
                        <span className="text-white font-bold">{sidebarAgent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Status:</span>
                        <span className="text-cyber-green font-bold flex items-center gap-1">
                          <span className={`w-2 h-2 rounded-full ${getStatusColor(sidebarAgent.status)} animate-pulse`}></span>
                          {getStatusText(sidebarAgent.status)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Uptime:</span>
                        <span className="text-cyber-green font-mono">{formatUptime(sidebarAgent.connected_at || '')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Last Seen:</span>
                        <span className="text-white">{formatLastSeen(sidebarAgent.last_seen)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Network Info - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Network</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-cyber-gray-light text-xs shrink-0">IP:</span>
                        <code className="bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-blue text-xs font-mono truncate">
                          {getAgentIP(sidebarAgent)}
                        </code>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-cyber-gray-light text-xs shrink-0">URL:</span>
                        <code className="bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-green text-[10px] font-mono truncate flex-1">
                          {sidebarAgent.connection_url}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Active Modules - Compact Grid */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Modules</h4>
                    <div className="grid grid-cols-4 gap-1">
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.asset 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Asset</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.traffic 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Traffic</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.host 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Host</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.access 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Access</div>
                    </div>
                  </div>

                  {/* POV Action - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-cyber-red font-bold uppercase text-xs">◆ POV Mode</h4>
                        <p className="text-cyber-gray-light text-[10px]">View from agent perspective</p>
                      </div>
                      {activeAgent?.id === sidebarAgent.id ? (
                        <button
                          onClick={() => {
                            setActiveAgent(null);
                            setShowSidebar(false);
                          }}
                          className="btn-base btn-sm btn-purple border-2 border-cyber-purple"
                        >
                          ◉ Exit POV
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            handleSwitchPOV(sidebarAgent);
                            setShowSidebar(false);
                          }}
                          className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-purple"
                        >
                          ◎ Enter POV
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Kill Agent Action */}
                  <div className="bg-cyber-dark border border-cyber-red/50 rounded p-3 hover:border-cyber-red hover:bg-cyber-red/10 transition-all">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-cyber-red font-bold uppercase text-xs">◆ Terminate Agent</h4>
                        <p className="text-cyber-gray-light text-[10px]">Kill process and remove from database</p>
                      </div>
                      <button
                        onClick={() => {
                          handleKillAgent(sidebarAgent.id, sidebarAgent.name);
                          setShowSidebar(false);
                          setSidebarAgent(null);
                        }}
                        className="btn-base btn-sm btn-red border-2 border-cyber-red hover:bg-cyber-red hover:text-black"
                      >
                        ✕ Kill
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Template Agent - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Agent Template</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Name:</span>
                        <span className="text-white font-bold">{sidebarAgent.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Type:</span>
                        <span className="text-white uppercase">{sidebarAgent.agent_type}</span>
                      </div>
                      <div className="col-span-2 flex justify-between">
                        <span className="text-cyber-gray-light">Status:</span>
                        <span className="text-cyber-gray-light flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-cyber-gray"></span>
                          Template Only
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Agent Credentials & Download */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Credentials</h4>
                    <div className="space-y-2">
                      {/* Agent ID */}
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-gray-light text-[10px] uppercase shrink-0 w-16">ID:</span>
                        <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-gray-light text-[10px] font-mono truncate">
                          {sidebarAgent.id}
                        </code>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(sidebarAgent.id); }}
                          className="btn-base btn-icon btn-gray border-2 border-cyber-gray hover:border-cyber-blue" title="Copy">◈</button>
                      </div>
                      {/* Auth Token */}
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-gray-light text-[10px] uppercase shrink-0 w-16">Token:</span>
                        <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-gray-light text-[10px] font-mono truncate">
                          {sidebarAgent.auth_token}
                        </code>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(sidebarAgent.auth_token); }}
                          className="btn-base btn-icon btn-gray border-2 border-cyber-gray hover:border-cyber-blue" title="Copy">◈</button>
                      </div>
                      {/* Encryption Key */}
                      <div className="flex items-center gap-2">
                        <span className="text-cyber-gray-light text-[10px] uppercase shrink-0 w-16">Key:</span>
                        <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-gray-light text-[10px] font-mono truncate">
                          {sidebarAgent.encryption_key}
                        </code>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(sidebarAgent.encryption_key); }}
                          className="btn-base btn-icon btn-gray border-2 border-cyber-gray hover:border-cyber-blue" title="Copy">◈</button>
                      </div>
                    </div>
                  </div>

                  {/* Download Section - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Download</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-gray-light text-[10px] font-mono truncate">
                          /api/v1/agents/download/{sidebarAgent.download_token}
                        </code>
                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.protocol}//${window.location.host}/api/v1/agents/download/${sidebarAgent.download_token}`); }}
                          className="btn-base btn-icon btn-gray border-2 border-cyber-gray hover:border-cyber-blue" title="Copy URL">◈</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const hostname = window.location.hostname;
                            const protocol = window.location.protocol;
                            const backendUrl = `${protocol}//${hostname.replace('-12000', '-12001')}`;
                            navigator.clipboard.writeText(`wget -O agent.py "${backendUrl}/api/v1/agents/download/${sidebarAgent.download_token}"`);
                          }}
                          className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                        >◈ wget</button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const hostname = window.location.hostname;
                            const protocol = window.location.protocol;
                            const backendUrl = `${protocol}//${hostname.replace('-12000', '-12001')}`;
                            navigator.clipboard.writeText(`curl -o agent.py "${backendUrl}/api/v1/agents/download/${sidebarAgent.download_token}"`);
                          }}
                          className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                        >◈ curl</button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`wget -O agent.py "http://nop-backend:12001/api/v1/agents/download/${sidebarAgent.download_token}"`);
                          }}
                          className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                        >◈ Docker wget</button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(`curl -o agent.py "http://nop-backend:12001/api/v1/agents/download/${sidebarAgent.download_token}"`);
                          }}
                          className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                        >◈ Docker curl</button>
                      </div>
                    </div>
                  </div>

                  {/* Template Capabilities - Compact Grid */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Modules</h4>
                    <div className="grid grid-cols-4 gap-1">
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.asset 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Asset</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.traffic 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Traffic</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.host 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Host</div>
                      <div className={`p-2 border text-center text-[10px] uppercase font-bold ${
                        sidebarAgent.capabilities.access 
                          ? 'border-cyber-gray bg-cyber-dark text-white' 
                          : 'border-cyber-gray/30 text-cyber-gray/50'
                      }`}>Access</div>
                    </div>
                  </div>

                  {/* Schedule Settings - Compact */}
                  {sidebarAgent.agent_metadata && (
                    <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                      <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Schedule</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-cyber-gray-light">Strategy:</span>
                          <span className="text-white uppercase">{sidebarAgent.agent_metadata.connection_strategy || 'constant'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-gray-light">Connectback:</span>
                          <span className="text-white">{sidebarAgent.agent_metadata.connectback_interval || 30}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-gray-light">Heartbeat:</span>
                          <span className="text-white">{sidebarAgent.agent_metadata.heartbeat_interval || 30}s</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-gray-light">Data Sync:</span>
                          <span className="text-white">{sidebarAgent.agent_metadata.data_interval || 60}s</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Security Settings - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Security</h4>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Obfuscate:</span>
                        <span className={sidebarAgent.obfuscate ? 'text-cyber-green' : 'text-cyber-gray'}>{sidebarAgent.obfuscate ? 'On' : 'Off'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Persist:</span>
                        <span className="text-white uppercase">{sidebarAgent.persistence_level || 'med'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Startup:</span>
                        <span className="text-white uppercase">{sidebarAgent.startup_mode || 'auto'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Template Actions - Compact */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Actions</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleViewSource(sidebarAgent)}
                        className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-blue"
                      >◉ View Source</button>
                      <button
                        onClick={() => {
                          // Populate form with template data for editing
                          setNewAgent({
                            name: sidebarAgent.name,
                            description: sidebarAgent.description || '',
                            agent_type: sidebarAgent.agent_type,
                            connection_url: sidebarAgent.connection_url,
                            capabilities: { ...sidebarAgent.capabilities },
                            obfuscate: sidebarAgent.obfuscate,
                            persistence_level: sidebarAgent.persistence_level || 'medium',
                            startup_mode: sidebarAgent.startup_mode || 'auto',
                          });
                          // Parse connection URL to populate form fields
                          try {
                            const url = new URL(sidebarAgent.connection_url);
                            setC2Protocol(url.protocol.replace(':', '') as 'ws' | 'wss');
                            setC2Host(url.hostname);
                            setC2Port(url.port || '');
                          } catch { /* ignore parse errors */ }
                          setShowCreateModal(true);
                          setShowSidebar(false);
                        }}
                        className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-red"
                      >◈ Edit</button>
                      <button
                        onClick={() => handleGenerateAgent(sidebarAgent)}
                        className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-green"
                      >▼ Download</button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete agent template "${sidebarAgent.name}"?`)) {
                            handleDeleteAgent(sidebarAgent.id);
                            setShowSidebar(false);
                            setSidebarAgent(null);
                          }
                        }}
                        className="btn-base btn-sm btn-gray border-2 border-cyber-gray hover:border-cyber-red"
                      >✕ Delete</button>
                    </div>
                  </div>
                </>
              )}

              {/* Common Metadata - Compact */}
              <div className="bg-cyber-dark border border-cyber-gray rounded p-3 hover:border-cyber-red hover:bg-cyber-dark/80 transition-all cursor-default">
                <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">◆ Metadata</h4>
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

      {/* Source Code Modal */}
      {showSourceModal && sourceCode && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border-2 border-cyber-blue rounded-lg shadow-lg shadow-cyber-blue/20 w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-4 border-b border-cyber-gray">
              <div className="flex items-center gap-3">
                <span className="text-cyber-blue text-xl">◉</span>
                <div>
                  <h3 className="text-cyber-white font-bold text-lg uppercase tracking-wider">Agent Source Code</h3>
                  <p className="text-cyber-gray text-sm font-mono">{sourceCode.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-cyber-dark border border-cyber-gray rounded text-xs text-cyber-gray-light uppercase">
                  {sourceCode.language}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(sourceCode.code);
                  }}
                  className="btn-base btn-sm btn-gray border border-cyber-gray hover:border-cyber-green"
                  title="Copy to clipboard"
                >
                  ◆ Copy
                </button>
                <button
                  onClick={() => {
                    setShowSourceModal(false);
                    setSourceCode(null);
                  }}
                  className="text-cyber-gray hover:text-cyber-red transition-colors text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Source Code Content */}
            <div className="flex-1 overflow-auto p-4">
              <pre className="bg-cyber-black border border-cyber-gray rounded p-4 overflow-auto text-sm font-mono text-cyber-gray-light whitespace-pre">
                {sourceCode.code}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
