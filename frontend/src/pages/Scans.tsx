import React, { useEffect, useRef, useState } from 'react';
import { useScanStore, Vulnerability } from '../store/scanStore';
import { useAuthStore } from '../store/authStore';
import { assetService, Asset } from '../services/assetService';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
  const [showVulnDetails, setShowVulnDetails] = useState(false);
  const [selectedVulnForDetails, setSelectedVulnForDetails] = useState<Vulnerability | null>(null);
  const [vulnDetailDatabase, setVulnDetailDatabase] = useState<string>('cve');
  const [manualPorts, setManualPorts] = useState<string>('');

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
      
      // Simulate vulnerability scanning delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockVulnerabilities: Vulnerability[] = [];
      
      if (portsToScan && portsToScan.length > 0) {
        // Check for SSH vulnerabilities
        if (portsToScan.includes(22)) {
          mockVulnerabilities.push({
            id: 'vuln-1',
            cve_id: 'CVE-2023-5678',
            title: 'OpenSSH Remote Code Execution',
            description: 'Critical vulnerability in OpenSSH allowing remote code execution',
            severity: 'critical',
            cvss_score: 9.8,
            affected_service: 'ssh',
            affected_port: 22,
            exploit_available: true,
            exploit_module: 'openssh_rce',
            source_database: 'cve'
          });
        }
        
        // Check for HTTP vulnerabilities
        if (portsToScan.includes(80) || portsToScan.includes(8080)) {
          const port = portsToScan.includes(80) ? 80 : 8080;
          mockVulnerabilities.push({
            id: 'vuln-2',
            cve_id: 'CVE-2023-9101',
            title: 'Jenkins CLI Remote Code Execution',
            description: 'Unauthenticated RCE in Jenkins CLI interface',
            severity: 'high',
            cvss_score: 8.5,
            affected_service: 'http',
            affected_port: port,
            exploit_available: true,
            exploit_module: 'jenkins_cli_rce',
            source_database: 'cve'
          });
        }
        
        // Check for FTP vulnerabilities
        if (portsToScan.includes(21)) {
          mockVulnerabilities.push({
            id: 'vuln-3',
            cve_id: 'CVE-2023-1234',
            title: 'ProFTPD Remote Code Execution',
            description: 'Buffer overflow in ProFTPD mod_copy module',
            severity: 'critical',
            cvss_score: 9.1,
            affected_service: 'ftp',
            affected_port: 21,
            exploit_available: true,
            exploit_module: 'proftpd_modcopy_exec',
            source_database: 'metasploit'
          });
        }
        
        // Check for SMB vulnerabilities
        if (portsToScan.includes(445)) {
          mockVulnerabilities.push({
            id: 'vuln-4',
            cve_id: 'CVE-2017-0144',
            title: 'EternalBlue SMB Remote Code Execution',
            description: 'Critical vulnerability in SMBv1 exploited by WannaCry',
            severity: 'critical',
            cvss_score: 9.3,
            affected_service: 'smb',
            affected_port: 445,
            exploit_available: true,
            exploit_module: 'eternalblue',
            source_database: 'exploit_db'
          });
        }
        
        // Check for MySQL vulnerabilities
        if (portsToScan.includes(3306)) {
          mockVulnerabilities.push({
            id: 'vuln-5',
            cve_id: 'CVE-2023-21980',
            title: 'MySQL Authentication Bypass',
            description: 'Authentication bypass allowing unauthorized access',
            severity: 'high',
            cvss_score: 8.1,
            affected_service: 'mysql',
            affected_port: 3306,
            exploit_available: true,
            exploit_module: 'mysql_auth_bypass',
            source_database: 'cve'
          });
        }
      }
      
      setVulnerabilities(tabId, mockVulnerabilities);
    } catch (error) {
      console.error('Vulnerability scan failed:', error);
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
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      {/* Tab Bar - Only show when there are active scans */}
      {tabs.length > 0 && (
        <div 
          className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar"
          onClick={(e) => {
            // If clicked on the tab bar background (not on a tab), show dashboard
            if (e.target === e.currentTarget) {
              setShowDashboard(true);
            }
          }}
        >
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
                  // If removing last tab, show dashboard
                  if (tabs.length === 1) {
                    setShowDashboard(true);
                  }
                }}
                className="hover:text-cyber-red ml-2"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Content Area */}
      {showDashboard ? (
        <DashboardView />
      ) : activeTab ? (
        <div className="flex flex-col flex-1 space-y-4 overflow-hidden">
          {/* Two-Pane Layout: Port Scan (Left) + Vulnerability Scan (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
            {/* LEFT PANE: Port Scan Configuration and Results */}
            <div className="flex flex-col space-y-4 overflow-hidden">
              {/* Port Scan Configuration */}
              <div className="bg-cyber-darker p-6 border border-cyber-gray space-y-4">
                <h3 className="text-cyber-blue font-bold uppercase tracking-widest border-b border-cyber-gray pb-2">Port Scan Configuration</h3>
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
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeTab.options.aggressive}
                      onChange={(e) => updateTabOptions(activeTab.id, { aggressive: e.target.checked })}
                      disabled={activeTab.status === 'running'}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 border-2 border-cyber-red flex items-center justify-center peer-checked:bg-cyber-red peer-disabled:opacity-50 transition-all">
                      {activeTab.options.aggressive && <span className="text-white text-xs">◆</span>}
                    </div>
                    <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">Aggressive (-A)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeTab.options.serviceDetection}
                      onChange={(e) => updateTabOptions(activeTab.id, { serviceDetection: e.target.checked })}
                      disabled={activeTab.status === 'running'}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 border-2 border-cyber-red flex items-center justify-center peer-checked:bg-cyber-red peer-disabled:opacity-50 transition-all">
                      {activeTab.options.serviceDetection && <span className="text-white text-xs">◆</span>}
                    </div>
                    <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">Service Version (-sV)</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={activeTab.options.osDetection}
                      onChange={(e) => updateTabOptions(activeTab.id, { osDetection: e.target.checked })}
                      disabled={activeTab.status === 'running'}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 border-2 border-cyber-red flex items-center justify-center peer-checked:bg-cyber-red peer-disabled:opacity-50 transition-all">
                      {activeTab.options.osDetection && <span className="text-white text-xs">◆</span>}
                    </div>
                    <span className="text-xs text-cyber-gray-light group-hover:text-cyber-red transition-colors uppercase">OS Detection (-O)</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleStartScan(activeTab.id)}
                    disabled={activeTab.status === 'running'}
                    className={`flex items-center justify-center space-x-2 py-3 border-2 transition-all uppercase font-bold tracking-widest ${
                      activeTab.status === 'running'
                        ? 'border-cyber-gray text-cyber-gray cursor-not-allowed'
                        : 'border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white cyber-glow-red'
                    }`}
                  >
                    {activeTab.status === 'running' ? (
                      <span className="text-xs">◉ Scanning...</span>
                    ) : (
                      <span className="text-xs">◈ Execute Port Scan</span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/access', { state: { mode: 'login', targetIP: activeTab?.ip } })}
                    disabled={activeTab.status === 'running'}
                    className="flex items-center justify-center space-x-2 py-3 border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all uppercase font-bold tracking-widest text-xs"
                  >
                    ◉ Login
                  </button>
                </div>
              </div>
              
              {/* Port Scan Output */}
              <div className="flex-1 flex flex-col bg-black border border-cyber-gray overflow-hidden">
                <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray flex justify-between items-center">
                  <span className="text-[10px] text-cyber-purple uppercase font-bold tracking-widest">Port Scan Output</span>
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

            {/* RIGHT PANE: Vulnerability Scan */}
            <div className="flex flex-col space-y-4 overflow-hidden border-l border-cyber-gray pl-4">
              {/* Vulnerability Scan Configuration */}
              <div className="bg-cyber-darker p-6 border border-cyber-gray space-y-4">
                <h3 className="text-cyber-purple font-bold uppercase tracking-widest border-b border-cyber-gray pb-2">Vulnerability Scan</h3>
                
                {/* Database Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] text-cyber-purple uppercase font-bold">Vulnerability Databases</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['cve', 'exploit_db', 'metasploit', 'vulners', 'packetstorm'].map((db) => (
                      <label key={db} className="flex items-center space-x-2 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={activeTab.selectedDatabases?.includes(db) || false}
                          onChange={() => toggleDatabase(activeTab.id, db)}
                          disabled={activeTab.vulnScanning}
                          className="sr-only peer"
                        />
                        <div className="w-4 h-4 border-2 border-cyber-purple flex items-center justify-center peer-checked:bg-cyber-purple peer-disabled:opacity-50 transition-all">
                          {activeTab.selectedDatabases?.includes(db) && <span className="text-white text-xs">◆</span>}
                        </div>
                        <span className="text-xs text-cyber-gray-light group-hover:text-cyber-purple transition-colors uppercase">
                          {db === 'exploit_db' ? 'ExploitDB' : db.charAt(0).toUpperCase() + db.slice(1)}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Manual Port Input */}
                <div className="space-y-2">
                  <label className="text-[10px] text-cyber-purple uppercase font-bold">
                    Manual Ports {activeTab.status !== 'completed' && '(Optional)'}
                  </label>
                  <input
                    type="text"
                    value={manualPorts}
                    onChange={(e) => setManualPorts(e.target.value)}
                    placeholder="e.g., 22,80,443,3306"
                    className="w-full bg-cyber-dark border border-cyber-gray p-2 text-cyber-blue text-xs font-mono outline-none focus:border-cyber-purple"
                    disabled={activeTab.vulnScanning}
                  />
                  <p className="text-[9px] text-cyber-gray-light">
                    {activeTab.status === 'completed' ? 'Ports auto-detected from scan' : 'Enter ports manually if port scan not performed'}
                  </p>
                </div>

                {/* Execute Vulnerability Scan Button */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVulnerabilityScan(activeTab.id)}
                    disabled={activeTab.vulnScanning || activeTab.selectedDatabases?.length === 0}
                    className={`flex items-center justify-center space-x-2 py-3 border-2 transition-all uppercase font-bold tracking-widest ${
                      activeTab.vulnScanning || activeTab.selectedDatabases?.length === 0
                        ? 'border-cyber-gray text-cyber-gray cursor-not-allowed'
                        : 'border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white'
                    }`}
                  >
                    {activeTab.vulnScanning ? (
                      <>
                        <span className="animate-pulse text-xs">◉ Scanning...</span>
                      </>
                    ) : (
                      <span className="text-xs">◈ Execute Vuln Scan</span>
                    )}
                  </button>
                  <button
                    onClick={() => navigate('/access', { state: { mode: 'exploit', targetIP: activeTab?.ip } })}
                    disabled={activeTab.vulnScanning}
                    className="flex items-center justify-center space-x-2 py-3 border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-all uppercase font-bold tracking-widest text-xs"
                  >
                    ◉ Exploit
                  </button>
                </div>
              </div>

              {/* Vulnerability Results */}
              <div className="flex-1 flex flex-col bg-cyber-darker border border-cyber-gray overflow-hidden">
                <div className="bg-cyber-dark px-4 py-2 border-b border-cyber-gray">
                  <span className="text-[10px] text-cyber-purple uppercase font-bold tracking-widest">
                    Vulnerability Results ({activeTab.vulnerabilities?.length || 0})
                  </span>
                </div>
                <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-3">
                  {activeTab.vulnScanning ? (
                    <div className="flex flex-col items-center justify-center h-full text-cyber-purple">
                      <div className="animate-pulse text-lg">⚡ Scanning...</div>
                      <div className="text-xs mt-2 opacity-60">Querying vulnerability databases</div>
                    </div>
                  ) : activeTab.vulnerabilities?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-cyber-gray-light">
                      <div className="text-lg">No vulnerabilities detected</div>
                      <div className="text-xs mt-2 opacity-60">
                        {activeTab.status === 'completed' ? 'Target appears secure' : 'Run vulnerability scan first'}
                      </div>
                    </div>
                  ) : (
                    activeTab.vulnerabilities?.map((vuln) => (
                      <div key={vuln.id} className="bg-cyber-dark border border-cyber-gray p-4 space-y-3">
                        {/* Vulnerability Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="text-cyber-blue font-bold text-sm">{vuln.title}</div>
                            <div className="text-cyber-gray-light text-xs mt-1">{vuln.cve_id}</div>
                          </div>
                          <div className={`px-2 py-1 border text-[10px] font-bold uppercase ${getSeverityColor(vuln.severity)}`}>
                            {vuln.severity}
                          </div>
                        </div>

                        {/* Vulnerability Details */}
                        <div className="text-xs text-cyber-gray-light">
                          {vuln.description}
                        </div>

                        {/* Metrics */}
                        <div className="flex items-center space-x-4 text-xs">
                          <div className="text-cyber-purple">
                            CVSS: <span className="font-bold">{vuln.cvss_score}</span>
                          </div>
                          <div className="text-cyber-blue">
                            Service: <span className="font-mono">{vuln.affected_service}</span>
                          </div>
                          <div className="text-cyber-blue">
                            Port: <span className="font-mono">{vuln.affected_port}</span>
                          </div>
                        </div>

                        {/* Exploit Availability */}
                        {vuln.exploit_available && (
                          <div className="flex items-center space-x-2 text-xs">
                            <span className="text-cyber-red">⚡ Exploit Available</span>
                            {vuln.exploit_module && (
                              <span className="text-cyber-gray-light font-mono">({vuln.exploit_module})</span>
                            )}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedVulnForDetails(vuln);
                              setShowVulnDetails(true);
                            }}
                            className="flex-1 btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white py-2 text-xs uppercase font-bold tracking-widest"
                          >
                            Details
                          </button>
                          <button
                            onClick={() => handleBuildExploit(vuln)}
                            className="flex-1 btn-cyber border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white py-2 text-xs uppercase font-bold tracking-widest"
                          >
                            Build
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
