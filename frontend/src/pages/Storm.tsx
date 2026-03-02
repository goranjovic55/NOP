import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../store/authStore';
import { CyberSectionHeader, CyberPageTitle } from '../components/CyberUI';

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

interface Asset {
  id: number;
  ip: string;
  hostname: string;
}

interface PingStatus {
  host: string;
  reachable: boolean;
  latency: number | null;
  last_check: string;
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
  
  // Live host monitoring
  const [liveHost, setLiveHost] = useState('');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [pingStatus, setPingStatus] = useState<PingStatus | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  
  // Metrics
  const [metrics, setMetrics] = useState<StormMetrics | null>(null);
  const [metricsHistory, setMetricsHistory] = useState<Array<{ time: number; pps: number; bps: number }>>([]);
  
  const { token } = useAuthStore();
  const metricsIntervalRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    fetchInterfaces();
    fetchAssets();
    const interval = setInterval(fetchInterfaces, 5000);
    return () => {
      clearInterval(interval);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
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

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/v1/assets/discovered`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setAssets(data);
    } catch (err) {
      console.error('Failed to fetch assets:', err);
    }
  };

  const pingHost = async (host: string) => {
    try {
      const response = await fetch(`/api/v1/traffic/ping`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ host })
      });
      const data = await response.json();
      setPingStatus(data);
      return data.reachable;
    } catch (err) {
      console.error('Failed to ping host:', err);
      return false;
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

    // Ping live host first if configured (non-blocking - proceed after 5s timeout)
    if (liveHost) {
      setIsPinging(true);
      
      // Ping for 5 seconds to establish baseline (non-blocking)
      const pingPromises = [];
      for (let i = 0; i < 5; i++) {
        pingPromises.push(pingHost(liveHost));
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      setIsPinging(false);
      // Continue regardless of ping result - monitoring will show status
    }

    if ((packetType === 'tcp' || packetType === 'udp') && !destPort) {
      alert('Destination port is required for TCP/UDP');
      return;
    }

    const ppsValue = parseInt(pps);
    if (isNaN(ppsValue) || ppsValue < 1 || ppsValue > 10000000) {
      alert('PPS must be between 1 and 10,000,000');
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
        
        // Start continuous ping monitoring if live host configured
        if (liveHost) {
          pingIntervalRef.current = window.setInterval(() => pingHost(liveHost), 2000);
        }
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
        
        // Stop ping monitoring
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
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
    <div className="flex flex-col h-full p-4 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="bg-cyber-darker p-3 border border-cyber-gray flex-shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <CyberPageTitle color="blue">Packet Storm</CyberPageTitle>
            <p className="text-[10px] text-cyber-gray-light mt-1">Test network storm protection mechanisms</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Configuration Panel */}
        <div className="cyber-panel flex flex-col">
          <CyberSectionHeader title="Configuration" />
          <div className="p-4">
          <div className="space-y-2">
          
          {/* Interface Selection and Packet Type */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">Interface</label>
              <select
                value={selectedIface}
                onChange={(e) => setSelectedIface(e.target.value)}
                disabled={isStormActive}
                className="w-full bg-cyber-dark border border-cyber-gray px-2 py-2 text-cyber-blue text-xs font-mono focus:outline-none focus:border-cyber-blue disabled:opacity-50"
              >
                {interfaces.map(iface => (
                  <option key={iface.name} value={iface.name}>
                    {iface.name} ({iface.ip})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">Packet Type</label>
              <select
                value={packetType}
                onChange={(e) => setPacketType(e.target.value as 'broadcast' | 'multicast' | 'tcp' | 'udp' | 'raw_ip')}
                disabled={isStormActive}
                className="w-full bg-cyber-dark border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-blue disabled:opacity-50"
              >
                <option value="broadcast">Broadcast</option>
                <option value="multicast">Multicast</option>
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="raw_ip">Raw IP</option>
              </select>
            </div>
          </div>

          {/* Live Host Monitoring */}
          <div className="space-y-1 border border-cyber-purple/30 p-2 bg-cyber-dark/30">
            <label className="text-[10px] text-cyber-purple font-bold uppercase">Live Host Monitor (Optional)</label>
            <div className="relative">
              <input
                type="text"
                value={liveHost}
                onChange={(e) => setLiveHost(e.target.value)}
                onFocus={() => setShowAssetDropdown(true)}
                onBlur={() => setTimeout(() => setShowAssetDropdown(false), 200)}
                disabled={isStormActive || isPinging}
                placeholder="Enter IP or select from assets"
                className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-purple text-xs font-mono focus:outline-none focus:border-cyber-purple disabled:opacity-50"
              />
              {showAssetDropdown && assets.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-cyber-darker border border-cyber-purple max-h-40 overflow-y-auto custom-scrollbar">
                  {assets.map(asset => (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setLiveHost(asset.ip);
                        setShowAssetDropdown(false);
                      }}
                      className="px-2 py-1 text-cyber-purple text-xs font-mono hover:bg-cyber-purple/20 cursor-pointer"
                    >
                      <span className="text-cyber-blue">{asset.hostname || 'Unknown'}</span>
                      <span className="text-cyber-gray ml-2">{asset.ip}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-[9px] text-cyber-gray-light leading-tight">Will ping before/during storm (proceeds after 5s timeout)</p>
          </div>

          {/* IP Addresses */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">Source IP (opt)</label>
              <input
                type="text"
                value={sourceIp}
                onChange={(e) => setSourceIp(e.target.value)}
                disabled={isStormActive}
                placeholder="Auto"
                className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">Destination IP</label>
              <input
                type="text"
                value={destIp}
                onChange={(e) => setDestIp(e.target.value)}
                disabled={isStormActive}
                className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
              />
            </div>
          </div>

          {/* Ports (TCP/UDP only) */}
          {(packetType === 'tcp' || packetType === 'udp') && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[10px] text-cyber-blue font-bold uppercase">Source Port (opt)</label>
                <input
                  type="text"
                  value={sourcePort}
                  onChange={(e) => setSourcePort(e.target.value)}
                  disabled={isStormActive}
                  placeholder="Random"
                  className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-cyber-blue font-bold uppercase">Destination Port</label>
                <input
                  type="text"
                  value={destPort}
                  onChange={(e) => setDestPort(e.target.value)}
                  disabled={isStormActive}
                  className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
                />
              </div>
            </div>
          )}

          {/* TCP Flags */}
          {packetType === 'tcp' && (
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">TCP Flags</label>
              <div className="flex flex-wrap gap-2">
                {['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'].map(flag => (
                  <button
                    key={flag}
                    onClick={() => toggleTcpFlag(flag)}
                    disabled={isStormActive}
                    className={`px-2 py-1 text-[10px] font-mono font-bold uppercase transition-all ${
                      tcpFlags.includes(flag)
                        ? 'bg-cyber-blue text-black border border-cyber-blue'
                        : 'bg-cyber-dark text-cyber-gray-light border border-cyber-gray hover:border-cyber-blue hover:text-cyber-blue'
                    } disabled:opacity-50`}
                  >
                    {flag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PPS and TTL */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">PPS</label>
              <input
                type="number"
                value={pps}
                onChange={(e) => setPps(e.target.value)}
                disabled={isStormActive}
                min="1"
                max="10000000"
                className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-cyber-blue font-bold uppercase">TTL</label>
              <input
                type="number"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                disabled={isStormActive}
                min="1"
                max="255"
                className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green text-xs font-mono focus:outline-none focus:border-cyber-green disabled:opacity-50"
              />
            </div>
          </div>

          {/* Payload */}
          <div className="space-y-1">
            <label className="text-[10px] text-cyber-blue font-bold uppercase">Payload (optional)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              disabled={isStormActive}
              placeholder="Enter payload data..."
              className="w-full bg-cyber-darker border border-cyber-gray px-2 py-2 text-cyber-green font-mono text-xs focus:outline-none focus:border-cyber-green disabled:opacity-50 resize-y min-h-[60px]"
            />
          </div>
          </div>

          </div>
          
          {/* Control Buttons */}
          <div className="p-4 border-t border-cyber-gray bg-cyber-darker">
            {!isStormActive ? (
              <button
                onClick={startStorm}
                className="w-full border-2 border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-black font-bold py-2 px-4 transition-all uppercase text-xs tracking-widest"
              >
                Start Storm
              </button>
            ) : (
              <button
                onClick={stopStorm}
                className="w-full border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white font-bold py-2 px-4 transition-all uppercase text-xs tracking-widest"
              >
                Stop Storm
              </button>
            )}
          </div>
        </div>

        {/* Metrics Panel */}
        <div className="cyber-panel flex flex-col">
          <CyberSectionHeader title="Metrics" />
          <div className="p-4">
          
          {!isStormActive && !metrics && (
            <div className="text-center text-cyber-gray-light py-12">
              <p>Start a storm to see metrics</p>
            </div>
          )}

          {metrics && (
            <div className="space-y-2">
              {/* Status Indicator */}
              <div className="flex items-center gap-2 pb-2 border-b border-cyber-gray">
                <span className={`text-xs font-bold uppercase tracking-widest ${
                  isStormActive ? 'text-cyber-red' : 'text-cyber-gray-light'
                }`}>
                  {isStormActive ? '● STORM ACTIVE' : '○ STORM STOPPED'}
                </span>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-cyber-dark/50 border border-cyber-gray p-2">
                  <div className="text-[9px] text-cyber-gray-light mb-0.5 uppercase">Packets Sent</div>
                  <div className="text-lg font-bold text-white font-mono">{metrics.packets_sent.toLocaleString()}</div>
                </div>
                
                <div className="bg-cyber-dark/50 border border-cyber-gray p-2">
                  <div className="text-[9px] text-cyber-gray-light mb-0.5 uppercase">Bytes Sent</div>
                  <div className="text-lg font-bold text-white font-mono">{formatBytes(metrics.bytes_sent)}</div>
                </div>
                
                <div className="bg-cyber-dark/50 border border-cyber-gray p-2">
                  <div className="text-[9px] text-cyber-gray-light mb-0.5 uppercase">Current PPS</div>
                  <div className="text-lg font-bold text-cyber-blue font-mono">{metrics.current_pps.toLocaleString()}</div>
                </div>
                
                <div className="bg-cyber-dark/50 border border-cyber-gray p-2">
                  <div className="text-[9px] text-cyber-gray-light mb-0.5 uppercase">Target PPS</div>
                  <div className="text-lg font-bold text-white font-mono">{metrics.target_pps.toLocaleString()}</div>
                </div>
                
                <div className="bg-cyber-dark/50 border border-cyber-gray p-2 col-span-2">
                  <div className="text-[9px] text-cyber-gray-light mb-0.5 uppercase">Duration</div>
                  <div className="text-lg font-bold text-white font-mono">{formatDuration(metrics.duration_seconds)}</div>
                </div>
              </div>

              {/* Chart */}
              {metricsHistory.length > 1 && (
                <div className="mt-2">
                  <div className="text-[9px] text-cyber-gray-light mb-1.5 uppercase tracking-widest">Packets per Second (Last 60s)</div>
                  <div className="bg-cyber-dark/50 border border-cyber-gray p-2 relative">
                    <div className="flex items-end h-[100px]">
                      {/* Y-axis labels */}
                      <div className="flex flex-col justify-between h-full text-[9px] text-cyber-gray-light font-mono pr-2 border-r border-cyber-gray/30">
                        <div>{metrics.target_pps}</div>
                        <div>{Math.round(metrics.target_pps / 2)}</div>
                        <div>0</div>
                      </div>
                      
                      {/* Chart area */}
                      <div className="flex-1 pl-2">
                        <svg width="100%" height="120" className="overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none">
                          {(() => {
                            const maxPps = metrics.target_pps || 100;
                            const width = 100;
                            const height = 100;
                            const step = width / (metricsHistory.length - 1 || 1);
                            
                            // Target line (reference)
                            const targetY = height - (metrics.target_pps / maxPps) * height;
                            
                            // Actual PPS line points
                            const points = metricsHistory.map((h, i) => 
                              `${(i * step)},${height - (Math.min(h.pps, maxPps) / maxPps) * height}`
                            ).join(' ');
                            
                            // Create filled area under the line
                            const areaPoints = `0,${height} ${points} ${width},${height}`;
                            
                            return (
                              <>
                                {/* Target PPS reference line */}
                                <line
                                  x1="0"
                                  y1={targetY}
                                  x2={width}
                                  y2={targetY}
                                  stroke="#666"
                                  strokeWidth="0.5"
                                  strokeDasharray="2,2"
                                  vectorEffect="non-scaling-stroke"
                                />
                                
                                {/* Filled area under PPS line */}
                                <polygon
                                  points={areaPoints}
                                  fill="url(#gradient)"
                                  opacity="0.3"
                                />
                                
                                {/* Gradient definition */}
                                <defs>
                                  <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.5" />
                                    <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
                                  </linearGradient>
                                </defs>
                                
                                {/* Actual PPS line */}
                                <polyline 
                                  points={points} 
                                  fill="none" 
                                  stroke="#00d4ff" 
                                  strokeWidth="1.5" 
                                  vectorEffect="non-scaling-stroke"
                                />
                              </>
                            );
                          })()}
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Host Ping Status */}
              {liveHost && (pingStatus || isPinging) && (
                <div className="mt-2 pt-2 border-t border-cyber-gray">
                  <div className="text-[9px] text-cyber-gray-light mb-1.5 uppercase tracking-widest">Live Host Status</div>
                  <div className={`bg-cyber-dark/50 border p-2 ${
                    isPinging ? 'border-cyber-yellow' :
                    pingStatus?.reachable ? 'border-cyber-green' : 'border-cyber-red'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-mono text-white">{liveHost}</div>
                        <div className="text-[9px] text-cyber-gray-light mt-1">
                          {isPinging ? 'Checking connectivity...' : 
                           pingStatus?.last_check ? `Last check: ${new Date(pingStatus.last_check).toLocaleTimeString()}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        {isPinging ? (
                          <span className="text-cyber-yellow font-bold uppercase text-xs">● PINGING</span>
                        ) : pingStatus?.reachable ? (
                          <>
                            <span className="text-cyber-green font-bold uppercase text-xs">● ONLINE</span>
                            {pingStatus.latency !== null && (
                              <div className="text-[9px] text-cyber-gray-light mt-1">
                                {pingStatus.latency.toFixed(1)}ms
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-cyber-red font-bold uppercase text-xs">✕ OFFLINE</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Average Stats */}
              {metricsHistory.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cyber-gray">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-cyber-gray-light uppercase text-[9px]">Avg PPS:</span>
                      <span className="ml-2 text-white font-mono font-bold">
                        {Math.round(metricsHistory.reduce((acc, h) => acc + h.pps, 0) / metricsHistory.length).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-cyber-gray-light uppercase text-[9px]">Peak PPS:</span>
                      <span className="ml-2 text-white font-mono font-bold">
                        {metricsHistory.length > 0 ? Math.max(...metricsHistory.map(h => h.pps)).toLocaleString() : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Current Status */}
              <div className="mt-3 pt-3 border-t border-cyber-blue">
                <div className="text-[9px] text-cyber-gray-light mb-2 uppercase tracking-widest">Current Status</div>
                <div className="bg-cyber-dark/50 border border-cyber-blue p-2">
                  <div className="text-xs font-mono text-cyber-blue">
                    {isPinging ? (
                      <span>● Pinging live host ({liveHost})...</span>
                    ) : isStormActive ? (
                      <>
                        <span>● Storm active - sending {metrics?.current_pps || 0} PPS</span>
                        {liveHost && pingStatus && (
                          <span className="ml-2">
                            | Live host: {pingStatus.reachable ? (
                              <span className="text-cyber-green">ONLINE ({pingStatus.latency?.toFixed(1)}ms)</span>
                            ) : (
                              <span className="text-cyber-red">OFFLINE (cutoff triggered)</span>
                            )}
                          </span>
                        )}
                      </>
                    ) : (
                      <span>○ Storm stopped - ready to configure</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Storm;
