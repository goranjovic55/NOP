/**
 * Custom hooks for Asset API operations
 * 
 * Provides React Query hooks for fetching and mutating asset data
 * with automatic caching, refetching, and error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { logger } from '../utils/logger';

// Query key factory for consistent cache invalidation
export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: { status?: string; agentPOV?: string }) => 
    [...assetKeys.lists(), filters] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: string) => [...assetKeys.details(), id] as const,
};

/**
 * Hook for fetching assets with optional filters
 * 
 * @param status - Optional status filter ('online', 'offline', 'unknown')
 * @param options - Additional React Query options
 * @returns Query result with assets data, loading state, and error
 * 
 * @example
 * const { data: assets, isLoading, error } = useAssets('online');
 */
export function useAssets(status?: string, options?: { enabled?: boolean }) {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  return useQuery({
    queryKey: assetKeys.list({ status, agentPOV: activeAgent?.id }),
    queryFn: async () => {
      if (!token) throw new Error('No authentication token');
      return assetService.getAssets(token, status, activeAgent?.id);
    },
    enabled: !!token && (options?.enabled !== false),
    staleTime: 30000, // Consider data stale after 30 seconds
    refetchInterval: 60000, // Refetch every 60 seconds in background
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook for deleting all assets
 * 
 * @returns Mutation object with mutate function and status
 * 
 * @example
 * const { mutate: deleteAll, isLoading } = useDeleteAllAssets();
 * deleteAll(); // Clears all assets and invalidates cache
 */
export function useDeleteAllAssets() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('No authentication token');
      return assetService.deleteAllAssets(token);
    },
    onSuccess: () => {
      // Invalidate all asset queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: assetKeys.all });
      logger.debug('All assets deleted, cache invalidated');
    },
    onError: (error) => {
      logger.error('Failed to delete assets:', error);
    },
  });
}

/**
 * Hook for starting a network scan
 * 
 * @returns Mutation object with mutate function that accepts scan parameters
 * 
 * @example
 * const { mutate: startScan } = useStartScan();
 * startScan({ network: '192.168.1.0/24', scanType: 'arp' });
 */
export function useStartScan() {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      network = '172.21.0.0/24', 
      scanType = 'basic' 
    }: { 
      network?: string; 
      scanType?: string;
    }) => {
      if (!token) throw new Error('No authentication token');
      return assetService.startScan(token, network, scanType, activeAgent?.id);
    },
    onSuccess: (data) => {
      logger.debug('Scan started:', data);
      // Invalidate assets after scan completes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: assetKeys.all });
      }, 5000);
    },
    onError: (error) => {
      logger.error('Failed to start scan:', error);
    },
  });
}

/**
 * Hook for polling scan status
 * 
 * @param scanId - The scan ID to check status for
 * @param enabled - Whether to enable polling
 * @returns Query result with scan status
 * 
 * @example
 * const { data: status } = useScanStatus(scanId, isScanning);
 */
export function useScanStatus(scanId: string | null, enabled: boolean = true) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: ['scanStatus', scanId],
    queryFn: async () => {
      if (!token || !scanId) throw new Error('Missing token or scan ID');
      return assetService.getScanStatus(token, scanId);
    },
    enabled: !!token && !!scanId && enabled,
    refetchInterval: (query) => {
      // Stop polling when scan is complete
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') {
        // Invalidate assets to refresh list
        queryClient.invalidateQueries({ queryKey: assetKeys.all });
        return false;
      }
      return 2000; // Poll every 2 seconds
    },
  });
}
