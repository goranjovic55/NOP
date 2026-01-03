import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { agentService, Agent, AgentCreate } from '../services/agentService';

const Agents: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, setActiveAgent } = usePOV();
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedAgentForSettings, setSelectedAgentForSettings] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(false);
  const [localIP, setLocalIP] = useState<string>('localhost');
  const [publicIP, setPublicIP] = useState<string>('');
  const [usePublicIP, setUsePublicIP] = useState(false);
  const [newAgent, setNewAgent] = useState<AgentCreate>({
    name: '',
    description: '',
    agent_type: 'python',
    connection_url: 'ws://localhost:12001/api/v1/agents/{agent_id}/connect',
    capabilities: {
      asset: true,
      traffic: true,
      host: true,
      access: false,
    },
    obfuscate: true,
    startup_mode: 'auto',
    persistence_level: 'medium',
    metadata: {
      connectback_interval: 30,
      heartbeat_interval: 30,
      data_interval: 60,
      connection_strategy: 'constant',
      max_reconnect_attempts: -1,
    },
  });

  useEffect(() => {
    loadAgents();
    detectIPs();
    // Poll for agent status updates
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const detectIPs = async () => {
    // Detect local IP
    try {
      const pc = new RTCPeerConnection({ iceServers: [] });
      pc.createDataChannel('');
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      pc.onicecandidate = (ice) => {
        if (!ice || !ice.candidate || !ice.candidate.candidate) return;
        const parts = ice.candidate.candidate.split(' ');
        const ip = parts[4];
        if (ip && ip !== '0.0.0.0' && !ip.includes(':')) {
          setLocalIP(ip);
          pc.close();
        }
      };
    } catch (error) {
      console.error('Failed to detect local IP:', error);
    }

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
  };

  const loadAgents = async () => {
    if (!token) return;
    try {
      const data = await agentService.getAgents(token);
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const handleCreateAgent = async () => {
    if (!token || !newAgent.name) return;
    setLoading(true);
    try {
      const agent = await agentService.createAgent(token, newAgent);
      setAgents([...agents, agent]);
      
      // Auto-download agent file
      const { content, filename } = await agentService.generateAgent(token, agent.id);
      const blob = new Blob([content], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      setShowCreateModal(false);
      setNewAgent({
        name: '',
        description: '',
        agent_type: 'python',
        connection_url: `ws://${usePublicIP ? publicIP : localIP}:12001/api/v1/agents/{agent_id}/connect`,
        capabilities: {
          asset: true,
          traffic: true,
          host: true,
          access: false,
        },
        obfuscate: true,
        startup_mode: 'auto',
        persistence_level: 'medium',
        metadata: {
          connectback_interval: 30,
          heartbeat_interval: 30,
          data_interval: 60,
          connection_strategy: 'constant',
          max_reconnect_attempts: -1,
        },
      });
      setUsePublicIP(false);
    } catch (error) {
      console.error('Failed to create agent:', error);
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

  const handleGenerateAgent = async (agent: Agent) => {
    if (!token) return;
    try {
      const { content, filename } = await agentService.generateAgent(token, agent.id);
      
      // Download the file
      const blob = new Blob([content], { type: 'text/plain' });
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

  const handleOpenSettings = (agent: Agent, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    setSelectedAgentForSettings(agent);
    setShowSettingsModal(true);
  };

  const handleSaveAgentSettings = async () => {
    if (!token || !selectedAgentForSettings) return;
    setLoading(true);
    try {
      // Update agent settings via API
      await agentService.updateAgent(token, selectedAgentForSettings.id, {
        connection_url: selectedAgentForSettings.connection_url,
        metadata: selectedAgentForSettings.metadata
      });
      
      // Update local state
      setAgents(agents.map(a => 
        a.id === selectedAgentForSettings.id ? selectedAgentForSettings : a
      ));
      
      setShowSettingsModal(false);
      setSelectedAgentForSettings(null);
    } catch (error) {
      console.error('Failed to update agent settings:', error);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-cyber-red cyber-glow-red tracking-wide uppercase">
            Agent Management
          </h2>
          <p className="text-cyber-gray-light text-sm mt-1">
            Deploy and manage clone agents for remote network operations
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-6 py-2 bg-cyber-red border border-cyber-red-dark text-white font-bold uppercase tracking-wide cyber-glow-red hover:bg-cyber-red-dark transition-all duration-300"
        >
          + Create Agent
        </button>
      </div>

      {/* Active Agent Banner */}
      {activeAgent && (
        <div className="bg-cyber-purple border border-cyber-purple-light p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-cyber-green rounded-full animate-pulse"></div>
              <span className="text-white font-bold uppercase tracking-wide">
                Agent POV Active: {activeAgent.name}
              </span>
              <span className="text-cyber-gray-light text-sm">
                All data is now streamed from this agent's perspective
              </span>
            </div>
            <button
              onClick={() => setActiveAgent(null)}
              className="px-4 py-1 border border-white text-white hover:bg-white hover:text-cyber-purple transition-all duration-300 uppercase text-sm"
            >
              Exit POV
            </button>
          </div>
        </div>
      )}

      {/* Agents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            onClick={() => handleSwitchPOV(agent)}
            className={`bg-cyber-dark border p-6 relative cursor-pointer ${
              activeAgent?.id === agent.id
                ? 'border-cyber-purple shadow-lg shadow-cyber-purple/50'
                : agent.status === 'online'
                ? 'border-cyber-green hover:border-cyber-blue hover:shadow-lg hover:shadow-cyber-blue/30'
                : 'border-cyber-gray hover:border-cyber-blue'
            } transition-all duration-300`}
          >
            {/* Settings Button */}
            <button
              onClick={(e) => handleOpenSettings(agent, e)}
              className="absolute top-4 right-12 text-cyber-gray-light hover:text-cyber-blue transition-colors text-xl"
              title="Agent Settings"
            >
              ⚙
            </button>

            {/* Status Indicator - Prominent */}
            <div className="absolute top-4 right-4 flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)} ${
                agent.status === 'online' ? 'animate-pulse' : ''
              }`}></div>
            </div>

            {/* Agent Info */}
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <span className="text-3xl">{getTypeIcon(agent.agent_type)}</span>
                <div className="flex-1">
                  <h3 className="text-cyber-red font-bold text-lg uppercase tracking-wide">
                    {agent.name}
                  </h3>
                  {agent.description && (
                    <p className="text-cyber-gray-light text-sm mt-1">{agent.description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-white uppercase">{agent.agent_type}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-cyber-gray-light">Status:</span>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                    <span className={`uppercase font-bold text-xs ${
                      agent.status === 'online' ? 'text-cyber-green' :
                      agent.status === 'offline' ? 'text-cyber-gray' :
                      agent.status === 'error' ? 'text-cyber-red' :
                      'text-cyber-yellow'
                    }`}>
                      {agent.status === 'online' ? '● CONNECTED' : 
                       agent.status === 'offline' ? '○ OFFLINE' : 
                       agent.status === 'error' ? '✖ ERROR' : 
                       '◌ DISCONNECTED'}
                    </span>
                  </div>
                </div>
                {agent.last_seen && (
                  <div className="flex justify-between">
                    <span className="text-cyber-gray-light">Last Seen:</span>
                    <span className="text-white">
                      {new Date(agent.last_seen).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>

              {/* Capabilities */}
              <div className="border-t border-cyber-gray pt-3">
                <span className="text-cyber-gray-light text-xs uppercase">Modules:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {agent.capabilities.asset && (
                    <span className="px-2 py-1 bg-cyber-blue/20 border border-cyber-blue text-cyber-blue text-xs uppercase">
                      Asset
                    </span>
                  )}
                  {agent.capabilities.traffic && (
                    <span className="px-2 py-1 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple text-xs uppercase">
                      Traffic
                    </span>
                  )}
                  {agent.capabilities.host && (
                    <span className="px-2 py-1 bg-cyber-green/20 border border-cyber-green text-cyber-green text-xs uppercase">
                      Host
                    </span>
                  )}
                  {agent.capabilities.access && (
                    <span className="px-2 py-1 bg-cyber-yellow/20 border border-cyber-yellow text-cyber-yellow text-xs uppercase">
                      Access
                    </span>
                  )}
                </div>
              </div>

              {/* Encryption Key & Download Link */}
              <div className="border-t border-cyber-gray pt-3 space-y-2">
                <div>
                  <span className="text-cyber-gray-light text-xs uppercase block mb-1">Encryption Key:</span>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-green text-xs font-mono truncate">
                      {agent.encryption_key}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(agent.encryption_key);
                      }}
                      className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue text-xs"
                      title="Copy key"
                    >
                      📋
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-cyber-gray-light text-xs uppercase block mb-1">Download Link:</span>
                  <div className="flex items-center space-x-2">
                    <code className="flex-1 bg-cyber-black border border-cyber-gray px-2 py-1 text-cyber-blue text-xs font-mono truncate">
                      {window.location.origin}/api/v1/agents/download/{agent.download_token}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/v1/agents/download/${agent.download_token}`);
                      }}
                      className="px-2 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue text-xs"
                      title="Copy link"
                    >
                      📋
                    </button>
                  </div>
                </div>
              </div>

              {/* Click to Open Indicator */}
              <div className="border-t border-cyber-gray pt-3 mt-3">
                <div className="text-center text-cyber-blue text-xs uppercase tracking-wide">
                  {agent.status === 'online' ? (
                    <span className="flex items-center justify-center space-x-2">
                      <span>Click to View Agent POV</span>
                      <span className="text-lg">→</span>
                    </span>
                  ) : (
                    <span className="text-cyber-gray-light">Agent Offline - Deploy to Connect</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">◎</div>
          <h3 className="text-cyber-gray-light text-xl font-bold uppercase">No Agents Deployed</h3>
          <p className="text-cyber-gray text-sm mt-2">
            Create your first agent to start remote network operations
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-6 px-6 py-2 bg-cyber-red border border-cyber-red-dark text-white font-bold uppercase tracking-wide cyber-glow-red hover:bg-cyber-red-dark transition-all duration-300"
          >
            + Create Agent
          </button>
        </div>
      )}

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

              {/* Connection URL */}
              <div>
                <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                  Connection URL *
                </label>
                
                {/* IP Selection */}
                <div className="mb-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setUsePublicIP(false);
                      setNewAgent({ 
                        ...newAgent, 
                        connection_url: `ws://${localIP}:12001/api/v1/agents/{agent_id}/connect` 
                      });
                    }}
                    className={`flex-1 px-3 py-2 border text-xs uppercase transition-all ${
                      !usePublicIP
                        ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue'
                    }`}
                  >
                    <div className="font-bold mb-1">Local IP</div>
                    <div className="font-mono">{localIP}</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setUsePublicIP(true);
                      setNewAgent({ 
                        ...newAgent, 
                        connection_url: `ws://${publicIP || 'DETECTING...'}:12001/api/v1/agents/{agent_id}/connect` 
                      });
                    }}
                    className={`flex-1 px-3 py-2 border text-xs uppercase transition-all ${
                      usePublicIP
                        ? 'border-cyber-blue bg-cyber-blue/20 text-cyber-blue'
                        : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-blue'
                    }`}
                    disabled={!publicIP}
                  >
                    <div className="font-bold mb-1">Public IP</div>
                    <div className="font-mono">{publicIP || 'Detecting...'}</div>
                  </button>
                </div>

                <input
                  type="text"
                  value={newAgent.connection_url}
                  onChange={(e) => setNewAgent({ ...newAgent, connection_url: e.target.value })}
                  className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-red font-mono text-sm"
                  placeholder="ws://your-nop-server:12001/api/v1/agents/{agent_id}/connect"
                />
                <p className="text-cyber-gray-light text-xs mt-1">
                  Agent will connect back to this WebSocket URL
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
                        metadata: { ...newAgent.metadata, connection_strategy: 'constant', max_reconnect_attempts: -1 }
                      })}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        newAgent.metadata?.connection_strategy === 'constant'
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
                        metadata: { ...newAgent.metadata, connection_strategy: 'scheduled', max_reconnect_attempts: 10 }
                      })}
                      className={`px-3 py-2 border text-xs uppercase transition-all ${
                        newAgent.metadata?.connection_strategy === 'scheduled'
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
                {newAgent.metadata?.connection_strategy === 'scheduled' && (
                  <div className="mb-4">
                    <label className="block text-cyber-gray-light text-xs uppercase mb-2">
                      Max Reconnect Attempts
                    </label>
                    <input
                      type="number"
                      value={newAgent.metadata?.max_reconnect_attempts || 10}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        metadata: { ...newAgent.metadata, max_reconnect_attempts: parseInt(e.target.value) }
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
                      value={newAgent.metadata?.connectback_interval || 30}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        metadata: { ...newAgent.metadata, connectback_interval: parseInt(e.target.value) }
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
                      value={newAgent.metadata?.heartbeat_interval || 30}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        metadata: { ...newAgent.metadata, heartbeat_interval: parseInt(e.target.value) }
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
                      value={newAgent.metadata?.data_interval || 60}
                      onChange={(e) => setNewAgent({
                        ...newAgent,
                        metadata: { ...newAgent.metadata, data_interval: parseInt(e.target.value) }
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

      {/* Agent Settings Modal */}
      {showSettingsModal && selectedAgentForSettings && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-cyber-dark border border-cyber-blue max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-cyber-darker border-b border-cyber-blue p-4 flex items-center justify-between sticky top-0">
              <h3 className="text-cyber-blue font-bold text-xl uppercase tracking-wide">
                Agent Configuration - {selectedAgentForSettings.name}
              </h3>
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setSelectedAgentForSettings(null);
                }}
                className="text-cyber-blue hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Connection Configuration */}
              <div>
                <h4 className="text-cyber-green font-bold uppercase text-sm mb-3">Connection Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                      Connectback Server URL
                    </label>
                    <input
                      type="text"
                      value={selectedAgentForSettings.connection_url}
                      onChange={(e) => setSelectedAgentForSettings({
                        ...selectedAgentForSettings,
                        connection_url: e.target.value
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-blue font-mono text-sm"
                      placeholder="ws://your-server:12001/api/v1/agents/{agent_id}/connect"
                    />
                  </div>
                </div>
              </div>

              {/* Schedule Configuration */}
              <div>
                <h4 className="text-cyber-green font-bold uppercase text-sm mb-3">Schedule Settings</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                      Connectback Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedAgentForSettings.metadata?.connectback_interval || 30}
                      onChange={(e) => setSelectedAgentForSettings({
                        ...selectedAgentForSettings,
                        metadata: {
                          ...selectedAgentForSettings.metadata,
                          connectback_interval: parseInt(e.target.value)
                        }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-blue"
                      min="5"
                      max="3600"
                    />
                    <p className="text-cyber-gray-light text-xs mt-1">
                      How often agent attempts to reconnect (5-3600 seconds)
                    </p>
                  </div>

                  <div>
                    <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                      Heartbeat Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedAgentForSettings.metadata?.heartbeat_interval || 30}
                      onChange={(e) => setSelectedAgentForSettings({
                        ...selectedAgentForSettings,
                        metadata: {
                          ...selectedAgentForSettings.metadata,
                          heartbeat_interval: parseInt(e.target.value)
                        }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-blue"
                      min="10"
                      max="300"
                    />
                    <p className="text-cyber-gray-light text-xs mt-1">
                      Heartbeat frequency when connected (10-300 seconds)
                    </p>
                  </div>

                  <div>
                    <label className="block text-cyber-gray-light text-sm uppercase mb-2">
                      Data Collection Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={selectedAgentForSettings.metadata?.data_interval || 60}
                      onChange={(e) => setSelectedAgentForSettings({
                        ...selectedAgentForSettings,
                        metadata: {
                          ...selectedAgentForSettings.metadata,
                          data_interval: parseInt(e.target.value)
                        }
                      })}
                      className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-blue"
                      min="30"
                      max="3600"
                    />
                    <p className="text-cyber-gray-light text-xs mt-1">
                      How often agent collects and sends data (30-3600 seconds)
                    </p>
                  </div>
                </div>
              </div>

              {/* Download & Delete Actions */}
              <div className="border-t border-cyber-gray pt-4">
                <h4 className="text-cyber-yellow font-bold uppercase text-sm mb-3">Actions</h4>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      handleGenerateAgent(selectedAgentForSettings);
                      setShowSettingsModal(false);
                    }}
                    className="flex-1 px-4 py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all duration-300 uppercase text-sm"
                  >
                    Re-Download Agent
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Delete agent "${selectedAgentForSettings.name}"?`)) {
                        handleDeleteAgent(selectedAgentForSettings.id);
                        setShowSettingsModal(false);
                        setSelectedAgentForSettings(null);
                      }
                    }}
                    className="px-4 py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-all duration-300 uppercase text-sm"
                  >
                    Delete Agent
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-cyber-gray p-4 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  setSelectedAgentForSettings(null);
                }}
                className="px-6 py-2 border border-cyber-gray text-cyber-gray-light hover:border-white hover:text-white transition-all duration-300 uppercase"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAgentSettings}
                className="px-6 py-2 bg-cyber-blue border border-cyber-blue-dark text-white font-bold uppercase tracking-wide hover:bg-cyber-blue-dark transition-all duration-300 disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Agents;
