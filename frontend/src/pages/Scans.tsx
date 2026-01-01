import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { useScanStore, Vulnerability } from '../store/scanStore';
import { useAuthStore } from '../store/authStore';
import { assetService, Asset } from '../services/assetService';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button, Input, Select, Card, CardHeader, CardTitle, Badge } from '../components/DesignSystem';

const API_BASE_URL = '';

// Memoized asset list item to prevent re-renders on filter input change
interface AssetListItemProps {
  asset: Asset & { has_been_scanned?: boolean; last_detailed_scan?: string | null };
  isSelected: boolean;
  isActive: boolean;
  onSelect: (ip: string) => void;
  onScan: (asset: Asset) => void;
}

const AssetListItem = memo(({ asset, isSelected, isActive, onSelect, onScan }: AssetListItemProps) => {
  return (
    <div
      onClick={() => onSelect(asset.ip_address)}
      className={`px-3 py-2 cursor-pointer border-l-2 transition-all ${
        isActive
          ? 'bg-cyber-red bg-opacity-20 border-cyber-red'
          : isSelected
          ? 'bg-cyber-blue bg-opacity-10 border-cyber-blue'
          : 'border-transparent hover:bg-cyber-darker hover:border-cyber-gray'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="text-cyber-blue font-mono text-sm font-bold truncate">
            {asset.ip_address}
          </div>
          {asset.hostname && asset.hostname !== asset.ip_address && (
            <div className="text-cyber-gray-light text-xs truncate">{asset.hostname}</div>
          )}
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`w-2 h-2 rounded-full ${asset.status === 'online' ? 'bg-cyber-green' : 'bg-cyber-gray'}`} />
          {asset.has_been_scanned && (
            <span className="text-xs text-cyber-purple px-1 border border-cyber-purple">SCND</span>
          )}
        </div>
      </div>
      {asset.open_ports && asset.open_ports.length > 0 && (
        <div className="text-xs text-cyber-purple mt-1 truncate">
          Ports: {asset.open_ports.slice(0, 5).join(', ')}{asset.open_ports.length > 5 ? '...' : ''}
        </div>
      )}
    </div>
  );
});

AssetListItem.displayName = 'AssetListItem';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete, setSelectedDatabases, setVulnerabilities, setVulnScanning } = useScanStore();
  const { token } = useAuthStore();
  const navigate = useNavigate();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [showDashboard, setShowDashboard] = useState(tabs.length === 0); // Show dashboard when no tabs
  const [onlineAssets, setOnlineAssets] = useState<Array<{ip_address: string, hostname: string, status: string}>>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>(() => {
    const saved = localStorage.getItem('nop_scans_status_filter');
    return (saved as 'all' | 'online' | 'offline') || 'all';
  });
  const [ipFilter, setIpFilter] = useState(() => {
    return localStorage.getItem('nop_scans_ip_filter') || '';
  });
  const [scanFilter, setScanFilter] = useState<'all' | 'scanned' | 'unscanned'>(() => {
    const saved = localStorage.getItem('nop_scans_scan_filter');
    return (saved as 'all' | 'scanned' | 'unscanned') || 'all';
  });
  const [sortBy, setSortBy] = useState<'ip' | 'time' | 'status'>(() => {
    const saved = localStorage.getItem('nop_scans_sort_by');
    return (saved as 'ip' | 'time' | 'status') || 'time';
  });
  const [showVulnDetails, setShowVulnDetails] = useState(false);
  const [selectedVulnForDetails, setSelectedVulnForDetails] = useState<Vulnerability | null>(null);
  const [vulnDetailDatabase, setVulnDetailDatabase] = useState<string>('cve');
  const [manualPorts, setManualPorts] = useState<string>('');
  const [vulnFilter, setVulnFilter] = useState<'all' | 'exploitable'>('all');

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
    localStorage.setItem('nop_scans_scan_filter', scanFilter);
  }, [scanFilter]);

  useEffect(() => {
    localStorage.setItem('nop_scans_sort_by', sortBy);
  }, [sortBy]);

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

  const toggleDatabase = (tabId: string, database: string) => {
    if (!activeTab) return;
    const currentDatabases = activeTab.selectedDatabases || [];
    const newDatabases = currentDatabases.includes(database)
      ? currentDatabases.filter(db => db !== database)
      : [...currentDatabases, database];
    setSelectedDatabases(tabId, newDatabases);
  };

  const handleVulnerabilityScan = async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab || tab.vulnScanning) return;

    // Get ports from scan results or manual input - ONLY for this specific host
    const asset = assets.find(a => a.ip_address === tab.ip);
    const portsToScan = asset?.open_ports || (manualPorts ? manualPorts.split(',').map(p => parseInt(p.trim())).filter(p => !isNaN(p)) : []);
    
    if (!portsToScan || portsToScan.length === 0) {
      alert('Please run a port scan first or enter ports manually to scan for vulnerabilities');
      return;
    }

    // Confirm scan target
    const portList = portsToScan.join(', ');
    const confirmed = window.confirm(
      `Scan for vulnerabilities on ${tab.ip}?\n\n` +
      `Ports to scan: ${portList}\n` +
      `Databases: ${(tab.selectedDatabases || []).join(', ').toUpperCase()}\n\n` +
      `Click OK to proceed.`
    );
    
    if (!confirmed) return;

    setVulnScanning(tabId, true);
    setVulnerabilities(tabId, []);

    try {
      addLog(tabId, `[*] Starting vulnerability scan on ${tab.ip}...`);
      addLog(tabId, `[*] Step 1/2: Detecting service versions on ports ${portList}...`);

      // Step 1: Detect service versions using nmap -sV
      const versionResponse = await fetch(`${API_BASE_URL}/api/v1/scans/vuln-scan-${tabId}/version-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          host: tab.ip,
          ports: portsToScan
        })
      });

      if (!versionResponse.ok) {
        throw new Error(`Version detection failed: ${versionResponse.statusText}`);
      }

      const versionData = await versionResponse.json();
      addLog(tabId, `[+] Found ${versionData.services.length} services`);
      
      // Log detected services
      versionData.services.forEach((svc: any) => {
        const product = svc.product || 'unknown';
        const version = svc.version || 'unknown';
        addLog(tabId, `    Port ${svc.port}: ${product} ${version}`);
      });

      addLog(tabId, `[*] Step 2/2: Looking up CVEs for detected services...`);

      // Step 2: Lookup CVEs for each service
      const foundVulnerabilities: Vulnerability[] = [];
      
      for (const service of versionData.services) {
        if (!service.product || !service.version) {
          continue;
        }

        try {
          const cveResponse = await fetch(`${API_BASE_URL}/api/v1/vulnerabilities/lookup-cve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
              product: service.product.toLowerCase(),
              version: service.version,
              vendor: service.vendor || null
            })
          });

          if (cveResponse.ok) {
            const cveData = await cveResponse.json();
            
            if (cveData.cves && cveData.cves.length > 0) {
              addLog(tabId, `[*] Found ${cveData.cves.length} CVE(s) for ${service.product} ${service.version}, checking for exploits...`);
              
              // Check each CVE for available exploits
              let exploitableCount = 0;
              for (const cve of cveData.cves) {
                try {
                  // Query exploit availability
                  const exploitResponse = await fetch(`${API_BASE_URL}/api/v1/vulnerabilities/exploits/${cve.cve_id}`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                  });

                  if (exploitResponse.ok) {
                    const exploits = await exploitResponse.json();
                    
                    // Only add CVE if it has exploits
                    if (exploits && exploits.length > 0) {
                      exploitableCount++;
                      foundVulnerabilities.push({
                        id: cve.cve_id,
                        cve_id: cve.cve_id,
                        title: cve.title || `Vulnerability in ${service.product}`,
                        description: cve.description || 'No description available',
                        severity: cve.severity || 'medium',
                        cvss_score: cve.cvss_score || 0,
                        affected_service: service.name || service.product,
                        affected_port: parseInt(service.port),
                        exploit_available: true,
                        exploit_module: exploits[0].module_id || exploits[0].module_path,
                        source_database: 'cve'
                      });
                    }
                  }
                } catch (exploitError) {
                  // Skip CVEs without exploits
                  continue;
                }
              }
              
              if (exploitableCount > 0) {
                addLog(tabId, `[+] Found ${exploitableCount} exploitable CVE(s) for ${service.product} ${service.version}`);
              } else {
                addLog(tabId, `[-] No exploitable CVEs found for ${service.product} ${service.version}`);
              }
            } else {
              addLog(tabId, `[-] No CVEs found for ${service.product} ${service.version}`);
            }
          }
        } catch (cveError) {
          console.error(`CVE lookup failed for ${service.product}:`, cveError);
          addLog(tabId, `[!] CVE lookup failed for ${service.product} ${service.version}`);
        }
      }

      if (foundVulnerabilities.length > 0) {
        addLog(tabId, `[+] Vulnerability scan complete: Found ${foundVulnerabilities.length} exploitable vulnerability(ies)`);
      } else {
        addLog(tabId, `[*] Vulnerability scan complete: No exploitable vulnerabilities found`);
      }
      
      setVulnerabilities(tabId, foundVulnerabilities);
    } catch (error: any) {
      console.error('Vulnerability scan failed:', error);
      addLog(tabId, `[ERROR] Vulnerability scan failed: ${error.message}`);
    } finally {
      setVulnScanning(tabId, false);
    }
  };

  const handleBuildExploit = (vulnerability: Vulnerability) => {
    // Navigate to Access page in exploit mode with pre-selected vulnerability
    navigate('/access', { state: { mode: 'exploit', vulnerability, targetIP: activeTab?.ip } });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-cyber-red border-cyber-red';
      case 'high': return 'text-orange-500 border-orange-500';
      case 'medium': return 'text-yellow-500 border-yellow-500';
      case 'low': return 'text-cyber-blue border-cyber-blue';
      default: return 'text-cyber-gray border-cyber-gray';
    }
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: string } = {
      'ssh': '◈',
      'http': '◉',
      'https': '◉',
      'ftp': '⬢',
      'telnet': '◆',
      'rdp': '⬡',
      'vnc': '◈',
      'mysql': '⬢',
      'postgresql': '◉',
      'smb': '◆'
    };
    return icons[service.toLowerCase()] || '◈';
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

  // Memoized filtered and sorted assets for split layout
  const filteredAssets = useMemo(() => {
    let result = assets.filter((asset: any) => {
      // Apply scan filter
      if (scanFilter === 'scanned' && !asset.has_been_scanned) return false;
      if (scanFilter === 'unscanned' && asset.has_been_scanned) return false;
      
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
    
    // Sort
    result.sort((a: any, b: any) => {
      if (sortBy === 'time') {
        const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
        const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
        return bTime - aTime; // Most recent first
      } else if (sortBy === 'status') {
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        return a.ip_address.localeCompare(b.ip_address);
      } else {
        // IP sort
        const aParts = a.ip_address.split('.').map(Number);
        const bParts = b.ip_address.split('.').map(Number);
        for (let i = 0; i < 4; i++) {
          if (aParts[i] !== bParts[i]) return aParts[i] - bParts[i];
        }
        return 0;
      }
    });
    
    return result;
  }, [assets, scanFilter, statusFilter, ipFilter, sortBy]);

  // Stable callbacks for AssetListItem
  const handleAssetSelect = useCallback((ip: string) => {
    const asset = assets.find(a => a.ip_address === ip);
    if (asset) {
      handleScanSingleAsset(asset);
    }
  }, [assets]);

  const handleAssetScan = useCallback((asset: Asset) => {
    handleScanSingleAsset(asset);
  }, []);

  // Dashboard view component
  const DashboardView = () => (
    <div className="flex flex-col space-y-3">
      {/* Manual IP Entry - Same layer as dashboard */}
      <div className="bg-cyber-darker border border-cyber-gray p-3">
        <h3 className="text-cyber-blue font-bold uppercase tracking-widest text-xs mb-2">Manual IP Scan</h3>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="flex-1 relative" ref={assetDropdownRef}>
            <input
              type="text"
              value={manualIp}
              onChange={(e) => {
                setManualIp(e.target.value);
                setShowAssetDropdown(e.target.value.length > 0);
              }}
              onFocus={() => setShowAssetDropdown(manualIp.length > 0)}
              placeholder="Enter IP or select from assets..."
              className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-xs outline-none focus:border-cyber-red transition-colors font-mono"
            />
            {showAssetDropdown && onlineAssets.length > 0 && (() => {
              const filtered = onlineAssets.filter(a => 
                a.ip_address.toLowerCase().includes(manualIp.toLowerCase()) ||
                a.hostname.toLowerCase().includes(manualIp.toLowerCase())
              );
              return filtered.length > 0 ? (
                <div className="absolute z-10 w-full mt-1 bg-cyber-dark border border-cyber-gray max-h-48 overflow-y-auto custom-scrollbar">
                  {filtered.slice(0, 10).map((asset) => {
                    const isOnline = asset.status === 'online';
                    return (
                      <div
                        key={asset.ip_address}
                        onClick={() => {
                          setManualIp(asset.ip_address);
                          setShowAssetDropdown(false);
                        }}
                        className="flex justify-between items-center p-2 hover:bg-cyber-darker cursor-pointer border-b border-cyber-gray last:border-0"
                      >
                        <div className="flex flex-col">
                          <span className="text-cyber-blue text-xs font-mono">
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
            className="btn-cyber border-cyber-red text-cyber-red px-3 py-2 hover:bg-cyber-red hover:text-white uppercase font-bold tracking-wider text-[10px]"
          >
            Add Scan
          </button>
        </form>
        <p className="text-cyber-gray-light text-[9px] mt-1">
          💡 Tip: You can enter CIDR notation (e.g., 192.168.1.0/24) to scan entire subnets
        </p>
      </div>

      {/* Filters Section */}
      <div className="bg-cyber-darker border border-cyber-gray p-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <label className="text-[10px] text-cyber-purple uppercase font-bold">Status:</label>
            <div className="flex gap-1">
              <button
                onClick={() => setStatusFilter('all')}
                className={`py-1 px-2 text-[10px] uppercase font-bold tracking-wider border transition-all ${
                  statusFilter === 'all'
                    ? 'bg-cyber-blue text-white border-cyber-blue'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-blue'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter('online')}
                className={`py-1 px-2 text-[10px] uppercase font-bold tracking-wider border transition-all ${
                  statusFilter === 'online'
                    ? 'bg-cyber-green text-white border-cyber-green'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-green'
                }`}
              >
                ● Online
              </button>
              <button
                onClick={() => setStatusFilter('offline')}
                className={`py-1 px-2 text-[10px] uppercase font-bold tracking-wider border transition-all ${
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
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <label className="text-[10px] text-cyber-purple uppercase font-bold whitespace-nowrap">Search:</label>
            <input
              type="text"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              placeholder="IP or hostname..."
              className="flex-1 bg-cyber-dark border border-cyber-gray p-1.5 text-cyber-blue text-[10px] outline-none focus:border-cyber-red transition-colors font-mono"
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
    <div className="flex h-[calc(100vh-12rem)]">
      {/* LEFT SIDEBAR - 30% - Asset List */}
      <div className="w-[30%] flex flex-col border-r border-cyber-gray bg-cyber-darker overflow-hidden">
        {/* Manual IP Entry */}
        <div className="px-3 py-2 border-b border-cyber-gray">
          <form onSubmit={handleManualSubmit} className="flex gap-2">
            <div className="flex-1 relative" ref={assetDropdownRef}>
              <input
                type="text"
                value={manualIp}
                onChange={(e) => {
                  setManualIp(e.target.value);
                  setShowAssetDropdown(e.target.value.length > 0);
                }}
                onFocus={() => setShowAssetDropdown(manualIp.length > 0)}
                placeholder="IP or CIDR..."
                className="w-full bg-cyber-dark border border-cyber-gray px-3 py-2 text-cyber-blue text-sm outline-none focus:border-cyber-red transition-colors font-mono"
              />
              {showAssetDropdown && onlineAssets.length > 0 && (() => {
                const filtered = onlineAssets.filter(a => 
                  a.ip_address.toLowerCase().includes(manualIp.toLowerCase()) ||
                  a.hostname.toLowerCase().includes(manualIp.toLowerCase())
                );
                return filtered.length > 0 ? (
                  <div className="absolute z-20 w-full mt-1 bg-cyber-dark border border-cyber-gray max-h-40 overflow-y-auto custom-scrollbar">
                    {filtered.slice(0, 8).map((asset) => (
                      <div
                        key={asset.ip_address}
                        onClick={() => {
                          setManualIp(asset.ip_address);
                          setShowAssetDropdown(false);
                        }}
                        className="flex justify-between items-center px-3 py-2 hover:bg-cyber-darker cursor-pointer border-b border-cyber-gray last:border-0"
                      >
                        <span className="text-cyber-blue font-mono text-sm">{asset.ip_address}</span>
                        <span className={`${asset.status === 'online' ? 'text-cyber-green' : 'text-cyber-gray'}`}>●</span>
                      </div>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
            <button
              type="submit"
              className="px-3 py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white text-xs font-bold uppercase"
            >
              Add
            </button>
          </form>
        </div>

        {/* Filters */}
        <div className="px-3 py-2 border-b border-cyber-gray space-y-2">
          {/* Scan Filter */}
          <div className="flex gap-1">
            {(['all', 'scanned', 'unscanned'] as const).map(f => (
              <button
                key={f}
                onClick={() => setScanFilter(f)}
                className={`flex-1 px-2 py-1 text-xs uppercase font-bold border transition-all ${
                  scanFilter === f
                    ? 'bg-cyber-blue text-white border-cyber-blue'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-blue'
                }`}
              >
                {f === 'all' ? '◈' : f === 'scanned' ? '◉' : '○'} {f}
              </button>
            ))}
          </div>
          {/* Status Filter */}
          <div className="flex gap-1">
            {(['all', 'online', 'offline'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`flex-1 px-2 py-1 text-xs uppercase font-bold border transition-all ${
                  statusFilter === f
                    ? f === 'online' ? 'bg-cyber-green text-white border-cyber-green' 
                      : f === 'offline' ? 'bg-cyber-gray text-white border-cyber-gray'
                      : 'bg-cyber-blue text-white border-cyber-blue'
                    : 'bg-cyber-dark text-cyber-gray-light border-cyber-gray hover:border-cyber-blue'
                }`}
              >
                {f === 'online' ? '●' : f === 'offline' ? '○' : '◈'} {f}
              </button>
            ))}
          </div>
          {/* Search + Sort */}
          <div className="flex gap-2">
            <input
              type="text"
              value={ipFilter}
              onChange={(e) => setIpFilter(e.target.value)}
              placeholder="Search IP/host..."
              className="flex-1 bg-cyber-dark border border-cyber-gray px-3 py-1 text-cyber-blue text-sm outline-none focus:border-cyber-red font-mono"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-cyber-dark border border-cyber-gray px-2 py-1 text-cyber-blue text-sm outline-none cursor-pointer"
            >
              <option value="time">Time</option>
              <option value="ip">IP</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>

        {/* Asset List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="px-6 py-4 text-center text-cyber-gray-light text-sm">Loading assets...</div>
          ) : filteredAssets.length === 0 ? (
            <div className="px-6 py-4 text-center text-cyber-gray-light text-sm">No assets match filters</div>
          ) : (
            <div className="divide-y divide-cyber-gray">
              {filteredAssets.map((asset: any) => (
                <AssetListItem
                  key={asset.id}
                  asset={asset}
                  isSelected={selectedAssets.has(asset.ip_address)}
                  isActive={activeTab?.ip === asset.ip_address}
                  onSelect={handleAssetSelect}
                  onScan={handleAssetScan}
                />
              ))}
            </div>
          )}
        </div>

        {/* Multi-select action */}
        {selectedAssets.size > 0 && (
          <div className="px-3 py-2 border-t border-cyber-gray">
            <button
              onClick={handleScanSelectedAssets}
              className="w-full py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white text-xs font-bold uppercase"
            >
              Scan Selected ({selectedAssets.size})
            </button>
          </div>
        )}

        {/* Asset count */}
        <div className="px-3 py-2 border-t border-cyber-gray text-xs text-cyber-gray-light text-center">
          {filteredAssets.length} assets • {assets.filter((a: any) => a.has_been_scanned).length} scanned
        </div>
      </div>

      {/* RIGHT PANEL - 70% - Scan Results */}
      <div className="w-[70%] flex flex-col overflow-hidden">
        {/* Tab Bar */}
        {tabs.length > 0 && (
          <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar bg-cyber-dark">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowDashboard(false);
                }}
                className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all ${
                  activeTabId === tab.id && !showDashboard
                    ? 'bg-cyber-darker border-cyber-red text-cyber-red'
                    : 'border-transparent text-cyber-gray-light hover:bg-cyber-darker'
                }`}
              >
                <div className="truncate">
                  <div className="text-xs font-bold uppercase">
                    {tab.ips ? `Multi (${tab.ips.length})` : tab.ip}
                  </div>
                </div>
                {tab.status === 'running' && (
                  <div className="w-2 h-2 bg-cyber-red rounded-full animate-ping"></div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                    if (tabs.length === 1) setShowDashboard(true);
                  }}
                  className="hover:text-cyber-red text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={() => setShowDashboard(true)}
              className={`px-4 py-2 text-xs font-bold ${showDashboard ? 'text-cyber-blue' : 'text-cyber-gray-light hover:text-cyber-blue'}`}
            >
              + New
            </button>
          </div>
        )}

        {/* Content - Show dashboard or active scan */}
        {showDashboard || !activeTab ? (
          <div className="flex-1 flex items-center justify-center text-cyber-gray-light">
            <div className="text-center p-8">
              <div className="text-4xl mb-4">◎</div>
              <div className="text-sm uppercase tracking-widest mb-2">Select an Asset</div>
              <div className="text-xs opacity-60">Click on an asset from the left panel to start scanning</div>
            </div>
          </div>
        ) : (
          /* Port Scan + Vuln Scan stacked vertically */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* TOP: Port Scan Section */}
            <div className="flex-1 flex flex-col border-b border-cyber-gray overflow-hidden min-h-0">
              {/* Port Scan Config */}
              <div className="bg-cyber-darker px-4 py-3 border-b border-cyber-gray">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-cyber-blue font-bold uppercase tracking-widest text-sm">Port Scan</h3>
                  <span className="text-cyber-gray-light text-sm font-mono">{activeTab.ip}</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <select
                    value={activeTab.options.scanType}
                    onChange={(e) => updateTabOptions(activeTab.id, { scanType: e.target.value as any })}
                    disabled={activeTab.status === 'running'}
                    className="bg-cyber-dark border border-cyber-gray px-3 py-2 text-cyber-blue text-sm outline-none focus:border-cyber-red cursor-pointer"
                  >
                    <option value="basic">Basic</option>
                    <option value="comprehensive">Full</option>
                    <option value="vuln">Vuln</option>
                  </select>
                  <input
                    type="text"
                    value={activeTab.options.ports}
                    onChange={(e) => updateTabOptions(activeTab.id, { ports: e.target.value })}
                    disabled={activeTab.status === 'running'}
                    className="bg-cyber-dark border border-cyber-gray px-3 py-2 text-cyber-blue text-sm font-mono outline-none focus:border-cyber-red"
                    placeholder="Ports..."
                  />
                  <button
                    onClick={() => handleStartScan(activeTab.id)}
                    disabled={activeTab.status === 'running'}
                    className={`px-3 py-2 border text-xs font-bold uppercase ${
                      activeTab.status === 'running'
                        ? 'border-cyber-gray text-cyber-gray cursor-not-allowed'
                        : 'border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white'
                    }`}
                  >
                    {activeTab.status === 'running' ? '⟳ Scanning...' : '▶ Scan'}
                  </button>
                  <button
                    onClick={() => navigate('/access', { state: { mode: 'login', targetIP: activeTab?.ip } })}
                    className="px-3 py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white text-xs font-bold uppercase"
                  >
                    Login
                  </button>
                </div>
              </div>
              {/* Port Scan Output */}
              <div className="flex-1 bg-black px-4 py-2 font-mono text-xs overflow-y-auto custom-scrollbar">
                {activeTab.logs.length === 0 ? (
                  <div className="text-cyber-gray-light opacity-50">Port scan output will appear here...</div>
                ) : (
                  activeTab.logs.map((log, i) => (
                    <div key={i} className={`${
                      log.includes('[SUCCESS]') ? 'text-cyber-green' :
                      log.includes('[SCAN]') ? 'text-cyber-blue' :
                      log.includes('[ERROR]') ? 'text-cyber-red' :
                      log.includes('[INFO]') ? 'text-cyber-purple' :
                      'text-cyber-gray-light'
                    }`}>
                      {log}
                    </div>
                  ))
                )}
                <div ref={logEndRef} />
              </div>
            </div>

            {/* BOTTOM: Vulnerability Scan Section */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Vuln Scan Config */}
              <div className="bg-cyber-darker px-4 py-3 border-b border-cyber-gray">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-cyber-purple font-bold uppercase tracking-widest text-sm">Vulnerability Scan</h3>
                  <span className="text-cyber-gray-light text-sm">{activeTab.vulnerabilities?.length || 0} found</span>
                </div>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  <input
                    type="text"
                    value={manualPorts}
                    onChange={(e) => setManualPorts(e.target.value)}
                    disabled={activeTab.vulnScanning}
                    className="col-span-2 bg-cyber-dark border border-cyber-purple px-3 py-2 text-cyber-purple text-sm font-mono outline-none focus:border-cyber-red"
                    placeholder="Ports (e.g., 80,443,3306)"
                  />
                  <div className="col-span-4 grid grid-cols-5 gap-1">
                    {['cve', 'exploit_db', 'metasploit', 'packetstorm', 'vulns'].map((db) => (
                      <label key={db} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeTab.selectedDatabases?.includes(db) || false}
                          onChange={() => toggleDatabase(activeTab.id, db)}
                          disabled={activeTab.vulnScanning}
                          className="sr-only peer"
                        />
                        <div className="w-4 h-4 border border-cyber-purple flex items-center justify-center peer-checked:bg-cyber-purple transition-all">
                          {activeTab.selectedDatabases?.includes(db) && <span className="text-white text-xs">✓</span>}
                        </div>
                        <span className="text-xs text-cyber-gray-light uppercase">{db === 'exploit_db' ? 'ExDB' : db === 'packetstorm' ? 'PkStm' : db}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <select
                    value={vulnFilter}
                    onChange={(e) => setVulnFilter(e.target.value as 'all' | 'exploitable')}
                    className="bg-cyber-dark border border-cyber-purple px-3 py-2 text-cyber-purple text-xs outline-none focus:border-cyber-red"
                  >
                    <option value="all">All Vulnerabilities</option>
                    <option value="exploitable">Exploitable Only</option>
                  </select>
                  <span className="text-xs text-cyber-gray-light flex items-center px-2">
                    {activeTab.vulnerabilities?.filter(v => vulnFilter === 'all' || v.exploit_available).length || 0} / {activeTab.vulnerabilities?.length || 0} shown
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVulnerabilityScan(activeTab.id)}
                    disabled={activeTab.vulnScanning || activeTab.selectedDatabases?.length === 0}
                    className={`px-3 py-2 border text-xs font-bold uppercase ${
                      activeTab.vulnScanning || activeTab.selectedDatabases?.length === 0
                        ? 'border-cyber-gray text-cyber-gray cursor-not-allowed'
                        : 'border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white'
                    }`}
                  >
                    {activeTab.vulnScanning ? '⟳ Scanning...' : '▶ Vuln Scan'}
                  </button>
                  <button
                    onClick={() => navigate('/access', { state: { mode: 'exploit', targetIP: activeTab?.ip } })}
                    className="px-3 py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white text-xs font-bold uppercase"
                  >
                    Exploit
                  </button>
                </div>
              </div>
              {/* Vuln Results */}
              <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar bg-cyber-dark">
                {activeTab.vulnScanning ? (
                  <div className="flex items-center justify-center h-full text-cyber-purple text-sm animate-pulse">⚡ Scanning...</div>
                ) : activeTab.vulnerabilities?.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-cyber-gray-light text-sm">
                    No vulnerabilities found. Run vulnerability scan.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeTab.vulnerabilities?.filter(v => vulnFilter === 'all' || v.exploit_available).map((vuln) => (
                      <div key={vuln.id} className="bg-cyber-darker border border-cyber-gray p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-cyber-blue font-bold text-sm">{vuln.title}</div>
                            <div className="text-cyber-gray-light text-xs">{vuln.cve_id}</div>
                          </div>
                          <span className={`px-2 py-1 border text-xs font-bold uppercase ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-cyber-purple">CVSS: {vuln.cvss_score}</span>
                          <span className="text-cyber-blue font-mono">{vuln.affected_service}:{vuln.affected_port}</span>
                          {vuln.exploit_available && <span className="text-cyber-red">⚡ Exploit Available</span>}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => {
                              setSelectedVulnForDetails(vuln);
                              setShowVulnDetails(true);
                            }}
                            className="flex-1 py-2 border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white text-xs font-bold uppercase"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleBuildExploit(vuln)}
                            className="flex-1 py-2 border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white text-xs font-bold uppercase"
                          >
                            Build
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Vulnerability Details Panel */}
      {showVulnDetails && selectedVulnForDetails && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowVulnDetails(false)}
          />
          
          {/* Details Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-3/5 lg:w-2/5 bg-cyber-darker border-l border-cyber-red z-50 overflow-y-auto animate-slideIn">
            {/* Panel Header */}
            <div className="sticky top-0 bg-cyber-dark border-b border-cyber-red p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-cyber-red font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◆</span>
                  Vulnerability Details
                </h3>
                <p className="text-xs text-cyber-blue mt-1">
                  {selectedVulnForDetails.cve_id}
                </p>
              </div>
              <button
                onClick={() => setShowVulnDetails(false)}
                className="text-cyber-gray hover:text-cyber-red text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-4">
              {/* Database Selector */}
              <div className="mb-4">
                <p className="text-xs text-cyber-gray-light mb-2 uppercase tracking-wide">View in Database:</p>
                <div className="flex gap-2 flex-wrap">
                  {[
                    { id: 'cve', label: 'CVE', icon: '⬢' },
                    { id: 'exploit_db', label: 'ExploitDB', icon: '◉' },
                    { id: 'metasploit', label: 'Metasploit', icon: '◈' },
                    { id: 'vulners', label: 'Vulners', icon: '◆' },
                    { id: 'packetstorm', label: 'PacketStorm', icon: '⬡' }
                  ].map(db => (
                    <button
                      key={db.id}
                      onClick={() => setVulnDetailDatabase(db.id)}
                      className={`px-3 py-2 text-xs border rounded font-mono transition-all ${
                        vulnDetailDatabase === db.id
                          ? 'border-cyber-red text-cyber-red bg-cyber-red bg-opacity-20'
                          : 'border-cyber-gray text-cyber-gray hover:border-cyber-red'
                      }`}
                    >
                      <span className="mr-1">{db.icon}</span>{db.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Vulnerability Info */}
              <div className="space-y-4">
                <div className="bg-cyber-dark border border-cyber-gray rounded p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <span className={`px-2 py-1 text-xs font-bold border rounded ${getSeverityColor(selectedVulnForDetails.severity)}`}>
                      {selectedVulnForDetails.severity.toUpperCase()}
                    </span>
                    <span className="text-cyber-blue font-mono text-sm">{selectedVulnForDetails.cve_id}</span>
                    <span className="text-cyber-gray text-xs">CVSS: {selectedVulnForDetails.cvss_score}/10</span>
                  </div>
                  <h4 className="text-white font-semibold text-base mb-2">{selectedVulnForDetails.title}</h4>
                  <p className="text-cyber-gray-light text-sm mb-3">{selectedVulnForDetails.description}</p>
                  
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-cyber-gray-light">Affected Service:</span>
                      <p className="text-cyber-purple font-mono mt-1">
                        {getServiceIcon(selectedVulnForDetails.affected_service)} {selectedVulnForDetails.affected_service}
                      </p>
                    </div>
                    <div>
                      <span className="text-cyber-gray-light">Port:</span>
                      <p className="text-cyber-blue font-mono mt-1">{selectedVulnForDetails.affected_port}</p>
                    </div>
                    <div>
                      <span className="text-cyber-gray-light">Source:</span>
                      <p className="text-cyber-green font-mono mt-1">{vulnDetailDatabase.toUpperCase()}</p>
                    </div>
                    <div>
                      <span className="text-cyber-gray-light">Exploit:</span>
                      <p className={`font-mono mt-1 ${
                        selectedVulnForDetails.exploit_available ? 'text-cyber-green' : 'text-cyber-red'
                      }`}>
                        {selectedVulnForDetails.exploit_available ? '◆ Available' : '○ Not Available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Exploit Code Display */}
                {selectedVulnForDetails.exploit_available && (
                  <div className="bg-cyber-dark border border-cyber-green rounded p-4">
                    <h4 className="text-cyber-green font-bold uppercase text-xs mb-3 flex items-center">
                      <span className="mr-2">◈</span> Exploit Code
                    </h4>
                    <div className="bg-cyber-darker border border-cyber-gray rounded p-3 overflow-x-auto">
                      <pre className="text-cyber-green text-xs font-mono whitespace-pre">
{`#!/usr/bin/env python3
# Exploit for ${selectedVulnForDetails.cve_id}
# Target: ${selectedVulnForDetails.affected_service}:${selectedVulnForDetails.affected_port}

import socket
import sys

class Exploit:
    def __init__(self, target_ip, target_port):
        self.target_ip = target_ip
        self.target_port = target_port
    
    def exploit(self):
        print(f"[*] Targeting {self.target_ip}:{self.target_port}")
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.connect((self.target_ip, self.target_port))
            print("[+] Connected successfully")
            
            # Send exploit payload
            payload = b"EXPLOIT_PAYLOAD_HERE"
            sock.send(payload)
            
            response = sock.recv(4096)
            print(f"[+] Response: {response}")
            
            sock.close()
            return True
        except Exception as e:
            print(f"[-] Exploit failed: {e}")
            return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(f"Usage: {sys.argv[0]} <target_ip> <target_port>")
        sys.exit(1)
    
    exploit = Exploit(sys.argv[1], int(sys.argv[2]))
    exploit.exploit()`}
                      </pre>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs">
                      <span className="text-cyber-gray-light">
                        Language: <span className="text-cyber-purple font-mono">Python 3</span>
                      </span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(`Exploit code for ${selectedVulnForDetails.cve_id}`);
                        }}
                        className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black px-3 py-1 text-xs"
                      >
                        ■ Copy Code
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedVulnForDetails.exploit_available && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        handleBuildExploit(selectedVulnForDetails);
                        setShowVulnDetails(false);
                      }}
                      className="flex-1 btn-cyber border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black py-2 text-sm font-bold"
                    >
                      ◆ Build Exploit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Scans;
