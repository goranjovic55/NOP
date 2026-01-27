import { useQuery, useQueryClient } from '@tanstack/react-query';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';

// Query keys factory for consistent cache key management
export const assetKeys = {
  all: ['assets'] as const,
  list: (status?: string, agentId?: string) => ['assets', 'list', { status, agentId }] as const,
  detail: (id: string) => ['assets', 'detail', id] as const,
};

/**
 * Centralized React Query hook for fetching assets
 * Replaces multiple independent useState/useEffect patterns across pages
 * 
 * Benefits:
 * - Automatic caching (stale-while-revalidate)
 * - Deduplication of concurrent requests
 * - Background refetching
 * - Shared state across components
 */
export function useAssetsQuery(
  status?: 'all' | 'online' | 'offline',
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
  }
) {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  
  const normalizedStatus = status === 'all' ? undefined : status;

  return useQuery({
    queryKey: assetKeys.list(normalizedStatus, activeAgent?.id),
    queryFn: async (): Promise<Asset[]> => {
      if (!token) return [];
      return assetService.getAssets(token, normalizedStatus, activeAgent?.id);
    },
    enabled: !!token && (options?.enabled !== false),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes (formerly cacheTime)
    refetchInterval: options?.refetchInterval,
    refetchOnWindowFocus: false,
    retry: 2,
    retryDelay: 1000,
  });
}

/**
 * Prefetch assets for faster page transitions
 * Call this before navigation to pre-populate cache
 */
export function usePrefetchAssets() {
  const queryClient = useQueryClient();
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();

  return async (status?: string) => {
    if (!token) return;
    
    await queryClient.prefetchQuery({
      queryKey: assetKeys.list(status, activeAgent?.id),
      queryFn: () => assetService.getAssets(token, status, activeAgent?.id),
      staleTime: 30 * 1000,
    });
  };
}

/**
 * Hook to invalidate asset cache
 * Use after mutations (scan complete, asset update, etc.)
 */
export function useInvalidateAssets() {
  const queryClient = useQueryClient();
  
  return () => {
    queryClient.invalidateQueries({ queryKey: assetKeys.all });
  };
}

/**
 * Optimistic asset count selector
 * Returns cached count without triggering a new fetch
 */
export function useAssetCount() {
  const queryClient = useQueryClient();
  const { activeAgent } = usePOV();
  
  const cachedData = queryClient.getQueryData<Asset[]>(
    assetKeys.list(undefined, activeAgent?.id)
  );
  
  return {
    total: cachedData?.length ?? 0,
    online: cachedData?.filter(a => a.status === 'online').length ?? 0,
    offline: cachedData?.filter(a => a.status === 'offline').length ?? 0,
  };
}
