import { create } from 'zustand';

interface TrafficState {
  isPinging: boolean;
  isCapturing: boolean;
  isCrafting: boolean;
  isStorming: boolean;
  setIsPinging: (isPinging: boolean) => void;
  setIsCapturing: (isCapturing: boolean) => void;
  setIsCrafting: (isCrafting: boolean) => void;
  setIsStorming: (isStorming: boolean) => void;
  isAnyActive: () => boolean;
}

export const useTrafficStore = create<TrafficState>((set, get) => ({
  isPinging: false,
  isCapturing: false,
  isCrafting: false,
  isStorming: false,
  setIsPinging: (isPinging) => set({ isPinging }),
  setIsCapturing: (isCapturing) => set({ isCapturing }),
  setIsCrafting: (isCrafting) => set({ isCrafting }),
  setIsStorming: (isStorming) => set({ isStorming }),
  isAnyActive: () => {
    const state = get();
    return state.isPinging || state.isCapturing || state.isCrafting || state.isStorming;
  },
}));
