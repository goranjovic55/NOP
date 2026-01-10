/**
 * Custom hooks for Agent API operations
 * 
 * Provides React Query hooks for fetching and mutating agent data
 * with automatic caching, refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService, Agent, AgentCreate, AgentUpdate } from '../services/agentService';
import { useAuthStore } from '../store/authStore';
import { logger } from '../utils/logger';

// Query key factory for consistent cache invalidation
export const agentKeys = {
  all: ['agents'] as const,
  lists: () => [...agentKeys.all, 'list'] as const,
  list: () => [...agentKeys.lists()] as const,
  details: () => [...agentKeys.all, 'detail'] as const,
  detail: (id: string) => [...agentKeys.details(), id] as const,
};

/**
 * Hook for fetching all agents
 * 
 * @param options - Additional React Query options
 * @returns Query result with agents data, loading state, and error
 * 
 * @example
 * const { data: agents, isLoading, error } = useAgents();
 */
export function useAgents(options?: { enabled?: boolean }) {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: agentKeys.list(),
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return agentService.getAgents(token);
    },
    enabled: !!token && (options?.enabled !== false),
    staleTime: 10000, // Consider data stale after 10 seconds
    refetchInterval: 30000, // Refetch every 30 seconds to check agent status
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for fetching a single agent by ID
 * 
 * @param agentId - The agent ID to fetch
 * @returns Query result with agent data
 * 
 * @example
 * const { data: agent } = useAgent(agentId);
 */
export function useAgent(agentId: string | null) {
  const { token } = useAuthStore();
  
  return useQuery({
    queryKey: agentKeys.detail(agentId || ''),
    queryFn: async () => {
      if (!token || !agentId) throw new Error('Missing token or agent ID');
      return agentService.getAgent(token, agentId);
    },
    enabled: !!token && !!agentId,
    staleTime: 10000,
  });
}

/**
 * Hook for creating a new agent
 * 
 * @returns Mutation object with mutate function that accepts agent data
 * 
 * @example
 * const { mutate: createAgent, isLoading } = useCreateAgent();
 * createAgent({ name: 'Agent1', agent_type: 'python', ... });
 */
export function useCreateAgent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentData: AgentCreate) => {
      if (!token) throw new Error('No authentication token');
      return agentService.createAgent(token, agentData);
    },
    onSuccess: (newAgent) => {
      // Invalidate agents list to trigger refetch
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      logger.debug('Agent created:', newAgent.id);
    },
    onError: (error) => {
      logger.error('Failed to create agent:', error);
    },
  });
}

/**
 * Hook for updating an agent
 * 
 * @returns Mutation object with mutate function
 * 
 * @example
 * const { mutate: updateAgent } = useUpdateAgent();
 * updateAgent({ id: agentId, data: { name: 'New Name' } });
 */
export function useUpdateAgent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AgentUpdate }) => {
      if (!token) throw new Error('No authentication token');
      return agentService.updateAgent(token, id, data);
    },
    onSuccess: (updatedAgent, { id }) => {
      // Update cache for this specific agent
      queryClient.setQueryData(agentKeys.detail(id), updatedAgent);
      // Invalidate list to reflect changes
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      logger.debug('Agent updated:', id);
    },
    onError: (error) => {
      logger.error('Failed to update agent:', error);
    },
  });
}

/**
 * Hook for deleting an agent
 * 
 * @returns Mutation object with mutate function that accepts agent ID
 * 
 * @example
 * const { mutate: deleteAgent } = useDeleteAgent();
 * deleteAgent(agentId);
 */
export function useDeleteAgent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!token) throw new Error('No authentication token');
      await agentService.deleteAgent(token, agentId);
      return agentId;
    },
    onSuccess: (agentId) => {
      // Invalidate agents list
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      // Remove from cache
      queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) });
      logger.debug('Agent deleted:', agentId);
    },
    onError: (error) => {
      logger.error('Failed to delete agent:', error);
    },
  });
}

/**
 * Hook for killing an agent (terminate and delete)
 * 
 * @returns Mutation object with mutate function that accepts agent ID
 * 
 * @example
 * const { mutate: killAgent } = useKillAgent();
 * killAgent(agentId);
 */
export function useKillAgent() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (agentId: string) => {
      if (!token) throw new Error('No authentication token');
      return agentService.killAgent(token, agentId);
    },
    onSuccess: (result, agentId) => {
      // Invalidate agents list
      queryClient.invalidateQueries({ queryKey: agentKeys.lists() });
      // Remove from cache
      queryClient.removeQueries({ queryKey: agentKeys.detail(agentId) });
      logger.debug('Agent killed:', agentId);
    },
    onError: (error) => {
      logger.error('Failed to kill agent:', error);
    },
  });
}

/**
 * Hook for generating agent file
 * 
 * @returns Mutation object with mutate function
 * 
 * @example
 * const { mutate: generateAgent } = useGenerateAgent();
 * generateAgent({ agentId, platform: 'linux-amd64' });
 */
export function useGenerateAgent() {
  const { token } = useAuthStore();
  
  return useMutation({
    mutationFn: async ({ agentId, platform }: { agentId: string; platform?: string }) => {
      if (!token) throw new Error('No authentication token');
      return agentService.generateAgent(token, agentId, platform);
    },
    onSuccess: () => {
      logger.debug('Agent file generated');
    },
    onError: (error) => {
      logger.error('Failed to generate agent:', error);
    },
  });
}
