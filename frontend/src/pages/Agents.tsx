import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { agentService, Agent, AgentCreate } from '../services/agentService';

const Agents: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, setActiveAgent } = usePOV();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
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
  });

  useEffect(() => {
    loadAgents();
    // Poll for agent status updates
    const interval = setInterval(loadAgents, 10000);
    return () => clearInterval(interval);
  }, [token]);

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
      setShowCreateModal(false);
      setNewAgent({
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
      });
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
    if (activeAgent?.id === agent.id) {
      setActiveAgent(null);
    } else {
      setActiveAgent(agent);
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
            className={`bg-cyber-dark border p-6 relative ${
              activeAgent?.id === agent.id
                ? 'border-cyber-purple shadow-lg shadow-cyber-purple/50'
                : 'border-cyber-gray hover:border-cyber-blue'
            } transition-all duration-300`}
          >
            {/* Status Indicator */}
            <div className="absolute top-4 right-4">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`}></div>
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
                <div className="flex justify-between">
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-white uppercase">{agent.agent_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-cyber-gray-light">Status:</span>
                  <span className={`uppercase font-bold ${
                    agent.status === 'online' ? 'text-cyber-green' :
                    agent.status === 'offline' ? 'text-cyber-gray' :
                    agent.status === 'error' ? 'text-cyber-red' :
                    'text-cyber-yellow'
                  }`}>
                    {getStatusText(agent.status)}
                  </span>
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

              {/* Actions */}
              <div className="border-t border-cyber-gray pt-3 flex gap-2">
                <button
                  onClick={() => handleGenerateAgent(agent)}
                  className="flex-1 px-3 py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all duration-300 text-xs uppercase"
                >
                  Download
                </button>
                <button
                  onClick={() => handleSwitchPOV(agent)}
                  className={`flex-1 px-3 py-2 border transition-all duration-300 text-xs uppercase ${
                    activeAgent?.id === agent.id
                      ? 'border-cyber-purple bg-cyber-purple text-white'
                      : 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-white'
                  }`}
                >
                  {activeAgent?.id === agent.id ? 'Active POV' : 'Switch POV'}
                </button>
                <button
                  onClick={() => handleDeleteAgent(agent.id)}
                  className="px-3 py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-all duration-300 text-xs uppercase"
                >
                  ×
                </button>
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
                <input
                  type="text"
                  value={newAgent.connection_url}
                  onChange={(e) => setNewAgent({ ...newAgent, connection_url: e.target.value })}
                  className="w-full bg-cyber-black border border-cyber-gray text-white px-4 py-2 focus:outline-none focus:border-cyber-red font-mono text-sm"
                  placeholder="ws://your-nop-server:12001/api/v1/agents/{agent_id}/connect"
                />
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
    </div>
  );
};

export default Agents;
