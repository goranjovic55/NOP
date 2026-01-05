import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { useScanStore, Vulnerability } from '../store/scanStore';
import { usePOV } from '../context/POVContext';
import { CyberPageTitle } from '../components/CyberUI';

interface AssetListItemProps {
  asset: Asset & { has_been_scanned?: boolean; last_detailed_scan?: string | null };
  isActive: boolean;
  scanStatus?: 'idle' | 'running' | 'completed' | 'failed';
  vulnScanning?: boolean;
  onOpen: (asset: Asset) => void;
}

const AssetListItem = memo(({ asset, isActive, scanStatus, vulnScanning, onOpen }: AssetListItemProps) => {
  return (
    <div
      onClick={() => onOpen(asset)}
      className={`px-3 py-2 cursor-pointer border-l-4 transition-all ${
        isActive
          ? 'border-l-cyber-red bg-cyber-darker'
          : 'border-l-cyber-gray hover:border-l-cyber-blue hover:bg-cyber-dark'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          {/* Online status */}
          <span className={`w-2 h-2 rounded-full ${asset.status === 'online' ? 'bg-cyber-green' : 'bg-cyber-gray'}`} />
          <div className={`font-mono text-sm font-bold truncate ${isActive ? 'text-cyber-red' : 'text-cyber-blue'}`}>
            {asset.ip_address}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Vuln scan indicator */}
          {vulnScanning && (
            <span className="w-2 h-2 rounded-full bg-cyber-purple animate-pulse" title="Vulnerability scan running" />
          )}
          {/* Scan status indicator */}
          {scanStatus === 'running' && (
            <span className="w-2 h-2 rounded-full bg-cyber-red animate-pulse" title="Scan running" />
          )}
          {scanStatus === 'completed' && (
            <span className="text-cyber-green text-xs" title="Scan completed">◉</span>
          )}
          {scanStatus === 'failed' && (
            <span className="text-cyber-red text-xs" title="Scan failed">✕</span>
          )}
          {!scanStatus && (
            <span className="text-cyber-gray text-xs" title="Not scanned">○</span>
          )}
        </div>
      </div>
      {asset.hostname && asset.hostname !== asset.ip_address && (
        <div className="text-cyber-gray-light text-xs truncate mt-1">{asset.hostname}</div>
      )}
      {asset.open_ports && asset.open_ports.length > 0 && (
        <div className="text-cyber-gray-light text-xs mt-1">
          <span className="text-cyber-purple">◈</span> {asset.open_ports.slice(0, 4).join(', ')}{asset.open_ports.length > 4 ? '...' : ''}
        </div>
      )}
    </div>
  );
});

AssetListItem.displayName = 'AssetListItem';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete, setSelectedDatabases, setVulnerabilities, setVulnScanning } = useScanStore();
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  const navigate = useNavigate();

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [manualIp, setManualIp] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>(() => (localStorage.getItem('nop_scans_status_filter') as any) || 'all');
  const [ipFilter, setIpFilter] = useState(localStorage.getItem('nop_scans_ip_filter') || '');
  const [scanFilter, setScanFilter] = useState<'all' | 'scanned' | 'unscanned'>(() => (localStorage.getItem('nop_scans_scan_filter') as any) || 'all');

  useEffect(() => {
    if (!token) return;
    setLoadingAssets(true);
    assetService.getAssets(token, undefined, activeAgent?.id)
      .then((resp) => setAssets(resp))
      .catch((err) => console.error('Failed to load assets', err))
      .finally(() => setLoadingAssets(false));
  }, [token, activeAgent]);

  useEffect(() => {
    if (activeTab?.logs && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab?.logs]);

  const filteredAssets = useMemo(() => {
    return assets
      .filter((asset) => {
        if (statusFilter !== 'all' && asset.status !== statusFilter) return false;
        if (ipFilter && !asset.ip_address.includes(ipFilter)) return false;
        const scanned = (asset as any).has_been_scanned || false;
        if (scanFilter === 'scanned' && !scanned) return false;
        if (scanFilter === 'unscanned' && scanned) return false;
        return true;
      })
      .sort((a, b) => a.ip_address.localeCompare(b.ip_address));
  }, [assets, statusFilter, ipFilter, scanFilter]);

  const handleStartScan = async (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (!tab || !token) return;

    try {
      startScan(id);
      setScanStatus(id, 'running');
      addLog(id, `[SCAN] Starting ${tab.options.scanType} scan on ${tab.ip} (${tab.options.ports || 'default ports'})`);
      addLog(id, '[INFO] Enumerating services and collecting banners...');

      // Call the real API
      const result = await assetService.startScan(token, tab.ip, tab.options.scanType || 'basic');
      
      if (result && result.scan_id) {
        addLog(id, `[INFO] Scan initiated with ID: ${result.scan_id}`);
        
        // Poll for scan results
        const pollInterval = setInterval(async () => {
          try {
            const scanStatus = await assetService.getScanStatus(token, result.scan_id);
            
            if (scanStatus.status === 'completed') {
              clearInterval(pollInterval);
              setScanStatus(id, 'completed');
              
              // Parse and display scan results
              const results = scanStatus.results || {};
              const hosts = results.hosts || [];
              addLog(id, `[SUCCESS] Scan complete. Found ${hosts.length} host(s)`);
              
              // Log discovered hosts and their open ports
              for (const host of hosts) {
                const hostIp = host.ip || host.address || 'unknown';
                const ports = host.ports || [];
                const openPorts = ports.filter((p: any) => p.state === 'open');
                
                if (openPorts.length > 0) {
                  addLog(id, `[HOST] ${hostIp}`);
                  for (const port of openPorts) {
                    const portId = port.portid || port.port;
                    const service = port.service?.name || port.service || 'unknown';
                    const version = port.service?.version || port.version || '';
                    const product = port.service?.product || port.product || '';
                    const serviceInfo = version ? `${service} ${product} ${version}`.trim() : service;
                    addLog(id, `  [PORT] ${portId}/tcp - ${serviceInfo}`);
                  }
                } else if (host.status === 'up') {
                  addLog(id, `[HOST] ${hostIp} - Up (no open ports in scan range)`);
                }
              }
              
              // Refresh assets list
              const updatedAssets = await assetService.getAssets(token);
              setAssets(updatedAssets);
              
              onScanComplete?.(tab.ip, scanStatus);
            } else if (scanStatus.status === 'failed') {
              clearInterval(pollInterval);
              setScanStatus(id, 'failed');
              addLog(id, '[ERROR] Scan failed');
            } else {
              addLog(id, `[INFO] Scan progress: ${scanStatus.progress || 'running'}...`);
            }
          } catch (err) {
            clearInterval(pollInterval);
            setScanStatus(id, 'failed');
            addLog(id, '[ERROR] Failed to get scan status');
          }
        }, 2000);
      } else {
        setScanStatus(id, 'failed');
        addLog(id, '[ERROR] Failed to start scan');
      }
    } catch (error: any) {
      setScanStatus(id, 'failed');
      addLog(id, `[ERROR] Scan failed: ${error.response?.data?.detail || error.message}`);
    }
  };

  const handleVulnerabilityScan = async (tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab || tab.vulnScanning || !token) return;

    try {
      setVulnScanning(tabId, true);
      addLog(tabId, `[SCAN] Running vulnerability checks against ${tab.selectedDatabases.join(', ')}`);
      
      // Find asset by IP to get open ports
      const asset = assets.find(a => a.ip_address === tab.ip);
      if (!asset || !asset.open_ports || asset.open_ports.length === 0) {
        addLog(tabId, '[ERROR] No open ports found. Run a port scan first.');
        setVulnScanning(tabId, false);
        return;
      }

      // Batch ports into groups of 5 to avoid proxy timeouts (Codespaces has ~2min limit)
      const BATCH_SIZE = 5;
      const portBatches: number[][] = [];
      for (let i = 0; i < asset.open_ports.length; i += BATCH_SIZE) {
        portBatches.push(asset.open_ports.slice(i, i + BATCH_SIZE));
      }

      addLog(tabId, `[INFO] Detecting service versions on ${asset.open_ports.length} open ports in ${portBatches.length} batches...`);
      
      // Step 1: Detect service versions in batches
      const allServices: any[] = [];
      
      for (let batchIdx = 0; batchIdx < portBatches.length; batchIdx++) {
        const batch = portBatches[batchIdx];
        addLog(tabId, `[INFO] Scanning batch ${batchIdx + 1}/${portBatches.length}: ports ${batch.join(', ')}...`);
        
        try {
          const versionResponse = await fetch(`/api/v1/scans/${tabId}/version-detection`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              host: tab.ip,
              ports: batch
            })
          });

          if (!versionResponse.ok) {
            addLog(tabId, `[WARN] Batch ${batchIdx + 1} failed, continuing...`);
            continue;
          }
          
          const versionData = await versionResponse.json();
          if (versionData.services) {
            allServices.push(...versionData.services);
          }
        } catch (fetchError: any) {
          addLog(tabId, `[WARN] Batch ${batchIdx + 1} error: ${fetchError.message}`);
          continue;
        }
      }

      addLog(tabId, `[INFO] Detected ${allServices.length} services total`);

      const allVulnerabilities: Vulnerability[] = [];

      // Step 2: Lookup CVEs for each service
      for (const service of allServices) {
        if (!service.product || !service.version) continue;

        addLog(tabId, `[INFO] Scanning ${service.product} ${service.version} on port ${service.port}...`);

        const cveResponse = await fetch(`/api/v1/vulnerabilities/lookup-cve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            product: service.product,
            version: service.version
          })
        });

        if (!cveResponse.ok) continue;

        const cveData = await cveResponse.json();
        const cves = cveData.cves || [];
        
        addLog(tabId, `[INFO] Found ${cves.length} CVEs for ${service.product}`);

        // Step 3: Check for exploits for each CVE
        for (const cve of cves.slice(0, 10)) { // Limit to first 10 to avoid overwhelming
          try {
            const exploitResponse = await fetch(`/api/v1/vulnerabilities/exploits/${cve.cve_id}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            const exploits = exploitResponse.ok ? await exploitResponse.json() : [];
            const hasExploit = exploits && exploits.length > 0;

            // Only add CVEs with available exploits
            if (hasExploit) {
              allVulnerabilities.push({
                id: `${tabId}-${cve.cve_id}`,
                cve_id: cve.cve_id,
                title: cve.title || cve.cve_id,
                description: cve.description || 'No description available',
                severity: cve.severity || 'medium',
                cvss_score: cve.cvss_score || 0,
                affected_service: service.product,
                affected_port: service.port,
                exploit_available: true,
                exploit_module: exploits[0]?.module_path || exploits[0]?.module_id,
                source_database: 'cve',
                // Store full exploit metadata
                exploit_data: exploits[0] ? {
                  id: exploits[0].id,
                  platform: exploits[0].platform,
                  module_id: exploits[0].module_id,
                  module_path: exploits[0].module_path,
                  exploit_type: exploits[0].exploit_type,
                  target_platform: exploits[0].target_platform,
                  rank: exploits[0].rank,
                  verified: exploits[0].verified,
                  exploit_db_id: exploits[0].exploit_db_id,
                  reference_url: exploits[0].reference_url,
                  exploit_metadata: exploits[0].exploit_metadata || undefined
                } : undefined
              });
            }
          } catch (err) {
            // Skip CVEs that fail exploit lookup
          }
        }
      }

      setVulnerabilities(tabId, allVulnerabilities);
      setVulnScanning(tabId, false);
      addLog(tabId, `[SUCCESS] Vulnerability scan complete. Found ${allVulnerabilities.length} exploitable CVEs`);

    } catch (error: any) {
      setVulnScanning(tabId, false);
      addLog(tabId, `[ERROR] Vulnerability scan failed: ${error.message}`);
    }
  };

  const toggleDatabase = (tabId: string, database: string) => {
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;
    const current = tab.selectedDatabases || [];
    const updated = current.includes(database) ? current.filter((db) => db !== database) : [...current, database];
    setSelectedDatabases(tabId, updated);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualIp.trim()) return;
    addTab(manualIp.trim());
    setManualIp('');
  };

  const handleOpenAsset = (asset: Asset) => {
    // Check if a tab already exists for this IP
    const existingTab = tabs.find((t) => t.ip === asset.ip_address);
    if (existingTab) {
      // Activate existing tab
      setActiveTab(existingTab.id);
    } else {
      // Create new tab
      addTab(asset.ip_address, asset.hostname);
    }
  };
  
  // Get scan status for an asset
  const getScanStatus = (ip: string): 'idle' | 'running' | 'completed' | 'failed' | undefined => {
    const tab = tabs.find((t) => t.ip === ip);
    if (!tab) return undefined;
    return tab.status;
  };

  return (
    <div className="h-full flex flex-col p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <CyberPageTitle color="red" className="flex items-center">
            <span className="mr-3 text-3xl">◆</span>
            Target Scans
          </CyberPageTitle>
          <p className="text-cyber-gray-light text-sm mt-1">Discover assets and run focused scans</p>
        </div>
        <div className="flex items-center gap-2">
          <form onSubmit={handleManualSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={manualIp}
              onChange={(e) => setManualIp(e.target.value)}
              placeholder="Enter IP or CIDR"
              className="bg-cyber-dark border border-cyber-gray px-3 py-2 text-sm font-mono text-cyber-blue outline-none focus:border-cyber-red"
            />
            <button type="submit" className="btn-base btn-md btn-red">New Scan</button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-4 flex-1 min-h-0">
        <div className="dashboard-card flex flex-col h-full overflow-hidden">
          <div className="p-4 border-b border-cyber-gray shrink-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {['all', 'online', 'offline'].map((f) => (
                <button
                  key={f}
                  onClick={() => { setStatusFilter(f as any); localStorage.setItem('nop_scans_status_filter', f); }}
                  className={`btn-base btn-sm ${statusFilter === f ? 'btn-blue' : 'btn-gray'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {['all', 'scanned', 'unscanned'].map((f) => (
                <button
                  key={f}
                  onClick={() => { setScanFilter(f as any); localStorage.setItem('nop_scans_scan_filter', f); }}
                  className={`btn-base btn-sm ${scanFilter === f ? 'btn-green' : 'btn-gray'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={ipFilter}
              onChange={(e) => { setIpFilter(e.target.value); localStorage.setItem('nop_scans_ip_filter', e.target.value); }}
              placeholder="Filter by IP"
              className="w-full bg-cyber-dark border border-cyber-gray px-3 py-2 text-sm font-mono text-cyber-blue outline-none focus:border-cyber-red"
            />
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-1 min-h-0">
            {loadingAssets ? (
              <div className="text-cyber-gray-light text-sm">Loading assets…</div>
            ) : filteredAssets.length === 0 ? (
              <p className="text-cyber-gray-light text-sm">No assets match the filters.</p>
            ) : (
              filteredAssets.map((asset) => {
                const tab = tabs.find(t => t.ip === asset.ip_address);
                return (
                  <AssetListItem
                    key={asset.id}
                    asset={asset}
                    isActive={asset.ip_address === activeTab?.ip}
                    scanStatus={getScanStatus(asset.ip_address)}
                    vulnScanning={tab?.vulnScanning}
                    onOpen={handleOpenAsset}
                  />
                );
              })
            )}
          </div>
        </div>

        <div className="dashboard-card p-4 h-full flex flex-col">
          {!activeTab && <p className="text-cyber-gray-light text-sm">Select or create a scan to view details.</p>}

          {activeTab && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-cyber-gray">Target</p>
                  <p className="text-lg font-bold text-cyber-blue">{activeTab.ip}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
                {/* PORT SCAN AREA */}
                <div className="border border-cyber-gray bg-cyber-darker p-4 rounded-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm uppercase tracking-wider text-cyber-blue font-bold flex items-center gap-2">
                      <span className="text-cyber-blue">◈</span> Port Scan
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={() => handleStartScan(activeTab.id)} disabled={activeTab.status === 'running'} className={`btn-base btn-md ${activeTab.status === 'running' ? 'btn-gray animate-pulse' : 'btn-red'}`}>
                        {activeTab.status === 'running' ? '◉ Scanning…' : '▶ Scan'}
                      </button>
                      <button onClick={() => navigate('/access', { state: { mode: 'login', targetIP: activeTab.ip } })} className="btn-base btn-md btn-blue">
                        ◈ Access
                      </button>
                      <button onClick={() => navigate('/settings', { state: { section: 'port-scan' } })} className="btn-base btn-icon btn-gray" title="Port Scan Settings">
                        ⚙
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="space-y-1">
                      <p className="text-xs text-cyber-gray uppercase tracking-wider">Scan Type</p>
                      <select
                        value={activeTab.options.scanType}
                        onChange={(e) => {
                          const scanType = e.target.value as any;
                          const updates: any = { scanType };
                          // Set port range based on scan type
                          if (scanType === 'comprehensive') {
                            updates.ports = '1-65535';
                          } else if (scanType === 'basic') {
                            updates.ports = '1-1000';
                          }
                          updateTabOptions(activeTab.id, updates);
                        }}
                        disabled={activeTab.status === 'running'}
                        className="w-full bg-cyber-dark border border-cyber-gray px-2 py-1.5 text-xs text-cyber-blue outline-none focus:border-cyber-blue"
                      >
                        <option value="basic">Basic</option>
                        <option value="comprehensive">Full</option>
                        <option value="custom">Custom</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-cyber-gray uppercase tracking-wider">Ports</p>
                      <input
                        type="text"
                        value={activeTab.options.ports}
                        onChange={(e) => updateTabOptions(activeTab.id, { ports: e.target.value })}
                        disabled={activeTab.status === 'running'}
                        className="w-full bg-cyber-dark border border-cyber-gray px-2 py-1.5 text-xs font-mono text-cyber-blue outline-none focus:border-cyber-blue"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-h-0 overflow-hidden">
                    <div className="h-full bg-black border border-cyber-gray p-3 rounded-sm overflow-y-auto custom-scrollbar font-mono text-xs">
                      {activeTab.logs.length === 0 ? (
                        <div className="text-cyber-gray-light opacity-60">&gt; Awaiting scan command...</div>
                      ) : (
                        activeTab.logs.map((log, idx) => (
                          <div key={idx} className={`${
                            log.includes('[SUCCESS]') ? 'text-cyber-green' :
                            log.includes('[SCAN]') ? 'text-cyber-blue' :
                            log.includes('[ERROR]') ? 'text-cyber-red' :
                            log.includes('[INFO]') ? 'text-cyber-purple' :
                            'text-cyber-gray-light'
                          }`}>&gt; {log}</div>
                        ))
                      )}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </div>

                {/* VULNERABILITY SCAN AREA */}
                <div className="border border-cyber-gray bg-cyber-darker p-4 rounded-sm flex flex-col h-full">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm uppercase tracking-wider text-cyber-purple font-bold flex items-center gap-2">
                      <span className="text-cyber-purple">◈</span> Vulnerability Scan
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={() => handleVulnerabilityScan(activeTab.id)} disabled={activeTab.vulnScanning} className={`btn-base btn-md ${activeTab.vulnScanning ? 'btn-gray animate-pulse' : 'btn-purple'}`}>
                        {activeTab.vulnScanning ? '◉ Scanning…' : '▶ Scan'}
                      </button>
                      <button onClick={() => navigate('/access', { state: { mode: 'exploit', targetIP: activeTab.ip, vulnerability: activeTab.vulnerabilities?.[0] } })} disabled={activeTab.vulnerabilities.length === 0} className={`btn-base btn-md ${activeTab.vulnerabilities.length === 0 ? 'btn-gray' : 'btn-red'}`}>
                        ◉ Exploit
                      </button>
                      <button onClick={() => navigate('/settings', { state: { section: 'vuln-scan' } })} className="btn-base btn-icon btn-gray" title="Vulnerability Scan Settings">
                        ⚙
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2 text-xs">
                    <span className="text-cyber-gray-light"><span className="text-cyber-purple">◈</span> {activeTab.vulnerabilities?.length || 0} vulnerabilities found</span>
                  </div>
                  
                  <div className="flex-1 bg-cyber-dark border border-cyber-gray p-3 rounded-sm overflow-y-auto custom-scrollbar">
                    {activeTab.vulnScanning ? (
                      <div className="text-cyber-purple text-sm animate-pulse">Scanning for vulnerabilities…</div>
                    ) : activeTab.vulnerabilities.length === 0 ? (
                      <div className="text-cyber-gray-light text-sm">Run a vuln scan to populate results.</div>
                    ) : (
                      <div className="space-y-2">
                        {activeTab.vulnerabilities.map((vuln) => (
                          <div key={vuln.id} className="border border-cyber-gray p-2 bg-cyber-darker hover:border-cyber-purple cursor-pointer" onClick={() => navigate('/access', { state: { mode: 'exploit', targetIP: activeTab.ip, vulnerability: vuln } })}>
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-cyber-blue text-sm font-bold">{vuln.title}</p>
                                <p className="text-cyber-gray-light text-xs">{vuln.cve_id}</p>
                              </div>
                              <span className={`px-2 py-1 border text-[10px] uppercase font-bold ${
                                vuln.severity === 'critical' || vuln.severity === 'high'
                                  ? 'border-cyber-red text-cyber-red'
                                  : vuln.severity === 'medium'
                                    ? 'border-yellow-400 text-yellow-300'
                                    : 'border-cyber-green text-cyber-green'
                              }`}>
                                {vuln.severity}
                              </span>
                            </div>
                            <p className="text-cyber-gray-light text-xs mt-1">{vuln.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Scans;
