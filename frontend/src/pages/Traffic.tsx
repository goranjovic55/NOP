import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuthStore } from '../store/authStore';
import { assetService, Asset } from '../services/assetService';
import PacketCrafting from '../components/PacketCrafting';

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
  const [packets, setPackets] = useState<Packet[]>([]);
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [isInterfaceListOpen, setIsInterfaceListOpen] = useState(false);
  const [isSniffing, setIsSniffing] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState('');
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
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
    const fetchAssets = async () => {
      if (token) {
        try {
          const data = await assetService.getAssets(token);
          setAssets(data);
        } catch (err) {
          console.error('Failed to fetch assets:', err);
        }
      }
    };
    fetchAssets();
  }, [token]);

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

  return (
    <>
      {showCrafting ? (
        <PacketCrafting onBack={() => setShowCrafting(false)} assets={assets} />
      ) : (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
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

        <button 
          onClick={() => setShowCrafting(true)}
          className="px-6 py-1 border-2 border-cyber-purple text-cyber-purple font-bold uppercase tracking-widest text-xs hover:bg-cyber-purple hover:text-white transition-all"
        >
          Craft Packet
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

      {/* Packet Inspector Sidebar */}
      {selectedPacket && (
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
    )}
    </>
  );
};

export default Traffic;
