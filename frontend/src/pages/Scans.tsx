import React, { useEffect, useRef, useState } from 'react';
import { useScanStore } from '../store/scanStore';
import { useAuthStore } from '../store/authStore';
import { assetService } from '../services/assetService';
import axios from 'axios';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete } = useScanStore();
  const { token } = useAuthStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState('');
  const [showHostSelector, setShowHostSelector] = useState(false);
  const [availableHosts, setAvailableHosts] = useState<any[]>([]);
  const [selectedHosts, setSelectedHosts] = useState<Set<string>>(new Set());
  const [loadingHosts, setLoadingHosts] = useState(false);
  const [currentView, setCurrentView] = useState<'selection' | 'scan'>('selection');
  const [scanFilter, setScanFilter] = useState<'all' | 'scanned' | 'unscanned'>('all');

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab?.logs]);

  // Load available hosts on component mount
  useEffect(() => {
    loadAvailableHosts();
    const interval = setInterval(loadAvailableHosts, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [token]);

  // Load available hosts for selection
  const loadAvailableHosts = async () => {
    if (!token) return;
    setLoadingHosts(true);
    try {
      const hosts = await assetService.getAssets(token);
      setAvailableHosts(hosts);
    } catch (err) {
      console.error('Failed to load hosts:', err);
    } finally {
      setLoadingHosts(false);
    }
  };

  const toggleHostSelection = (ip: string) => {
    const newSelected = new Set(selectedHosts);
    if (newSelected.has(ip)) {
      newSelected.delete(ip);
    } else {
      newSelected.add(ip);
    }
    setSelectedHosts(newSelected);
  };

  const handleStartMultiScan = async () => {
    if (selectedHosts.size === 0) return;
    
    for (const ip of Array.from(selectedHosts)) {
      const host = availableHosts.find(h => h.ip_address === ip);
      addTab(ip, host?.hostname);
    }
    
    setCurrentView('scan');
    setSelectedHosts(new Set());
  };

  const filteredHosts = availableHosts.filter(host => {
    if (scanFilter === 'all') return true;
    if (scanFilter === 'scanned') return host.open_ports && host.open_ports.length > 0;
    if (scanFilter === 'unscanned') return !host.open_ports || host.open_ports.length === 0;
    return true;
  });

  const handleStartScan = async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab || tab.status === 'running' || !token) return;

    startScan(id);

    const { ip, options } = tab;

    addLog(id, `[SCAN] Initializing real-time scan for ${ip}...`);
    addLog(id, `[SCAN] Requesting backend to perform ${options.scanType} scan...`);

    try {
      const response = await axios.post('/api/v1/discovery/scan/host', {
        host: ip,
        scan_type: options.scanType === 'basic' ? 'ports' : options.scanType,
        ports: options.ports
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const scanId = response.data.scan_id;
      addLog(id, `[SCAN] Backend scan started. ID: ${scanId}`);

      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await axios.get(`/api/v1/discovery/scans/${scanId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const data = statusRes.data;
          if (data.status === 'completed') {
            clearInterval(pollInterval);
            addLog(id, `[SUCCESS] Backend scan completed.`);

            const hostResults = data.results?.hosts?.[0];
            if (hostResults) {
              const osName = hostResults.os?.name || 'Unknown';
              const openPorts = hostResults.ports?.filter((p: any) => p.state === 'open').map((p: any) => parseInt(p.portid)) || [];

              addLog(id, `[INFO] OS details: ${osName}`);
              openPorts.forEach((port: number) => {
                addLog(id, `[INFO] Discovered open port ${port}/tcp`);
              });

              if (onScanComplete) {
                onScanComplete(ip, {
                  os_name: osName,
                  open_ports: openPorts,
                  hostname: hostResults.hostnames?.[0]?.name,
                  vendor: hostResults.addresses?.find((a: any) => a.addrtype === 'mac')?.vendor
                });
              }
            }
            setScanStatus(id, 'completed');
            addLog(id, `[SUCCESS] Nmap done: 1 IP address (1 host up) scanned.`);
          } else if (data.status === 'failed') {
            clearInterval(pollInterval);
            addLog(id, `[ERROR] Backend scan failed: ${data.error}`);
            setScanStatus(id, 'failed');
          } else {
            addLog(id, `[SCAN] Still running...`);
          }
        } catch (err) {
          clearInterval(pollInterval);
          addLog(id, `[ERROR] Failed to poll scan status.`);
          setScanStatus(id, 'failed');
        }
      }, 3000);

    } catch (err: any) {
      addLog(id, `[ERROR] Failed to start backend scan: ${err.message}`);
      setScanStatus(id, 'failed');
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualIp.trim()) {
      addTab(manualIp.trim());
      setManualIp('');
    }
  };

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
        {/* Header with filters */}
        <div className="flex justify-between items-center bg-cyber-darker p-4 border border-cyber-gray">
          <div className="flex items-center space-x-4">
            <h2 className="text-cyber-purple font-bold uppercase tracking-widest">Host Selection</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setScanFilter('all')}
                className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                  scanFilter === 'all'
                    ? 'bg-cyber-purple text-white'
                    : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple'
                }`}
              >
                All ({availableHosts.length})
              </button>
              <button
                onClick={() => setScanFilter('scanned')}
                className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                  scanFilter === 'scanned'
                    ? 'bg-cyber-green text-white'
                    : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-green'
                }`}
              >
                Scanned ({availableHosts.filter(h => h.open_ports && h.open_ports.length > 0).length})
              </button>
              <button
                onClick={() => setScanFilter('unscanned')}
                className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                  scanFilter === 'unscanned'
                    ? 'bg-cyber-red text-white'
                    : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
                }`}
              >
                Unscanned ({availableHosts.filter(h => !h.open_ports || h.open_ports.length === 0).length})
              </button>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-cyber-gray-light text-sm">
              {selectedHosts.size} selected
            </span>
            <button
              onClick={handleStartMultiScan}
              disabled={selectedHosts.size === 0}
              className={`px-6 py-2 font-bold uppercase tracking-widest transition-all ${
                selectedHosts.size === 0
                  ? 'border border-cyber-gray text-cyber-gray cursor-not-allowed'
                  : 'border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white cyber-glow-red'
              }`}
            >
              Start Scans ({selectedHosts.size})
            </button>
          </div>
        </div>

        {/* Host cards grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-cyber-dark">
          {loadingHosts ? (
            <div className="text-center text-cyber-gray-light py-12">
              <div className="text-xl">Loading hosts...</div>
            </div>
          ) : filteredHosts.length === 0 ? (
            <div className="text-center text-cyber-gray-light py-12">
              <div className="text-xl mb-2">No hosts available</div>
              <p className="text-sm">Run a discovery scan from Assets page to detect hosts</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredHosts.map((host) => {
                const isScanned = host.open_ports && host.open_ports.length > 0;
                const isSelected = selectedHosts.has(host.ip_address);
                
                return (
                  <div
                    key={host.id}
                    onClick={() => toggleHostSelection(host.ip_address)}
                    className={`relative p-4 border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-cyber-purple bg-cyber-darker shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                        : 'border-cyber-gray hover:border-cyber-blue bg-cyber-darker'
                    }`}
                  >
                    {/* Selection checkbox */}
                    <div className="absolute top-2 right-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-5 h-5 accent-cyber-purple"
                      />
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center space-x-2 mb-3">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                        host.status === 'online'
                          ? 'text-cyber-green border-cyber-green'
                          : 'text-cyber-red border-cyber-red opacity-60'
                      }`}>
                        {host.status}
                      </span>
                      {isScanned && (
                        <span className="px-2 py-1 text-[10px] font-bold uppercase border border-cyber-green text-cyber-green shadow-[0_0_3px_#00ff41]">
                          Scanned
                        </span>
                      )}
                    </div>

                    {/* IP Address */}
                    <div className="text-cyber-blue font-mono text-lg font-bold mb-2">
                      {host.ip_address}
                    </div>

                    {/* Hostname */}
                    <div className="text-cyber-gray-light text-sm mb-3">
                      {host.hostname || 'Unknown hostname'}
                    </div>

                    {/* Details grid */}
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-cyber-purple uppercase font-bold">OS:</span>
                        <span className="text-cyber-gray-light">{host.os_name || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-purple uppercase font-bold">MAC:</span>
                        <span className="text-cyber-gray-light font-mono">{host.mac_address ? host.mac_address.substring(0, 17) : 'N/A'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-cyber-purple uppercase font-bold">Vendor:</span>
                        <span className="text-cyber-gray-light">{host.vendor || 'N/A'}</span>
                      </div>
                    </div>

                    {/* Open ports */}
                    {isScanned && (
                      <div className="mt-3 pt-3 border-t border-cyber-gray">
                        <div className="text-[10px] text-cyber-purple uppercase font-bold mb-2">Services</div>
                        <div className="flex flex-wrap gap-1">
                          {host.open_ports.includes(22) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">SSH</span>}
                          {host.open_ports.includes(3389) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">RDP</span>}
                          {host.open_ports.includes(5900) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">VNC</span>}
                          {host.open_ports.includes(23) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">TELNET</span>}
                          {(host.open_ports.includes(80) || host.open_ports.includes(443) || host.open_ports.includes(8080)) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">WEB</span>}
                          {(host.open_ports.includes(21) || host.open_ports.includes(20)) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">FTP</span>}
                          {host.open_ports.length > 6 && <span className="text-[9px] text-cyber-gray-light">+{host.open_ports.length - 6} more</span>}
                        </div>
                      </div>
                    )}

                    {/* Last seen */}
                    <div className="mt-3 text-[10px] text-cyber-gray-light opacity-50">
                      Last seen: {host.last_seen ? new Date(host.last_seen).toLocaleString() : 'Never'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar">
        {/* Default Host Selection Tab */}
        <div
          onClick={() => setCurrentView('selection')}
          className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all min-w-[150px] ${
            currentView === 'selection'
              ? 'bg-cyber-darker border-cyber-purple text-cyber-purple'
              : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
          }`}
        >
          <div className="flex-1">
            <div className="text-xs font-bold uppercase">Host Selection</div>
            <div className="text-[10px] opacity-60">{availableHosts.length} hosts</div>
          </div>
        </div>

        {/* Scan tabs */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setCurrentView('scan');
            }}
            className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all min-w-[150px] ${
              activeTabId === tab.id && currentView === 'scan'
                ? 'bg-cyber-darker border-cyber-red text-cyber-red'
                : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
            }`}
          >
            <div className="flex-1 truncate">
              <div className="text-xs font-bold uppercase">{tab.ip}</div>
              <div className="text-[10px] opacity-60">{tab.hostname || 'Manual Target'}</div>
            </div>
            {tab.status === 'running' && (
              <div className="w-2 h-2 bg-cyber-red rounded-full animate-ping"></div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
                if (tabs.length === 1) setCurrentView('selection');
              }}
              className="hover:text-cyber-red ml-2"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

      {/* Content area */}
      {currentView === 'selection' ? (
        <>
          {/* Host selection header */}
          <div className="flex justify-between items-center bg-cyber-darker p-4 border border-cyber-gray">
            <div className="flex items-center space-x-4">
              <h2 className="text-cyber-purple font-bold uppercase tracking-widest">Select Hosts for Scanning</h2>
              <div className="flex space-x-2">
                <button
                  onClick={() => setScanFilter('all')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                    scanFilter === 'all'
                      ? 'bg-cyber-purple text-white'
                      : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple'
                  }`}
                >
                  All ({availableHosts.length})
                </button>
                <button
                  onClick={() => setScanFilter('scanned')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                    scanFilter === 'scanned'
                      ? 'bg-cyber-green text-white'
                      : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-green'
                  }`}
                >
                  Scanned ({availableHosts.filter(h => h.open_ports && h.open_ports.length > 0).length})
                </button>
                <button
                  onClick={() => setScanFilter('unscanned')}
                  className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${
                    scanFilter === 'unscanned'
                      ? 'bg-cyber-red text-white'
                      : 'border border-cyber-gray text-cyber-gray-light hover:border-cyber-red'
                  }`}
                >
                  Unscanned ({availableHosts.filter(h => !h.open_ports || h.open_ports.length === 0).length})
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-cyber-gray-light text-sm">
                {selectedHosts.size} selected
              </span>
              <button
                onClick={handleStartMultiScan}
                disabled={selectedHosts.size === 0}
                className={`px-6 py-2 font-bold uppercase tracking-widest transition-all ${
                  selectedHosts.size === 0
                    ? 'border border-cyber-gray text-cyber-gray cursor-not-allowed'
                    : 'border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white cyber-glow-red'
                }`}
              >
                Start Scans ({selectedHosts.size})
              </button>
            </div>
          </div>

          {/* Host cards grid */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 bg-cyber-dark">
            {loadingHosts ? (
              <div className="text-center text-cyber-gray-light py-12">
                <div className="text-xl">Loading hosts...</div>
              </div>
            ) : filteredHosts.length === 0 ? (
              <div className="text-center text-cyber-gray-light py-12">
                <div className="text-xl mb-2">No hosts available</div>
                <p className="text-sm">Run a discovery scan from Assets page to detect hosts</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredHosts.map((host) => {
                  const isScanned = host.open_ports && host.open_ports.length > 0;
                  const isSelected = selectedHosts.has(host.ip_address);
                  
                  return (
                    <div
                      key={host.id}
                      onClick={() => toggleHostSelection(host.ip_address)}
                      className={`relative p-4 border-2 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-cyber-purple bg-cyber-darker shadow-[0_0_10px_rgba(168,85,247,0.5)]'
                          : 'border-cyber-gray hover:border-cyber-blue bg-cyber-darker'
                      }`}
                    >
                      {/* Selection checkbox */}
                      <div className="absolute top-2 right-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-5 h-5 accent-cyber-purple"
                        />
                      </div>

                      {/* Status badge */}
                      <div className="flex items-center space-x-2 mb-3">
                        <span className={`px-2 py-1 text-[10px] font-bold uppercase border ${
                          host.status === 'online'
                            ? 'text-cyber-green border-cyber-green'
                            : 'text-cyber-red border-cyber-red opacity-60'
                        }`}>
                          {host.status}
                        </span>
                        {isScanned && (
                          <span className="px-2 py-1 text-[10px] font-bold uppercase border border-cyber-green text-cyber-green shadow-[0_0_3px_#00ff41]">
                            Scanned
                          </span>
                        )}
                      </div>

                      {/* IP Address */}
                      <div className="text-cyber-blue font-mono text-lg font-bold mb-2">
                        {host.ip_address}
                      </div>

                      {/* Hostname */}
                      <div className="text-cyber-gray-light text-sm mb-3">
                        {host.hostname || 'Unknown hostname'}
                      </div>

                      {/* Details grid */}
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-cyber-purple uppercase font-bold">OS:</span>
                          <span className="text-cyber-gray-light">{host.os_name || 'Unknown'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-purple uppercase font-bold">MAC:</span>
                          <span className="text-cyber-gray-light font-mono">{host.mac_address ? host.mac_address.substring(0, 17) : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-purple uppercase font-bold">Vendor:</span>
                          <span className="text-cyber-gray-light">{host.vendor || 'N/A'}</span>
                        </div>
                      </div>

                      {/* Open ports */}
                      {isScanned && (
                        <div className="mt-3 pt-3 border-t border-cyber-gray">
                          <div className="text-[10px] text-cyber-purple uppercase font-bold mb-2">Services</div>
                          <div className="flex flex-wrap gap-1">
                            {host.open_ports.includes(22) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">SSH</span>}
                            {host.open_ports.includes(3389) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">RDP</span>}
                            {host.open_ports.includes(5900) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">VNC</span>}
                            {host.open_ports.includes(23) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">TELNET</span>}
                            {(host.open_ports.includes(80) || host.open_ports.includes(443) || host.open_ports.includes(8080)) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">WEB</span>}
                            {(host.open_ports.includes(21) || host.open_ports.includes(20)) && <span className="text-[9px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">FTP</span>}
                            {host.open_ports.length > 6 && <span className="text-[9px] text-cyber-gray-light">+{host.open_ports.length - 6} more</span>}
                          </div>
                        </div>
                      )}

                      {/* Last seen */}
                      <div className="mt-3 text-[10px] text-cyber-gray-light opacity-50">
                        Last seen: {host.last_seen ? new Date(host.last_seen).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        activeTab && (
        <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cyber-darker p-6 border border-cyber-gray">
            <div className="space-y-4">
              <h3 className="text-cyber-blue font-bold uppercase tracking-widest border-b border-cyber-gray pb-2">Scan Configuration</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-cyber-purple uppercase font-bold">Scan Type</label>
                  <select
                    value={activeTab.options.scanType}
                    onChange={(e) => updateTabOptions(activeTab.id, { scanType: e.target.value as any })}
                    disabled={activeTab.status === 'running'}
                    className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-xs outline-none focus:border-cyber-red"
                  >
                    <option value="basic">Basic Port Scan</option>
                    <option value="comprehensive">Comprehensive</option>
                    <option value="vuln">Vulnerability Scan</option>
                    <option value="custom">Custom Script</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-cyber-purple uppercase font-bold">Timing Template</label>
                  <select
                    value={activeTab.options.timing}
                    onChange={(e) => updateTabOptions(activeTab.id, { timing: e.target.value as any })}
                    disabled={activeTab.status === 'running'}
                    className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-xs outline-none focus:border-cyber-red"
                  >
                    <option value="1">T1 (Paranoid)</option>
                    <option value="2">T2 (Sneaky)</option>
                    <option value="3">T3 (Normal)</option>
                    <option value="4">T4 (Aggressive)</option>
                    <option value="5">T5 (Insane)</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-cyber-purple uppercase font-bold">Port Range</label>
                <input
                  type="text"
                  value={activeTab.options.ports}
                  onChange={(e) => updateTabOptions(activeTab.id, { ports: e.target.value })}
                  disabled={activeTab.status === 'running'}
                  className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-xs font-mono outline-none focus:border-cyber-red"
                  placeholder="e.g. 1-65535, U:53, T:21-25"
                />
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="text-cyber-blue font-bold uppercase tracking-widest border-b border-cyber-gray pb-2">Advanced Flags</h3>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeTab.options.aggressive}
                    onChange={(e) => updateTabOptions(activeTab.id, { aggressive: e.target.checked })}
                    disabled={activeTab.status === 'running'}
                    className="w-4 h-4 accent-cyber-red"
                  />
                  <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">Aggressive (-A)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeTab.options.serviceDetection}
                    onChange={(e) => updateTabOptions(activeTab.id, { serviceDetection: e.target.checked })}
                    disabled={activeTab.status === 'running'}
                    className="w-4 h-4 accent-cyber-red"
                  />
                  <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">Service Version (-sV)</span>
                </label>
                <label className="flex items-center space-x-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={activeTab.options.osDetection}
                    onChange={(e) => updateTabOptions(activeTab.id, { osDetection: e.target.checked })}
                    disabled={activeTab.status === 'running'}
                    className="w-4 h-4 accent-cyber-red"
                  />
                  <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">OS Detection (-O)</span>
                </label>
              </div>
              <div className="pt-4">
                <button
                  onClick={() => handleStartScan(activeTab.id)}
                  disabled={activeTab.status === 'running'}
                  className={`w-full flex items-center justify-center space-x-2 py-3 border-2 transition-all uppercase font-bold tracking-widest ${
                    activeTab.status === 'running'
                      ? 'border-cyber-gray text-cyber-gray cursor-not-allowed'
                      : 'border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white cyber-glow-red'
                  }`}
                >
                  {activeTab.status === 'running' ? (
                    <span>Scan in Progress...</span>
                  ) : (
                    <span>Execute Scan</span>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="flex-1 flex flex-col bg-black border border-cyber-gray overflow-hidden">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray flex justify-between items-center">
              <span className="text-[10px] text-cyber-purple uppercase font-bold tracking-widest">Real-time Scan Output</span>
              <span className="text-[10px] text-cyber-gray-light font-mono">{activeTab.ip}</span>
            </div>
            <div className="flex-1 p-4 font-mono text-xs overflow-y-auto custom-scrollbar space-y-1">
              {activeTab.logs.map((log, i) => (
                <div key={i} className={`${
                  log.includes('[SUCCESS]') ? 'text-cyber-green' :
                  log.includes('[SCAN]') ? 'text-cyber-blue' :
                  log.includes('[ERROR]') ? 'text-cyber-red' :
                  log.includes('[INFO]') ? 'text-cyber-purple' :
                  'text-cyber-gray-light'
                }`}>
                  <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>
                  {log}
                </div>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Scans;