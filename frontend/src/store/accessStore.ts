import { create } from 'zustand';

export type Protocol = 'ssh' | 'rdp' | 'vnc' | 'telnet' | 'exploit';

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

interface AccessState {
  tabs: ConnectionTab[];
  activeTabId: string | null;
  addTab: (ip: string, protocol: Protocol, hostname?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabStatus: (id: string, status: ConnectionTab['status']) => void;
  updateTabCredentials: (id: string, credentials: ConnectionTab['credentials']) => void;
}

export const useAccessStore = create<AccessState>((set) => ({
  tabs: [],
  activeTabId: null,
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
}));
