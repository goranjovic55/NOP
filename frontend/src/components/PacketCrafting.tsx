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
      const packetData = {
        protocol,
        source_ip: sourceIp,
        dest_ip: destIp,
        source_port: sourcePort ? parseInt(sourcePort) : undefined,
        dest_port: destPort ? parseInt(destPort) : undefined,
        payload,
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

      {/* Split View Container */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        {/* Top Half - Packet Definition Form */}
        <div className="h-1/2 bg-cyber-dark border border-cyber-gray flex flex-col">
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
                <label className="text-xs text-cyber-gray-light font-bold uppercase">Payload / Data</label>
                <textarea
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  placeholder="Enter payload data (hex or ASCII)"
                  rows={4}
                  className="w-full bg-cyber-darker border border-cyber-gray text-cyber-blue text-sm p-2 outline-none focus:border-cyber-purple font-mono resize-none"
                />
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

              {/* Send Button */}
              <div className="col-span-2">
                <button
                  onClick={handleSendPacket}
                  disabled={isSending || !destIp}
                  className="px-8 py-2 border-2 border-cyber-green text-cyber-green font-bold uppercase tracking-widest text-sm hover:bg-cyber-green hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? 'Sending...' : 'Send Packet'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Half - Response and Trace */}
        <div className="flex-1 bg-cyber-dark border border-cyber-gray flex flex-col min-h-0">
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
    </div>
  );
};

export default PacketCrafting;
