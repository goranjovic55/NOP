import React, { useEffect, useRef, useState } from 'react';
import { useScanStore } from '../store/scanStore';
import { useAuthStore } from '../store/authStore';
import { assetService, Asset } from '../services/assetService';
import axios from 'axios';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete } = useScanStore();
  const { token } = useAuthStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(true);
  const [onlineAssets, setOnlineAssets] = useState<Array<{ip_address: string, hostname: string, status: string}>>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>(() => {
    const saved = localStorage.getItem('nop_scans_status_filter');
    return (saved as 'all' | 'online' | 'offline') || 'all';
  });
  const [ipFilter, setIpFilter] = useState(() => {
    return localStorage.getItem('nop_scans_ip_filter') || '';
  });

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab?.logs]);

  useEffect(() => {
    // Fetch online assets for dropdown
    fetchOnlineAssets();
  }, [token]);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setShowAssetDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persist filters to localStorage
  useEffect(() => {
    localStorage.setItem('nop_scans_status_filter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    localStorage.setItem('nop_scans_ip_filter', ipFilter);
  }, [ipFilter]);

  useEffect(() => {
    const fetchAssets = async () => {
      if (!token) return;
      try {
        setLoading(true);
        const data = await assetService.getAssets(token);
        
        // Merge with local scan results to determine which assets have been scanned
        const localResults = JSON.parse(localStorage.getItem('nop_local_scan_results') || '{}');
        const mergedData = data.map(asset => {
          const localData = localResults[asset.ip_address];
          if (localData) {
            return { 
              ...asset, 
              ...localData,
              has_been_scanned: true,
              last_detailed_scan: localData.last_detailed_scan
            };
          }
          return { ...asset, has_been_scanned: false, last_detailed_scan: null };
        });
        
        setAssets(mergedData);
      } catch (err) {
        console.error('Failed to fetch assets:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAssets();
    // Refresh assets every 30 seconds
    const interval = setInterval(fetchAssets, 30000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchOnlineAssets = async () => {
    if (!token) return;
    try {
      const response = await fetch(`/api/v1/assets/online`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setOnlineAssets(data);
      }
    } catch (err) {
      console.error('Failed to fetch online assets:', err);
    }
  };

  const handleStartScan = async (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab || tab.status === 'running' || !token) return;

    startScan(id);

    const { ip, ips, options } = tab;
    const isMultiHost = !!ips && ips.length > 0;
    const hostsToScan = isMultiHost ? ips : [ip];

    addLog(id, `[SCAN] Initializing real-time scan for ${hostsToScan.length} host(s)...`);
    addLog(id, `[SCAN] Requesting backend to perform ${options.scanType} scan...`);

    try {
      // For multi-host, we'll scan each sequentially
      for (const host of hostsToScan) {
        addLog(id, `[SCAN] Scanning ${host}...`);
        
        const response = await axios.post('/api/v1/discovery/scan/host', {
          host: host,
          scan_type: options.scanType === 'basic' ? 'ports' : options.scanType,
          ports: options.ports
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const scanId = response.data.scan_id;
        addLog(id, `[SCAN] Backend scan started for ${host}. ID: ${scanId}`);

        // Poll for this host's scan
        await new Promise<void>((resolve) => {
          const pollInterval = setInterval(async () => {
            try {
              const statusRes = await axios.get(`/api/v1/discovery/scans/${scanId}`, {
                headers: { Authorization: `Bearer ${token}` }
              });

              const data = statusRes.data;
              if (data.status === 'completed') {
                clearInterval(pollInterval);
                addLog(id, `[SUCCESS] Scan completed for ${host}.`);

                const hostResults = data.results?.hosts?.[0];
                if (hostResults) {
                  const osName = hostResults.os?.name || 'Unknown';
                  const openPorts = hostResults.ports?.filter((p: any) => p.state === 'open').map((p: any) => parseInt(p.portid)) || [];

                  addLog(id, `[INFO] ${host} - OS: ${osName}`);
                  openPorts.forEach((port: number) => {
                    addLog(id, `[INFO] ${host} - Open port ${port}/tcp`);
                  });

                  if (onScanComplete) {
                    onScanComplete(host, {
                      os_name: osName,
                      open_ports: openPorts,
                      hostname: hostResults.hostnames?.[0]?.name,
                      vendor: hostResults.addresses?.find((a: any) => a.addrtype === 'mac')?.vendor
                    });
                  }
                }
                resolve();
              } else if (data.status === 'failed') {
                clearInterval(pollInterval);
                addLog(id, `[ERROR] Scan failed for ${host}: ${data.error}`);
                resolve();
              } else {
                addLog(id, `[SCAN] ${host} - Still running...`);
              }
            } catch (err) {
              clearInterval(pollInterval);
              addLog(id, `[ERROR] Failed to poll scan status for ${host}.`);
              resolve();
            }
          }, 3000);
        });
      }
      
      setScanStatus(id, 'completed');
      addLog(id, `[SUCCESS] All scans completed. ${hostsToScan.length} host(s) scanned.`);

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
      setShowDashboard(false); // Switch to the new scan tab
    }
  };

  const toggleAssetSelection = (ipAddress: string) => {
    const newSelected = new Set(selectedAssets);
    if (newSelected.has(ipAddress)) {
      newSelected.delete(ipAddress);
    } else {
      newSelected.add(ipAddress);
    }
    setSelectedAssets(newSelected);
  };

  const handleScanSelectedAssets = () => {
    if (selectedAssets.size === 0) return;
    
    const ipsArray = Array.from(selectedAssets);
    addTab(ipsArray);
    setSelectedAssets(new Set());
    setShowDashboard(false); // Switch to the new scan tab
  };

  const handleScanSingleAsset = (asset: Asset) => {
    addTab(asset.ip_address, asset.hostname);
    setShowDashboard(false); // Switch to the new scan tab
  };

  // Filter to only show unscanned assets with applied filters
  const unscannedAssets = assets.filter((asset: any) => {
    if (asset.has_been_scanned) return false;
    
    // Apply status filter
    if (statusFilter === 'online' && asset.status !== 'online') return false;
    if (statusFilter === 'offline' && asset.status !== 'offline') return false;
    
    // Apply IP filter
    if (ipFilter.trim()) {
      const searchTerm = ipFilter.toLowerCase();
      const matchesIp = asset.ip_address.toLowerCase().includes(searchTerm);
      const matchesHostname = asset.hostname?.toLowerCase().includes(searchTerm);
      if (!matchesIp && !matchesHostname) return false;
    }
    
    return true;
  });

  // Dashboard view component
  const DashboardView = () => (
    <div className="flex flex-col space-y-6">
      {/* Filters Section */}
      <div className="bg-cyber-darker border border-cyber-gray p-4 space-y-3">
        <h3 className="text-cyber-blue font-bold uppercase tracking-widest text-sm">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status Filter */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-purple uppercase font-bold">Status</label>
            <div className="flex gap-2">
              <button
                onClick={() => setStatusFilter('all')}
                className={`flex-1 py-2 px-3 text-xs uppercase font-bold tracking-widest border transition-all ${
                  statusFilter === 'all'
                    ? 'bg-cyber-blue text-white border-cyber-blue'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-blue'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                className={`flex-1 py-2 px-3 text-xs uppercase font-bold tracking-widest border transition-all ${
                  statusFilter === 'online'
                    ? 'bg-cyber-green text-white border-cyber-green'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-green'
                }`}
              >
                ● Online
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={`flex-1 py-2 px-3 text-xs uppercase font-bold tracking-widest border transition-all ${
                  statusFilter === 'offline'
                    ? 'bg-cyber-gray text-white border-cyber-gray'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-gray'
                }`}
              >
                ○ Offline
              </button>
            </div>
          </div>
          {/* IP Address Filter */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-purple uppercase font-bold">Search IP / Hostname</label>
            <input
              type="text"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              placeholder="Filter by IP or hostname..."
              className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-sm outline-none focus:border-cyber-red transition-colors font-mono"
            />
          </div>
        </div>
      </div>

      {/* Unscanned Assets Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-cyber-red font-bold uppercase tracking-widest text-xl cyber-glow-red">
              Unscanned Assets
            </h3>
            <p className="text-cyber-purple text-sm mt-1">
              Select assets to scan. Click to scan individually or select multiple for multi-host scan.
            </p>
          </div>
          {selectedAssets.size > 0 && (
            <button
              onClick={handleScanSelectedAssets}
              className="btn-cyber border-cyber-red text-cyber-red px-6 py-3 hover:bg-cyber-red hover:text-white uppercase font-bold tracking-widest"
            >
              Scan Selected ({selectedAssets.size})
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12 text-cyber-gray-light">
            Loading assets...
          </div>
        ) : unscannedAssets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-cyber-gray-light text-lg uppercase tracking-widest">
              No Unscanned Assets Available
            </div>
            <p className="text-cyber-purple text-sm mt-2">
              All discovered assets have been scanned. Use manual IP scan above to scan specific targets.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {unscannedAssets.map((asset: any) => {
              const isSelected = selectedAssets.has(asset.ip_address);
              return (
                <div
                  key={asset.id}
                    onClick={() => toggleAssetSelection(asset.ip_address)}
                    className={`bg-cyber-darker border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-cyber-red shadow-[0_0_10px_rgba(255,0,64,0.5)]' 
                        : 'border-cyber-gray hover:border-cyber-blue'
                    }`}
                  >
                    <div className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="text-cyber-blue font-mono font-bold text-lg">
                            {asset.ip_address}
                          </div>
                          {asset.hostname && (
                            <div className="text-cyber-gray-light text-xs truncate">
                              {asset.hostname}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                          asset.status === 'online' 
                          ? 'text-cyber-green border border-cyber-green' 
                          : 'text-cyber-gray-light border border-cyber-gray opacity-60'
                      }`}>
                        {asset.status}
                      </span>
                      <span className="text-cyber-gray-light text-xs opacity-60">
                        Last seen: {asset.last_seen ? new Date(asset.last_seen).toLocaleTimeString() : 'Never'}
                      </span>
                    </div>

                    {/* Asset Info */}
                    {(asset.vendor || asset.os_name) && (
                      <div className="text-xs text-cyber-purple space-y-1 border-t border-cyber-gray pt-2">
                        {asset.vendor && (
                          <div>Vendor: {asset.vendor}</div>
                        )}
                        {asset.os_name && (
                          <div>OS: {asset.os_name}</div>
                        )}
                      </div>
                    )}

                    {/* Scan Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleScanSingleAsset(asset);
                      }}
                      className="w-full btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white py-2 text-sm uppercase font-bold tracking-widest"
                    >
                      Scan Now
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      {/* Manual IP Input Section - Compact */}
      <div className="bg-cyber-darker border border-cyber-gray p-3">
        <form onSubmit={handleManualSubmit} className="flex items-center space-x-2">
          <label className="text-[10px] text-cyber-purple uppercase font-bold whitespace-nowrap">
            Target IP:
          </label>
          <div className="flex-1 relative" ref={assetDropdownRef}>
            <input
              type="text"
              value={manualIp}
              onChange={(e) => {
                setManualIp(e.target.value);
                setShowAssetDropdown(true);
              }}
              onFocus={() => setShowAssetDropdown(true)}
              placeholder="e.g. 192.168.1.1 or 192.168.1.0/24"
              className="w-full bg-cyber-dark border border-cyber-gray px-3 py-1.5 text-cyber-blue text-sm outline-none focus:border-cyber-red transition-colors font-mono"
            />
            
            {/* Assets Dropdown with Filter */}
            {showAssetDropdown && (() => {
              const filtered = onlineAssets.filter(asset => 
                asset.ip_address.toLowerCase().includes(manualIp.toLowerCase()) ||
                asset.hostname.toLowerCase().includes(manualIp.toLowerCase())
              );
              const onlineCount = filtered.filter(a => a.status === 'online').length;
              const offlineCount = filtered.filter(a => a.status === 'offline').length;
              
              return filtered.length > 0 ? (
                <div className="absolute top-full left-0 mt-1 w-full bg-cyber-darker border border-cyber-blue z-50 shadow-xl max-h-[250px] overflow-y-auto custom-scrollbar">
                  <div className="p-2 bg-cyber-darker border-b border-cyber-gray flex justify-between items-center">
                    <span className="text-[10px] text-cyber-purple font-bold uppercase">Assets ({filtered.length})</span>
                    <span className="text-[9px] text-cyber-gray-light">
                      <span className="text-cyber-green">{onlineCount} online</span> / <span className="text-cyber-gray">{offlineCount} offline</span>
                    </span>
                  </div>
                  {filtered.map((asset, idx) => {
                    const isOnline = asset.status === 'online';
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setManualIp(asset.ip_address);
                          setShowAssetDropdown(false);
                        }}
                        className={`p-2 cursor-pointer border-b border-cyber-gray/30 flex items-center justify-between ${
                          isOnline 
                            ? 'hover:bg-cyber-green/10' 
                            : 'hover:bg-cyber-gray/10 opacity-60'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className={`font-mono text-xs ${isOnline ? 'text-cyber-green' : 'text-cyber-gray'}`}>
                            {asset.ip_address}
                          </span>
                          {asset.hostname !== asset.ip_address && (
                            <span className="text-cyber-gray-light text-[10px]">{asset.hostname}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold uppercase ${isOnline ? 'text-cyber-green' : 'text-cyber-gray'}`}>
                            {isOnline ? '● ONLINE' : '○ OFFLINE'}
                          </span>
                          <span className={`text-[10px] ${isOnline ? 'text-cyber-green' : 'text-cyber-gray'}`}>▸</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })()}
          </div>
          <button
            type="submit"
            className="btn-cyber border-cyber-red text-cyber-red px-4 py-2 hover:bg-cyber-red hover:text-white uppercase font-bold tracking-widest text-xs"
          >
            Add Scan
          </button>
        </form>
        <p className="text-cyber-gray-light text-[10px]">
          💡 Tip: You can enter CIDR notation (e.g., 192.168.1.0/24) to scan entire subnets
        </p>
      </div>

      {/* Tab Bar */}
      <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar">
        {/* Dashboard Tab - Always present */}
        <div
          onClick={() => setShowDashboard(true)}
          className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all min-w-[150px] ${
            showDashboard
              ? 'bg-cyber-darker border-cyber-purple text-cyber-purple'
              : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
          }`}
        >
          <div className="flex-1">
            <div className="text-xs font-bold uppercase">⌂ Scan Dashboard</div>
            <div className="text-[10px] opacity-60">{unscannedAssets.length} unscanned</div>
          </div>
        </div>

        {/* Active Scan Tabs */}
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setShowDashboard(false);
            }}
            className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all min-w-[150px] ${
              activeTabId === tab.id && !showDashboard
                ? 'bg-cyber-darker border-cyber-red text-cyber-red'
                : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
            }`}
          >
            <div className="flex-1 truncate">
              <div className="text-xs font-bold uppercase">
                {tab.ips ? `Multi-host (${tab.ips.length})` : tab.ip}
              </div>
              <div className="text-[10px] opacity-60">
                {tab.ips ? tab.ips.slice(0, 2).join(', ') + (tab.ips.length > 2 ? '...' : '') : (tab.hostname || 'Manual Target')}
              </div>
            </div>
            {tab.status === 'running' && (
              <div className="w-2 h-2 bg-cyber-red rounded-full animate-ping"></div>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                removeTab(tab.id);
              }}
              className="hover:text-cyber-red ml-2"
            >
              &times;
            </button>
          </div>
        ))}
        <button
          onClick={() => {
            const ip = prompt('Enter IP Address:');
            if (ip) {
              addTab(ip);
              setShowDashboard(false);
            }
          }}
          className="px-4 py-2 text-cyber-blue hover:text-cyber-red transition-colors text-xl"
          title="Add Manual Scan"
        >
          +
        </button>
      </div>

      {/* Content Area */}
      {showDashboard ? (
        <DashboardView />
      ) : activeTab ? (
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
              <span className="text-[10px] text-cyber-gray-light font-mono">
                {activeTab.ips ? `${activeTab.ips.length} hosts` : activeTab.ip}
              </span>
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
      ) : null}
    </div>
  );
};

export default Scans;
