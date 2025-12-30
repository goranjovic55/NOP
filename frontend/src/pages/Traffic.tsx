import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import PacketCrafting from '../components/PacketCrafting';
import Storm from './Storm';

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
  // Dissected layers
  layers?: {
    ethernet?: {
      src_mac: string;
      dst_mac: string;
      type: string;
    };
    ip?: {
      version: number;
      header_length: number;
      tos: number;
      total_length: number;
      identification: number;
      flags: string;
      fragment_offset: number;
      ttl: number;
      protocol: number;
      protocol_name: string;
      checksum: string;
      src: string;
      dst: string;
    };
    tcp?: {
      src_port: number;
      dst_port: number;
      seq: number;
      ack: number;
      data_offset: number;
      flags: string;
      window: number;
      checksum: string;
      urgent_pointer: number;
      options?: string;
    };
    udp?: {
      src_port: number;
      dst_port: number;
      length: number;
      checksum: string;
    };
    icmp?: {
      type: number;
      type_name: string;
      code: number;
      checksum: string;
      identifier?: number;
      sequence?: number;
    };
    arp?: {
      hardware_type: string;
      protocol_type: string;
      operation: string;
      sender_mac: string;
      sender_ip: string;
      target_mac: string;
      target_ip: string;
    };
    dns?: {
      id: number;
      qr: string;
      opcode: number;
      qdcount: number;
      ancount: number;
      nscount: number;
      arcount: number;
      queries?: Array<{ name: string; type: number; class: number }>;
    };
    http?: {
      type: string;
      method?: string;
      path?: string;
      host?: string;
      user_agent?: string;
      status_code?: string;
      reason?: string;
    };
    tls?: {
      type: string;
      version: string;
    };
    application?: {
      protocol: string;
      details?: {
        description?: string;
        port?: number;
      };
    };
    payload?: {
      length: number;
      hex: string;
      preview: string;
    };
  };
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
  const [activeTab, setActiveTab] = useState<'capture' | 'ping' | 'craft' | 'storm'>(() => {
    return (localStorage.getItem('nop_traffic_active_tab') as 'capture' | 'ping' | 'craft' | 'storm') || 'capture';
  });
  const [packets, setPackets] = useState<Packet[]>([]);
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [isInterfaceListOpen, setIsInterfaceListOpen] = useState(false);
  const [isSniffing, setIsSniffing] = useState(false);
  const [filter, setFilter] = useState(() => {
    return localStorage.getItem('nop_traffic_filter') || '';
  });
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
  const [selectedFlow, setSelectedFlow] = useState<Stream | null>(null);
  const [sortColumn, setSortColumn] = useState<'time' | 'source' | 'destination' | 'protocol' | 'length' | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [onlineAssets, setOnlineAssets] = useState<Array<{ip_address: string, hostname: string, status: string}>>([]);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const assetDropdownRef = useRef<HTMLDivElement>(null);
  
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
    // Fetch online assets when ping tab is active
    if (activeTab === 'ping') {
      fetchOnlineAssets();
    }
  }, [activeTab, token]);

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

  // Persist active tab and filter to localStorage
  useEffect(() => {
    localStorage.setItem('nop_traffic_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('nop_traffic_filter', filter);
  }, [filter]);

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

  const fetchOnlineAssets = async () => {
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

  // Filter packets by selected flow
  const filteredPackets = useMemo(() => {
    if (!selectedFlow) return packets;
    return packets.filter(p => {
      const matchForward = p.source === selectedFlow.source && p.destination === selectedFlow.destination && p.protocol === selectedFlow.protocol;
      const matchReverse = p.source === selectedFlow.destination && p.destination === selectedFlow.source && p.protocol === selectedFlow.protocol;
      return matchForward || matchReverse;
    });
  }, [packets, selectedFlow]);

  // Sort filtered packets
  const displayedPackets = useMemo(() => {
    if (!sortColumn) return filteredPackets;
    return [...filteredPackets].sort((a, b) => {
      let comparison = 0;
      switch (sortColumn) {
        case 'time': comparison = a.timestamp - b.timestamp; break;
        case 'source': comparison = a.source.localeCompare(b.source); break;
        case 'destination': comparison = a.destination.localeCompare(b.destination); break;
        case 'protocol': comparison = a.protocol.localeCompare(b.protocol); break;
        case 'length': comparison = a.length - b.length; break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredPackets, sortColumn, sortDirection]);

  const handleSort = (column: 'time' | 'source' | 'destination' | 'protocol' | 'length') => {
    if (sortColumn === column) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column) return <span className="opacity-30">↕</span>;
    return <span className="text-cyber-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  const handleFlowClick = (stream: Stream) => {
    if (selectedFlow?.id === stream.id) {
      setSelectedFlow(null); // Deselect if clicking the same flow
    } else {
      setSelectedFlow(stream);
    }
  };

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
      const requestBody: any = {
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
        <button
          onClick={() => setActiveTab('craft')}
          className={`px-6 py-2 font-bold uppercase text-xs transition-all ${
            activeTab === 'craft'
              ? 'bg-cyber-purple text-white border-2 border-cyber-purple'
              : 'border-2 border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple'
          }`}
        >
          Craft Packet
        </button>
        <button
          onClick={() => setActiveTab('storm')}
          className={`px-6 py-2 font-bold uppercase text-xs transition-all flex items-center gap-2 ${
            activeTab === 'storm'
              ? 'bg-red-600 text-white border-2 border-red-600'
              : 'border-2 border-cyber-gray text-cyber-gray-light hover:border-red-600 hover:text-red-500'
          }`}
        >
          <span className="text-base">⚡</span> Storm
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

      {/* Main Content - Vertical Split View */}
      <div className="flex-1 flex flex-row min-h-0 gap-4">
        {/* Left Part: Live Packet Capture */}
        <div className={`${selectedPacket ? 'w-1/2' : 'w-2/3'} bg-black border border-cyber-gray flex flex-col min-h-0 transition-all`}>
          <div className="bg-cyber-darker px-4 py-1 border-b border-cyber-gray flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Live Packet Capture</span>
              {selectedFlow && (
                <button
                  onClick={() => setSelectedFlow(null)}
                  className="text-[10px] text-cyber-red border border-cyber-red px-2 py-0.5 hover:bg-cyber-red hover:text-white transition-all"
                >
                  ✕ Clear Filter
                </button>
              )}
            </div>
            <span className="text-xs text-cyber-gray-light opacity-50">
              {selectedFlow ? `${displayedPackets.length} / ${packets.length}` : packets.length} Packets
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs">
            <table className="min-w-full">
              <thead className="bg-cyber-darker sticky top-0">
                <tr className="text-cyber-gray-light uppercase">
                  <th className="px-2 py-2 text-left w-20 cursor-pointer hover:text-cyber-blue select-none" onClick={() => handleSort('time')}>
                    <div className="flex items-center gap-1">Time <SortIcon column="time" /></div>
                  </th>
                  <th className="px-2 py-2 text-left w-28 cursor-pointer hover:text-cyber-blue select-none" onClick={() => handleSort('source')}>
                    <div className="flex items-center gap-1">Source <SortIcon column="source" /></div>
                  </th>
                  <th className="px-2 py-2 text-left w-28 cursor-pointer hover:text-cyber-blue select-none" onClick={() => handleSort('destination')}>
                    <div className="flex items-center gap-1">Dest <SortIcon column="destination" /></div>
                  </th>
                  <th className="px-2 py-2 text-left w-14 cursor-pointer hover:text-cyber-blue select-none" onClick={() => handleSort('protocol')}>
                    <div className="flex items-center gap-1">Proto <SortIcon column="protocol" /></div>
                  </th>
                  <th className="px-2 py-2 text-left w-12 cursor-pointer hover:text-cyber-blue select-none" onClick={() => handleSort('length')}>
                    <div className="flex items-center gap-1">Len <SortIcon column="length" /></div>
                  </th>
                  <th className="px-2 py-2 text-left">Info</th>
                </tr>
              </thead>
              <tbody>
                {displayedPackets.map((p, i) => (
                  <tr
                    key={p.id || i}
                    onClick={() => setSelectedPacket(p)}
                    className={`hover:bg-cyber-gray/20 cursor-pointer transition-colors ${selectedPacket === p ? 'bg-cyber-blue/20 border-l-2 border-cyber-blue' : ''}`}
                  >
                    <td className="px-2 py-0.5 text-cyber-gray-light opacity-60">{new Date(p.timestamp * 1000).toLocaleTimeString()}</td>
                    <td className="px-2 py-0.5 text-cyber-blue truncate max-w-[112px]">{p.source}</td>
                    <td className="px-2 py-0.5 text-cyber-red truncate max-w-[112px]">{p.destination}</td>
                    <td className={`px-2 py-0.5 font-bold ${getProtocolColor(p.protocol)}`}>{p.protocol}</td>
                    <td className="px-2 py-0.5 text-cyber-gray-light">{p.length}</td>
                    <td className="px-2 py-0.5 text-cyber-gray-light truncate">{p.info || p.summary}</td>
                  </tr>
                ))}
                <div ref={packetListEndRef} />
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Part: Streams / Flow */}
        <div className={`${selectedPacket ? 'w-1/2' : 'w-1/3'} bg-cyber-dark border border-cyber-gray flex flex-col min-h-0 transition-all`}>
          <div className="bg-cyber-darker px-4 py-1 border-b border-cyber-gray flex justify-between items-center">
            <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Active Flows</span>
            <span className="text-xs text-cyber-gray-light opacity-50">{streams.length} Conversations</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="min-w-full text-xs font-mono">
              <thead className="bg-cyber-darker sticky top-0">
                <tr className="text-cyber-gray-light uppercase">
                  <th className="px-2 py-2 text-left">Source</th>
                  <th className="px-2 py-2 text-left">Destination</th>
                  <th className="px-2 py-2 text-left">Proto</th>
                  <th className="px-2 py-2 text-right">Pkts</th>
                  <th className="px-2 py-2 text-right">Bytes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyber-gray/30">
                {streams.map((stream) => (
                  <tr
                    key={stream.id}
                    onClick={() => handleFlowClick(stream)}
                    className={`hover:bg-cyber-blue/10 cursor-pointer transition-colors ${
                      selectedFlow?.id === stream.id ? 'bg-cyber-purple/20 border-l-2 border-cyber-purple' : ''
                    }`}
                  >
                    <td className="px-2 py-1 text-cyber-blue truncate max-w-[100px]">{stream.source}</td>
                    <td className="px-2 py-1 text-cyber-red truncate max-w-[100px]">{stream.destination}</td>
                    <td className="px-2 py-1">{stream.protocol}</td>
                    <td className="px-2 py-1 text-right">{stream.packetCount}</td>
                    <td className="px-2 py-1 text-right">{(stream.byteCount / 1024).toFixed(1)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Ping Tab Content */}
      {activeTab === 'ping' && (
        <div className="flex-1 flex flex-row min-h-0 gap-4">
          {/* Left Part: Advanced Ping Configuration */}
          <div className="w-1/2 bg-cyber-dark border border-cyber-gray flex flex-col min-h-0">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
              <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Advanced Ping Configuration</span>
            </div>
            <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col gap-4">
                {/* Configuration Section */}
                <div className="space-y-4">
                  {/* Target Input */}
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-blue font-bold uppercase">Target IP/Hostname</label>
                    <div className="relative" ref={assetDropdownRef}>
                      <input
                        type="text"
                        value={pingTarget}
                        onChange={(e) => {
                          setPingTarget(e.target.value);
                          setPingError('');
                          setShowAssetDropdown(true);
                        }}
                        onFocus={() => setShowAssetDropdown(true)}
                        placeholder="e.g. 192.168.1.1 or example.com"
                        className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-sm p-2 outline-none focus:border-cyber-green font-mono"
                      />
                      
                      {/* Assets Dropdown with Filter */}
                      {showAssetDropdown && (() => {
                        const filtered = onlineAssets.filter(asset => 
                          asset.ip_address.toLowerCase().includes(pingTarget.toLowerCase()) ||
                          asset.hostname.toLowerCase().includes(pingTarget.toLowerCase())
                        );
                        const onlineCount = filtered.filter(a => a.status === 'online').length;
                        const offlineCount = filtered.filter(a => a.status === 'offline').length;
                        
                        return filtered.length > 0 ? (
                          <div className="absolute top-full left-0 mt-1 w-full bg-cyber-darker border border-cyber-green z-50 shadow-xl max-h-[250px] overflow-y-auto custom-scrollbar">
                            <div className="p-2 bg-cyber-darker border-b border-cyber-gray flex justify-between items-center">
                              <span className="text-xs text-cyber-purple font-bold uppercase">Assets ({filtered.length})</span>
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
                                    setPingTarget(asset.ip_address);
                                    setShowAssetDropdown(false);
                                    setPingError('');
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
                    {pingError && (
                      <p className="text-cyber-red text-xs mt-1">⚠ {pingError}</p>
                    )}
                  </div>

                  {/* Protocol Selection */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-cyber-blue font-bold uppercase">Protocol</label>
                    <div className="grid grid-cols-5 gap-1">
                      {['icmp', 'tcp', 'udp', 'http', 'dns'].map((proto) => (
                        <button
                          key={proto}
                          onClick={() => setPingProtocol(proto)}
                          className={`py-1.5 border font-bold uppercase text-[10px] transition-all text-center ${
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

                  {/* Port (for TCP/UDP/HTTP/DNS) */}
                  {(pingProtocol === 'tcp' || pingProtocol === 'udp' || pingProtocol === 'http' || pingProtocol === 'dns') && (
                    <div className="space-y-2">
                      <label className="text-xs text-cyber-blue font-bold uppercase">Port</label>
                      <input
                        type="number"
                        value={pingPort}
                        onChange={(e) => setPingPort(e.target.value)}
                        placeholder={pingProtocol === 'dns' ? '53' : pingProtocol === 'http' ? '80' : '443'}
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
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-cyber-blue font-bold uppercase">Count</label>
                      <input
                        type="number"
                        value={pingCount}
                        onChange={(e) => setPingCount(e.target.value)}
                        min="1"
                        max="100"
                        className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-xs p-1.5 outline-none focus:border-cyber-green font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-cyber-blue font-bold uppercase">Timeout (s)</label>
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
                        <label className="text-[10px] text-cyber-blue font-bold uppercase">Packet Size</label>
                        <input
                          type="number"
                          value={pingPacketSize}
                          onChange={(e) => setPingPacketSize(e.target.value)}
                          min="1"
                          max="65500"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green text-xs p-1.5 outline-none focus:border-cyber-green font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* Execute Button */}
                  <div className="pt-2">
                    <button
                      onClick={handlePing}
                      disabled={pingInProgress}
                      className={`px-4 py-2 border font-bold uppercase tracking-wider text-xs transition-all ${
                        pingInProgress
                          ? 'border-cyber-gray text-cyber-gray opacity-50 cursor-not-allowed'
                          : 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black'
                      }`}
                    >
                      {pingInProgress ? 'Pinging...' : 'Execute Ping'}
                    </button>
                  </div>

                  {/* Protocol Information */}
                  <div className="mt-3 p-3 bg-cyber-darker border border-cyber-blue/30">
                    <h4 className="text-[10px] text-cyber-blue font-bold uppercase mb-2">Protocol Information</h4>
                    <div className="text-[10px] text-cyber-gray-light space-y-2">
                      {pingProtocol === 'icmp' && (
                        <div className="space-y-1">
                          <p className="text-cyber-green font-bold">ICMP Echo Request/Reply</p>
                          <p>Standard ping protocol using ICMP packets. Sends echo requests and waits for echo replies to measure round-trip time.</p>
                          <p className="text-cyber-purple mt-1">⚠ May be blocked by firewalls or disabled on target hosts.</p>
                        </div>
                      )}
                      {pingProtocol === 'tcp' && (
                        <div className="space-y-1">
                          <p className="text-cyber-green font-bold">TCP SYN Probe (hping3)</p>
                          <p>Sends TCP SYN packets to specified port. Useful for testing connectivity when ICMP is blocked. Measures response time based on SYN-ACK or RST replies.</p>
                          <p className="text-cyber-purple mt-1">✓ Bypasses ICMP filters. Requires port specification.</p>
                        </div>
                      )}
                      {pingProtocol === 'udp' && (
                        <div className="space-y-1">
                          <p className="text-cyber-green font-bold">UDP Probe (hping3)</p>
                          <p>Sends UDP packets to specified port. Connectionless protocol - measures time until ICMP "port unreachable" or response is received.</p>
                          <p className="text-cyber-purple mt-1">⚠ May show packet loss if port is open (no response expected).</p>
                        </div>
                      )}
                      {pingProtocol === 'http' && (
                        <div className="space-y-1">
                          <p className="text-cyber-green font-bold">HTTP/HTTPS Request</p>
                          <p>Performs HTTP GET request to the target. Measures full request-response cycle including TLS handshake for HTTPS. Returns HTTP status code.</p>
                          <p className="text-cyber-purple mt-1">✓ Tests application-layer connectivity and web server availability.</p>
                        </div>
                      )}
                      {pingProtocol === 'dns' && (
                        <div className="space-y-1">
                          <p className="text-cyber-green font-bold">DNS Query (dig)</p>
                          <p>Sends DNS A record query using dig command. Measures DNS resolution time. Target should be a DNS server address.</p>
                          <p className="text-cyber-purple mt-1">✓ Default port 53. Tests DNS server responsiveness.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Part: Ping Response */}
          <div className="w-1/2 bg-black border border-cyber-gray flex flex-col min-h-0">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray flex justify-between items-center">
              <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Ping Response</span>
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

      {/* Craft Packet Tab Content */}
      {activeTab === 'craft' && (
        <div className="flex-1 overflow-hidden">
          <PacketCrafting />
        </div>
      )}

      {/* Storm Tab Content */}
      {activeTab === 'storm' && (
        <div className="flex-1 overflow-hidden">
          <Storm />
        </div>
      )}

      {/* Packet Inspector Sidebar - Slides in from right, covers streams */}
      {activeTab === 'capture' && selectedPacket && (
        <div className="fixed right-0 top-0 h-full w-[600px] bg-cyber-darker border-l border-cyber-red shadow-[-10px_0_30px_rgba(255,10,84,0.2)] z-50 flex flex-col animate-slideInRight">
          <div className="p-3 border-b border-cyber-gray flex justify-between items-center bg-cyber-dark">
            <h3 className="text-cyber-red font-bold uppercase tracking-widest text-base">Packet Inspector</h3>
            <button onClick={() => setSelectedPacket(null)} className="text-cyber-gray-light hover:text-cyber-red text-2xl leading-none">&times;</button>
          </div>
          <div className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4">
            {/* Frame Info */}
            <div className="space-y-2">
              <h4 className="text-xs text-cyber-green font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                <span className="mr-2">▸</span> Frame
              </h4>
              <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                <span className="text-cyber-gray-light">Timestamp:</span>
                <span className="text-cyber-blue">{new Date(selectedPacket.timestamp * 1000).toISOString()}</span>
                <span className="text-cyber-gray-light">Frame Length:</span>
                <span className="text-cyber-blue">{selectedPacket.length} bytes</span>
              </div>
            </div>

            {/* Ethernet Layer */}
            {selectedPacket.layers?.ethernet && (
              <div className="space-y-2">
                <h4 className="text-xs text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Ethernet II
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Source MAC:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ethernet.src_mac}</span>
                  <span className="text-cyber-gray-light">Destination MAC:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.ethernet.dst_mac}</span>
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-cyber-green">{selectedPacket.layers.ethernet.type}</span>
                </div>
              </div>
            )}

            {/* ARP Layer */}
            {selectedPacket.layers?.arp && (
              <div className="space-y-2">
                <h4 className="text-xs text-orange-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> ARP (Address Resolution Protocol)
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Hardware Type:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.arp.hardware_type}</span>
                  <span className="text-cyber-gray-light">Protocol Type:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.arp.protocol_type}</span>
                  <span className="text-cyber-gray-light">Operation:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.arp.operation}</span>
                  <span className="text-cyber-gray-light">Sender MAC:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.arp.sender_mac}</span>
                  <span className="text-cyber-gray-light">Sender IP:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.arp.sender_ip}</span>
                  <span className="text-cyber-gray-light">Target MAC:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.arp.target_mac}</span>
                  <span className="text-cyber-gray-light">Target IP:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.arp.target_ip}</span>
                </div>
              </div>
            )}

            {/* IP Layer */}
            {selectedPacket.layers?.ip && (
              <div className="space-y-2">
                <h4 className="text-xs text-cyan-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Internet Protocol Version {selectedPacket.layers.ip.version}
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Source:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.src}</span>
                  <span className="text-cyber-gray-light">Destination:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.ip.dst}</span>
                  <span className="text-cyber-gray-light">Header Length:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.header_length} bytes</span>
                  <span className="text-cyber-gray-light">Total Length:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.total_length} bytes</span>
                  <span className="text-cyber-gray-light">TTL:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.ttl}</span>
                  <span className="text-cyber-gray-light">Protocol:</span>
                  <span className="text-cyber-green">{selectedPacket.layers.ip.protocol_name} ({selectedPacket.layers.ip.protocol})</span>
                  <span className="text-cyber-gray-light">Identification:</span>
                  <span className="text-cyber-blue">0x{selectedPacket.layers.ip.identification?.toString(16).padStart(4, '0')}</span>
                  <span className="text-cyber-gray-light">Flags:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.flags}</span>
                  <span className="text-cyber-gray-light">Fragment Offset:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.fragment_offset}</span>
                  <span className="text-cyber-gray-light">Header Checksum:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.ip.checksum}</span>
                </div>
              </div>
            )}

            {/* TCP Layer */}
            {selectedPacket.layers?.tcp && (
              <div className="space-y-2">
                <h4 className="text-xs text-yellow-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Transmission Control Protocol
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Source Port:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.src_port}</span>
                  <span className="text-cyber-gray-light">Destination Port:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.tcp.dst_port}</span>
                  <span className="text-cyber-gray-light">Sequence Number:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.seq}</span>
                  <span className="text-cyber-gray-light">Acknowledgment:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.ack}</span>
                  <span className="text-cyber-gray-light">Header Length:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.data_offset} bytes</span>
                  <span className="text-cyber-gray-light">Flags:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.tcp.flags}</span>
                  <span className="text-cyber-gray-light">Window Size:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.window}</span>
                  <span className="text-cyber-gray-light">Checksum:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.checksum}</span>
                  <span className="text-cyber-gray-light">Urgent Pointer:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tcp.urgent_pointer}</span>
                </div>
              </div>
            )}

            {/* UDP Layer */}
            {selectedPacket.layers?.udp && (
              <div className="space-y-2">
                <h4 className="text-xs text-pink-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> User Datagram Protocol
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Source Port:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.udp.src_port}</span>
                  <span className="text-cyber-gray-light">Destination Port:</span>
                  <span className="text-cyber-red">{selectedPacket.layers.udp.dst_port}</span>
                  <span className="text-cyber-gray-light">Length:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.udp.length} bytes</span>
                  <span className="text-cyber-gray-light">Checksum:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.udp.checksum}</span>
                </div>
              </div>
            )}

            {/* ICMP Layer */}
            {selectedPacket.layers?.icmp && (
              <div className="space-y-2">
                <h4 className="text-xs text-lime-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Internet Control Message Protocol
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.icmp.type_name} ({selectedPacket.layers.icmp.type})</span>
                  <span className="text-cyber-gray-light">Code:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.icmp.code}</span>
                  <span className="text-cyber-gray-light">Checksum:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.icmp.checksum}</span>
                  {selectedPacket.layers.icmp.identifier !== undefined && (
                    <>
                      <span className="text-cyber-gray-light">Identifier:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.icmp.identifier}</span>
                    </>
                  )}
                  {selectedPacket.layers.icmp.sequence !== undefined && (
                    <>
                      <span className="text-cyber-gray-light">Sequence:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.icmp.sequence}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* DNS Layer */}
            {selectedPacket.layers?.dns && (
              <div className="space-y-2">
                <h4 className="text-xs text-cyan-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Domain Name System ({selectedPacket.layers.dns.qr})
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Transaction ID:</span>
                  <span className="text-cyber-blue">0x{selectedPacket.layers.dns.id?.toString(16).padStart(4, '0')}</span>
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.dns.qr}</span>
                  <span className="text-cyber-gray-light">Questions:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.dns.qdcount}</span>
                  <span className="text-cyber-gray-light">Answers:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.dns.ancount}</span>
                  {selectedPacket.layers.dns.queries?.map((q: any, i: number) => (
                    <React.Fragment key={i}>
                      <span className="text-cyber-gray-light">Query {i + 1}:</span>
                      <span className="text-cyber-yellow">{q.name}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* HTTP Layer */}
            {selectedPacket.layers?.http && (
              <div className="space-y-2">
                <h4 className="text-xs text-emerald-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Hypertext Transfer Protocol ({selectedPacket.layers.http.type})
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  {selectedPacket.layers.http.method && (
                    <>
                      <span className="text-cyber-gray-light">Method:</span>
                      <span className="text-cyber-green font-bold">{selectedPacket.layers.http.method}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.path && (
                    <>
                      <span className="text-cyber-gray-light">Path:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.http.path}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.host && (
                    <>
                      <span className="text-cyber-gray-light">Host:</span>
                      <span className="text-cyber-yellow">{selectedPacket.layers.http.host}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.status_code && (
                    <>
                      <span className="text-cyber-gray-light">Status:</span>
                      <span className="text-cyber-green font-bold">{selectedPacket.layers.http.status_code} {selectedPacket.layers.http.reason}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Application Layer Detection */}
            {selectedPacket.layers?.application && selectedPacket.layers.application.protocol !== 'Unknown' && (
              <div className="space-y-2">
                <h4 className="text-xs text-violet-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Application Layer
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Protocol:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.application.protocol}</span>
                  {selectedPacket.layers.application.details?.description && (
                    <>
                      <span className="text-cyber-gray-light">Description:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.application.details.description}</span>
                    </>
                  )}
                  {selectedPacket.layers.application.details?.port && (
                    <>
                      <span className="text-cyber-gray-light">Port:</span>
                      <span className="text-cyber-yellow">{selectedPacket.layers.application.details.port}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TLS/SSL Layer */}
            {selectedPacket.layers?.tls && (
              <div className="space-y-2">
                <h4 className="text-xs text-amber-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Transport Layer Security
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Protocol:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.tls.type}</span>
                  <span className="text-cyber-gray-light">Version:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tls.version}</span>
                </div>
              </div>
            )}

            {/* DNS Layer */}
            {selectedPacket.layers?.dns && (
              <div className="space-y-2">
                <h4 className="text-xs text-cyan-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Domain Name System ({selectedPacket.layers.dns.qr})
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Transaction ID:</span>
                  <span className="text-cyber-blue">0x{selectedPacket.layers.dns.id?.toString(16).padStart(4, '0')}</span>
                  <span className="text-cyber-gray-light">Type:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.dns.qr}</span>
                  <span className="text-cyber-gray-light">Questions:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.dns.qdcount}</span>
                  <span className="text-cyber-gray-light">Answers:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.dns.ancount}</span>
                  {selectedPacket.layers.dns.queries?.map((q: any, i: number) => (
                    <React.Fragment key={i}>
                      <span className="text-cyber-gray-light">Query {i + 1}:</span>
                      <span className="text-cyber-yellow">{q.name}</span>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* HTTP Layer */}
            {selectedPacket.layers?.http && (
              <div className="space-y-2">
                <h4 className="text-xs text-emerald-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Hypertext Transfer Protocol ({selectedPacket.layers.http.type})
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  {selectedPacket.layers.http.method && (
                    <>
                      <span className="text-cyber-gray-light">Method:</span>
                      <span className="text-cyber-green font-bold">{selectedPacket.layers.http.method}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.path && (
                    <>
                      <span className="text-cyber-gray-light">Path:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.http.path}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.host && (
                    <>
                      <span className="text-cyber-gray-light">Host:</span>
                      <span className="text-cyber-yellow">{selectedPacket.layers.http.host}</span>
                    </>
                  )}
                  {selectedPacket.layers.http.status_code && (
                    <>
                      <span className="text-cyber-gray-light">Status:</span>
                      <span className="text-cyber-green font-bold">{selectedPacket.layers.http.status_code} {selectedPacket.layers.http.reason}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Application Layer Detection */}
            {selectedPacket.layers?.application && selectedPacket.layers.application.protocol !== 'Unknown' && (
              <div className="space-y-2">
                <h4 className="text-xs text-violet-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Application Layer
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Protocol:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.application.protocol}</span>
                  {selectedPacket.layers.application.details?.description && (
                    <>
                      <span className="text-cyber-gray-light">Description:</span>
                      <span className="text-cyber-blue">{selectedPacket.layers.application.details.description}</span>
                    </>
                  )}
                  {selectedPacket.layers.application.details?.port && (
                    <>
                      <span className="text-cyber-gray-light">Port:</span>
                      <span className="text-cyber-yellow">{selectedPacket.layers.application.details.port}</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* TLS/SSL Layer */}
            {selectedPacket.layers?.tls && (
              <div className="space-y-2">
                <h4 className="text-xs text-amber-400 font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Transport Layer Security
                </h4>
                <div className="pl-4 grid grid-cols-2 gap-1 text-xs font-mono">
                  <span className="text-cyber-gray-light">Protocol:</span>
                  <span className="text-cyber-green font-bold">{selectedPacket.layers.tls.type}</span>
                  <span className="text-cyber-gray-light">Version:</span>
                  <span className="text-cyber-blue">{selectedPacket.layers.tls.version}</span>
                </div>
              </div>
            )}

            {/* Payload */}
            {selectedPacket.layers?.payload && (
              <div className="space-y-2">
                <h4 className="text-xs text-cyber-gray-light font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                  <span className="mr-2">▸</span> Payload ({selectedPacket.layers.payload.length} bytes)
                </h4>
                <div className="pl-4 p-2 bg-black border border-cyber-gray text-cyber-blue text-xs font-mono break-all">
                  {selectedPacket.layers.payload.preview}
                </div>
              </div>
            )}

            {/* Raw Hex Dump */}
            <div className="space-y-2">
              <h4 className="text-xs text-cyber-gray-light font-bold uppercase border-b border-cyber-gray pb-1 flex items-center">
                <span className="mr-2">▸</span> Raw Data (Hex Dump)
              </h4>
              <div className="p-2 bg-black border border-cyber-gray text-cyber-blue text-xs font-mono leading-tight whitespace-pre overflow-x-auto max-h-[200px]">
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
