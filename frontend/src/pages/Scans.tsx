import React, { useEffect, useRef, useState } from 'react';
import { useScanStore } from '../store/scanStore';
import { useAuthStore } from '../store/authStore';
import axios from 'axios';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete } = useScanStore();
  const { token } = useAuthStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState('');

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab?.logs]);

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
      <div className="flex flex-col items-center justify-center h-[80vh] space-y-8">
        <div className="text-center space-y-2">
          <div className="text-cyber-gray-light text-xl uppercase tracking-widest">No Active Scan Sessions</div>
          <p className="text-cyber-purple text-sm">Start a scan from Assets or enter an IP manually below.</p>
        </div>

        <form onSubmit={handleManualSubmit} className="w-full max-w-md flex space-x-2">
          <input
            type="text"
            value={manualIp}
            onChange={(e) => setManualIp(e.target.value)}
            placeholder="Enter IP Address (e.g. 192.168.1.1)"
            className="flex-1 bg-cyber-darker border border-cyber-gray p-3 text-cyber-blue outline-none focus:border-cyber-red transition-colors font-mono"
          />
          <button
            type="submit"
            className="btn-cyber border-cyber-red text-cyber-red px-6 py-3 hover:bg-cyber-red hover:text-white uppercase font-bold tracking-widest"
          >
            Initialize
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] space-y-4">
      <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t-2 transition-all min-w-[150px] ${
              activeTabId === tab.id
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
            if (ip) addTab(ip);
          }}
          className="px-4 py-2 text-cyber-blue hover:text-cyber-red transition-colors text-xl"
          title="Add Manual Scan"
        >
          +
        </button>
      </div>

      {activeTab && (
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
