import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { useScanStore } from '../store/scanStore';
import { useAccessStore } from '../store/accessStore';
import AssetDetailsSidebar from '../components/AssetDetailsSidebar';
import ScanSettingsModal from '../components/ScanSettingsModal';

interface ScanSettings {
  autoScanEnabled: boolean;
  autoScanInterval: number;
  autoScanType: 'arp' | 'ping';
  manualScanType: 'arp' | 'ping';
  networkRange: string;
  pps: number;
}

type SortField = 'ip' | 'first_seen' | 'last_seen' | 'scanned_time';
type SortOrder = 'asc' | 'desc';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subnetFilter, setSubnetFilter] = useState<string>('');
  const [refreshInterval] = useState<number>(30);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('ip');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [activeScanId, setActiveScanId] = useState<string | null>(null);

  const [scanSettings, setScanSettings] = useState<ScanSettings>(() => {
    const saved = localStorage.getItem('nop_scan_settings');
    return saved ? JSON.parse(saved) : {
      autoScanEnabled: false,
      autoScanInterval: 15,
      autoScanType: 'arp',
      manualScanType: 'arp',
      networkRange: '172.21.0.0/24',
      pps: 100
    };
  });

  const { token } = useAuthStore();
  const { setOnScanComplete, tabs: scanTabs } = useScanStore();
  const { tabs: accessTabs } = useAccessStore();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Refs for accessing latest state in intervals/timeouts
  const scanSettingsRef = useRef(scanSettings);
  const isScanningRef = useRef(isScanning);
  const activeScanIdRef = useRef(activeScanId);

  useEffect(() => {
    scanSettingsRef.current = scanSettings;
  }, [scanSettings]);

  useEffect(() => {
    isScanningRef.current = isScanning;
  }, [isScanning]);

  useEffect(() => {
    activeScanIdRef.current = activeScanId;
  }, [activeScanId]);

  const fetchAssets = useCallback(async (showLoading = true) => {
    if (!token) return;
    try {
      if (showLoading) setLoading(true);
      setIsRefreshing(true);

      const data = await assetService.getAssets(token, statusFilter === 'all' ? undefined : statusFilter);
      
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

      setSelectedAsset(prev => {
        if (!prev) return null;
        const updated = mergedData.find(a => a.id === prev.id || a.ip_address === prev.ip_address);
        return updated || prev;
      });

      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Failed to fetch assets');
    } finally {
      if (showLoading) setLoading(false);
      setTimeout(() => setIsRefreshing(false), 1000);
    }
  }, [token, statusFilter]);

  useEffect(() => {
    setOnScanComplete((ip, data) => {
      const localResults = JSON.parse(localStorage.getItem('nop_local_scan_results') || '{}');
      localResults[ip] = {
        ...localResults[ip],
        ...data,
        last_detailed_scan: new Date().toISOString()
      };
      localStorage.setItem('nop_local_scan_results', JSON.stringify(localResults));
      fetchAssets(false);
    });
  }, [setOnScanComplete, fetchAssets]);

  const triggerScan = useCallback(async (type: 'manual' | 'auto') => {
    if (!token) return;
    const currentSettings = scanSettingsRef.current;
    const scanType = type === 'manual' ? currentSettings.manualScanType : currentSettings.autoScanType;
    try {
      setIsScanning(true);
      const result = await assetService.startScan(token, currentSettings.networkRange, scanType);
      if (result && result.scan_id) {
        setActiveScanId(result.scan_id);
      } else {
        // Fallback if no scan_id returned
        if (statusTimeoutRef.current) clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setIsScanning(false), 5000);
      }
    } catch (err) {
      console.error('Discovery failed:', err);
      setIsScanning(false);
    }
  }, [token]);

  // Poll for scan status
  useEffect(() => {
    let pollTimer: NodeJS.Timeout;
    if (activeScanId && token) {
      pollTimer = setInterval(async () => {
        try {
          const status = await assetService.getScanStatus(token, activeScanId);
          if (status.status === 'completed' || status.status === 'failed') {
            setIsScanning(false);
            setActiveScanId(null);
            if (status.status === 'completed') {
              fetchAssets(false);
            }
          }
        } catch (err) {
          console.error("Failed to poll scan status", err);
          setIsScanning(false);
          setActiveScanId(null);
        }
      }, 2000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [activeScanId, token, fetchAssets]);

  // Auto-scan trigger
  useEffect(() => {
    if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    
    if (scanSettings.autoScanEnabled && scanSettings.autoScanInterval > 0) {
      const runAutoScan = () => {
        if (!isScanningRef.current && !activeScanIdRef.current) {
          triggerScan('auto');
        }
      };

      // Run immediately when enabled or settings change
      runAutoScan();

      autoScanTimerRef.current = setInterval(runAutoScan, scanSettings.autoScanInterval * 60 * 1000);
    }
    
    return () => {
      if (autoScanTimerRef.current) clearInterval(autoScanTimerRef.current);
    };
  }, [scanSettings.autoScanEnabled, scanSettings.autoScanInterval, triggerScan]);

  useEffect(() => {
    fetchAssets(true);
  }, [fetchAssets]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (refreshInterval > 0) {
      timerRef.current = setInterval(() => {
        fetchAssets(false);
      }, refreshInterval * 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAssets, refreshInterval]);

  const handleSaveSettings = (newSettings: ScanSettings) => {
    setScanSettings(newSettings);
    localStorage.setItem('nop_scan_settings', JSON.stringify(newSettings));
  };

  const ipToNumber = (ip: string) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const filteredAndSortedAssets = useMemo(() => {
    let result = assets;

    // Subnet Filter
    if (subnetFilter) {
      result = result.filter(a => a.ip_address.startsWith(subnetFilter));
    }

    // Sorting
    return [...result].sort((a: any, b: any) => {
      let comparison = 0;
      if (sortField === 'ip') {
        comparison = ipToNumber(a.ip_address) - ipToNumber(b.ip_address);
      } else if (sortField === 'last_seen') {
        comparison = new Date(a.last_seen || 0).getTime() - new Date(b.last_seen || 0).getTime();
      } else if (sortField === 'scanned_time') {
        comparison = new Date(a.last_detailed_scan || 0).getTime() - new Date(b.last_detailed_scan || 0).getTime();
      } else if (sortField === 'first_seen') {
        comparison = a.id.localeCompare(b.id);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [assets, subnetFilter, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="relative min-h-full">
      {/* Status Notification Bar */}
      <div className="mb-4 flex items-center justify-between bg-cyber-darker border border-cyber-gray px-4 py-2 overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse shadow-[0_0_5px_#00ff41]"></div>
            <span className="text-[10px] text-cyber-green uppercase font-bold tracking-widest">System Online</span>
          </div>

          {isScanning && (
            <div className="flex items-center space-x-2 animate-fadeIn">
              <div className="w-2 h-2 bg-cyber-red rounded-full animate-ping shadow-[0_0_5px_#ff0040]"></div>
              <span className="text-[10px] text-cyber-red uppercase font-bold tracking-widest">Discovery Underway</span>
            </div>
          )}

          {isRefreshing && (
            <div className="flex items-center space-x-2 animate-fadeIn">
              <div className="w-2 h-2 bg-cyber-blue rounded-full animate-spin shadow-[0_0_5px_#00f0ff]"></div>
              <span className="text-[10px] text-cyber-blue uppercase font-bold tracking-widest">Refreshing Data</span>
            </div>
          )}
        </div>

        <div className="hidden md:block">
          <span className="text-[10px] text-cyber-purple uppercase font-bold tracking-widest opacity-50">
            Network: {scanSettings.networkRange} | Timing: {scanSettings.pps} PPS
          </span>
        </div>
      </div>

      <div className={`space-y-6 transition-all duration-300 ${selectedAsset ? 'mr-96' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">Assets</h2>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2 bg-cyber-darker border border-cyber-gray px-3 py-1">
              <span className="text-xs text-cyber-purple uppercase font-bold">Subnet:</span>
              <input
                type="text"
                value={subnetFilter}
                onChange={(e) => setSubnetFilter(e.target.value)}
                placeholder="172.21."
                className="bg-transparent text-cyber-blue text-sm focus:outline-none border-none w-24 font-mono"
              />
            </div>

            <div className="flex items-center space-x-2 bg-cyber-darker border border-cyber-gray px-3 py-1">
              <span className="text-xs text-cyber-purple uppercase font-bold">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-cyber-blue text-sm focus:outline-none border-none cursor-pointer"
              >
                <option value="all" className="bg-cyber-darker">ALL ASSETS</option>
                <option value="online" className="bg-cyber-darker">ONLINE ONLY</option>
                <option value="offline" className="bg-cyber-darker">OFFLINE ONLY</option>
              </select>
            </div>

            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-cyber-darker border border-cyber-gray text-cyber-gray-light hover:text-cyber-blue transition-colors text-sm font-bold">
              CONFIG
            </button>
            <button 
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear all assets? This cannot be undone.')) {
                  try {
                    await assetService.deleteAllAssets(token || '');
                    fetchAssets(true);
                  } catch (err) {
                    console.error('Failed to clear assets:', err);
                  }
                }
              }} 
              className="p-2 bg-cyber-darker border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-colors text-sm font-bold"
            >
              CLEAR ALL
            </button>
            <button onClick={() => fetchAssets(true)} className="btn-cyber px-4 py-2">Refresh</button>
            <button onClick={() => triggerScan('manual')} className="btn-cyber px-4 py-2 border-cyber-red text-cyber-red">Discover</button>
          </div>
        </div>

        {error && <div className="bg-cyber-darker border border-cyber-red text-cyber-red p-4 cyber-glow">&gt; ERROR: {error}</div>}

        <div className="bg-cyber-dark border border-cyber-gray overflow-hidden">
          <table className="min-w-full divide-y divide-cyber-gray">
            <thead className="bg-cyber-darker">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase cursor-pointer hover:text-cyber-blue transition-colors"
                  onClick={() => toggleSort('ip')}
                >
                  IP Address {sortField === 'ip' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Hostname</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Status</th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase cursor-pointer hover:text-cyber-blue transition-colors"
                  onClick={() => toggleSort('last_seen')}
                >
                  Last Seen {sortField === 'last_seen' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase cursor-pointer hover:text-cyber-blue transition-colors"
                  onClick={() => toggleSort('scanned_time')}
                >
                  Intel {sortField === 'scanned_time' && (sortOrder === 'asc' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Services</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-gray">
              {loading && assets.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-cyber-gray-light">Loading assets...</td></tr>
              ) : filteredAndSortedAssets.length === 0 && !error ? (
                <tr><td colSpan={6} className="px-6 py-4 text-center text-cyber-gray-light">No assets found.</td></tr>
              ) : (
                filteredAndSortedAssets.map((asset: any) => {
                  const isScanningThis = scanTabs.some(t => t.ip === asset.ip_address && t.status === 'running');
                  const isConnectedThis = accessTabs.some(t => t.ip === asset.ip_address && t.status === 'connected');
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-cyber-darker cursor-pointer transition-colors ${selectedAsset?.id === asset.id || selectedAsset?.ip_address === asset.ip_address ? 'bg-cyber-darker border-l-2 border-cyber-red' : ''}`}
                      onClick={() => setSelectedAsset(asset)}
                    >
                      <td className="px-6 py-4 text-sm text-cyber-blue font-mono flex items-center space-x-2">
                        <span>{asset.ip_address}</span>
                        {isScanningThis && (
                          <span className="w-2 h-2 bg-cyber-red rounded-full animate-ping" title="Detailed Scan Underway"></span>
                        )}
                        {isConnectedThis && (
                          <span className="w-2 h-2 bg-cyber-green rounded-full animate-pulse shadow-[0_0_5px_#00ff41]" title="Active Connection"></span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-cyber-gray-light">{asset.hostname || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${asset.status === 'online' ? 'text-cyber-green border border-cyber-green shadow-[0_0_5px_rgba(0,255,65,0.5)]' : 'text-cyber-red border border-cyber-red opacity-60'}`}>
                          {asset.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-cyber-gray-light">
                        {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col space-y-1">
                          {asset.has_been_scanned ? (
                            <>
                              <span className="text-cyber-green text-[10px] font-bold uppercase border border-cyber-green px-1 shadow-[0_0_3px_#00ff41] w-fit">Scanned</span>
                              <span className="text-[9px] text-cyber-gray-light opacity-50 font-mono">
                                {new Date(asset.last_detailed_scan).toLocaleTimeString()}
                              </span>
                            </>
                          ) : (
                            <span className="text-cyber-gray-light text-[10px] font-bold uppercase border border-cyber-gray px-1 opacity-40 w-fit">Unscanned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {asset.open_ports && asset.open_ports.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {asset.open_ports.includes(22) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">SSH</span>}
                            {asset.open_ports.includes(3389) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">RDP</span>}
                            {asset.open_ports.includes(5900) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">VNC</span>}
                            {asset.open_ports.includes(23) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">TELNET</span>}
                            {(asset.open_ports.includes(80) || asset.open_ports.includes(443) || asset.open_ports.includes(8080)) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">WEB</span>}
                            {(asset.open_ports.includes(21) || asset.open_ports.includes(20)) && <span className="text-[10px] font-bold uppercase border border-cyber-blue text-cyber-blue px-1.5 py-0.5">FTP</span>}
                          </div>
                        ) : (
                          <span className="text-cyber-gray-light text-[10px] opacity-40">None</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AssetDetailsSidebar asset={selectedAsset} onClose={() => setSelectedAsset(null)} />

      <ScanSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={scanSettings}
        onSave={handleSaveSettings}
      />
    </div>
  );
};

export default Assets;
