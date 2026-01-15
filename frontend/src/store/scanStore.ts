import { create } from 'zustand';

export interface Vulnerability {
  id: string;
  cve_id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cvss_score: number;
  affected_service: string;
  affected_port: number;
  exploit_available: boolean;
  exploit_module?: string;
  source_database: 'cve' | 'exploit_db' | 'metasploit' | 'vulners' | 'packetstorm';
  // Full exploit metadata
  exploit_data?: {
    id: string;
    platform: string;
    module_id: string;
    module_path?: string;
    exploit_type: string;
    target_platform?: string;
    rank?: string;
    verified: boolean;
    exploit_db_id?: number;
    reference_url?: string;
    exploit_metadata?: {
      trigger_port?: number;
      shell_port?: number;
      shell_type?: string;
      payload_type?: string;
      requires_auth?: boolean;
      auto_exploit?: boolean;
      default_payload_variant?: string;
    };
  };
}

export interface ScanTab {
  id: string;
  ip: string;
  ips?: string[]; // For multi-host scans
  hostname?: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  logs: string[];
  options: ScanOptions;
  // Vulnerability scan state
  selectedDatabases: string[];
  vulnerabilities: Vulnerability[];
  vulnScanning: boolean;
}

export interface ScanOptions {
  scanType: 'basic' | 'comprehensive' | 'vuln' | 'custom';
  ports: string;
  aggressive: boolean;
  serviceDetection: boolean;
  osDetection: boolean;
  timing: '1' | '2' | '3' | '4' | '5';
}

export interface PassiveService {
  host: string;
  port: number;
  service: string;
  first_seen: number;
  last_seen: number;
  syn_ack_count: number;
}

interface ScanState {
  tabs: ScanTab[];
  activeTabId: string | null;
  // Passive scan state
  passiveScanEnabled: boolean;
  passiveServices: PassiveService[];
  setPassiveScanEnabled: (enabled: boolean) => void;
  setPassiveServices: (services: PassiveService[]) => void;
  addTab: (ipOrIps: string | string[], hostname?: string) => void;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabOptions: (id: string, options: Partial<ScanOptions>) => void;
  startScan: (id: string) => void;
  addLog: (id: string, log: string) => void;
  setScanStatus: (id: string, status: ScanTab['status']) => void;
  onScanComplete?: (ip: string, data: any) => void;
  setOnScanComplete: (callback: (ip: string, data: any) => void) => void;
  // Vulnerability scan methods
  setSelectedDatabases: (id: string, databases: string[]) => void;
  setVulnerabilities: (id: string, vulnerabilities: Vulnerability[]) => void;
  setVulnScanning: (id: string, scanning: boolean) => void;
}

export const useScanStore = create<ScanState>((set) => ({
  tabs: [],
  activeTabId: null,
  passiveScanEnabled: false,
  passiveServices: [],
  setPassiveScanEnabled: (enabled) => set({ passiveScanEnabled: enabled }),
  setPassiveServices: (services) => set({ passiveServices: services }),
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
    
    // Load saved database preferences
    const savedDatabases = localStorage.getItem('nop_scans_vuln_databases');
    const defaultDatabases = savedDatabases ? JSON.parse(savedDatabases) : ['cve', 'exploit_db', 'metasploit'];
    
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
      },
      selectedDatabases: defaultDatabases,
      vulnerabilities: [],
      vulnScanning: false
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
  })),
  setSelectedDatabases: (id, databases) => set((state) => {
    // Persist to localStorage
    localStorage.setItem('nop_scans_vuln_databases', JSON.stringify(databases));
    return {
      tabs: state.tabs.map(t => t.id === id ? { ...t, selectedDatabases: databases } : t)
    };
  }),
  setVulnerabilities: (id, vulnerabilities) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, vulnerabilities } : t)
  })),
  setVulnScanning: (id, scanning) => set((state) => ({
    tabs: state.tabs.map(t => t.id === id ? { ...t, vulnScanning: scanning } : t)
  }))
}));
