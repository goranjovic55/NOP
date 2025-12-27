import React, { useState } from 'react';
import { useAuthStore } from '../store/authStore';

interface PacketCraftingProps {
  onBack: () => void;
}

interface PacketResponse {
  success: boolean;
  sent_packet?: any;
  response?: any;
  trace?: string[];
  error?: string;
}

const PacketCrafting: React.FC<PacketCraftingProps> = ({ onBack }) => {
  const { token } = useAuthStore();
  const [protocol, setProtocol] = useState('TCP');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('');
  const [sourcePort, setSourcePort] = useState('');
  const [destPort, setDestPort] = useState('');
  const [payload, setPayload] = useState('');
  const [flags, setFlags] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [response, setResponse] = useState<PacketResponse | null>(null);
  
  // Advanced header fields
  const [ttl, setTtl] = useState('64');
  const [ipId, setIpId] = useState('');
  const [tos, setTos] = useState('0');
  const [tcpSeq, setTcpSeq] = useState('');
  const [tcpAck, setTcpAck] = useState('');
  const [tcpWindow, setTcpWindow] = useState('8192');
  const [icmpType, setIcmpType] = useState('8');
  const [icmpCode, setIcmpCode] = useState('0');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [payloadFormat, setPayloadFormat] = useState<'ascii' | 'hex'>('ascii');
  
  // Packet sending controls
  const [packetCount, setPacketCount] = useState('1');
  const [pps, setPps] = useState('1');
  const [isContinuous, setIsContinuous] = useState(false);

  const protocols = ['TCP', 'UDP', 'ICMP', 'ARP', 'IP'];
  const tcpFlags = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'];

  const handleFlagToggle = (flag: string) => {
    setFlags(prev => 
      prev.includes(flag) ? prev.filter(f => f !== flag) : [...prev, flag]
    );
  };

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
        payload,
        payload_format: payloadFormat,
        flags: protocol === 'TCP' ? flags : undefined,
        // Advanced header fields
        ttl: ttl ? parseInt(ttl) : undefined,
        ip_id: ipId ? parseInt(ipId) : undefined,
        tos: tos ? parseInt(tos) : undefined,
        tcp_seq: tcpSeq ? parseInt(tcpSeq) : undefined,
        tcp_ack: tcpAck ? parseInt(tcpAck) : undefined,
        tcp_window: tcpWindow ? parseInt(tcpWindow) : undefined,
        icmp_type: protocol === 'ICMP' && icmpType ? parseInt(icmpType) : undefined,
        icmp_code: protocol === 'ICMP' && icmpCode ? parseInt(icmpCode) : undefined,
        // Multi-packet sending
        packet_count: count,
        pps: packetsPerSecond,
      };

      const res = await fetch('/api/v1/traffic/craft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(packetData),
      });

      const data = await res.json();
      setResponse(data);
    } catch (err) {
      console.error('Failed to send packet:', err);
      setResponse({
        success: false,
        error: 'Failed to send packet. Please check network permissions, destination IP validity, or try a different protocol.',
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-cyber-darker p-4 border border-cyber-gray">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="px-4 py-1 border border-cyber-blue text-cyber-blue text-xs uppercase hover:bg-cyber-blue hover:text-black transition-all"
          >
            ← Back to Traffic
          </button>
          <h2 className="text-cyber-purple font-bold uppercase tracking-widest text-sm">
            Packet Crafting
          </h2>
        </div>
      </div>

      {/* Main Content - Three Panel Layout */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Left Panel - Packet Definition Form */}
        <div className="w-1/2 flex flex-col gap-4">
          <div className="flex-1 bg-cyber-dark border border-cyber-gray flex flex-col">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
              <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">
                Packet Definition
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              <div className="grid grid-cols-2 gap-6">
              {/* Protocol Selection */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-gray-light font-bold uppercase">Protocol</label>
                <select
                  value={protocol}
                  onChange={(e) => setProtocol(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple"
                >
                  {protocols.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              {/* Source IP */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-gray-light font-bold uppercase">Source IP</label>
                <input
                  type="text"
                  value={sourceIp}
                  onChange={(e) => setSourceIp(e.target.value)}
                  placeholder="e.g., 192.168.1.100"
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                />
              </div>

              {/* Destination IP */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-gray-light font-bold uppercase">Destination IP</label>
                <input
                  type="text"
                  value={destIp}
                  onChange={(e) => setDestIp(e.target.value)}
                  placeholder="e.g., 192.168.1.1"
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                />
              </div>

              {/* Source Port (TCP/UDP only) */}
              {(protocol === 'TCP' || protocol === 'UDP') && (
                <div className="space-y-2">
                  <label className="text-xs text-cyber-gray-light font-bold uppercase">Source Port</label>
                  <input
                    type="number"
                    value={sourcePort}
                    onChange={(e) => setSourcePort(e.target.value)}
                    placeholder="e.g., 12345"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                  />
                </div>
              )}

              {/* Destination Port (TCP/UDP only) */}
              {(protocol === 'TCP' || protocol === 'UDP') && (
                <div className="space-y-2">
                  <label className="text-xs text-cyber-gray-light font-bold uppercase">Destination Port</label>
                  <input
                    type="number"
                    value={destPort}
                    onChange={(e) => setDestPort(e.target.value)}
                    placeholder="e.g., 80"
                    className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                  />
                </div>
              )}

              {/* TCP Flags */}
              {protocol === 'TCP' && (
                <div className="col-span-2 space-y-2">
                  <label className="text-xs text-cyber-gray-light font-bold uppercase">TCP Flags</label>
                  <div className="flex space-x-4">
                    {tcpFlags.map(flag => (
                      <label key={flag} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={flags.includes(flag)}
                          onChange={() => handleFlagToggle(flag)}
                          className="form-checkbox bg-cyber-darker border-cyber-gray text-cyber-purple focus:ring-cyber-purple"
                        />
                        <span className="text-xs text-cyber-blue">{flag}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Payload */}
              <div className="col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-cyber-gray-light font-bold uppercase">Payload / Data</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setPayloadFormat('ascii')}
                      className={`px-3 py-1 text-[10px] uppercase transition-all ${
                        payloadFormat === 'ascii'
                          ? 'bg-cyber-purple text-white border border-cyber-purple'
                          : 'bg-cyber-darker text-cyber-gray-light border border-cyber-gray hover:border-cyber-purple'
                      }`}
                    >
                      ASCII
                    </button>
                    <button
                      onClick={() => setPayloadFormat('hex')}
                      className={`px-3 py-1 text-[10px] uppercase transition-all ${
                        payloadFormat === 'hex'
                          ? 'bg-cyber-purple text-white border border-cyber-purple'
                          : 'bg-cyber-darker text-cyber-gray-light border border-cyber-gray hover:border-cyber-purple'
                      }`}
                    >
                      HEX
                    </button>
                  </div>
                </div>
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder={payloadFormat === 'hex' 
                    ? "Enter hex bytes (e.g., 48656c6c6f or 48 65 6c 6c 6f)" 
                    : "Enter ASCII text (e.g., Hello World)"}
                  rows={4}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono resize-none"
                />
                {payloadFormat === 'hex' && payload && (
                  <div className="text-[10px] text-cyber-gray-light">
                    {payload.replace(/\s/g, '').match(/.{1,2}/g)?.length || 0} bytes
                  </div>
                )}
                {payloadFormat === 'ascii' && payload && (
                  <div className="text-[10px] text-cyber-gray-light">
                    {payload.length} characters ({new Blob([payload]).size} bytes)
                  </div>
                )}
              </div>

              {/* Advanced Options Toggle */}
              <div className="col-span-2">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="px-4 py-1 border border-cyber-gray text-cyber-gray-light text-xs uppercase hover:border-cyber-purple hover:text-cyber-purple transition-all"
                >
                  {showAdvanced ? '▼ Hide Advanced Options' : '▶ Show Advanced Options'}
                </button>
              </div>

              {/* Advanced Header Fields */}
              {showAdvanced && (
                <>
                  <div className="col-span-2 border-t border-cyber-gray pt-4 mb-2">
                    <h4 className="text-xs text-cyber-purple font-bold uppercase">IP Header Options</h4>
                  </div>

                  {/* TTL */}
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-gray-light font-bold uppercase">TTL (Time To Live)</label>
                    <input
                      type="number"
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                      placeholder="64"
                      min="1"
                      max="255"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                    />
                  </div>

                  {/* IP ID */}
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-gray-light font-bold uppercase">IP ID (Identification)</label>
                    <input
                      type="number"
                      value={ipId}
                      onChange={(e) => setIpId(e.target.value)}
                      placeholder="Auto"
                      min="0"
                      max="65535"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                    />
                  </div>

                  {/* TOS */}
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-gray-light font-bold uppercase">TOS (Type of Service)</label>
                    <input
                      type="number"
                      value={tos}
                      onChange={(e) => setTos(e.target.value)}
                      placeholder="0"
                      min="0"
                      max="255"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                    />
                  </div>

                  {/* TCP Header Options */}
                  {protocol === 'TCP' && (
                    <>
                      <div className="col-span-2 border-t border-cyber-gray pt-4 mb-2 mt-4">
                        <h4 className="text-xs text-cyber-purple font-bold uppercase">TCP Header Options</h4>
                      </div>

                      {/* TCP Sequence Number */}
                      <div className="space-y-2">
                        <label className="text-xs text-cyber-gray-light font-bold uppercase">Sequence Number</label>
                        <input
                          type="number"
                          value={tcpSeq}
                          onChange={(e) => setTcpSeq(e.target.value)}
                          placeholder="Auto"
                          min="0"
                          max="4294967295"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                        />
                      </div>

                      {/* TCP Acknowledgment Number */}
                      <div className="space-y-2">
                        <label className="text-xs text-cyber-gray-light font-bold uppercase">Acknowledgment Number</label>
                        <input
                          type="number"
                          value={tcpAck}
                          onChange={(e) => setTcpAck(e.target.value)}
                          placeholder="Auto"
                          min="0"
                          max="4294967295"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                        />
                      </div>

                      {/* TCP Window Size */}
                      <div className="space-y-2">
                        <label className="text-xs text-cyber-gray-light font-bold uppercase">Window Size</label>
                        <input
                          type="number"
                          value={tcpWindow}
                          onChange={(e) => setTcpWindow(e.target.value)}
                          placeholder="8192"
                          min="0"
                          max="65535"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                        />
                      </div>
                    </>
                  )}

                  {/* ICMP Header Options */}
                  {protocol === 'ICMP' && (
                    <>
                      <div className="col-span-2 border-t border-cyber-gray pt-4 mb-2 mt-4">
                        <h4 className="text-xs text-cyber-purple font-bold uppercase">ICMP Header Options</h4>
                      </div>

                      {/* ICMP Type */}
                      <div className="space-y-2">
                        <label className="text-xs text-cyber-gray-light font-bold uppercase">ICMP Type</label>
                        <input
                          type="number"
                          value={icmpType}
                          onChange={(e) => setIcmpType(e.target.value)}
                          placeholder="8 (Echo Request)"
                          min="0"
                          max="255"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                        />
                      </div>

                      {/* ICMP Code */}
                      <div className="space-y-2">
                        <label className="text-xs text-cyber-gray-light font-bold uppercase">ICMP Code</label>
                        <input
                          type="number"
                          value={icmpCode}
                          onChange={(e) => setIcmpCode(e.target.value)}
                          placeholder="0"
                          min="0"
                          max="255"
                          className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Packet Sending Controls */}
              <div className="col-span-2 border-t border-cyber-gray pt-4 mt-4">
                <h4 className="text-xs text-cyber-purple font-bold uppercase mb-4">Sending Options</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-gray-light font-bold uppercase">Packet Count</label>
                    <input
                      type="number"
                      value={packetCount}
                      onChange={(e) => {
                        setPacketCount(e.target.value);
                        setIsContinuous(e.target.value === '0');
                      }}
                      placeholder="1 (0 = continuous)"
                      min="0"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                    />
                    <div className="text-[10px] text-cyber-gray-light">
                      {packetCount === '0' ? 'Continuous sending mode' : `Send ${packetCount} packet(s)`}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs text-cyber-gray-light font-bold uppercase">PPS (Packets/Second)</label>
                    <input
                      type="number"
                      value={pps}
                      onChange={(e) => setPps(e.target.value)}
                      placeholder="1"
                      min="1"
                      max="10000"
                      className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono"
                    />
                    <div className="text-[10px] text-cyber-gray-light">
                      Rate: {pps} packets per second
                    </div>
                  </div>
                </div>
              </div>

              {/* Send Button */}
              <div className="col-span-2">
                <button
                  onClick={handleSendPacket}
                  disabled={isSending || !destIp}
                  className="px-8 py-2 border-2 border-cyber-green text-cyber-green font-bold uppercase tracking-widest text-sm hover:bg-cyber-green hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Sending...' : (isContinuous ? 'Start Continuous Send' : 'Send Packet')}
                </button>
              </div>
            </div>
          </div>
          
          {/* Response and Trace - Bottom of Left Panel */}
          <div className="h-1/3 bg-cyber-dark border border-cyber-gray flex flex-col">
            <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
              <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">
                Response & Trace
              </span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
              {!response && (
                <div className="flex items-center justify-center h-full text-cyber-gray-light text-sm">
                  No response yet. Send a packet to see the results.
                </div>
              )}

            {response && (
              <div className="space-y-4 font-mono text-xs">
                {/* Status */}
                <div className="space-y-2">
                  <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">
                    Status
                  </h4>
                  <div className={`p-3 border ${response.success ? 'border-cyber-green text-cyber-green' : 'border-cyber-red text-cyber-red'} bg-black`}>
                    {response.success ? '✓ Packet sent successfully' : `✗ Error: ${response.error}`}
                  </div>
                </div>

                {/* Sent Packet Info */}
                {response.sent_packet && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">
                      Sent Packet
                    </h4>
                    <div className="p-3 bg-black border border-cyber-gray text-cyber-blue">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(response.sent_packet, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Response */}
                {response.response && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">
                      Response Packet
                    </h4>
                    <div className="p-3 bg-black border border-cyber-gray text-cyber-green">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(response.response, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Trace */}
                {response.trace && response.trace.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] text-cyber-purple font-bold uppercase border-b border-cyber-gray pb-1">
                      Trace
                    </h4>
                    <div className="p-3 bg-black border border-cyber-gray text-cyber-gray-light space-y-1">
                      {response.trace.map((line, idx) => (
                        <div key={idx}>{line}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Right Panel - Packet Structure Visualization */}
        <div className="w-1/2 bg-cyber-dark border border-cyber-gray flex flex-col">
          <div className="bg-cyber-darker px-4 py-2 border-b border-cyber-gray">
            <span className="text-[10px] text-cyber-purple font-bold uppercase tracking-widest">
              Packet Structure (Editable)
            </span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            <div className="space-y-4 font-mono text-xs">
              {/* Ethernet Header */}
              <div className="border border-cyber-gray bg-black p-4">
                <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                  Ethernet II
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Destination MAC:</div>
                    <input 
                      type="text" 
                      placeholder="Auto"
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Source MAC:</div>
                    <input 
                      type="text" 
                      placeholder="Auto"
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Type:</div>
                    <div className="text-cyber-blue">0x0800 (IPv4)</div>
                  </div>
                </div>
              </div>

              {/* IP Header */}
              <div className="border border-cyber-gray bg-black p-4">
                <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                  Internet Protocol Version 4
                </h4>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Version:</div>
                    <div className="text-cyber-blue">4</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Header Length:</div>
                    <div className="text-cyber-blue">20 bytes</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">TOS:</div>
                    <input 
                      type="number" 
                      value={tos}
                      onChange={(e) => setTos(e.target.value)}
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Total Length:</div>
                    <div className="text-cyber-blue">Auto</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Identification:</div>
                    <input 
                      type="number" 
                      value={ipId}
                      onChange={(e) => setIpId(e.target.value)}
                      placeholder="Auto"
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Flags:</div>
                    <div className="text-cyber-blue">0x0 (Don't Fragment)</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Fragment Offset:</div>
                    <div className="text-cyber-blue">0</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">TTL:</div>
                    <input 
                      type="number" 
                      value={ttl}
                      onChange={(e) => setTtl(e.target.value)}
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Protocol:</div>
                    <div className="text-cyber-blue">{protocol === 'TCP' ? '6 (TCP)' : protocol === 'UDP' ? '17 (UDP)' : protocol === 'ICMP' ? '1 (ICMP)' : protocol}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Header Checksum:</div>
                    <div className="text-cyber-blue">Auto</div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Source IP:</div>
                    <input 
                      type="text" 
                      value={sourceIp}
                      onChange={(e) => setSourceIp(e.target.value)}
                      placeholder="Auto"
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-cyber-gray-light">Destination IP:</div>
                    <input 
                      type="text" 
                      value={destIp}
                      onChange={(e) => setDestIp(e.target.value)}
                      className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                    />
                  </div>
                </div>
              </div>

              {/* TCP Header */}
              {protocol === 'TCP' && (
                <div className="border border-cyber-gray bg-black p-4">
                  <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                    Transmission Control Protocol
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Source Port:</div>
                      <input 
                        type="number" 
                        value={sourcePort}
                        onChange={(e) => setSourcePort(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Destination Port:</div>
                      <input 
                        type="number" 
                        value={destPort}
                        onChange={(e) => setDestPort(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Sequence Number:</div>
                      <input 
                        type="number" 
                        value={tcpSeq}
                        onChange={(e) => setTcpSeq(e.target.value)}
                        placeholder="Auto"
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Ack Number:</div>
                      <input 
                        type="number" 
                        value={tcpAck}
                        onChange={(e) => setTcpAck(e.target.value)}
                        placeholder="Auto"
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Header Length:</div>
                      <div className="text-cyber-blue">20 bytes</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Flags:</div>
                      <div className="text-cyber-blue">{flags.length > 0 ? flags.join(', ') : 'None'}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Window Size:</div>
                      <input 
                        type="number" 
                        value={tcpWindow}
                        onChange={(e) => setTcpWindow(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Checksum:</div>
                      <div className="text-cyber-blue">Auto</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Urgent Pointer:</div>
                      <div className="text-cyber-blue">0</div>
                    </div>
                  </div>
                </div>
              )}

              {/* UDP Header */}
              {protocol === 'UDP' && (
                <div className="border border-cyber-gray bg-black p-4">
                  <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                    User Datagram Protocol
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Source Port:</div>
                      <input 
                        type="number" 
                        value={sourcePort}
                        onChange={(e) => setSourcePort(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Destination Port:</div>
                      <input 
                        type="number" 
                        value={destPort}
                        onChange={(e) => setDestPort(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Length:</div>
                      <div className="text-cyber-blue">Auto</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Checksum:</div>
                      <div className="text-cyber-blue">Auto</div>
                    </div>
                  </div>
                </div>
              )}

              {/* ICMP Header */}
              {protocol === 'ICMP' && (
                <div className="border border-cyber-gray bg-black p-4">
                  <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                    Internet Control Message Protocol
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Type:</div>
                      <input 
                        type="number" 
                        value={icmpType}
                        onChange={(e) => setIcmpType(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Code:</div>
                      <input 
                        type="number" 
                        value={icmpCode}
                        onChange={(e) => setIcmpCode(e.target.value)}
                        className="bg-cyber-darker border border-cyber-gray text-cyber-blue text-xs p-1 outline-none focus:border-cyber-purple"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Checksum:</div>
                      <div className="text-cyber-blue">Auto</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Payload */}
              {payload && (
                <div className="border border-cyber-gray bg-black p-4">
                  <h4 className="text-[10px] text-cyber-purple font-bold uppercase mb-3 border-b border-cyber-gray pb-1">
                    Payload Data
                  </h4>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Format:</div>
                      <div className="text-cyber-blue uppercase">{payloadFormat}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-cyber-gray-light">Length:</div>
                      <div className="text-cyber-blue">
                        {payloadFormat === 'hex' 
                          ? `${payload.replace(/\s/g, '').match(/.{1,2}/g)?.length || 0} bytes`
                          : `${payload.length} chars (${new Blob([payload]).size} bytes)`
                        }
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-cyber-gray-light mb-1">Preview:</div>
                      <div className="text-cyber-blue break-all text-[10px] max-h-20 overflow-y-auto">
                        {payload.substring(0, 100)}{payload.length > 100 ? '...' : ''}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PacketCrafting;
