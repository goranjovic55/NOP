/**
 * Custom React Hooks for API calls
 * 
 * These hooks encapsulate API logic with @tanstack/react-query for:
 * - Automatic caching
 * - Background refetching
 * - Loading/error states
 * - Mutation handling
 */

export { useAssets, useDeleteAllAssets, useStartScan, useScanStatus } from './useAssets';
export { useAgents, useCreateAgent, useDeleteAgent, useKillAgent } from './useAgents';
