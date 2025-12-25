import React, { useEffect, useRef, useState } from 'react';
import { useScanStore } from '../store/scanStore';

const Scans: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab, updateTabOptions, startScan, setScanStatus, addLog, addTab, onScanComplete } = useScanStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState('');

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab?.logs]);

  const handleStartScan = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (!tab || tab.status === 'running') return;

    startScan(id);

    const { ip, options } = tab;
    const timestamp = () => new Date().toLocaleTimeString();

    // Dynamic simulation logic based on the new randomized IPs
    let detectedPorts = [22, 80];
    let osName = 'Linux 5.4 - 5.11';

    if (ip === '172.21.0.42') {
      detectedPorts = [22, 80, 8888, 9999];
      osName = 'Ubuntu 22.04 LTS (Jammy Jellyfish)';
    } else if (ip === '172.21.0.69') {
      detectedPorts = [22, 7777];
      osName = 'Debian 11 (Bullseye)';
    } else if (ip === '172.21.0.123') {
      detectedPorts = [3306];
      osName = 'Alpine Linux 3.16';
    } else if (ip === '172.21.0.200') {
      detectedPorts = [139, 445];
      osName = 'Windows Server 2019 (Simulated)';
    }

    const sequence: { delay: number; log: string; data?: any }[] = [
      { delay: 500, log: `[SCAN] Initializing Nmap 7.92 engine...` },
      { delay: 1200, log: `[SCAN] Target: ${ip} (${tab.hostname || 'unknown'})` },
      { delay: 2000, log: `[SCAN] Command: nmap -T${options.timing} ${options.aggressive ? '-A ' : ''}${options.serviceDetection ? '-sV ' : ''}${options.osDetection ? '-O ' : ''}-p ${options.ports} ${ip}` },
      { delay: 3500, log: `[SCAN] ARP Stealth Discovery: Host is up (0.00042s latency).` },
      { delay: 5000, log: `[SCAN] Parallel DNS resolution of 1 host. Completed.` },
      { delay: 7000, log: `[SCAN] Initiating SYN Stealth Scan at ${timestamp()}` },
      { delay: 9000, log: `[SCAN] Scanning ${options.ports.split(',').length > 1 ? 'multiple ports' : options.ports} ports...` },
      ...detectedPorts.map((port, i) => ({
        delay: 11000 + (i * 1000),
        log: `[INFO] Discovered open port ${port}/tcp on ${ip}`
      })),
      { delay: 15000, log: `[SCAN] Completed SYN Stealth Scan at ${timestamp()} (15s elapsed)` },
      { delay: 17000, log: `[SCAN] Initiating Service scan (sV) on ${detectedPorts.length} ports...` },
      ...detectedPorts.map((port, i) => ({
        delay: 19000 + (i * 1500),
        log: `[INFO] Port ${port}/tcp: ${[8888, 9999, 7777].includes(port) ? 'unknown service (nc listener)' : 'standard service'}`
      })),
      { delay: 25000, log: `[SCAN] Initiating OS detection (O)...` },
      { delay: 28000, log: `[INFO] OS details: ${osName} (96% accuracy)`, data: { os_name: osName, open_ports: detectedPorts } },
      { delay: 30000, log: `[SCAN] Post-processor: Script scanning (NSE) started...` },
      { delay: 33000, log: `[SUCCESS] Nmap done: 1 IP address (1 host up) scanned in 32.15 seconds` },
    ];

    sequence.forEach((step, index) => {
      setTimeout(() => {
        addLog(id, step.log);
        if (step.data && onScanComplete) {
          onScanComplete(ip, step.data);
        }
        if (index === sequence.length - 1) {
          setScanStatus(id, 'completed');
        }
      }, step.delay);
    });
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
      {/* Tabs Header */}
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
          {/* Top Part: Options */}
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

          {/* Bottom Part: Logs */}
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
