import { create } from 'zustand';

interface DiscoveryState {
  isDiscovering: boolean;
  setIsDiscovering: (isDiscovering: boolean) => void;
}

export const useDiscoveryStore = create<DiscoveryState>((set) => ({
  isDiscovering: false,
  setIsDiscovering: (isDiscovering) => set({ isDiscovering }),
}));
