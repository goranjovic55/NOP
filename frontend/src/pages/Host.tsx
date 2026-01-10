import React, { useState, useEffect, useRef } from 'react';
import { hostService, SystemMetrics, SystemInfo, Process, FileSystemItem, NetworkConnection, DiskIO, POVInstruction } from '../services/hostService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import ProtocolConnection from '../components/ProtocolConnection';
import { useAccessStore, Protocol } from '../store/accessStore';
import { logger } from '../utils/logger';

const Host: React.FC = () => {
  const { token, logout, _hasHydrated } = useAuthStore();
  const { activeAgent } = usePOV();
  const { addTab } = useAccessStore();
  const [activeTab, setActiveTab] = useState<'metrics' | 'terminal' | 'filesystem' | 'desktop'>('metrics');
  const [desktopProtocol, setDesktopProtocol] = useState<Protocol>('vnc');
  const [desktopConnectionTab, setDesktopConnectionTab] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [connections, setConnections] = useState<NetworkConnection[]>([]);
  const [diskIO, setDiskIO] = useState<DiskIO | null>(null);
  const [currentPath, setCurrentPath] = useState('/');
  const [fileItems, setFileItems] = useState<FileSystemItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Local file transfer state with resumeable support
  const [localFiles, setLocalFiles] = useState<{file: File; handle?: FileSystemFileHandle; id: string}[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: {progress: number; status: 'pending' | 'uploading' | 'paused' | 'completed' | 'failed'; bytesTransferred: number}}>({}); 
  const [downloadProgress, setDownloadProgress] = useState<{[key: string]: {progress: number; status: 'pending' | 'downloading' | 'paused' | 'completed' | 'failed'; bytesTransferred: number}}>({}); 
  const [transferStatus, setTransferStatus] = useState<string | null>(null);
  const [selectedRemoteFile, setSelectedRemoteFile] = useState<string | null>(null);
  const [pausedUploads, setPausedUploads] = useState<Set<string>>(new Set());
  const [pausedDownloads, setPausedDownloads] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllers = useRef<{[key: string]: AbortController}>({});
  const directoryHandle = useRef<FileSystemDirectoryHandle | null>(null);
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  // Fetch system info on mount
  useEffect(() => {
    if (_hasHydrated && token) {
      fetchSystemInfo();
    }
  }, [token, activeAgent, _hasHydrated]);

  // Fetch metrics periodically
  useEffect(() => {
    if (_hasHydrated && token && activeTab === 'metrics') {
      fetchMetrics();
      fetchProcesses();
      fetchConnections();
      fetchDiskIO();
      const interval = setInterval(() => {
        fetchMetrics();
        fetchProcesses();
        fetchConnections();
        fetchDiskIO();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [token, activeTab]);

  // Initialize terminal with WebSocket
  useEffect(() => {
    if (activeTab === 'terminal' && terminalRef.current && !xtermRef.current && token) {
      const term = new Terminal({
        cursorBlink: true,
        fontSize: 14,
        fontFamily: 'JetBrains Mono, Fira Code, Courier New, monospace',
        theme: {
          background: '#0a0a0a',
          foreground: '#00ff41',
          cursor: '#ff0040',
          cursorAccent: '#0a0a0a',
          black: '#000000',
          red: '#ff0040',
          green: '#00ff41',
          yellow: '#fffc00',
          blue: '#0080ff',
          magenta: '#bc13fe',
          cyan: '#00ffff',
          white: '#ffffff',
          brightBlack: '#333333',
          brightRed: '#ff3366',
          brightGreen: '#33ff66',
          brightYellow: '#ffff33',
          brightBlue: '#3399ff',
          brightMagenta: '#cc33ff',
          brightCyan: '#33ffff',
          brightWhite: '#ffffff',
        },
      });
      
      const fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(terminalRef.current);
      fitAddon.fit();
      
      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      
      // Display connection message
      term.writeln('\x1b[1;35m╔══════════════════════════════════════════════╗\x1b[0m');
      term.writeln('\x1b[1;35m║\x1b[0m  \x1b[1;32m⌬\x1b[0m \x1b[1;36mNOP TERMINAL v1.0\x1b[0m                         \x1b[1;35m║\x1b[0m');
      term.writeln('\x1b[1;35m║\x1b[0m  \x1b[33mInitializing secure channel...\x1b[0m              \x1b[1;35m║\x1b[0m');
      term.writeln('\x1b[1;35m╚══════════════════════════════════════════════╝\x1b[0m');
      term.writeln('');
      
      // Connect WebSocket
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let wsUrl = `${wsProtocol}//${window.location.host}/api/v1/host/terminal?token=${encodeURIComponent(token)}`;
      if (activeAgent) {
        wsUrl += `&agent_pov=${encodeURIComponent(activeAgent.id)}`;
      }
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        term.writeln('\x1b[1;32m✓ Connection established\x1b[0m');
        term.writeln('\x1b[90m─────────────────────────────────────────────\x1b[0m');
        term.writeln('');
        
        // Send terminal size
        const size = { cols: term.cols, rows: term.rows };
        ws.send(JSON.stringify({ type: 'resize', ...size }));
      };
      
      ws.onmessage = (event) => {
        term.write(event.data);
      };
      
      ws.onerror = (error) => {
        term.writeln('\x1b[1;31m✗ Connection error\x1b[0m');
        logger.error('WebSocket error:', error);
      };
      
      ws.onclose = (event) => {
        term.writeln('');
        term.writeln('\x1b[1;33m⚠ Connection closed\x1b[0m');
        if (event.code !== 1000) {
          term.writeln(`\x1b[90mCode: ${event.code} - ${event.reason || 'Unknown'}\x1b[0m`);
        }
      };
      
      // Handle terminal input
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
      
      // Handle resize
      const handleResize = () => {
        fitAddon.fit();
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
        }
      };
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        ws.close();
        term.dispose();
        xtermRef.current = null;
        wsRef.current = null;
        fitAddonRef.current = null;
      };
    }
  }, [activeTab, token]);

  // Browse filesystem
  useEffect(() => {
    if (token && activeTab === 'filesystem') {
      browseDirectory(currentPath);
    }
  }, [token, activeTab, currentPath]);

  const fetchSystemInfo = async () => {
    if (!token) {
      // No token - wait for hydration, don't force logout
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const info = await hostService.getSystemInfo(token, activeAgent?.id);
      setSystemInfo(info);
      setLoading(false);
    } catch (error: any) {
      logger.error('Failed to fetch system info:', error);
      setLoading(false);
      if (error?.response?.status === 401) {
        // Session expired - auto logout and let app redirect to login
        logout();
        return;
      } else {
        const errorMessage = error?.response?.data?.detail || error?.message || 'Unknown error';
        setError(`Failed to fetch system info: ${errorMessage}`);
      }
    }
  };

  const fetchMetrics = async () => {
    if (!token) return;
    try {
      const data = await hostService.getSystemMetrics(token, activeAgent?.id);
      setMetrics(data);
      setError(null);
    } catch (error: any) {
      logger.error('Failed to fetch metrics:', error);
      if (error?.response?.status === 401) {
        // Session expired - auto logout and let app redirect to login
        logout();
        return;
      }
    }
  };

  const fetchProcesses = async () => {
    if (!token) return;
    try {
      const data = await hostService.getProcesses(token, 15, activeAgent?.id);
      setProcesses(data);
    } catch (error: any) {
      logger.error('Failed to fetch processes:', error);
      if (error?.response?.status === 401) {
        logout();
        return;
      }
    }
  };

  const fetchConnections = async () => {
    if (!token) return;
    try {
      const data = await hostService.getNetworkConnections(token, 20, activeAgent?.id);
      setConnections(data);
    } catch (error: any) {
      logger.error('Failed to fetch connections:', error);
      if (error?.response?.status === 401) {
        logout();
        return;
      }
    }
  };

  const fetchDiskIO = async () => {
    if (!token) return;
    try {
      const data = await hostService.getDiskIO(token, activeAgent?.id);
      setDiskIO(data);
    } catch (error: any) {
      logger.error('Failed to fetch disk I/O:', error);
      if (error?.response?.status === 401) {
        logout();
        return;
      }
    }
  };

  const browseDirectory = async (path: string) => {
    if (!token) return;
    try {
      const data = await hostService.browseFileSystem(token, path, activeAgent?.id);
      setCurrentPath(data.current_path);
      setFileItems(data.items);
    } catch (error: any) {
      logger.error('Failed to browse directory:', error);
      if (error?.response?.status === 401) {
        logout();
        return;
      }
    }
  };

  const handleFileClick = async (item: FileSystemItem) => {
    if (item.type === 'directory') {
      setCurrentPath(item.path);
    } else if (item.type === 'file' && token) {
      try {
        const content = await hostService.readFile(token, item.path, activeAgent?.id);
        setSelectedFile(item.path);
        setFileContent(content.content);
        setEditMode(false);
      } catch (error) {
        logger.error('Failed to read file:', error);
      }
    }
  };

  const handleSaveFile = async () => {
    if (!token || !selectedFile) return;
    try {
      await hostService.writeFile(token, selectedFile, fileContent, activeAgent?.id);
      setEditMode(false);
      alert('File saved successfully');
    } catch (error) {
      logger.error('Failed to save file:', error);
      alert('Failed to save file');
    }
  };

  // File transfer functions with File System Access API
  const handleLocalFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).map(file => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      setLocalFiles(prev => [...prev, ...files]);
    }
  };

  // Use File System Access API for resumeable transfers
  const selectLocalDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        directoryHandle.current = await (window as any).showDirectoryPicker();
        setTransferStatus(`✓ Connected to local directory`);
        setTimeout(() => setTransferStatus(null), 3000);
      } else {
        setTransferStatus('⚠ Directory access not supported in this browser');
      }
    } catch (err) {
      logger.error('Directory picker cancelled or failed:', err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
      const files = Array.from(e.dataTransfer.files).map(file => ({
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      }));
      setLocalFiles(prev => [...prev, ...files]);
    }
  };

  const removeLocalFile = (id: string) => {
    setLocalFiles(prev => prev.filter(f => f.id !== id));
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
      delete abortControllers.current[id];
    }
  };

  const uploadFileToServer = async (fileItem: {file: File; id: string}, startByte: number = 0) => {
    if (!token) return;
    
    const { file, id } = fileItem;
    const chunkSize = 1024 * 1024; // 1MB chunks for resumeable upload
    let offset = startByte;
    
    // Create abort controller for this upload
    abortControllers.current[id] = new AbortController();
    
    setUploadProgress(prev => ({ 
      ...prev, 
      [id]: { progress: Math.round((offset / file.size) * 100), status: 'uploading', bytesTransferred: offset }
    }));
    setTransferStatus(`↑ Injecting ${file.name}...`);
    
    try {
      while (offset < file.size) {
        // Check if paused
        if (pausedUploads.has(id)) {
          setUploadProgress(prev => ({ 
            ...prev, 
            [id]: { ...prev[id], status: 'paused' }
          }));
          return;
        }
        
        const chunk = file.slice(offset, offset + chunkSize);
        const reader = new FileReader();
        
        const base64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(chunk);
        });
        
        const response = await fetch(`/api/v1/host/filesystem/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            path: currentPath,
            content: base64,
            filename: file.name,
            offset: offset,
            total_size: file.size,
            is_chunk: file.size > chunkSize
          }),
          signal: abortControllers.current[id]?.signal
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        offset += chunk.size;
        const progress = Math.round((offset / file.size) * 100);
        
        setUploadProgress(prev => ({ 
          ...prev, 
          [id]: { progress, status: 'uploading', bytesTransferred: offset }
        }));
      }
      
      setUploadProgress(prev => ({ 
        ...prev, 
        [id]: { progress: 100, status: 'completed', bytesTransferred: file.size }
      }));
      setTransferStatus(`✓ Injected ${file.name}`);
      setLocalFiles(prev => prev.filter(f => f.id !== id));
      browseDirectory(currentPath);
      
      setTimeout(() => {
        setTransferStatus(null);
        setUploadProgress(prev => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }, 3000);
      
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setUploadProgress(prev => ({ 
          ...prev, 
          [id]: { ...prev[id], status: 'paused' }
        }));
      } else {
        logger.error('Upload failed:', error);
        setUploadProgress(prev => ({ 
          ...prev, 
          [id]: { ...prev[id], status: 'failed' }
        }));
        setTransferStatus(`✗ Failed: ${file.name}`);
      }
    }
  };

  const pauseUpload = (id: string) => {
    setPausedUploads(prev => new Set(prev).add(id));
    if (abortControllers.current[id]) {
      abortControllers.current[id].abort();
    }
  };

  const resumeUpload = (id: string) => {
    const fileItem = localFiles.find(f => f.id === id);
    const progress = uploadProgress[id];
    if (fileItem && progress) {
      setPausedUploads(prev => {
        const updated = new Set(prev);
        updated.delete(id);
        return updated;
      });
      uploadFileToServer(fileItem, progress.bytesTransferred);
    }
  };

  const uploadAllFiles = async () => {
    for (const fileItem of localFiles) {
      const existing = uploadProgress[fileItem.id];
      if (!existing || existing.status === 'failed') {
        await uploadFileToServer(fileItem);
      } else if (existing.status === 'paused') {
        resumeUpload(fileItem.id);
      }
    }
  };

  const downloadFileFromServer = async (filePath: string) => {
    if (!token) return;
    
    const filename = filePath.split('/').pop() || 'download';
    const downloadId = `${filename}-${Date.now()}`;
    
    setDownloadProgress(prev => ({
      ...prev,
      [downloadId]: { progress: 0, status: 'downloading', bytesTransferred: 0 }
    }));
    setTransferStatus(`↓ Extracting ${filename}...`);
    
    try {
      const response = await fetch(`/api/v1/host/filesystem/download?path=${encodeURIComponent(filePath)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Decode base64 and create download
        const binaryString = atob(data.content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // If we have directory access, save directly
        if (directoryHandle.current) {
          try {
            const fileHandle = await directoryHandle.current.getFileHandle(data.filename, { create: true });
            const writable = await (fileHandle as any).createWritable();
            await writable.write(bytes);
            await writable.close();
            setTransferStatus(`✓ Saved ${data.filename} to local directory`);
          } catch (err) {
            logger.error('Direct save failed, falling back to download:', err);
            triggerBrowserDownload(bytes, data.filename);
          }
        } else {
          triggerBrowserDownload(bytes, data.filename);
        }
        
        setDownloadProgress(prev => ({
          ...prev,
          [downloadId]: { progress: 100, status: 'completed', bytesTransferred: bytes.length }
        }));
        
        setTimeout(() => {
          setTransferStatus(null);
          setDownloadProgress(prev => {
            const updated = { ...prev };
            delete updated[downloadId];
            return updated;
          });
        }, 3000);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      logger.error('Download failed:', error);
      setDownloadProgress(prev => ({
        ...prev,
        [downloadId]: { ...prev[downloadId], status: 'failed' }
      }));
      setTransferStatus(`✗ Failed to extract file`);
    }
  };

  const triggerBrowserDownload = (bytes: Uint8Array, filename: string) => {
    const blob = new Blob([bytes]);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTransferStatus(`✓ Extracted ${filename}`);
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
      {/* Error Banner */}
      {error && (
        <div className="bg-red-900/50 border border-cyber-red p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-cyber-red text-xl">⚠</span>
            <span className="text-cyber-red">{error}</span>
          </div>
          <button
            onClick={() => { setError(null); fetchSystemInfo(); }}
            className="px-4 py-2 bg-cyber-gray text-white uppercase text-sm font-bold hover:bg-cyber-gray-light transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && !systemInfo && !error && (
        <div className="bg-cyber-dark border border-cyber-gray p-8 flex items-center justify-center">
          <div className="text-cyber-green animate-pulse">Loading system information...</div>
        </div>
      )}

      {/* System Info Header */}
      {systemInfo && (
        <div className="dashboard-card p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-cyber-gray-light uppercase text-xs font-mono tracking-wider mb-1">Hostname</p>
              <p className="text-cyber-green font-mono text-sm">{systemInfo.hostname}</p>
            </div>
            <div>
              <p className="text-cyber-gray-light uppercase text-xs font-mono tracking-wider mb-1">Platform</p>
              <p className="text-cyber-green font-mono text-sm">{systemInfo.platform} {systemInfo.platform_release}</p>
            </div>
            <div>
              <p className="text-cyber-gray-light uppercase text-xs font-mono tracking-wider mb-1">Architecture</p>
              <p className="text-cyber-green font-mono text-sm">{systemInfo.architecture}</p>
            </div>
            <div>
              <p className="text-cyber-gray-light uppercase text-xs font-mono tracking-wider mb-1">Uptime</p>
              <p className="text-cyber-green font-mono text-sm">{formatUptime(systemInfo.boot_time)}</p>
            </div>
          </div>
          {systemInfo.network_interfaces && systemInfo.network_interfaces.length > 0 && (
            <div className="mt-4 pt-4 border-t border-cyber-gray/50">
              <p className="text-cyber-gray-light uppercase text-xs font-mono tracking-wider mb-2">Network Interfaces</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {systemInfo.network_interfaces.map((iface: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-cyber-purple text-xs">●</span>
                    <span className="text-cyber-blue font-mono text-xs">{iface.name}:</span>
                    <span className="text-cyber-green font-mono text-sm">{iface.address}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-2 border-b border-cyber-gray">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`px-4 py-2 uppercase text-xs font-mono tracking-wider font-medium transition-colors ${
            activeTab === 'metrics'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ⟁ System Metrics
        </button>
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 uppercase text-xs font-mono tracking-wider font-medium transition-colors ${
            activeTab === 'terminal'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ⌬ Terminal
        </button>
        <button
          onClick={() => setActiveTab('filesystem')}
          className={`px-4 py-2 uppercase text-xs font-mono tracking-wider font-medium transition-colors ${
            activeTab === 'filesystem'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ⎔ Data Vault
        </button>
        <button
          onClick={() => setActiveTab('desktop')}
          className={`px-4 py-2 uppercase text-xs font-mono tracking-wider font-medium transition-colors ${
            activeTab === 'desktop'
              ? 'text-cyber-red border-b-2 border-cyber-red'
              : 'text-cyber-gray-light hover:text-cyber-purple'
          }`}
        >
          ⬡ Desktop
        </button>
      </div>

      {/* Metrics Tab */}
      {activeTab === 'metrics' && metrics && (
        <div className="space-y-4">
          {/* Row 1: CPU, Memory, Swap */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CPU */}
            <div className="dashboard-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyber-red uppercase text-xs font-mono tracking-wider flex items-center">
                  <span className="mr-1">⬡</span> CPU
                </p>
                <p className="text-cyber-green font-mono text-sm">{metrics.cpu.percent_total.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-cyber-darker h-2 border border-cyber-gray mb-2">
                <div className="bg-cyber-red h-full transition-all" style={{ width: `${metrics.cpu.percent_total}%` }} />
              </div>
              <div className="flex flex-wrap gap-1">
                {metrics.cpu.percent_per_core.map((percent, idx) => (
                  <div key={idx} className="w-6 h-3 bg-cyber-darker border border-cyber-gray relative" title={`Core ${idx}: ${percent.toFixed(0)}%`}>
                    <div className="bg-cyber-red/70 h-full" style={{ width: `${percent}%` }} />
                  </div>
                ))}
              </div>
              <div className="text-xs text-cyber-gray-light mt-1">{metrics.cpu.core_count}C/{metrics.cpu.thread_count}T</div>
            </div>

            {/* Memory */}
            <div className="dashboard-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyber-purple uppercase text-xs font-mono tracking-wider flex items-center">
                  <span className="mr-1">⬢</span> RAM
                </p>
                <p className="text-cyber-green font-mono text-sm">{metrics.memory.percent.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-cyber-darker h-2 border border-cyber-gray mb-2">
                <div className="bg-cyber-purple h-full transition-all" style={{ width: `${metrics.memory.percent}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyber-gray-light">Used</span>
                <span className="text-cyber-green font-mono">{formatBytes(metrics.memory.used)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyber-gray-light">Total</span>
                <span className="text-cyber-green font-mono">{formatBytes(metrics.memory.total)}</span>
              </div>
            </div>

            {/* Swap */}
            <div className="dashboard-card p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-cyber-purple uppercase text-xs font-mono tracking-wider flex items-center">
                  <span className="mr-1">⇌</span> Swap
                </p>
                <p className="text-cyber-green font-mono text-sm">{metrics.memory.swap_percent.toFixed(1)}%</p>
              </div>
              <div className="w-full bg-cyber-darker h-2 border border-cyber-gray mb-2">
                <div className="bg-cyber-purple/70 h-full transition-all" style={{ width: `${metrics.memory.swap_percent}%` }} />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyber-gray-light">Used</span>
                <span className="text-cyber-green font-mono">{formatBytes(metrics.memory.swap_used)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-cyber-gray-light">Total</span>
                <span className="text-cyber-green font-mono">{formatBytes(metrics.memory.swap_total)}</span>
              </div>
            </div>
          </div>

          {/* Row 2: Network I/O, Disk I/O */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Network I/O */}
            <div className="dashboard-card p-4">
              <p className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-2 flex items-center">
                <span className="mr-1">⇄</span> Network I/O
              </p>
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <div className="text-cyber-gray-light">TX</div>
                  <div className="text-cyber-green font-mono">{formatBytes(metrics.network.bytes_sent)}</div>
                </div>
                <div>
                  <div className="text-cyber-gray-light">RX</div>
                  <div className="text-cyber-green font-mono">{formatBytes(metrics.network.bytes_recv)}</div>
                </div>
                <div>
                  <div className="text-cyber-gray-light">Pkt TX</div>
                  <div className="text-cyber-green font-mono">{(metrics.network.packets_sent / 1000).toFixed(1)}K</div>
                </div>
                <div>
                  <div className="text-cyber-gray-light">Pkt RX</div>
                  <div className="text-cyber-green font-mono">{(metrics.network.packets_recv / 1000).toFixed(1)}K</div>
                </div>
              </div>
              {(metrics.network.errin > 0 || metrics.network.errout > 0) && (
                <div className="flex gap-4 mt-2 text-xs text-cyber-red">
                  <span>Err In: {metrics.network.errin}</span>
                  <span>Err Out: {metrics.network.errout}</span>
                </div>
              )}
            </div>

            {/* Disk I/O */}
            <div className="dashboard-card p-4">
              <p className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-2 flex items-center">
                <span className="mr-1">◈</span> Disk I/O
              </p>
              {diskIO && Object.keys(diskIO).length > 0 ? (
                <div className="grid grid-cols-2 gap-2 text-xs max-h-20 overflow-y-auto">
                  {Object.entries(diskIO).slice(0, 4).map(([disk, io]) => (
                    <div key={disk} className="flex justify-between">
                      <span className="text-cyber-gray-light truncate max-w-[60px]">{disk}</span>
                      <span className="text-cyber-green font-mono">
                        R:{formatBytes(io.read_bytes)} W:{formatBytes(io.write_bytes)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-cyber-gray-light text-xs">No disk I/O data</div>
              )}
            </div>
          </div>

          {/* Row 3: Disk Space */}
          <div className="dashboard-card p-4">
            <p className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-2 flex items-center">
              <span className="mr-1">⛁</span> Disk Space
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {metrics.disk.map((disk, idx) => (
                <div key={idx} className="border border-cyber-gray/50 p-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cyber-gray-light font-mono truncate max-w-[100px]" title={disk.mountpoint}>{disk.mountpoint}</span>
                    <span className={`font-mono ${disk.percent > 90 ? 'text-cyber-red' : disk.percent > 75 ? 'text-yellow-500' : 'text-cyber-green'}`}>
                      {disk.percent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-cyber-darker h-1.5 border border-cyber-gray">
                    <div
                      className={`h-full transition-all ${disk.percent > 90 ? 'bg-cyber-red' : disk.percent > 75 ? 'bg-yellow-500' : 'bg-cyber-green'}`}
                      style={{ width: `${disk.percent}%` }}
                    />
                  </div>
                  <div className="text-xs text-cyber-gray-light mt-1">
                    {formatBytes(disk.free)} free / {formatBytes(disk.total)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 4: Top Processes and Network Connections side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Processes */}
            <div className="dashboard-card p-4">
              <p className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center"><span className="mr-1">⧫</span> Top Processes</span>
                <span className="text-cyber-gray-light font-normal">{metrics.processes} total</span>
              </p>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="border-b border-cyber-gray sticky top-0 bg-cyber-dark">
                    <tr className="text-left text-cyber-gray-light uppercase">
                      <th className="pb-1 pr-2">PID</th>
                      <th className="pb-1 pr-2">Name</th>
                      <th className="pb-1 pr-2">CPU</th>
                      <th className="pb-1">MEM</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {processes.slice(0, 10).map((proc) => (
                      <tr key={proc.pid} className="border-b border-cyber-darker/50 hover:bg-cyber-darker">
                        <td className="py-1 pr-2 text-cyber-green">{proc.pid}</td>
                        <td className="py-1 pr-2 text-cyber-purple truncate max-w-[100px]" title={proc.name}>{proc.name}</td>
                        <td className="py-1 pr-2 text-cyber-red">{proc.cpu_percent?.toFixed(1) || 0}%</td>
                        <td className="py-1 text-cyber-red">{proc.memory_percent?.toFixed(1) || 0}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Network Connections */}
            <div className="dashboard-card p-4">
              <p className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-2 flex items-center justify-between">
                <span className="flex items-center"><span className="mr-1">⌘</span> Connections</span>
                <span className="text-cyber-gray-light font-normal">{connections.length} active</span>
              </p>
              <div className="overflow-x-auto max-h-48">
                <table className="w-full text-xs">
                  <thead className="border-b border-cyber-gray sticky top-0 bg-cyber-dark">
                    <tr className="text-left text-cyber-gray-light uppercase">
                      <th className="pb-1 pr-2">Local</th>
                      <th className="pb-1 pr-2">Remote</th>
                      <th className="pb-1 pr-2">State</th>
                      <th className="pb-1">Proc</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {connections.slice(0, 10).map((conn, idx) => (
                      <tr key={idx} className="border-b border-cyber-darker/50 hover:bg-cyber-darker">
                        <td className="py-1 pr-2 text-cyber-green truncate max-w-[100px]" title={conn.local_address}>
                          {conn.local_address.split(':').pop()}
                        </td>
                        <td className="py-1 pr-2 text-cyber-purple truncate max-w-[100px]" title={conn.remote_address}>
                          {conn.remote_address === '-' ? '-' : conn.remote_address.length > 15 ? conn.remote_address.substring(0, 15) + '...' : conn.remote_address}
                        </td>
                        <td className={`py-1 pr-2 ${conn.status === 'ESTABLISHED' ? 'text-cyber-green' : conn.status === 'LISTEN' ? 'text-cyber-purple' : 'text-cyber-gray-light'}`}>
                          {conn.status.substring(0, 6)}
                        </td>
                        <td className="py-1 text-cyber-gray-light truncate max-w-[60px]" title={conn.process}>{conn.process}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Terminal Tab */}
      {activeTab === 'terminal' && (
        <div className="dashboard-card p-4">
          <p className="text-cyber-green text-xs font-mono tracking-wider mb-2 uppercase flex items-center">
            <span className="mr-2">⌬</span> Neural Interface • Shell Access
            {activeAgent && (
              <span className="ml-2 text-cyber-purple">• Agent POV: {activeAgent.name}</span>
            )}
          </p>
          <div
            ref={terminalRef}
            className="h-[600px] border border-cyber-green/50 bg-black"
          />
          <p className="text-cyber-gray-light text-xs font-mono mt-2 flex items-center">
            <span className="mr-2 text-cyber-purple">◇</span> WebSocket terminal with PTY support • ESC to detach
          </p>
        </div>
      )}

      {/* Filesystem Tab */}
      {activeTab === 'filesystem' && (
        <div className="flex flex-col h-[calc(100vh-280px)]">
          {/* Main Dual-Pane Area */}
          <div className="flex flex-1 gap-4 min-h-0">
            {/* Left Pane - Remote Files (Server) */}
            <div className="flex-1 bg-cyber-dark border border-cyber-red/30 p-4 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-cyber-red uppercase font-bold flex items-center">
                  <span className="mr-2 text-lg">⟐</span> Target Node
                </h3>
                {currentPath !== '/' && (
                  <button
                    onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/') || '/')}
                    className="text-cyber-purple hover:text-cyber-red text-sm uppercase flex items-center"
                  >
                    <span className="mr-1">⟨</span> Parent
                  </button>
                )}
              </div>
              <div className="text-cyber-red/70 text-xs font-mono mb-2 p-2 bg-cyber-darker border border-cyber-red/30 flex items-center">
                <span className="mr-2 text-cyber-red">⌁</span> {currentPath}
              </div>
              <div className="flex-1 overflow-y-auto space-y-1">
                {/* Check if first item is POV instructions */}
                {fileItems.length > 0 && fileItems[0].type === 'instructions' ? (
                  <div className="space-y-3">
                    {fileItems[0].instructions?.map((instruction, idx) => (
                      <div key={idx} className={`p-3 border ${
                        instruction.type === 'success' ? 'border-cyber-green bg-cyber-green/10' :
                        instruction.type === 'header' ? 'border-cyber-purple bg-cyber-purple/10' :
                        instruction.type === 'command' ? 'border-cyber-blue/50 bg-cyber-darker' :
                        instruction.type === 'target' ? 'border-cyber-gray/50 bg-cyber-darker' :
                        instruction.type === 'warning' ? 'border-cyber-yellow bg-cyber-yellow/10' :
                        instruction.type === 'error' ? 'border-cyber-red bg-cyber-red/10' :
                        'border-cyber-gray/30 bg-cyber-darker'
                      }`}>
                        <div className={`font-mono text-sm ${
                          instruction.type === 'success' ? 'text-cyber-green' :
                          instruction.type === 'header' ? 'text-cyber-purple font-bold uppercase' :
                          instruction.type === 'command' ? 'text-cyber-blue' :
                          instruction.type === 'target' ? 'text-cyber-green' :
                          instruction.type === 'warning' ? 'text-cyber-yellow' :
                          instruction.type === 'error' ? 'text-cyber-red' :
                          'text-cyber-gray-light'
                        }`}>
                          {instruction.title}
                        </div>
                        {instruction.detail && (
                          <div className={`mt-1 font-mono text-xs ${
                            instruction.type === 'command' ? 'text-cyber-green bg-black/50 p-2 rounded select-all' :
                            'text-cyber-gray-light'
                          }`}>
                            {instruction.detail}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Regular file items */
                  fileItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      if (item.type === 'directory') {
                        setCurrentPath(item.path);
                      } else {
                        setSelectedRemoteFile(item.path);
                      }
                    }}
                    onDoubleClick={() => handleFileClick(item)}
                    className={`w-full text-left px-3 py-2 border transition-colors group ${
                      selectedRemoteFile === item.path ? 'border-cyber-green bg-cyber-green/10' :
                      item.type === 'directory'
                        ? 'border-cyber-red/30 hover:bg-cyber-red/10 hover:border-cyber-red'
                        : 'border-cyber-gray/50 hover:bg-cyber-darker hover:border-cyber-green'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {item.type === 'directory' ? (
                          <span className="text-cyber-red group-hover:text-cyber-purple">⊞</span>
                        ) : (
                          <span className="text-cyber-green group-hover:text-cyber-purple">◇</span>
                        )}
                        <span className={`font-mono text-sm truncate ${item.type === 'directory' ? 'text-cyber-red group-hover:text-cyber-purple' : 'text-cyber-green group-hover:text-cyber-purple'} transition-colors`}>
                          {item.name}
                        </span>
                      </div>
                      <div className="text-xs text-cyber-gray-light ml-2 flex-shrink-0">
                        {item.type === 'file' && item.size !== undefined && formatBytes(item.size)}
                      </div>
                    </div>
                    {item.error && (
                      <div className="text-xs text-cyber-red mt-1">⚠ {item.error}</div>
                    )}
                  </button>
                ))
                )}
              </div>
            </div>

            {/* Transfer Buttons */}
            <div className="flex flex-col items-center justify-center space-y-4 px-3">
              <div className="text-cyber-gray-light text-xs uppercase mb-2">Data Link</div>
              <button
                onClick={() => selectedRemoteFile && downloadFileFromServer(selectedRemoteFile)}
                disabled={!selectedRemoteFile}
                className="px-4 py-3 bg-cyber-green/20 border border-cyber-green text-cyber-green uppercase text-xs font-bold hover:bg-cyber-green hover:text-black disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
                title="Extract from target"
              >
                <span>⇶</span>
                <span>Extract</span>
              </button>
              <div className="h-8 border-l border-cyber-gray/50"></div>
              <button
                onClick={uploadAllFiles}
                disabled={localFiles.length === 0}
                className="px-4 py-3 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple uppercase text-xs font-bold hover:bg-cyber-purple hover:text-white disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-2 transition-all"
                title="Inject to target"
              >
                <span>⇷</span>
                <span>Inject</span>
              </button>
            </div>

            {/* Right Pane - Local Files (Operator) */}
            <div className="flex-1 bg-cyber-dark border border-cyber-green/30 p-4 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-cyber-green uppercase font-bold flex items-center">
                  <span className="mr-2 text-lg">⎔</span> Operator Storage
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={selectLocalDirectory}
                    className="px-3 py-1 bg-cyber-purple/20 border border-cyber-purple text-cyber-purple uppercase text-xs font-bold hover:bg-cyber-purple hover:text-white transition-all"
                    title="Link local directory for resumeable transfers"
                  >
                    ⚭ Link Dir
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-3 py-1 bg-cyber-green/20 border border-cyber-green text-cyber-green uppercase text-xs font-bold hover:bg-cyber-green hover:text-black transition-all"
                  >
                    ⊕ Load Data
                  </button>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleLocalFileSelect}
                className="hidden"
              />
              
              {directoryHandle.current && (
                <div className="mb-2 px-2 py-1 bg-cyber-purple/10 border border-cyber-purple/30 text-xs text-cyber-purple flex items-center">
                  <span className="mr-2">⚭</span> Linked: {directoryHandle.current.name}
                </div>
              )}
              
              <div 
                className="flex-1 overflow-y-auto border border-dashed border-cyber-green/30 p-2 min-h-[200px] relative"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                {localFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-cyber-gray-light">
                    <span className="text-4xl mb-3 text-cyber-green/50">⬡</span>
                    <span className="text-sm uppercase">Drop Zone Active</span>
                    <span className="text-xs text-cyber-gray mt-1">Drag files or click "Load Data"</span>
                    <div className="mt-4 flex items-center space-x-2 text-xs">
                      <span className="text-cyber-green">◇</span>
                      <span className="text-cyber-gray">Awaiting payload...</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {localFiles.map((fileItem) => {
                      const progress = uploadProgress[fileItem.id];
                      return (
                        <div key={fileItem.id} className="flex flex-col px-3 py-2 border border-cyber-green/50 bg-cyber-green/5 group hover:bg-cyber-green/10 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <span className={`${progress?.status === 'uploading' ? 'animate-pulse' : ''} ${progress?.status === 'completed' ? 'text-cyber-green' : progress?.status === 'failed' ? 'text-cyber-red' : 'text-cyber-green'}`}>
                                {progress?.status === 'uploading' ? '⟳' : progress?.status === 'completed' ? '✓' : progress?.status === 'failed' ? '✗' : progress?.status === 'paused' ? '⏸' : '◈'}
                              </span>
                              <span className="font-mono text-sm text-cyber-green truncate">{fileItem.file.name}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-cyber-gray-light font-mono">{formatBytes(fileItem.file.size)}</span>
                              {progress?.status === 'uploading' && (
                                <button 
                                  onClick={() => pauseUpload(fileItem.id)}
                                  className="text-cyber-yellow hover:text-yellow-400 text-xs"
                                  title="Pause"
                                >
                                  ⏸
                                </button>
                              )}
                              {progress?.status === 'paused' && (
                                <button 
                                  onClick={() => resumeUpload(fileItem.id)}
                                  className="text-cyber-green hover:text-green-400 text-xs"
                                  title="Resume"
                                >
                                  ▶
                                </button>
                              )}
                              <button 
                                onClick={() => removeLocalFile(fileItem.id)}
                                className="text-cyber-red hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                ⊗
                              </button>
                            </div>
                          </div>
                          {progress && progress.status !== 'completed' && (
                            <div className="mt-2 flex items-center space-x-2">
                              <div className="flex-1 bg-cyber-darker h-1 border border-cyber-green/30">
                                <div 
                                  className={`h-full transition-all ${progress.status === 'failed' ? 'bg-cyber-red' : progress.status === 'paused' ? 'bg-cyber-yellow' : 'bg-gradient-to-r from-cyber-green to-cyber-purple'}`} 
                                  style={{ width: `${progress.progress}%` }} 
                                />
                              </div>
                              <span className="text-xs text-cyber-gray-light font-mono w-12 text-right">{progress.progress}%</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Transfer Status */}
          <div className="mt-4 bg-cyber-dark border border-cyber-purple/30 p-3">
            <div className="flex items-center justify-between">
              <h4 className="text-cyber-purple uppercase text-xs font-bold flex items-center">
                <span className="mr-2">⚡</span> Transfer Matrix
              </h4>
              {transferStatus && (
                <span className={`text-sm font-mono flex items-center ${transferStatus.includes('✓') ? 'text-cyber-green' : transferStatus.includes('✗') ? 'text-cyber-red' : 'text-cyber-purple'}`}>
                  {transferStatus}
                </span>
              )}
            </div>
            {(Object.entries(uploadProgress).length > 0 || Object.entries(downloadProgress).length > 0) && (
              <div className="mt-2 space-y-1">
                {Object.entries(uploadProgress).filter(([_, p]) => p.status !== 'completed').map(([id, progress]) => {
                  const fileItem = localFiles.find(f => f.id === id);
                  return (
                    <div key={id} className="flex items-center space-x-2">
                      <span className={`${progress.status === 'uploading' ? 'text-cyber-purple animate-pulse' : progress.status === 'paused' ? 'text-cyber-yellow' : 'text-cyber-red'}`}>
                        {progress.status === 'uploading' ? '⟳' : progress.status === 'paused' ? '⏸' : '✗'}
                      </span>
                      <span className="text-xs text-cyber-gray-light">↑</span>
                      <span className="text-xs text-cyber-gray-light font-mono truncate w-40">{fileItem?.file.name || id}</span>
                      <div className="flex-1 bg-cyber-darker h-2 border border-cyber-purple/30">
                        <div className={`h-full transition-all ${progress.status === 'failed' ? 'bg-cyber-red' : 'bg-gradient-to-r from-cyber-purple to-cyber-green'}`} style={{ width: `${progress.progress}%` }} />
                      </div>
                      <span className="text-xs text-cyber-green font-mono w-16 text-right">{formatBytes(progress.bytesTransferred)}</span>
                    </div>
                  );
                })}
                {Object.entries(downloadProgress).filter(([_, p]) => p.status !== 'completed').map(([id, progress]) => (
                  <div key={id} className="flex items-center space-x-2">
                    <span className={`${progress.status === 'downloading' ? 'text-cyber-green animate-pulse' : 'text-cyber-red'}`}>
                      {progress.status === 'downloading' ? '⟳' : '✗'}
                    </span>
                    <span className="text-xs text-cyber-gray-light">↓</span>
                    <span className="text-xs text-cyber-gray-light font-mono truncate w-40">{id}</span>
                    <div className="flex-1 bg-cyber-darker h-2 border border-cyber-green/30">
                      <div className={`h-full transition-all ${progress.status === 'failed' ? 'bg-cyber-red' : 'bg-gradient-to-r from-cyber-green to-cyber-purple'}`} style={{ width: `${progress.progress}%` }} />
                    </div>
                    <span className="text-xs text-cyber-green font-mono w-16 text-right">{formatBytes(progress.bytesTransferred)}</span>
                  </div>
                ))}
              </div>
            )}
            {!transferStatus && Object.entries(uploadProgress).length === 0 && Object.entries(downloadProgress).length === 0 && (
              <div className="mt-2 text-xs text-cyber-gray-light flex items-center">
                <span className="mr-2 text-cyber-purple/50">◌</span> No active transfers • Select files to inject or extract data
              </div>
            )}
          </div>
        </div>
      )}

      {/* File Editor Sidebar */}
      {selectedFile && (
        <div className="fixed top-0 right-0 h-full w-[500px] bg-cyber-dark border-l border-cyber-gray shadow-2xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-cyber-purple/30">
            <h3 className="text-cyber-purple uppercase font-bold flex items-center">
              <span className="mr-2">⧫</span> Data Editor
            </h3>
            <button
              onClick={() => { setSelectedFile(null); setEditMode(false); }}
              className="text-cyber-gray-light hover:text-cyber-red text-xl"
            >
              ✕
            </button>
          </div>
          <div className="p-4 border-b border-cyber-gray">
            <div className="text-cyber-gray-light text-xs font-mono p-2 bg-cyber-darker border border-cyber-gray truncate">
              {selectedFile}
            </div>
          </div>
          <div className="flex-1 p-4 flex flex-col min-h-0">
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              readOnly={!editMode}
              className={`flex-1 bg-cyber-darker border border-cyber-gray p-3 text-cyber-green font-mono text-sm ${
                editMode ? '' : 'cursor-not-allowed'
              }`}
              style={{ resize: 'none' }}
            />
          </div>
          <div className="p-4 border-t border-cyber-gray flex justify-end space-x-2">
            {editMode ? (
              <>
                <button
                  onClick={handleSaveFile}
                  className="px-4 py-2 bg-cyber-green text-black uppercase text-sm font-bold hover:bg-opacity-80"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 bg-cyber-red text-white uppercase text-sm font-bold hover:bg-opacity-80"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => selectedFile && downloadFileFromServer(selectedFile)}
                  className="px-4 py-2 bg-cyber-purple text-white uppercase text-sm font-bold hover:bg-opacity-80"
                >
                  Download
                </button>
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-cyber-green text-black uppercase text-sm font-bold hover:bg-opacity-80"
                >
                  Edit
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Desktop Tab */}
      {activeTab === 'desktop' && (
        <div className="dashboard-card p-4">
          <div className="mb-4">
            <h3 className="text-cyber-red uppercase text-xs font-mono tracking-wider mb-3 flex items-center">
              <span className="mr-2">⬡</span> Remote Desktop Access
            </h3>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setDesktopProtocol('vnc');
                  setDesktopConnectionTab({
                    id: `desktop-vnc-${Date.now()}`,
                    protocol: 'vnc' as Protocol,
                    ip: 'localhost',
                    port: 5900,
                    status: 'disconnected' as const,
                    credentials: null,
                  });
                }}
                className={`px-6 py-3 uppercase text-xs font-mono tracking-wider font-bold transition-all ${
                  desktopProtocol === 'vnc' && desktopConnectionTab
                    ? 'bg-cyber-green text-black'
                    : 'bg-cyber-darker border border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black'
                }`}
              >
                ◉ VNC
              </button>
              <button
                onClick={() => {
                  setDesktopProtocol('rdp');
                  setDesktopConnectionTab({
                    id: `desktop-rdp-${Date.now()}`,
                    protocol: 'rdp' as Protocol,
                    ip: 'localhost',
                    port: 3389,
                    status: 'disconnected' as const,
                    credentials: null,
                  });
                }}
                className={`px-6 py-3 uppercase text-xs font-mono tracking-wider font-bold transition-all ${
                  desktopProtocol === 'rdp' && desktopConnectionTab
                    ? 'bg-cyber-blue text-black'
                    : 'bg-cyber-darker border border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black'
                }`}
              >
                ◉ RDP
              </button>
              {desktopConnectionTab && (
                <button
                  onClick={() => setDesktopConnectionTab(null)}
                  className="px-6 py-3 uppercase text-xs font-mono tracking-wider font-bold bg-cyber-darker border border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black transition-all"
                >
                  ✕ Disconnect
                </button>
              )}
            </div>
          </div>
          
          {desktopConnectionTab ? (
            <div className="border border-cyber-gray bg-cyber-black min-h-[600px]">
              <ProtocolConnection tab={desktopConnectionTab} />
            </div>
          ) : (
            <div className="border border-cyber-gray bg-cyber-black min-h-[600px] flex items-center justify-center">
              <div className="text-center text-cyber-gray-light">
                <div className="text-6xl mb-4">◉</div>
                <p className="text-sm font-mono uppercase tracking-wider mb-2">Host Desktop Access</p>
                <p className="text-xs font-mono">
                  Click VNC or RDP above to connect to the host
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Host;
