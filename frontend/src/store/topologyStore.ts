import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Topology display and performance settings
export interface TopologySettings {
  // Performance settings
  performanceMode: 'auto' | 'quality' | 'balanced' | 'performance';
  particlesEnabled: boolean;
  maxNodes: number;  // Limit nodes for very large graphs (0 = unlimited)
  maxLinks: number;  // Limit links for very large graphs (0 = unlimited)
  
  // Animation settings
  animationEnabled: boolean;
  refreshRate: number;  // ms between refreshes
  autoRefresh: boolean;
  
  // Display settings
  trafficThreshold: number;  // Min bytes to show link
  linkSpeedFilter: number;  // Min Mbps to show
  defaultLayers: string[];  // Active OSI layers on load
  
  // Simulation settings
  cooldownTicks: number;
  warmupTicks: number;
  cooldownTime: number;  // ms
}

export const defaultTopologySettings: TopologySettings = {
  // Performance
  performanceMode: 'auto',
  particlesEnabled: true,
  maxNodes: 500,
  maxLinks: 1000,
  
  // Animation
  animationEnabled: true,
  refreshRate: 5000,
  autoRefresh: true,
  
  // Display
  trafficThreshold: 0,
  linkSpeedFilter: 0,
  defaultLayers: ['L2', 'L4', 'L5', 'L7'],
  
  // Simulation
  cooldownTicks: 200,
  warmupTicks: 100,
  cooldownTime: 10000,
};

interface TopologyState {
  settings: TopologySettings;
  updateSettings: (settings: Partial<TopologySettings>) => void;
  resetSettings: () => void;
  
  // Computed performance thresholds based on mode
  getPerformanceConfig: (nodeCount: number, linkCount: number) => {
    particleMultiplier: number;
    cooldownTicks: number;
    warmupTicks: number;
    cooldownTime: number;
  };
}

export const useTopologyStore = create<TopologyState>()(
  persist(
    (set, get) => ({
      settings: defaultTopologySettings,
      
      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),
      
      resetSettings: () => set({ settings: defaultTopologySettings }),
      
      getPerformanceConfig: (nodeCount: number, linkCount: number) => {
        const { settings } = get();
        
        // If manual mode, use settings directly
        if (settings.performanceMode === 'quality') {
          return {
            particleMultiplier: settings.particlesEnabled ? 1 : 0,
            cooldownTicks: settings.cooldownTicks,
            warmupTicks: settings.warmupTicks,
            cooldownTime: settings.cooldownTime,
          };
        }
        
        if (settings.performanceMode === 'balanced') {
          return {
            particleMultiplier: settings.particlesEnabled ? 0.5 : 0,
            cooldownTicks: Math.min(settings.cooldownTicks, 150),
            warmupTicks: Math.min(settings.warmupTicks, 75),
            cooldownTime: Math.min(settings.cooldownTime, 7000),
          };
        }
        
        if (settings.performanceMode === 'performance') {
          return {
            particleMultiplier: 0,
            cooldownTicks: 50,
            warmupTicks: 20,
            cooldownTime: 3000,
          };
        }
        
        // Auto mode - detect based on graph size
        const isLarge = nodeCount > 100 || linkCount > 200;
        const isVeryLarge = nodeCount > 300 || linkCount > 500;
        
        if (isVeryLarge) {
          return {
            particleMultiplier: 0,
            cooldownTicks: 50,
            warmupTicks: 20,
            cooldownTime: 3000,
          };
        }
        
        if (isLarge) {
          return {
            particleMultiplier: settings.particlesEnabled ? 0.3 : 0,
            cooldownTicks: 100,
            warmupTicks: 50,
            cooldownTime: 5000,
          };
        }
        
        // Small graph - full quality
        return {
          particleMultiplier: settings.particlesEnabled ? 1 : 0,
          cooldownTicks: settings.cooldownTicks,
          warmupTicks: settings.warmupTicks,
          cooldownTime: settings.cooldownTime,
        };
      },
    }),
    {
      name: 'nop-topology-settings',
      partialize: (state) => ({ settings: state.settings }),
    }
  )
);
