import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';

interface Packet {
  id: string;
  timestamp: number;
  length: number;
  protocol: string;
  source: string;
  destination: string;
  summary: string;
  info: string;
  raw: string;
}

interface Stream {
  id: string;
  source: string;
  destination: string;
  protocol: string;
  packetCount: number;
  byteCount: number;
  lastSeen: number;
}

interface PingResult {
  seq: number;
  status: string;
  time_ms?: number;
  http_code?: string;
  error?: string;
  note?: string;
}

interface PingResponse {
  protocol: string;
  target: string;
  port?: number;
  count?: number;
  successful?: number;
  failed?: number;
  packet_loss?: number;
  min_ms?: number;
  max_ms?: number;
  avg_ms?: number;
  results?: PingResult[];
  raw_output?: string;
  transmitted?: number;
  received?: number;
  timestamp: string;
  error?: string;
  note?: string;
}

interface Interface {
  name: string;
  ip: string;
  activity: number[];
}

const Sparkline = ({ data, width = 60, height = 20, color = '#00f0ff' }: { data: number[], width?: number, height?: number, color?: string }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data, 1);
  const step = width / (data.length - 1 || 1);
  const points = data.map((val, i) => `${i * step},${height - (val / max) * height}`).join(' ');
  return (
    <svg width={width} height={height} className="overflow-visible">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const Traffic: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'capture' | 'ping'>('capture');
  const [packets, setPackets] = useState<Packet[]>([]);
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [isInterfaceListOpen, setIsInterfaceListOpen] = useState(false);
  const [isSniffing, setIsSniffing] = useState(false);
  const [filter, setFilter] = useState('');
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Ping state
  const [pingTarget, setPingTarget] = useState('');
  const [pingProtocol, setPingProtocol] = useState('icmp');
  const [pingPort, setPingPort] = useState('80');
  const [pingCount, setPingCount] = useState('4');
  const [pingTimeout, setPingTimeout] = useState('5');
  const [pingPacketSize, setPingPacketSize] = useState('56');
  const [pingUseHttps, setPingUseHttps] = useState(false);
  const [pingInProgress, setPingInProgress] = useState(false);
  const [pingResults, setPingResults] = useState<PingResponse | null>(null);
  const [pingError, setPingError] = useState<string>('');
  
  const wsRef = useRef<WebSocket | null>(null);
  const packetListEndRef = useRef<HTMLDivElement>(null);
  const { token } = useAuthStore();

  useEffect(() => {
    fetchInterfaces();
    const interval = setInterval(fetchInterfaces, 1000); // Poll interfaces every second
    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (packetListEndRef.current && !selectedPacket) {
      packetListEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [packets, selectedPacket]);

  useEffect(() => {
    if (interfaces.length > 0 && !selectedIface) {
      setSelectedIface(interfaces[0].name);
    }
  }, [interfaces, selectedIface]);

  const fetchInterfaces = async () => {
    try {
      const response = await fetch(`/api/v1/traffic/interfaces`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setInterfaces(data);
    } catch (err) {
      console.error('Failed to fetch interfaces:', err);
    }
  };

  const toggleSniffing = () => {
    if (isSniffing) {
      if (wsRef.current) wsRef.current.close();
      setIsSniffing(false);
    } else {
      setPackets([]);
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      const ws = new WebSocket(`${protocol}//${host}/api/v1/traffic/ws`);

      ws.onopen = () => {
        ws.send(JSON.stringify({ interface: selectedIface, filter }));
        setIsSniffing(true);
      };

      ws.onmessage = (event) => {
        const packet = JSON.parse(event.data);
        setPackets(prev => [...prev.slice(-499), packet]);
      };

      ws.onclose = () => setIsSniffing(false);
      ws.onerror = (err) => console.error('WS Error:', err);
      wsRef.current = ws;
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`/api/v1/traffic/export`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'capture.pcap';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const streams = useMemo(() => {
    const streamMap: Record<string, Stream> = {};
    packets.forEach(p => {
      const id = [p.source, p.destination, p.protocol].sort().join('|');
      if (!streamMap[id]) {
        streamMap[id] = {
          id,
          source: p.source,
          destination: p.destination,
          protocol: p.protocol,
          packetCount: 0,
          byteCount: 0,
          lastSeen: 0
        };
      }
      streamMap[id].packetCount++;
      streamMap[id].byteCount += p.length;
      streamMap[id].lastSeen = Math.max(streamMap[id].lastSeen, p.timestamp);
    });
    return Object.values(streamMap).sort((a, b) => b.lastSeen - a.lastSeen);
  }, [packets]);

  const getProtocolColor = (proto: string) => {
    switch (proto) {
      case 'TCP': return 'text-cyber-blue';
      case 'UDP': return 'text-cyber-purple';
      case 'ARP': return 'text-cyber-yellow';
      case 'HTTP': return 'text-cyber-green';
      case 'DNS': return 'text-cyber-cyan';
      default: return 'text-cyber-gray-light';
    }
  };

  const formatHex = (hex: string) => {
    if (!hex) return '';
    let result = '';
    for (let i = 0; i < hex.length; i += 32) {
      const chunk = hex.substring(i, i + 32);
      const offset = (i / 2).toString(16).padStart(4, '0');
      let hexPart = '';
      let asciiPart = '';
      for (let j = 0; j < chunk.length; j += 2) {
        const byte = chunk.substring(j, j + 2);
        hexPart += byte + ' ';
        const charCode = parseInt(byte, 16);
        asciiPart += (charCode >= 32 && charCode <= 126) ? String.fromCharCode(charCode) : '.';
      }
      result += `${offset}  ${hexPart.padEnd(48, ' ')}  ${asciiPart}\n`;
    }
    return result;
  };

  const handlePing = async () => {
    if (!pingTarget) {
      setPingError('Please enter a target IP or hostname');
      return;
    }

    setPingError('');
    setPingInProgress(true);
    setPingResults(null);

    try {
      const requestBody = {
        target: pingTarget,
        protocol: pingProtocol,
        count: parseInt(pingCount),
        timeout: parseInt(pingTimeout),
        packet_size: parseInt(pingPacketSize),
      };

      if (pingProtocol !== 'icmp' && pingPort) {
        requestBody.port = parseInt(pingPort);
      }

      if (pingProtocol === 'http') {
        requestBody.use_https = pingUseHttps;
      }

      const response = await fetch('/api/v1/traffic/ping', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Ping failed');
      }

      const result = await response.json();
      setPingResults(result);
    } catch (err: any) {
      setPingResults({
        error: err.message || 'Failed to perform ping',
        protocol: pingProtocol,
        target: pingTarget,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setPingInProgress(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 bg-cyber-darker p-2 border border-cyber-gray">
        <button
          onClick={() => setActiveTab('capture')}
          className={`px-6 py-2 font-bold uppercase text-xs transition-all ${
            activeTab === 'capture'
              ? 'bg-cyber-blue text-black border-2 border-cyber-blue'
              : 'border-2 border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue'
          }`}
        >
          Packet Capture
        </button>
        <button
          onClick={() => setActiveTab('ping')}
          className={`px-6 py-2 font-bold uppercase text-xs transition-all ${
            activeTab === 'ping'
              ? 'bg-cyber-green text-black border-2 border-cyber-green'
              : 'border-2 border-cyber-gray text-cyber-gray-light hover:border-cyber-green hover:text-cyber-green'
          }`}
        >
          Advanced Ping
        </button>
      </div>

      {/* Capture Tab Content */}
      {activeTab === 'capture' && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-4 bg-cyber-darker p-4 border border-cyber-gray">
        <div className="flex items-center space-x-2 relative">
          <label className="text-xs text-cyber-purple font-bold uppercase">Interface:</label>
          <div className="relative">
            <button
              onClick={() => !isSniffing && setIsInterfaceListOpen(!isInterfaceListOpen)}
              disabled={isSniffing}
              className={`bg-cyber-dark border border-cyber-gray text-cyber-blue text-xs p-1 min-w-[200px] text-left flex justify-between items-center ${isSniffing ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyber-blue'}`}
            >
              <span>{selectedIface || 'Select Interface'}</span>
              <span className="text-[10px]">▼</span>
            </button>
            
            {isInterfaceListOpen && (
              <div className="absolute top-full left-0 mt-1 w-[300px] bg-cyber-darker border border-cyber-blue z-50 shadow-xl max-h-[400px] overflow-y-auto">
                {interfaces.map(iface => (
                  <div
                    key={iface.name}
                    onClick={() => {
                      setSelectedIface(iface.name);
                      setIsInterfaceListOpen(false);
                    }}
                    className={`p-2 hover:bg-cyber-blue/10 cursor-pointer border-b border-cyber-gray/30 flex items-center justify-between ${selectedIface === iface.name ? 'bg-cyber-blue/20' : ''}`}
                  >
                    <div className="flex flex-col">
                      <span className="text-cyber-blue font-bold text-xs">{iface.name}</span>
                      <span className="text-cyber-gray-light text-[10px]">{iface.ip}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Sparkline data={iface.activity} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex items-center space-x-2">
          <label className="text-xs text-cyber-purple font-bold uppercase">Filter:</label>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="e.g. tcp port 80"
            disabled={isSniffing}
            className="flex-1 bg-cyber-dark border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-red font-mono"
          />
        </div>

        <button
          onClick={toggleSniffing}
          className={`px-6 py-1 border-2 font-bold uppercase tracking-widest text-xs transition-all ${
            isSniffing
              ? 'border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white'
              : 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black'
          }`}
        >
          {isSniffing ? 'Stop Capture' : 'Start Capture'}
        </button>

        <button 
          onClick={handleExport}
          disabled={isExporting || packets.length === 0}
          className="px-4 py-1 border border-cyber-gray text-cyber-gray-light text-xs uppercase hover:border-cyber-blue hover:text-cyber-blue disabled:opacity-50"
        >
          {isExporting ? 'Exporting...' : 'Export PCAP'}
        </button>
      </div>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Upper Part: Streams */}
        <div className="h-1/3 bg-cyber-dark border border-cyber-gray flex flex-col min-h-0">
          <div className="bg-cyber-darker px-4 py-1 border-b border-cyber-gray flex justify-between items-center">
            <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">Active Streams</span>
            <span className="text-[10px] text-cyber-gray-light opacity-50">{streams.length} Conversations</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="min-w-full text-[10px] font-mono">
              <thead className="bg-cyber-darker sticky top-0">
                <tr className="text-cyber-gray-light uppercase">
                  <th className="px-4 py-2 text-left">Source</th>
                  <th className="px-4 py-2 text-left">Destination</th>
                  <th className="px-4 py-2 text-left">Protocol</th>
                  <th className="px-4 py-2 text-right">Packets</th>
                  <th className="px-4 py-2 text-right">Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-gray/30">
                {streams.map((stream) => (
                  <tr key={stream.id} className="hover:bg-cyber-blue/10 transition-colors">
                    <td className="px-4 py-1 text-cyber-blue">{stream.source}</td>
                    <td className="px-4 py-1 text-cyber-red">{stream.destination}</td>
                    <td className="px-4 py-1">{stream.protocol}</td>
                    <td className="px-4 py-1 text-right">{stream.packetCount}</td>
                    <td className="px-4 py-1 text-right">{(stream.byteCount / 1024).toFixed(2)} KB</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lower Part: Live Traffic */}
        <div className="flex-1 bg-black border border-cyber-gray flex flex-col min-h-0">
          <div className="bg-cyber-darker px-4 py-1 border-b border-cyber-gray flex justify-between items-center">
            <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">Live Packet Capture</span>
            <span className="text-[10px] text-cyber-gray-light opacity-50">{packets.length} Packets in Buffer</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px]">
            <table className="min-w-full">
              <thead className="bg-cyber-darker sticky top-0">
                <tr className="text-cyber-gray-light uppercase">
                  <th className="px-4 py-2 text-left w-24">Time</th>
                  <th className="px-4 py-2 text-left w-32">Source</th>
                  <th className="px-4 py-2 text-left w-32">Destination</th>
                  <th className="px-4 py-2 text-left w-16">Proto</th>
                  <th className="px-4 py-2 text-left w-16">Len</th>
                  <th className="px-4 py-2 text-left">Info</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((p, i) => (
                  <tr
                    key={p.id || i}
                    onClick={() => setSelectedPacket(p)}
                    className={`hover:bg-cyber-gray/20 cursor-pointer transition-colors ${selectedPacket === p ? 'bg-cyber-blue/20' : ''}`}
                  >
                    <td className="px-4 py-0.5 text-cyber-gray-light opacity-60">{new Date(p.timestamp * 1000).toLocaleTimeString()}</td>
                    <td className="px-4 py-0.5 text-cyber-blue truncate max-w-[128px]">{p.source}</td>
                    <td className="px-4 py-0.5 text-cyber-red truncate max-w-[128px]">{p.destination}</td>
                    <td className={`px-4 py-0.5 font-bold ${getProtocolColor(p.protocol)}`}>{p.protocol}</td>
                    <td className="px-4 py-0.5 text-cyber-gray-light">{p.length}</td>
                    <td className="px-4 py-0.5 text-cyber-gray-light truncate">{p.info || p.summary}</td>
                  </tr>
                ))}
                <div ref={packetListEndRef} />
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Ping Tab Content */}
      {activeTab === 'ping' && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          {/* Upper Part: Advanced Ping Configuration */}
          <div className="h-1/2 bg-cyber-dark border border-cyber-gray flex flex-col min-h-0">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
              <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">Advanced Ping Configuration</span>
            </div>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              <div className="max-w-4xl space-y-6">
                {/* Target Input */}
                <div className="space-y-2">
                  <label className="text-xs text-cyber-blue font-bold uppercase">Target IP/Hostname</label>
                  <input
                    type="text"
                    value={pingTarget}
                    onChange={(e) => {
                      setPingTarget(e.target.value);
                      setPingError('');
                    }}
                    placeholder="e.g. 192.168.1.1 or example.com"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                  />
                  {pingError && (
                    <p className="text-cyber-red text-xs mt-1">⚠ {pingError}</p>
                  )}
                </div>

                {/* Protocol Selection */}
                <div className="space-y-2">
                  <label className="text-xs text-cyber-blue font-bold uppercase">Protocol</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['icmp', 'tcp', 'udp', 'http'].map((proto) => (
                      <button
                        key={proto}
                        onClick={() => setPingProtocol(proto)}
                        className={`px-4 py-2 border-2 font-bold uppercase text-xs transition-all ${
                          pingProtocol === proto
                            ? 'bg-cyber-green text-black border-cyber-green'
                            : 'border-cyber-gray text-cyber-gray-light hover:border-cyber-green hover:text-cyber-green'
                        }`}
                      >
                        {proto.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Port (for TCP/UDP/HTTP) */}
                {(pingProtocol === 'tcp' || pingProtocol === 'udp' || pingProtocol === 'http') && (
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-blue font-bold uppercase">Port</label>
                    <input
                      type="number"
                      value={pingPort}
                      onChange={(e) => setPingPort(e.target.value)}
                      placeholder="80"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                    />
                  </div>
                )}

                {/* HTTPS Toggle (for HTTP) */}
                {pingProtocol === 'http' && (
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="use-https"
                      checked={pingUseHttps}
                      onChange={(e) => setPingUseHttps(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <label htmlFor="use-https" className="text-xs text-cyber-blue font-bold uppercase">Use HTTPS</label>
                  </div>
                )}

                {/* Advanced Options */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-blue font-bold uppercase">Count</label>
                    <input
                      type="number"
                      value={pingCount}
                      onChange={(e) => setPingCount(e.target.value)}
                      min="1"
                      max="100"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-blue font-bold uppercase">Timeout (s)</label>
                    <input
                      type="number"
                      value={pingTimeout}
                      onChange={(e) => setPingTimeout(e.target.value)}
                      min="1"
                      max="30"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                    />
                  </div>
                  {pingProtocol === 'icmp' && (
                    <div className="space-y-2">
                      <label className="text-xs text-cyber-blue font-bold uppercase">Packet Size</label>
                      <input
                        type="number"
                        value={pingPacketSize}
                        onChange={(e) => setPingPacketSize(e.target.value)}
                        min="1"
                        max="65500"
                        className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Execute Button */}
                <div className="pt-4">
                  <button
                    onClick={handlePing}
                    disabled={pingInProgress}
                    className={`px-8 py-3 border-2 font-bold uppercase tracking-widest text-sm transition-all ${
                      pingInProgress
                        ? 'border-cyber-gray text-cyber-gray opacity-50 cursor-not-allowed'
                        : 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black'
                    }`}
                  >
                    {pingInProgress ? 'Pinging...' : 'Execute Ping'}
                  </button>
                </div>

                {/* Info Box */}
                <div className="bg-cyber-darker border border-cyber-blue/30 p-4">
                  <h4 className="text-xs text-cyber-blue font-bold uppercase mb-2">Protocol Information</h4>
                  <div className="text-[10px] text-cyber-gray-light space-y-1 font-mono">
                    {pingProtocol === 'icmp' && (
                      <>
                        <p>• Standard ICMP echo request/reply</p>
                        <p>• Commonly blocked by firewalls</p>
                        <p>• Best for basic connectivity testing</p>
                      </>
                    )}
                    {pingProtocol === 'tcp' && (
                      <>
                        <p>• Tests TCP port connectivity</p>
                        <p>• Can bypass ICMP filters</p>
                        <p>• Useful for testing specific services</p>
                      </>
                    )}
                    {pingProtocol === 'udp' && (
                      <>
                        <p>• Sends UDP packets to target port</p>
                        <p>• Connectionless protocol</p>
                        <p>• No acknowledgment expected</p>
                      </>
                    )}
                    {pingProtocol === 'http' && (
                      <>
                        <p>• HTTP/HTTPS request to web server</p>
                        <p>• Tests web service availability</p>
                        <p>• Returns HTTP status codes</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Part: Ping Response */}
          <div className="flex-1 bg-black border border-cyber-gray flex flex-col min-h-0">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray flex justify-between items-center">
              <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">Ping Response</span>
              {pingResults && !pingResults.error && (
                <span className="text-[10px] text-cyber-green">
                  {pingResults.packet_loss !== undefined 
                    ? `Loss: ${pingResults.packet_loss}%`
                    : 'Completed'}
                </span>
              )}
            </div>
            <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
              {!pingResults && !pingInProgress && (
                <div className="flex items-center justify-center h-full">
                  <p className="text-cyber-gray-light text-sm opacity-50">Configure and execute ping to see results here</p>
                </div>
              )}

              {pingInProgress && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="text-cyber-green text-4xl animate-pulse">⟳</div>
                    <p className="text-cyber-green text-sm">Executing ping...</p>
                  </div>
                </div>
              )}

              {pingResults && (
                <div className="space-y-4 font-mono text-xs">
                  {/* Error Display */}
                  {pingResults.error && (
                    <div className="bg-cyber-red/10 border border-cyber-red p-4">
                      <h4 className="text-cyber-red font-bold mb-2">ERROR</h4>
                      <p className="text-cyber-red">{pingResults.error}</p>
                    </div>
                  )}

                  {/* Success Display */}
                  {!pingResults.error && (
                    <>
                      {/* Summary Statistics */}
                      <div className="bg-cyber-darker border border-cyber-green p-4">
                        <h4 className="text-cyber-green font-bold uppercase mb-3 text-xs">Summary</h4>
                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <div>
                            <span className="text-cyber-gray-light">Protocol:</span>
                            <span className="text-cyber-green ml-2 font-bold">{pingResults.protocol}</span>
                          </div>
                          <div>
                            <span className="text-cyber-gray-light">Target:</span>
                            <span className="text-cyber-blue ml-2">{pingResults.target}</span>
                          </div>
                          {pingResults.port && (
                            <div>
                              <span className="text-cyber-gray-light">Port:</span>
                              <span className="text-cyber-blue ml-2">{pingResults.port}</span>
                            </div>
                          )}
                          {pingResults.count !== undefined && (
                            <div>
                              <span className="text-cyber-gray-light">Count:</span>
                              <span className="text-cyber-blue ml-2">{pingResults.count}</span>
                            </div>
                          )}
                          {pingResults.successful !== undefined && (
                            <>
                              <div>
                                <span className="text-cyber-gray-light">Successful:</span>
                                <span className="text-cyber-green ml-2">{pingResults.successful}</span>
                              </div>
                              <div>
                                <span className="text-cyber-gray-light">Failed:</span>
                                <span className="text-cyber-red ml-2">{pingResults.failed}</span>
                              </div>
                            </>
                          )}
                          {pingResults.packet_loss !== undefined && (
                            <div>
                              <span className="text-cyber-gray-light">Packet Loss:</span>
                              <span className={`ml-2 font-bold ${pingResults.packet_loss > 50 ? 'text-cyber-red' : pingResults.packet_loss > 0 ? 'text-cyber-yellow' : 'text-cyber-green'}`}>
                                {pingResults.packet_loss}%
                              </span>
                            </div>
                          )}
                          {pingResults.min_ms !== undefined && (
                            <>
                              <div>
                                <span className="text-cyber-gray-light">Min RTT:</span>
                                <span className="text-cyber-blue ml-2">{pingResults.min_ms} ms</span>
                              </div>
                              <div>
                                <span className="text-cyber-gray-light">Avg RTT:</span>
                                <span className="text-cyber-blue ml-2">{pingResults.avg_ms} ms</span>
                              </div>
                              <div>
                                <span className="text-cyber-gray-light">Max RTT:</span>
                                <span className="text-cyber-blue ml-2">{pingResults.max_ms} ms</span>
                              </div>
                            </>
                          )}
                        </div>
                        {pingResults.note && (
                          <div className="mt-3 pt-3 border-t border-cyber-gray/30">
                            <p className="text-cyber-yellow text-[10px]">ℹ {pingResults.note}</p>
                          </div>
                        )}
                      </div>

                      {/* Individual Results */}
                      {pingResults.results && pingResults.results.length > 0 && (
                        <div className="bg-cyber-darker border border-cyber-blue p-4">
                          <h4 className="text-cyber-blue font-bold uppercase mb-3 text-xs">Individual Results</h4>
                          <div className="space-y-2">
                            {pingResults.results.map((result: PingResult, idx: number) => (
                              <div key={idx} className="flex items-center justify-between py-1 border-b border-cyber-gray/20">
                                <span className="text-cyber-gray-light">
                                  Seq {result.seq}:
                                </span>
                                <div className="flex items-center gap-4">
                                  {result.status === 'success' && (
                                    <>
                                      <span className="text-cyber-green">✓ Success</span>
                                      {result.time_ms !== undefined && (
                                        <span className="text-cyber-blue">{result.time_ms} ms</span>
                                      )}
                                      {result.http_code && (
                                        <span className="text-cyber-cyan">HTTP {result.http_code}</span>
                                      )}
                                    </>
                                  )}
                                  {result.status === 'sent' && (
                                    <>
                                      <span className="text-cyber-blue">→ Sent</span>
                                      {result.time_ms !== undefined && (
                                        <span className="text-cyber-blue">{result.time_ms} ms</span>
                                      )}
                                    </>
                                  )}
                                  {result.status === 'timeout' && (
                                    <span className="text-cyber-yellow">⏱ Timeout</span>
                                  )}
                                  {result.status === 'failed' && (
                                    <span className="text-cyber-red">✗ Failed</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Raw Output (for ICMP) */}
                      {pingResults.raw_output && (
                        <div className="bg-black border border-cyber-gray p-4">
                          <h4 className="text-cyber-purple font-bold uppercase mb-2 text-xs">Raw Output</h4>
                          <pre className="text-cyber-green text-[10px] whitespace-pre-wrap">{pingResults.raw_output}</pre>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Packet Inspector Sidebar - Only show in capture tab */}
      {activeTab === 'capture' && selectedPacket && (
        <div className="fixed right-0 top-0 h-full w-1/3 bg-cyber-darker border-l border-cyber-red shadow-[-10px_0_30px_rgba(255,10,84,0.2)] z-50 flex flex-col animate-slideInRight">
          <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
            <h3 className="text-cyber-red font-bold uppercase tracking-widest">Packet Inspector</h3>
            <button onClick={() => setSelectedPacket(null)} className="text-cyber-gray-light hover:text-cyber-red text-xl">&times;</button>
          </div>
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-6">
            <div className="space-y-2">
              <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">General Information</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <span className="text-cyber-gray-light">Timestamp:</span>
                <span className="text-cyber-blue">{new Date(selectedPacket.timestamp * 1000).toISOString()}</span>
                <span className="text-cyber-gray-light">Length:</span>
                <span className="text-cyber-blue">{selectedPacket.length} bytes</span>
                <span className="text-cyber-gray-light">Protocol:</span>
                <span className={`font-bold ${getProtocolColor(selectedPacket.protocol)}`}>{selectedPacket.protocol}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">Network Layer</h4>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <span className="text-cyber-gray-light">Source:</span>
                <span className="text-cyber-blue">{selectedPacket.source}</span>
                <span className="text-cyber-gray-light">Destination:</span>
                <span className="text-cyber-red">{selectedPacket.destination}</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">Summary</h4>
              <div className="p-3 bg-black border border-cyber-gray text-cyber-green text-xs font-mono break-words">
                {selectedPacket.summary}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">Raw Data</h4>
                <div className="p-3 bg-black border border-cyber-gray text-cyber-blue text-[10px] font-mono leading-tight whitespace-pre overflow-x-auto">
                  {formatHex(selectedPacket.raw)}
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Traffic;
