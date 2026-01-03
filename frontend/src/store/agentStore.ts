/**
 * Agent Store - Zustand state management for agents
 */

import { create } from 'zustand';
import { Agent } from '../services/agentService';

interface AgentStore {
  agents: Agent[];
  activeAgent: Agent | null;
  connectedCount: number;
  setAgents: (agents: Agent[]) => void;
  addAgent: (agent: Agent) => void;
  updateAgent: (agentId: string, updates: Partial<Agent>) => void;
  removeAgent: (agentId: string) => void;
  setActiveAgent: (agent: Agent | null) => void;
  updateConnectedCount: () => void;
}

export const useAgentStore = create<AgentStore>((set, get) => ({
  agents: [],
  activeAgent: null,
  connectedCount: 0,

  setAgents: (agents) => {
    set({ agents });
    get().updateConnectedCount();
  },

  addAgent: (agent) => {
    set((state) => ({ agents: [...state.agents, agent] }));
    get().updateConnectedCount();
  },

  updateAgent: (agentId, updates) => {
    set((state) => ({
      agents: state.agents.map((agent) =>
        agent.id === agentId ? { ...agent, ...updates } : agent
      ),
    }));
    get().updateConnectedCount();
  },

  removeAgent: (agentId) => {
    set((state) => ({
      agents: state.agents.filter((agent) => agent.id !== agentId),
      activeAgent: state.activeAgent?.id === agentId ? null : state.activeAgent,
    }));
    get().updateConnectedCount();
  },

  setActiveAgent: (agent) => {
    set({ activeAgent: agent });
  },

  updateConnectedCount: () => {
    const count = get().agents.filter(
      (agent) => agent.status === 'online'
    ).length;
    set({ connectedCount: count });
  },
}));
