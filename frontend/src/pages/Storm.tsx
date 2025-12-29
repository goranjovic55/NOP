import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';

interface StormMetrics {
  packets_sent: number;
  bytes_sent: number;
  duration_seconds: number;
  current_pps: number;
  target_pps: number;
  start_time: string;
}

interface Interface {
  name: string;
  ip: string;
  activity: number[];
}

const Storm: React.FC = () => {
  const [interfaces, setInterfaces] = useState<Interface[]>([]);
  const [selectedIface, setSelectedIface] = useState<string>('');
  const [isStormActive, setIsStormActive] = useState(false);
  
  // Packet configuration
  const [packetType, setPacketType] = useState<'broadcast' | 'multicast' | 'tcp' | 'udp' | 'raw_ip'>('tcp');
  const [sourceIp, setSourceIp] = useState('');
  const [destIp, setDestIp] = useState('255.255.255.255');
  const [sourcePort, setSourcePort] = useState('');
  const [destPort, setDestPort] = useState('80');
  const [pps, setPps] = useState('100');
  const [payload, setPayload] = useState('');
  const [ttl, setTtl] = useState('64');
  
  // TCP specific
  const [tcpFlags, setTcpFlags] = useState<string[]>(['SYN']);
  
  // Metrics
  const [metrics, setMetrics] = useState<StormMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Array<{ time: number; pps: number; bps: number }>>([]);
  
  const { token } = useAuthStore();
  const metricsIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetchInterfaces();
    const interval = setInterval(fetchInterfaces, 5000);
    return () => {
      clearInterval(interval);
      stopStorm();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`/api/v1/traffic/storm/metrics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMetrics(data);
        
        // Update history
        const now = Date.now();
        setMetricsHistory(prev => {
          const newHistory = [...prev, {
            time: now,
            pps: data.current_pps,
            bps: data.bytes_sent
          }];
          // Keep last 60 data points
          return newHistory.slice(-60);
        });
      }
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    }
  };

  const startStorm = async () => {
    // Validation
    if (!destIp) {
      alert('Destination IP is required');
      return;
    }

    if ((packetType === 'tcp' || packetType === 'udp') && !destPort) {
      alert('Destination port is required for TCP/UDP');
      return;
    }

    const ppsValue = parseInt(pps);
    if (isNaN(ppsValue) || ppsValue < 1 || ppsValue > 100000) {
      alert('PPS must be between 1 and 100,000');
      return;
    }

    const config = {
      interface: selectedIface,
      packet_type: packetType,
      source_ip: sourceIp || null,
      dest_ip: destIp,
      source_port: sourcePort ? parseInt(sourcePort) : null,
      dest_port: destPort ? parseInt(destPort) : null,
      pps: ppsValue,
      payload: payload,
      ttl: parseInt(ttl),
      tcp_flags: tcpFlags
    };

    try {
      const response = await fetch(`/api/v1/traffic/storm/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setIsStormActive(true);
        setMetrics(null);
        setMetricsHistory([]);
        
        // Start polling metrics
        metricsIntervalRef.current = window.setInterval(fetchMetrics, 1000);
      } else {
        const error = await response.json();
        alert(`Failed to start storm: ${error.detail || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to start storm:', err);
      alert('Failed to start storm: Network error');
    }
  };

  const stopStorm = async () => {
    try {
      const response = await fetch(`/api/v1/traffic/storm/stop`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        setIsStormActive(false);
        
        // Stop polling metrics
        if (metricsIntervalRef.current) {
          clearInterval(metricsIntervalRef.current);
          metricsIntervalRef.current = null;
        }
        
        // Fetch final metrics
        await fetchMetrics();
      }
    } catch (err) {
      console.error('Failed to stop storm:', err);
    }
  };

  const toggleTcpFlag = (flag: string) => {
    setTcpFlags(prev => 
      prev.includes(flag) 
        ? prev.filter(f => f !== flag)
        : [...prev, flag]
    );
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00f0ff] mb-2">PACKET STORM</h1>
        <p className="text-sm text-gray-400">Test network storm protection by generating high-volume packet traffic</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Panel */}
        <div className="bg-gray-900 border border-[#00f0ff]/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#00f0ff] mb-4">CONFIGURATION</h2>
          
          {/* Interface Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Interface</label>
            <select
              value={selectedIface}
              onChange={(e) => setSelectedIface(e.target.value)}
              disabled={isStormActive}
              className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
            >
              {interfaces.map(iface => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} ({iface.ip})
                </option>
              ))}
            </select>
          </div>

          {/* Packet Type */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Packet Type</label>
            <select
              value={packetType}
              onChange={(e) => setPacketType(e.target.value as 'broadcast' | 'multicast' | 'tcp' | 'udp' | 'raw_ip')}
              disabled={isStormActive}
              className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
            >
              <option value="broadcast">Broadcast</option>
              <option value="multicast">Multicast</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
              <option value="raw_ip">Raw IP</option>
            </select>
          </div>

          {/* IP Addresses */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm text-gray-400 mb-2">Source IP (optional)</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                disabled={isStormActive}
                placeholder="Auto"
                className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-2">Destination IP</label>
              <input
                type="text"
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                disabled={isStormActive}
                className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
              />
            </div>
          </div>

          {/* Ports (TCP/UDP only) */}
          {(packetType === 'tcp' || packetType === 'udp') && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Source Port (optional)</label>
                <input
                  type="text"
                  value={sourcePort}
                  onChange={(e) => setSourcePort(e.target.value)}
                  disabled={isStormActive}
                  placeholder="Random"
                  className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">Destination Port</label>
                <input
                  type="text"
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  disabled={isStormActive}
                  className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* TCP Flags */}
          {packetType === 'tcp' && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">TCP Flags</label>
              <div className="flex flex-wrap gap-2">
                {['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'].map(flag => (
                  <button
                    key={flag}
                    onClick={() => toggleTcpFlag(flag)}
                    disabled={isStormActive}
                    className={`px-3 py-1 rounded text-xs font-mono ${
                      tcpFlags.includes(flag)
                        ? 'bg-[#00f0ff] text-gray-900'
                        : 'bg-gray-800 text-gray-400 border border-gray-700'
                    } disabled:opacity-50`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PPS */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Packets per Second (PPS)</label>
            <input
              type="number"
              value={pps}
              onChange={(e) => setPps(e.target.value)}
              disabled={isStormActive}
              min="1"
              max="100000"
              className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
            />
          </div>

          {/* TTL */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">TTL</label>
            <input
              type="number"
              value={ttl}
              onChange={(e) => setTtl(e.target.value)}
              disabled={isStormActive}
              min="1"
              max="255"
              className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
            />
          </div>

          {/* Payload */}
          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-2">Payload (optional)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              disabled={isStormActive}
              placeholder="Enter payload data..."
              rows={3}
              className="w-full bg-gray-800 border border-[#00f0ff]/30 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#00f0ff] disabled:opacity-50"
            />
          </div>

          {/* Control Buttons */}
          <div className="flex gap-3">
            {!isStormActive ? (
              <button
                onClick={startStorm}
                className="flex-1 bg-[#00f0ff] hover:bg-[#00d0df] text-gray-900 font-bold py-3 px-4 rounded transition-colors"
              >
                START STORM
              </button>
            ) : (
              <button
                onClick={stopStorm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded transition-colors"
              >
                STOP STORM
              </button>
            )}
          </div>
        </div>

        {/* Metrics Panel */}
        <div className="bg-gray-900 border border-[#00f0ff]/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-[#00f0ff] mb-4">METRICS</h2>
          
          {!isStormActive && !metrics && (
            <div className="text-center text-gray-500 py-12">
              <p>Start a storm to see metrics</p>
            </div>
          )}

          {metrics && (
            <div className="space-y-4">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 mb-6">
                <div className={`w-3 h-3 rounded-full ${isStormActive ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
                <span className={`text-sm font-medium ${isStormActive ? 'text-red-400' : 'text-gray-500'}`}>
                  {isStormActive ? 'STORM ACTIVE' : 'STORM STOPPED'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4">
                  <div className="text-xs text-gray-400 mb-1">Packets Sent</div>
                  <div className="text-2xl font-bold text-white font-mono">{metrics.packets_sent.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4">
                  <div className="text-xs text-gray-400 mb-1">Bytes Sent</div>
                  <div className="text-2xl font-bold text-white font-mono">{formatBytes(metrics.bytes_sent)}</div>
                </div>
                
                <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4">
                  <div className="text-xs text-gray-400 mb-1">Current PPS</div>
                  <div className="text-2xl font-bold text-[#00f0ff] font-mono">{metrics.current_pps.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4">
                  <div className="text-xs text-gray-400 mb-1">Target PPS</div>
                  <div className="text-2xl font-bold text-white font-mono">{metrics.target_pps.toLocaleString()}</div>
                </div>
                
                <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4 col-span-2">
                  <div className="text-xs text-gray-400 mb-1">Duration</div>
                  <div className="text-2xl font-bold text-white font-mono">{formatDuration(metrics.duration_seconds)}</div>
                </div>
              </div>

              {/* Chart */}
              {metricsHistory.length > 1 && (
                <div className="mt-6">
                  <div className="text-xs text-gray-400 mb-2">Packets per Second (Last 60s)</div>
                  <div className="bg-gray-800/50 border border-[#00f0ff]/20 rounded p-4">
                    <svg width="100%" height="120" className="overflow-visible">
                      {(() => {
                        const maxPps = Math.max(...metricsHistory.map(h => h.pps), 1);
                        const width = 100; // percentage
                        const height = 100;
                        const step = width / (metricsHistory.length - 1 || 1);
                        const points = metricsHistory.map((h, i) => 
                          `${(i * step)}%,${height - (h.pps / maxPps) * height}%`
                        ).join(' ');
                        return (
                          <>
                            <polyline 
                              points={points} 
                              fill="none" 
                              stroke="#00f0ff" 
                              strokeWidth="2" 
                              vectorEffect="non-scaling-stroke"
                            />
                            {metricsHistory.map((h, i) => (
                              <circle
                                key={i}
                                cx={`${i * step}%`}
                                cy={`${height - (h.pps / maxPps) * height}%`}
                                r="2"
                                fill="#00f0ff"
                              />
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>
              )}

              {/* Average Stats */}
              {metricsHistory.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Avg PPS:</span>
                      <span className="ml-2 text-white font-mono">
                        {Math.round(metricsHistory.reduce((acc, h) => acc + h.pps, 0) / metricsHistory.length).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Peak PPS:</span>
                      <span className="ml-2 text-white font-mono">
                        {metricsHistory.length > 0 ? Math.max(...metricsHistory.map(h => h.pps)).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Warning */}
      <div className="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-yellow-500 text-xl">⚠️</span>
          <div>
            <h3 className="text-yellow-500 font-semibold mb-1">Warning</h3>
            <p className="text-sm text-gray-300">
              Packet storm testing generates high-volume traffic that may trigger network protection mechanisms 
              or overwhelm network devices. Use responsibly and only in controlled test environments.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storm;
