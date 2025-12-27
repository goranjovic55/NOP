import React, { useState, useEffect, useRef } from 'react';
import { hostService, SystemMetrics, SystemInfo, Process, FileSystemItem } from '../services/hostService';
import { useAuthStore } from '../store/authStore';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import ProtocolConnection from '../components/ProtocolConnection';
import { useAccessStore, Protocol } from '../store/accessStore';

const Host: React.FC = () => {
  const { token } = useAuthStore();
  const { addTab } = useAccessStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'terminal' | 'filesystem' | 'desktop'>('metrics');
  const [desktopProtocol, setDesktopProtocol] = useState<Protocol>('vnc');
  const [desktopHost, setDesktopHost] = useState('localhost');
  const [desktopPort, setDesktopPort] = useState('5900');
  const [desktopConnectionTab, setDesktopConnectionTab] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [fileItems, setFileItems] = useState<FileSystemItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Fetch system info on mount
  useEffect(() => {
    if (token) {
      fetchSystemInfo();
    }
  }, [token]);

  // Fetch metrics periodically
  useEffect(() => {
    if (token && activeTab === 'metrics') {
      fetchMetrics();
      fetchProcesses();
      const interval = setInterval(() => {
        fetchMetrics();
        fetchProcesses();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [token, activeTab]);

  // Initialize terminal
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !xtermRef.current) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'Courier New, monospace',
        theme: {
          background: '#0a0a0a',
          foreground: '#00ff41',
          cursor: '#00ff41',
          black: '#000000',
          red: '#ff0040',
          green: '#00ff41',
          yellow: '#fffc00',
          blue: '#0080ff',
          magenta: '#bc13fe',
          cyan: '#00ffff',
          white: '#ffffff',
        },
      });
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      
      // Connect WebSocket (Note: Authentication would need to be handled properly)
      // For now, this is a placeholder
      term.writeln('Terminal connection not fully implemented yet.');
      term.writeln('This requires proper WebSocket authentication.');
      
      return () => {
        term.dispose();
        xtermRef.current = null;
      };
    }
  }, [activeTab]);

  // Browse filesystem
  useEffect(() => {
    if (token && activeTab === 'filesystem') {
      browseDirectory(currentPath);
    }
  }, [token, activeTab, currentPath]);

  const fetchSystemInfo = async () => {
    if (!token) return;
    try {
      const info = await hostService.getSystemInfo(token);
      setSystemInfo(info);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
    }
  };

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const data = await hostService.getSystemMetrics(token);
      setMetrics(data);
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
  };

  const fetchProcesses = async () => {
    if (!token) return;
    try {
      const data = await hostService.getProcesses(token, 20);
      setProcesses(data);
    } catch (error) {
      console.error('Failed to fetch processes:', error);
    }
  };

  const browseDirectory = async (path: string) => {
    if (!token) return;
    try {
      const data = await hostService.browseFileSystem(token, path);
      setCurrentPath(data.current_path);
      setFileItems(data.items);
    } catch (error) {
      console.error('Failed to browse directory:', error);
    }
  };

  const handleFileClick = async (item: FileSystemItem) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path);
    } else if (item.type === 'file' && token) {
      try {
        const content = await hostService.readFile(token, item.path);
        setSelectedFile(item.path);
        setFileContent(content.content);
        setEditMode(false);
      } catch (error) {
        console.error('Failed to read file:', error);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!token || !selectedFile) return;
    try {
      await hostService.writeFile(token, selectedFile, fileContent);
      setEditMode(false);
      alert('File saved successfully');
    } catch (error) {
      console.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const formatUptime = (bootTime: string): string => {
    const boot = new Date(bootTime);
    const now = new Date();
    const diff = now.getTime() - boot.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}d ${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-4">
      {/* System Info Header */}
      {systemInfo && (
        <div className="bg-cyber-dark border border-cyber-gray p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-cyber-gray-light uppercase text-xs">Hostname</div>
              <div className="text-cyber-green font-mono">{systemInfo.hostname}</div>
            </div>
            <div>
              <div className="text-cyber-gray-light uppercase text-xs">Platform</div>
              <div className="text-cyber-green font-mono">{systemInfo.platform} {systemInfo.platform_release}</div>
            </div>
            <div>
              <div className="text-cyber-gray-light uppercase text-xs">Architecture</div>
              <div className="text-cyber-green font-mono">{systemInfo.architecture}</div>
            </div>
            <div>
              <div className="text-cyber-gray-light uppercase text-xs">Uptime</div>
              <div className="text-cyber-green font-mono">{formatUptime(systemInfo.boot_time)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-cyber-gray">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 uppercase text-sm font-medium transition-colors ${
            activeTab === 'metrics'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ◈ System Metrics
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 uppercase text-sm font-medium transition-colors ${
            activeTab === 'terminal'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ▣ Terminal
        </button>
        <button
          onClick={() => setActiveTab('filesystem')}
          className={`px-4 py-2 uppercase text-sm font-medium transition-colors ${
            activeTab === 'filesystem'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ⬢ Filesystem
        </button>
        <button
          onClick={() => setActiveTab('desktop')}
          className={`px-4 py-2 uppercase text-sm font-medium transition-colors ${
            activeTab === 'desktop'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ◉ Desktop
        </button>
      </div>

      {/* Metrics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-4">
          {/* CPU and Memory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CPU */}
            <div className="bg-cyber-dark border border-cyber-gray p-4">
              <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
                <span className="mr-2">◉</span> CPU Usage
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-cyber-gray-light">Total</span>
                  <span className="text-cyber-green font-mono">{metrics.cpu.percent_total.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-cyber-darker h-4 border border-cyber-gray">
                  <div
                    className="bg-cyber-red h-full transition-all duration-300"
                    style={{ width: `${metrics.cpu.percent_total}%` }}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2 mt-3">
                  {metrics.cpu.percent_per_core.map((percent, idx) => (
                    <div key={idx} className="text-xs">
                      <div className="text-cyber-gray-light">Core {idx}</div>
                      <div className="text-cyber-green font-mono">{percent.toFixed(0)}%</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-cyber-gray-light mt-2">
                  {metrics.cpu.core_count} cores, {metrics.cpu.thread_count} threads
                </div>
              </div>
            </div>

            {/* Memory */}
            <div className="bg-cyber-dark border border-cyber-gray p-4">
              <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
                <span className="mr-2">◉</span> Memory Usage
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-cyber-gray-light">RAM</span>
                  <span className="text-cyber-green font-mono">
                    {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
                  </span>
                </div>
                <div className="w-full bg-cyber-darker h-4 border border-cyber-gray">
                  <div
                    className="bg-cyber-purple h-full transition-all duration-300"
                    style={{ width: `${metrics.memory.percent}%` }}
                  />
                </div>
                <div className="text-xs text-cyber-green font-mono text-right">
                  {metrics.memory.percent.toFixed(1)}%
                </div>
                
                <div className="flex justify-between text-sm mt-3">
                  <span className="text-cyber-gray-light">Swap</span>
                  <span className="text-cyber-green font-mono">
                    {formatBytes(metrics.memory.swap_used)} / {formatBytes(metrics.memory.swap_total)}
                  </span>
                </div>
                <div className="w-full bg-cyber-darker h-4 border border-cyber-gray">
                  <div
                    className="bg-cyber-purple h-full transition-all duration-300"
                    style={{ width: `${metrics.memory.swap_percent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Disk Usage */}
          <div className="bg-cyber-dark border border-cyber-gray p-4">
            <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
              <span className="mr-2">◉</span> Disk Usage
            </h3>
            <div className="space-y-3">
              {metrics.disk.map((disk, idx) => (
                <div key={idx} className="border border-cyber-gray p-3">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-cyber-gray-light font-mono">{disk.mountpoint}</span>
                    <span className="text-cyber-green font-mono">
                      {formatBytes(disk.used)} / {formatBytes(disk.total)}
                    </span>
                  </div>
                  <div className="w-full bg-cyber-darker h-3 border border-cyber-gray">
                    <div
                      className="bg-cyber-green h-full transition-all duration-300"
                      style={{ width: `${disk.percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-cyber-gray-light mt-1">
                    {disk.device} ({disk.fstype}) - {disk.percent.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Network */}
          <div className="bg-cyber-dark border border-cyber-gray p-4">
            <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
              <span className="mr-2">◉</span> Network I/O
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-cyber-gray-light uppercase text-xs">Bytes Sent</div>
                <div className="text-cyber-green font-mono">{formatBytes(metrics.network.bytes_sent)}</div>
              </div>
              <div>
                <div className="text-cyber-gray-light uppercase text-xs">Bytes Recv</div>
                <div className="text-cyber-green font-mono">{formatBytes(metrics.network.bytes_recv)}</div>
              </div>
              <div>
                <div className="text-cyber-gray-light uppercase text-xs">Packets Sent</div>
                <div className="text-cyber-green font-mono">{metrics.network.packets_sent.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-cyber-gray-light uppercase text-xs">Packets Recv</div>
                <div className="text-cyber-green font-mono">{metrics.network.packets_recv.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Top Processes */}
          <div className="bg-cyber-dark border border-cyber-gray p-4">
            <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
              <span className="mr-2">◉</span> Top Processes ({metrics.processes} total)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-cyber-gray">
                  <tr className="text-left text-cyber-gray-light uppercase text-xs">
                    <th className="pb-2">PID</th>
                    <th className="pb-2">Name</th>
                    <th className="pb-2">User</th>
                    <th className="pb-2">CPU %</th>
                    <th className="pb-2">Memory %</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {processes.map((proc) => (
                    <tr key={proc.pid} className="border-b border-cyber-darker hover:bg-cyber-darker">
                      <td className="py-2 text-cyber-green">{proc.pid}</td>
                      <td className="py-2 text-cyber-purple">{proc.name}</td>
                      <td className="py-2 text-cyber-gray-light">{proc.username}</td>
                      <td className="py-2 text-cyber-red">{proc.cpu_percent?.toFixed(1) || 0}</td>
                      <td className="py-2 text-cyber-red">{proc.memory_percent?.toFixed(1) || 0}</td>
                      <td className="py-2 text-cyber-gray-light">{proc.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Tab */}
      {activeTab === 'terminal' && (
        <div className="bg-cyber-dark border border-cyber-gray p-4">
          <div className="text-cyber-gray-light text-sm mb-2 uppercase">
            ▣ Shell Access
          </div>
          <div
            ref={terminalRef}
            className="h-[600px] border border-cyber-gray"
          />
          <div className="text-cyber-gray-light text-xs mt-2">
            Note: Full terminal functionality requires proper WebSocket authentication implementation.
          </div>
        </div>
      )}

      {/* Filesystem Tab */}
      {activeTab === 'filesystem' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* File Browser */}
          <div className="bg-cyber-dark border border-cyber-gray p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cyber-red uppercase font-bold flex items-center">
                <span className="mr-2">⬢</span> File Browser
              </h3>
              {currentPath !== '/' && (
                <button
                  onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/') || '/')}
                  className="text-cyber-purple hover:text-cyber-red text-sm uppercase"
                >
                  ◀ Parent
                </button>
              )}
            </div>
            <div className="text-cyber-gray-light text-xs font-mono mb-2 p-2 bg-cyber-darker border border-cyber-gray">
              {currentPath}
            </div>
            <div className="space-y-1 max-h-[500px] overflow-y-auto">
              {fileItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleFileClick(item)}
                  className={`w-full text-left px-3 py-2 border transition-colors group ${
                    item.type === 'directory'
                      ? 'border-cyber-purple hover:bg-cyber-darker hover:border-cyber-red'
                      : 'border-cyber-gray hover:bg-cyber-darker hover:border-cyber-green'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      {item.type === 'directory' ? (
                        <svg className="w-5 h-5 text-cyber-purple group-hover:text-cyber-red transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18" opacity="0.6" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-cyber-green group-hover:text-cyber-purple transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 3v6h6" opacity="0.6" />
                        </svg>
                      )}
                      <span className={`font-mono text-sm truncate ${item.type === 'directory' ? 'text-cyber-purple group-hover:text-cyber-red' : 'text-cyber-green group-hover:text-cyber-purple'} transition-colors`}>
                        {item.name}
                      </span>
                    </div>
                    <div className="text-xs text-cyber-gray-light ml-2 flex-shrink-0">
                      {item.type === 'file' && item.size !== undefined && formatBytes(item.size)}
                    </div>
                  </div>
                  {item.error && (
                    <div className="text-xs text-cyber-red mt-1">{item.error}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* File Viewer/Editor */}
          <div className="bg-cyber-dark border border-cyber-gray p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cyber-red uppercase font-bold flex items-center">
                <span className="mr-2">⬢</span> File Viewer
              </h3>
              {selectedFile && (
                <div className="flex space-x-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={handleSaveFile}
                        className="px-3 py-1 bg-cyber-green text-black uppercase text-xs font-bold hover:bg-opacity-80"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-3 py-1 bg-cyber-red text-white uppercase text-xs font-bold hover:bg-opacity-80"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-3 py-1 bg-cyber-purple text-white uppercase text-xs font-bold hover:bg-opacity-80"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            {selectedFile ? (
              <>
                <div className="text-cyber-gray-light text-xs font-mono mb-2 p-2 bg-cyber-darker border border-cyber-gray">
                  {selectedFile}
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => setFileContent(e.target.value)}
                  readOnly={!editMode}
                  className={`w-full h-[500px] bg-cyber-darker border border-cyber-gray p-3 text-cyber-green font-mono text-sm ${
                    editMode ? '' : 'cursor-not-allowed'
                  }`}
                  style={{ resize: 'none' }}
                />
              </>
            ) : (
              <div className="text-center text-cyber-gray-light py-20">
                Select a file to view or edit
              </div>
            )}
          </div>
        </div>
      )}

      {/* Desktop Tab */}
      {activeTab === 'desktop' && (
        <div className="bg-cyber-dark border border-cyber-gray p-4">
          <div className="mb-4">
            <h3 className="text-cyber-red uppercase font-bold mb-3 flex items-center">
              <span className="mr-2">◉</span> Desktop Access (VNC/RDP)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-cyber-gray-light text-xs uppercase mb-2">Protocol</label>
                <select
                  value={desktopProtocol}
                  onChange={(e) => setDesktopProtocol(e.target.value as Protocol)}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green p-2"
                >
                  <option value="vnc">VNC</option>
                  <option value="rdp">RDP</option>
                </select>
              </div>
              <div>
                <label className="block text-cyber-gray-light text-xs uppercase mb-2">Host</label>
                <input
                  type="text"
                  value={desktopHost}
                  onChange={(e) => setDesktopHost(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green p-2 font-mono"
                  placeholder="localhost"
                />
              </div>
              <div>
                <label className="block text-cyber-gray-light text-xs uppercase mb-2">Port</label>
                <input
                  type="text"
                  value={desktopPort}
                  onChange={(e) => setDesktopPort(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green p-2 font-mono"
                  placeholder="5900"
                />
              </div>
            </div>
            <button
              onClick={() => {
                const newTab = {
                  id: `desktop-${Date.now()}`,
                  protocol: desktopProtocol,
                  ip: desktopHost,
                  port: parseInt(desktopPort) || (desktopProtocol === 'vnc' ? 5900 : 3389),
                  status: 'disconnected' as const,
                  credentials: null,
                };
                setDesktopConnectionTab(newTab);
              }}
              className="px-4 py-2 bg-cyber-green text-black uppercase text-sm font-bold hover:bg-opacity-80"
            >
              Connect
            </button>
          </div>
          
          {desktopConnectionTab ? (
            <div className="border border-cyber-gray bg-cyber-black min-h-[600px]">
              <ProtocolConnection tab={desktopConnectionTab} />
            </div>
          ) : (
            <div className="border border-cyber-gray bg-cyber-black min-h-[600px] flex items-center justify-center">
              <div className="text-center text-cyber-gray-light">
                <div className="text-6xl mb-4">◉</div>
                <div className="text-lg uppercase mb-2">No Connection</div>
                <div className="text-sm">
                  Configure connection settings above and click Connect
                </div>
                <div className="text-xs mt-4 text-cyber-purple">
                  Default VNC port: 5900 | Default RDP port: 3389
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Host;
