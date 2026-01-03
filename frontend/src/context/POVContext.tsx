/**
 * POV (Point of View) Context
 * 
 * Manages which agent's perspective is currently active.
 * When an agent POV is set, all API calls will include the X-Agent-POV header
 * to filter data to that specific agent.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Agent } from '../services/agentService';

interface POVContextType {
  activeAgent: Agent | null;
  setActiveAgent: (agent: Agent | null) => void;
  isAgentPOV: boolean;
}

const POVContext = createContext<POVContextType | undefined>(undefined);

export const POVProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);

  const isAgentPOV = activeAgent !== null;

  // Persist active agent to localStorage
  useEffect(() => {
    if (activeAgent) {
      localStorage.setItem('active_agent_pov', JSON.stringify(activeAgent));
    } else {
      localStorage.removeItem('active_agent_pov');
    }
  }, [activeAgent]);

  // Restore active agent from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('active_agent_pov');
    if (stored) {
      try {
        setActiveAgent(JSON.parse(stored));
      } catch (e) {
        localStorage.removeItem('active_agent_pov');
      }
    }
  }, []);

  return (
    <POVContext.Provider value={{ activeAgent, setActiveAgent, isAgentPOV }}>
      {children}
    </POVContext.Provider>
  );
};

export const usePOV = (): POVContextType => {
  const context = useContext(POVContext);
  if (!context) {
    throw new Error('usePOV must be used within a POVProvider');
  }
  return context;
};

/**
 * Get headers with agent POV included
 */
export const getPOVHeaders = (activeAgent: Agent | null): Record<string, string> => {
  const headers: Record<string, string> = {};
  
  if (activeAgent) {
    headers['X-Agent-POV'] = activeAgent.id;
  }
  
  return headers;
};
