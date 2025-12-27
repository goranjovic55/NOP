import { create } from 'zustand';

export interface ScanTab {
  id: string;
  ip: string;
  ips?: string[]; // For multi-host scans
  hostname?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: string[];
  options: ScanOptions;
}

export interface ScanOptions {
  scanType: 'basic' | 'comprehensive' | 'vuln' | 'custom';
  ports: string;
  aggressive: boolean;
  serviceDetection: boolean;
  osDetection: boolean;
  timing: '1' | '2' | '3' | '4' | '5';
}

interface ScanState {
  tabs: ScanTab[];
  activeTabId: string | null;
  addTab: (ipOrIps: string | string[], hostname?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabOptions: (id: string, options: Partial<ScanOptions>) => void;
  startScan: (id: string) => void;
  addLog: (id: string, log: string) => void;
  setScanStatus: (id: string, status: ScanTab['status']) => void;
  onScanComplete?: (ip: string, data: any) => void;
  setOnScanComplete: (callback: (ip: string, data: any) => void) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  tabs: [],
  activeTabId: null,
  onScanComplete: undefined,
  setOnScanComplete: (callback) => set({ onScanComplete: callback }),
  addTab: (ipOrIps, hostname) => set((state) => {
    // Handle both single IP and array of IPs
    const isSingleIp = typeof ipOrIps === 'string';
    const ip = isSingleIp ? ipOrIps : ipOrIps[0];
    const ips = isSingleIp ? undefined : ipOrIps;
    
    const existingTab = state.tabs.find(t => t.ip === ip);
    if (existingTab && isSingleIp) {
      return { activeTabId: existingTab.id };
    }
    const newId = Math.random().toString(36).substring(7);
    const displayText = isSingleIp ? ip : `${ipOrIps.length} hosts`;
    const newTab: ScanTab = {
      id: newId,
      ip,
      ips,
      hostname,
      status: 'idle',
      logs: [`[INFO] Initialized scan tab for ${displayText}`],
      options: {
        scanType: 'basic',
        ports: '1-1000',
        aggressive: false,
        serviceDetection: true,
        osDetection: true,
        timing: '3'
      }
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
  updateTabOptions: (id, options) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, options: { ...t.options, ...options } } : t)
  })),
  startScan: (id) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, status: 'running', logs: [...t.logs, `[SCAN] Starting ${t.options.scanType} scan on ${t.ip}...`] } : t)
  })),
  addLog: (id, log) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, logs: [...t.logs, log] } : t)
  })),
  setScanStatus: (id, status) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, status } : t)
  }))
}));
