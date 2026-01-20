import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Protocol = 'ssh' | 'rdp' | 'vnc' | 'telnet' | 'exploit' | 'web' | 'ftp';

export interface ConnectionTab {
  id: string;
  ip: string;
  hostname?: string;
  protocol: Protocol;
  status: 'disconnected' | 'connecting' | 'connected' | 'failed';
  credentials?: {
    username?: string;
    password?: string;
    remember?: boolean;
  };
}

// Remote access display settings
export interface RemoteAccessSettings {
  // Resolution settings
  resolution: 'auto' | '1920x1080' | '1680x1050' | '1440x900' | '1280x1024' | '1280x720' | '1024x768' | 'custom';
  customWidth: number;
  customHeight: number;
  
  // RDP specific settings
  rdpColorDepth: 16 | 24 | 32;
  rdpEnableWallpaper: boolean;
  rdpEnableTheming: boolean;
  rdpEnableFontSmoothing: boolean;
  rdpEnableAudio: boolean;
  rdpEnablePrinting: boolean;
  rdpEnableDrive: boolean;
  
  // VNC specific settings
  vncColorDepth: 8 | 16 | 24 | 32;
  vncCompression: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  vncQuality: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  vncCursor: 'local' | 'remote';
  
  // General display settings
  scalingMode: 'fit' | 'fill' | 'none';
  hideCursor: boolean;
  clipboardSync: boolean;
}

export const defaultRemoteAccessSettings: RemoteAccessSettings = {
  resolution: 'auto',
  customWidth: 1920,
  customHeight: 1080,
  
  rdpColorDepth: 32,
  rdpEnableWallpaper: false,
  rdpEnableTheming: false,
  rdpEnableFontSmoothing: false,
  rdpEnableAudio: false,
  rdpEnablePrinting: false,
  rdpEnableDrive: false,
  
  vncColorDepth: 24,
  vncCompression: 6,
  vncQuality: 6,
  vncCursor: 'remote',
  
  scalingMode: 'fit',
  hideCursor: true,
  clipboardSync: true,
};

interface AccessState {
  tabs: ConnectionTab[];
  activeTabId: string | null;
  remoteSettings: RemoteAccessSettings;
  addTab: (ip: string, protocol: Protocol, hostname?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabStatus: (id: string, status: ConnectionTab['status']) => void;
  updateTabCredentials: (id: string, credentials: ConnectionTab['credentials']) => void;
  updateRemoteSettings: (settings: Partial<RemoteAccessSettings>) => void;
  resetRemoteSettings: () => void;
  isAssetConnected: (ip: string) => boolean;
  getConnectedCount: () => number;
}

export const useAccessStore = create<AccessState>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      remoteSettings: defaultRemoteAccessSettings,
      addTab: (ip, protocol, hostname) => set((state) => {
        const existingTab = state.tabs.find(t => t.ip === ip && t.protocol === protocol);
        if (existingTab) {
          return { activeTabId: existingTab.id };
        }
        const newId = Math.random().toString(36).substring(7);
        const newTab: ConnectionTab = {
          id: newId,
          ip,
          hostname,
          protocol,
          status: 'disconnected',
        };
        return {
          tabs: [...state.tabs, newTab],
          activeTabId: newId
        };
      }),
      removeTab: (id) => set((state) => {
        const newTabs = state.tabs.filter(t => t.id !== id);
        let newActiveId = state.activeTabId;
        if (state.activeTabId === id) {
          newActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
        }
        return { tabs: newTabs, activeTabId: newActiveId };
      }),
      setActiveTab: (id) => set({ activeTabId: id }),
      updateTabStatus: (id, status) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, status } : t)
      })),
      updateTabCredentials: (id, credentials) => set((state) => ({
        tabs: state.tabs.map(t => t.id === id ? { ...t, credentials: { ...t.credentials, ...credentials } } : t)
      })),
      updateRemoteSettings: (settings) => set((state) => ({
        remoteSettings: { ...state.remoteSettings, ...settings }
      })),
      resetRemoteSettings: () => set({ remoteSettings: defaultRemoteAccessSettings }),
      isAssetConnected: (ip) => {
        return get().tabs.some(t => t.ip === ip && t.status === 'connected');
      },
      getConnectedCount: () => {
        return get().tabs.filter(t => t.status === 'connected').length;
      },
    }),
    {
      name: 'nop-access-settings',
      partialize: (state) => ({ remoteSettings: state.remoteSettings }),
    }
  )
);
