import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { Asset } from '../services/assetService';

interface PacketCraftingProps {
  onBack?: () => void;
  assets?: Asset[];
}

interface PacketResponse {
  success: boolean;
  sent_packet?: any;
  response?: any;
  trace?: string[];
  raw_output?: string;
  error?: string;
}

const COMMON_PORTS = [
  { port: 21, name: 'FTP' },
  { port: 22, name: 'SSH' },
  { port: 23, name: 'Telnet' },
  { port: 25, name: 'SMTP' },
  { port: 53, name: 'DNS' },
  { port: 80, name: 'HTTP' },
  { port: 443, name: 'HTTPS' },
  { port: 445, name: 'SMB' },
  { port: 3306, name: 'MySQL' },
  { port: 3389, name: 'RDP' },
  { port: 5432, name: 'PostgreSQL' },
  { port: 5900, name: 'VNC' },
  { port: 8080, name: 'HTTP-Alt' },
];

const PacketCrafting: React.FC<PacketCraftingProps> = ({ onBack, assets = [] }) => {
  const { token } = useAuthStore();
  const [protocol, setProtocol] = useState('TCP');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('');
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showSourcePortDropdown, setShowSourcePortDropdown] = useState(false);
  const [showDestPortDropdown, setShowDestPortDropdown] = useState(false);
  const [showStructurePanel, setShowStructurePanel] = useState(false);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const destDropdownRef = useRef<HTMLDivElement>(null);
  const sourcePortRef = useRef<HTMLDivElement>(null);
  const destPortRef = useRef<HTMLDivElement>(null);

  const [hexBytes, setHexBytes] = useState<string[]>(['00']);
  const [asciiValue, setAsciiValue] = useState<string>('\x00');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(event.target as Node)) setShowSourceDropdown(false);
      if (destDropdownRef.current && !destDropdownRef.current.contains(event.target as Node)) setShowDestDropdown(false);
      if (sourcePortRef.current && !sourcePortRef.current.contains(event.target as Node)) setShowSourcePortDropdown(false);
      if (destPortRef.current && !destPortRef.current.contains(event.target as Node)) setShowDestPortDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [sourcePort, setSourcePort] = useState('');
  const [destPort, setDestPort] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<PacketResponse | null>(null);
  
  const [ttl, setTtl] = useState('64');
  const [ipId, setIpId] = useState('');
  const [tos, setTos] = useState('0');
  const [tcpSeq, setTcpSeq] = useState('');
  const [tcpAck, setTcpAck] = useState('');
  const [tcpWindow, setTcpWindow] = useState('8192');
  const [icmpType, setIcmpType] = useState('8');
  const [icmpCode, setIcmpCode] = useState('0');
  const [packetCount, setPacketCount] = useState('1');
  const [pps, setPps] = useState('1');
  const [destMac, setDestMac] = useState('');
  const [srcMac, setSrcMac] = useState('');
  const [ipFlags, setIpFlags] = useState('DF');
  const [tcpUrgPtr, setTcpUrgPtr] = useState('0');

  const protocols = ['TCP', 'UDP', 'ICMP', 'ARP', 'IP'];
  const tcpFlags = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'];

  const sortedAssets = [...assets].sort((a, b) => {
    if (a.status === 'online' && b.status !== 'online') return -1;
    if (a.status !== 'online' && b.status === 'online') return 1;
    return a.ip_address.localeCompare(b.ip_address);
  });

  const handleFlagToggle = (flag: string) => {
    setFlags(prev => prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]);
  };

  const handleAssetSelect = (ip: string, isSource: boolean) => {
    if (isSource) { setSourceIp(ip); setShowSourceDropdown(false); }
    else { setDestIp(ip); setShowDestDropdown(false); }
  };

  const handlePortSelect = (port: number, isSource: boolean) => {
    if (isSource) { setSourcePort(port.toString()); setShowSourcePortDropdown(false); }
    else { setDestPort(port.toString()); setShowDestPortDropdown(false); }
  };

  const hexToAscii = (bytes: string[]): string => {
    return bytes.map(b => {
      const code = parseInt(b, 16);
      return code >= 32 && code <= 126 ? String.fromCharCode(code) : '.';
    }).join('');
  };

  const asciiToHex = (str: string): string[] => {
    return str.split('').map(c => c.charCodeAt(0).toString(16).padStart(2, '0').toUpperCase());
  };

  const handleHexByteChange = (index: number, value: string) => {
    const cleaned = value.replace(/[^0-9A-Fa-f]/g, '').toUpperCase().slice(0, 2);
    const newBytes = [...hexBytes];
    newBytes[index] = cleaned.padStart(2, '0');
    setHexBytes(newBytes);
    setAsciiValue(hexToAscii(newBytes));
  };

  const handleHexKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && !e.shiftKey && index === hexBytes.length - 1) {
      e.preventDefault();
      setHexBytes([...hexBytes, '00']);
      setAsciiValue(hexToAscii([...hexBytes, '00']));
    }
    if (e.key === 'Backspace' && hexBytes[index] === '00' && hexBytes.length > 1) {
      e.preventDefault();
      const newBytes = hexBytes.filter((_, i) => i !== index);
      setHexBytes(newBytes);
      setAsciiValue(hexToAscii(newBytes));
    }
  };

  const handleAsciiChange = (value: string) => {
    if (value.length === 0) {
      setHexBytes(['00']);
      setAsciiValue('\x00');
      return;
    }
    const newHex = asciiToHex(value);
    setHexBytes(newHex);
    setAsciiValue(value);
  };

  const getPayloadHexString = (): string => hexBytes.join('');

  const handleSendPacket = async () => {
    setIsSending(true);
    setResponse(null);
    try {
      const count = packetCount === '0' ? 0 : parseInt(packetCount) || 1;
      const packetsPerSecond = parseInt(pps) || 1;
      const packetData = {
        protocol,
        source_ip: sourceIp,
        dest_ip: destIp,
        source_port: sourcePort ? parseInt(sourcePort) : undefined,
        dest_port: destPort ? parseInt(destPort) : undefined,
        payload: getPayloadHexString(),
        payload_format: 'hex',
        flags: protocol === 'TCP' ? flags : undefined,
        ttl: ttl ? parseInt(ttl) : undefined,
        ip_id: ipId ? parseInt(ipId) : undefined,
        tos: tos ? parseInt(tos) : undefined,
        tcp_seq: tcpSeq ? parseInt(tcpSeq) : undefined,
        tcp_ack: tcpAck ? parseInt(tcpAck) : undefined,
        tcp_window: tcpWindow ? parseInt(tcpWindow) : undefined,
        icmp_type: protocol === 'ICMP' && icmpType ? parseInt(icmpType) : undefined,
        icmp_code: protocol === 'ICMP' && icmpCode ? parseInt(icmpCode) : undefined,
        packet_count: count,
        pps: packetsPerSecond,
        dest_mac: destMac || undefined,
        src_mac: srcMac || undefined,
      };
      const res = await fetch('/api/v1/traffic/craft', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(packetData),
      });
      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Failed to send packet:', err);
      setResponse({ success: false, error: 'Failed to send packet. Check network permissions or destination IP.' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Split */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: Basic Packet Definition - NO PAYLOAD HERE */}
        <div className="w-1/2 border-r border-cyber-gray overflow-y-auto custom-scrollbar">
          <div className="p-6 space-y-4">
            {/* Basic Parameters */}
            <div className="bg-cyber-dark border border-cyber-gray">
              <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
                <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Basic Parameters</span>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Protocol</label>
                  <select value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple">
                    {protocols.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative" ref={sourceDropdownRef}>
                    <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Source IP</label>
                    <div className="relative">
                      <input type="text" value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} onFocus={() => setShowSourceDropdown(true)} placeholder="192.168.1.100" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 pr-8 outline-none focus:border-cyber-purple font-mono" />
                      <button onClick={() => setShowSourceDropdown(!showSourceDropdown)} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-purple hover:text-cyber-blue text-xs">▼</button>
                    </div>
                    {showSourceDropdown && sortedAssets.length > 0 && (
                      <div className="absolute z-20 w-full bg-cyber-darker border border-cyber-purple max-h-48 overflow-y-auto shadow-lg mt-1">
                        {sortedAssets.map(a => (
                          <div key={a.id} onClick={() => handleAssetSelect(a.ip_address, true)} className={`p-2 cursor-pointer hover:bg-cyber-gray text-sm font-mono flex items-center justify-between ${a.status === 'online' ? 'text-green-400 bg-green-900/20' : 'text-cyber-gray-light'}`}>
                            <span className="font-bold">{a.ip_address}</span>
                            <span className="text-xs ml-2 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${a.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                              {a.hostname || 'Unknown'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative" ref={destDropdownRef}>
                    <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Destination IP</label>
                    <div className="relative">
                      <input type="text" value={destIp} onChange={(e) => setDestIp(e.target.value)} onFocus={() => setShowDestDropdown(true)} placeholder="192.168.1.1" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 pr-8 outline-none focus:border-cyber-purple font-mono" />
                      <button onClick={() => setShowDestDropdown(!showDestDropdown)} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-purple hover:text-cyber-blue text-xs">▼</button>
                    </div>
                    {showDestDropdown && sortedAssets.length > 0 && (
                      <div className="absolute z-20 w-full bg-cyber-darker border border-cyber-purple max-h-48 overflow-y-auto shadow-lg mt-1">
                        {sortedAssets.map(a => (
                          <div key={a.id} onClick={() => handleAssetSelect(a.ip_address, false)} className={`p-2 cursor-pointer hover:bg-cyber-gray text-sm font-mono flex items-center justify-between ${a.status === 'online' ? 'text-green-400 bg-green-900/20' : 'text-cyber-gray-light'}`}>
                            <span className="font-bold">{a.ip_address}</span>
                            <span className="text-xs ml-2 flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${a.status === 'online' ? 'bg-green-400' : 'bg-gray-500'}`}></span>
                              {a.hostname || 'Unknown'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {(protocol === 'TCP' || protocol === 'UDP') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative" ref={sourcePortRef}>
                      <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Source Port</label>
                      <div className="relative">
                        <input type="number" value={sourcePort} onChange={(e) => setSourcePort(e.target.value)} onFocus={() => setShowSourcePortDropdown(true)} placeholder="Auto" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 pr-8 outline-none focus:border-cyber-purple font-mono" />
                        <button onClick={() => setShowSourcePortDropdown(!showSourcePortDropdown)} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-purple hover:text-cyber-blue text-xs">▼</button>
                      </div>
                      {showSourcePortDropdown && (
                        <div className="absolute z-20 w-full bg-cyber-darker border border-cyber-purple max-h-48 overflow-y-auto shadow-lg mt-1">
                          {COMMON_PORTS.map(p => (
                            <div key={p.port} onClick={() => handlePortSelect(p.port, true)} className="p-2 cursor-pointer hover:bg-cyber-gray text-sm font-mono flex justify-between text-cyber-blue">
                              <span className="font-bold">{p.port}</span>
                              <span className="text-xs text-cyber-gray-light">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="relative" ref={destPortRef}>
                      <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Dest Port</label>
                      <div className="relative">
                        <input type="number" value={destPort} onChange={(e) => setDestPort(e.target.value)} onFocus={() => setShowDestPortDropdown(true)} placeholder="80" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 pr-8 outline-none focus:border-cyber-purple font-mono" />
                        <button onClick={() => setShowDestPortDropdown(!showDestPortDropdown)} className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-purple hover:text-cyber-blue text-xs">▼</button>
                      </div>
                      {showDestPortDropdown && (
                        <div className="absolute z-20 w-full bg-cyber-darker border border-cyber-purple max-h-48 overflow-y-auto shadow-lg mt-1">
                          {COMMON_PORTS.map(p => (
                            <div key={p.port} onClick={() => handlePortSelect(p.port, false)} className="p-2 cursor-pointer hover:bg-cyber-gray text-sm font-mono flex justify-between text-cyber-blue">
                              <span className="font-bold">{p.port}</span>
                              <span className="text-xs text-cyber-gray-light">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {protocol === 'ICMP' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Type</label>
                      <input type="number" value={icmpType} onChange={(e) => setIcmpType(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Code</label>
                      <input type="number" value={icmpCode} onChange={(e) => setIcmpCode(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                )}

                {protocol === 'TCP' && (
                  <div>
                    <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-2">TCP Flags</label>
                    <div className="flex flex-wrap gap-4">
                      {tcpFlags.map(f => (
                        <label key={f} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={flags.includes(f)} onChange={() => handleFlagToggle(f)} className="form-checkbox h-4 w-4 bg-cyber-darker border-cyber-gray text-cyber-purple" />
                          <span className="text-sm text-cyber-blue">{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Send Controls */}
            <div className="bg-cyber-dark border border-cyber-gray">
              <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
                <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Send Control</span>
              </div>
              <div className="p-4 flex gap-4 items-end">
                <div className="flex-1 grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Packet Count</label>
                    <input type="number" value={packetCount} onChange={(e) => setPacketCount(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-cyber-gray-light font-bold uppercase block mb-1">Packets/Second</label>
                    <input type="number" value={pps} onChange={(e) => setPps(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                </div>
                <button onClick={() => setShowStructurePanel(true)} className="px-6 py-3 border-2 border-cyber-purple text-cyber-purple font-bold uppercase text-sm hover:bg-cyber-purple hover:text-white transition-all">
                  Edit Structure
                </button>
                <button onClick={handleSendPacket} disabled={isSending || !sourceIp || !destIp} className="px-8 py-3 border-2 border-cyber-green text-cyber-green font-bold uppercase text-sm hover:bg-cyber-green hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSending ? 'Sending...' : 'Send Packet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Response & Trace */}
        <div className="w-1/2 overflow-y-auto custom-scrollbar bg-black">
          <div className="p-4 space-y-4">
            <div className="bg-cyber-dark border border-cyber-gray">
              <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray flex items-center gap-2">
                <span className="text-xs text-cyber-purple font-bold uppercase tracking-widest">Terminal Output</span>
                {response?.success !== undefined && (
                  <span className={`text-xs px-2 py-0.5 ${response.success ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                    {response.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                )}
              </div>
              <div className="bg-black p-4 font-mono text-sm min-h-[300px] max-h-[500px] overflow-auto">
                {response ? (
                  <div className="space-y-2">
                    {response.error && <div className="text-red-400">ERROR: {response.error}</div>}
                    {response.raw_output && <pre className="text-cyber-green whitespace-pre-wrap">{response.raw_output}</pre>}
                    {response.trace && response.trace.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-cyber-purple">--- Packet Trace ---</div>
                        {response.trace.map((line, i) => <div key={i} className="text-cyber-blue pl-2 border-l border-cyber-gray">{line}</div>)}
                      </div>
                    )}
                    {response.sent_packet && (
                      <div className="mt-4">
                        <div className="text-cyber-purple">--- Sent Packet ---</div>
                        <pre className="text-cyber-gray-light mt-1">{JSON.stringify(response.sent_packet, null, 2)}</pre>
                      </div>
                    )}
                    {response.response && (
                      <div className="mt-4">
                        <div className="text-cyber-purple">--- Response ---</div>
                        <pre className="text-cyber-green mt-1">{JSON.stringify(response.response, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-cyber-gray-light opacity-50">
                    <div>$ # Ready to send packet</div>
                    <div>$ # Configure packet parameters and click "Send Packet"</div>
                    <div className="animate-pulse">_</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STRUCTURE PANEL - Slides in from right - 600px wide */}
      <div className={`fixed inset-y-0 right-0 w-[600px] bg-cyber-dark border-l border-cyber-purple shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${showStructurePanel ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-4 border-b border-cyber-gray flex justify-between items-center bg-cyber-darker">
            <div>
              <h3 className="text-lg font-bold text-cyber-purple uppercase tracking-wider">Packet Structure</h3>
              <p className="text-xs text-cyber-blue font-mono mt-1">{protocol} Packet - All Fields Editable</p>
            </div>
            <button onClick={() => setShowStructurePanel(false)} className="text-cyber-gray-light hover:text-cyber-red transition-colors text-2xl">&times;</button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {/* Layer 2: Ethernet */}
            <div className="border border-cyber-gray bg-black p-4">
              <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Layer 2: Ethernet II</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-cyber-gray-light block mb-1">Destination MAC</label>
                    <input type="text" value={destMac} onChange={(e) => setDestMac(e.target.value)} placeholder="Auto (ARP)" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-cyber-gray-light block mb-1">Source MAC</label>
                    <input type="text" value={srcMac} onChange={(e) => setSrcMac(e.target.value)} placeholder="Auto (interface)" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                </div>
                <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                  <span className="text-cyber-gray-light">EtherType:</span>
                  <span className="text-cyber-blue font-mono">0x0800 (IPv4) <span className="text-cyber-gray-light text-xs">[fixed]</span></span>
                </div>
              </div>
            </div>

            {/* Layer 3: IP */}
            <div className="border border-cyber-gray bg-black p-4">
              <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Layer 3: IPv4</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                    <div className="text-[10px] text-cyber-gray-light">Version</div>
                    <div className="text-cyber-blue font-mono text-sm">4 <span className="text-[8px] text-cyber-gray-light">[fixed]</span></div>
                  </div>
                  <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                    <div className="text-[10px] text-cyber-gray-light">IHL</div>
                    <div className="text-cyber-blue font-mono text-sm">5 <span className="text-[8px] text-cyber-gray-light">[auto]</span></div>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-cyber-gray-light block mb-1">TOS/DSCP</label>
                    <input type="number" value={tos} onChange={(e) => setTos(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-1.5 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                    <div className="text-[10px] text-cyber-gray-light">Total Len</div>
                    <div className="text-cyber-blue font-mono text-sm">Auto <span className="text-[8px] text-cyber-gray-light">[calc]</span></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-cyber-gray-light block mb-1">Identification</label>
                    <input type="number" value={ipId} onChange={(e) => setIpId(e.target.value)} placeholder="Auto" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-1.5 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                  <div>
                    <label className="text-[10px] text-cyber-gray-light block mb-1">Flags</label>
                    <select value={ipFlags} onChange={(e) => setIpFlags(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-1.5 outline-none focus:border-cyber-purple">
                      <option value="">None</option>
                      <option value="DF">DF</option>
                      <option value="MF">MF</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                    <div className="text-[10px] text-cyber-gray-light">Frag Off</div>
                    <div className="text-cyber-blue font-mono text-sm">0 <span className="text-[8px] text-cyber-gray-light">[fixed]</span></div>
                  </div>
                  <div>
                    <label className="text-[10px] text-cyber-gray-light block mb-1">TTL</label>
                    <input type="number" value={ttl} onChange={(e) => setTtl(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-1.5 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                  <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                    <div className="text-[10px] text-cyber-gray-light">Protocol</div>
                    <div className="text-cyber-blue font-mono text-sm">{protocol === 'TCP' ? '6' : protocol === 'UDP' ? '17' : protocol === 'ICMP' ? '1' : '0'} <span className="text-[8px] text-cyber-gray-light">[{protocol}]</span></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                  <span className="text-cyber-gray-light">Header Checksum:</span>
                  <span className="text-cyber-blue font-mono">Auto <span className="text-cyber-gray-light text-xs">[calculated]</span></span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-cyber-gray-light block mb-1">Source IP</label>
                    <input type="text" value={sourceIp} onChange={(e) => setSourceIp(e.target.value)} placeholder="Required" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                  <div>
                    <label className="text-xs text-cyber-gray-light block mb-1">Destination IP</label>
                    <input type="text" value={destIp} onChange={(e) => setDestIp(e.target.value)} placeholder="Required" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                  </div>
                </div>
              </div>
            </div>

            {/* Layer 4: TCP */}
            {protocol === 'TCP' && (
              <div className="border border-cyber-gray bg-black p-4">
                <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Layer 4: TCP</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Source Port</label>
                      <input type="number" value={sourcePort} onChange={(e) => setSourcePort(e.target.value)} placeholder="Random" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Destination Port</label>
                      <input type="number" value={destPort} onChange={(e) => setDestPort(e.target.value)} placeholder="Required" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Sequence Number</label>
                      <input type="number" value={tcpSeq} onChange={(e) => setTcpSeq(e.target.value)} placeholder="Random" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Acknowledgment Number</label>
                      <input type="number" value={tcpAck} onChange={(e) => setTcpAck(e.target.value)} placeholder="0" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                      <div className="text-[10px] text-cyber-gray-light">Data Off</div>
                      <div className="text-cyber-blue font-mono text-sm">5 <span className="text-[8px] text-cyber-gray-light">[auto]</span></div>
                    </div>
                    <div className="bg-cyber-darker p-2 border border-cyber-gray text-center">
                      <div className="text-[10px] text-cyber-gray-light">Reserved</div>
                      <div className="text-cyber-blue font-mono text-sm">0 <span className="text-[8px] text-cyber-gray-light">[fixed]</span></div>
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-cyber-gray-light block mb-1">Window Size</label>
                      <input type="number" value={tcpWindow} onChange={(e) => setTcpWindow(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-1.5 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-cyber-gray-light block mb-2">Flags</label>
                    <div className="grid grid-cols-6 gap-1 bg-cyber-darker p-2 border border-cyber-gray">
                      {tcpFlags.map(f => (
                        <label key={f} className="flex flex-col items-center cursor-pointer p-1 hover:bg-cyber-gray rounded">
                          <input type="checkbox" checked={flags.includes(f)} onChange={() => handleFlagToggle(f)} className="form-checkbox h-4 w-4 mb-1" />
                          <span className="text-[10px] text-cyber-blue">{f}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                      <span className="text-cyber-gray-light">Checksum:</span>
                      <span className="text-cyber-blue font-mono">Auto <span className="text-[8px] text-cyber-gray-light">[calc]</span></span>
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Urgent Pointer</label>
                      <input type="number" value={tcpUrgPtr} onChange={(e) => setTcpUrgPtr(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layer 4: UDP */}
            {protocol === 'UDP' && (
              <div className="border border-cyber-gray bg-black p-4">
                <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Layer 4: UDP</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Source Port</label>
                      <input type="number" value={sourcePort} onChange={(e) => setSourcePort(e.target.value)} placeholder="Random" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Destination Port</label>
                      <input type="number" value={destPort} onChange={(e) => setDestPort(e.target.value)} placeholder="Required" className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                      <span className="text-cyber-gray-light">Length:</span>
                      <span className="text-cyber-blue font-mono">Auto <span className="text-[8px] text-cyber-gray-light">[calc]</span></span>
                    </div>
                    <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                      <span className="text-cyber-gray-light">Checksum:</span>
                      <span className="text-cyber-blue font-mono">Auto <span className="text-[8px] text-cyber-gray-light">[calc]</span></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Layer 4: ICMP */}
            {protocol === 'ICMP' && (
              <div className="border border-cyber-gray bg-black p-4">
                <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Layer 4: ICMP</h4>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Type</label>
                      <input type="number" value={icmpType} onChange={(e) => setIcmpType(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                    <div>
                      <label className="text-xs text-cyber-gray-light block mb-1">Code</label>
                      <input type="number" value={icmpCode} onChange={(e) => setIcmpCode(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono" />
                    </div>
                  </div>
                  <div className="text-xs bg-cyber-darker p-2 border border-cyber-gray">
                    <span className="text-cyber-gray-light">Type: </span>
                    <span className="text-cyber-blue">{icmpType === '8' ? 'Echo Request (Ping)' : icmpType === '0' ? 'Echo Reply' : icmpType === '3' ? 'Dest Unreachable' : icmpType === '11' ? 'Time Exceeded' : 'Custom'}</span>
                  </div>
                  <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                    <span className="text-cyber-gray-light">Checksum:</span>
                    <span className="text-cyber-blue font-mono">Auto <span className="text-[8px] text-cyber-gray-light">[calc]</span></span>
                  </div>
                </div>
              </div>
            )}

            {/* Payload Editor - ONLY IN STRUCTURE PANEL */}
            <div className="border border-cyber-gray bg-black p-4">
              <h4 className="text-xs text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-2">Payload Data</h4>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-cyber-gray-light block mb-2">Hex Editor (Tab to add byte, Backspace on 00 to remove)</label>
                  <div className="bg-cyber-darker border border-cyber-gray p-3 min-h-[80px] max-h-[150px] overflow-auto font-mono text-sm flex flex-wrap gap-1">
                    {hexBytes.map((byte, i) => (
                      <input key={i} type="text" value={byte} onChange={(e) => handleHexByteChange(i, e.target.value)} onKeyDown={(e) => handleHexKeyDown(i, e)} className="w-9 h-8 bg-black border border-cyber-gray text-cyber-blue text-center outline-none focus:border-cyber-purple uppercase text-sm" maxLength={2} />
                    ))}
                    <button onClick={() => { setHexBytes([...hexBytes, '00']); setAsciiValue(hexToAscii([...hexBytes, '00'])); }} className="w-9 h-8 border border-dashed border-cyber-purple text-cyber-purple text-xs hover:bg-cyber-purple hover:text-white">+</button>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-cyber-gray-light block mb-2">ASCII View (editable)</label>
                  <textarea value={asciiValue} onChange={(e) => handleAsciiChange(e.target.value)} className="w-full bg-cyber-darker border border-cyber-gray text-cyber-green p-3 min-h-[60px] font-mono text-sm outline-none focus:border-cyber-purple resize-none" placeholder="Type ASCII text..." />
                </div>
                <div className="flex justify-between text-sm bg-cyber-darker p-2 border border-cyber-gray">
                  <span className="text-cyber-gray-light">Length:</span>
                  <span className="text-cyber-blue font-mono">{hexBytes.length} bytes</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showStructurePanel && <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setShowStructurePanel(false)} />}
    </div>
  );
};

export default PacketCrafting;
