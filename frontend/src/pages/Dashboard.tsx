import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import ForceGraph2D from 'react-force-graph-2d';
import { dashboardService, SystemEvent } from '../services/dashboardService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { CyberCard } from '../components/CyberUI';

// Time ago helper
const formatTimeAgo = (timestamp: string): string => {
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays > 0) return `${diffDays}d ago`;
  if (diffHours > 0) return `${diffHours}h ago`;
  if (diffMins > 0) return `${diffMins}m ago`;
  return 'just now';
};

// Combined Stat Card with dual values - Compact version
const CombinedStatCard: React.FC<{ 
  title: string; 
  value1: number;
  value2: number;
  icon: string; 
  color1: string;
  color2: string;
  glowColor: string;
  onClick?: () => void;
}> = ({ title, value1, value2, icon, color1, color2, glowColor, onClick }) => (
  <CyberCard 
    interactive={!!onClick}
    onClick={onClick}
    className="p-2"
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-cyber-gray-light text-[10px] font-mono uppercase tracking-wider">{title}</p>
        <p className="text-lg font-bold font-mono">
          <span className={color1}>{value1}</span>
          <span className="text-cyber-gray-light mx-1">/</span>
          <span className={color2}>{value2}</span>
        </p>
      </div>
      <div className={`w-8 h-8 border flex items-center justify-center ${glowColor}`}>
        <span className="text-sm">{icon}</span>
      </div>
    </div>
  </CyberCard>
);

const Dashboard: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent } = usePOV();
  const navigate = useNavigate();
  const topologyRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<any>(null);
  
  const [stats, setStats] = useState({
    totalAssets: 0,
    onlineAssets: 0,
    activeScans: 0,
    activeConnections: 0,
    scannedHosts: 0,
    accessedHosts: 0,
    vulnerableHosts: 0,
    exploitedHosts: 0,
    trafficVolume: '0 MB',
  });

  const [protocolData, setProtocolData] = useState<{name: string; value: number; color: string}[]>([]);
  const [trafficHistory, setTrafficHistory] = useState<{time: string; value: number}[]>([]);
  const [graphData, setGraphData] = useState<{nodes: any[]; links: any[]}>({ nodes: [], links: [] });
  const [events, setEvents] = useState<SystemEvent[]>([]);
  const [recentAssets, setRecentAssets] = useState<{id: number; ip: string; timestamp: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;

    try {
      const [assetStats, trafficStats, recentEvents] = await Promise.all([
        dashboardService.getAssetStats(token, activeAgent?.id),
        dashboardService.getTrafficStats(token, activeAgent?.id),
        dashboardService.getEvents(token, 5)
      ]);

      setStats({
        totalAssets: assetStats.total_assets || 0,
        onlineAssets: assetStats.online_assets || 0,
        activeScans: assetStats.active_scans || 0,
        activeConnections: assetStats.active_connections || 0,
        scannedHosts: assetStats.scanned_assets || 0,
        accessedHosts: assetStats.accessed_assets || 0,
        vulnerableHosts: assetStats.vulnerable_assets || 0,
        exploitedHosts: assetStats.exploited_assets || 0,
        trafficVolume: `${((trafficStats.total_bytes || 0) / 1024 / 1024).toFixed(2)} MB`,
      });

      // Protocol breakdown for bar chart
      if (trafficStats.protocols && Object.keys(trafficStats.protocols).length > 0) {
        const protocolColors: Record<string, string> = {
          'TCP': '#00ff88',
          'UDP': '#00d4ff', 
          'ICMP': '#facc15',
          'ARP': '#8b5cf6',
          'OTHER': '#ff0040'
        };
        const protocols = Object.entries(trafficStats.protocols).map(([name, value]) => ({
          name: name.toUpperCase(),
          value: value as number,
          color: protocolColors[name.toUpperCase()] || '#ff0040'
        }));
        setProtocolData(protocols);
      }

      // Traffic history for trend line
      if (trafficStats.traffic_history && trafficStats.traffic_history.length > 0) {
        setTrafficHistory(trafficStats.traffic_history.slice(-12)); // Last 12 data points
      }

      // Build force-directed graph data from connections
      if (trafficStats.connections && trafficStats.connections.length > 0) {
        const connections = trafficStats.connections.slice(0, 20);
        
        // Build unique nodes with colors
        const nodeMap = new Map<string, {id: string; color: string; val: number}>();
        const links: {source: string; target: string; color: string}[] = [];
        
        connections.forEach(conn => {
          if (!nodeMap.has(conn.source)) {
            nodeMap.set(conn.source, { id: conn.source, color: '#00ff88', val: 3 });
          }
          if (!nodeMap.has(conn.target)) {
            nodeMap.set(conn.target, { id: conn.target, color: '#00d4ff', val: 2 });
          }
          
          const protocol = conn.protocols?.[0] || 'TCP';
          const linkColor = protocol === 'TCP' ? '#00ff88' : protocol === 'UDP' ? '#00d4ff' : protocol === 'ICMP' ? '#facc15' : '#ff0040';
          links.push({
            source: conn.source,
            target: conn.target,
            color: linkColor
          });
        });

        setGraphData({
          nodes: Array.from(nodeMap.values()),
          links: links
        });
      }

      setEvents(recentEvents || []);

      // Get recent assets from connections data
      if (trafficStats.connections && trafficStats.connections.length > 0) {
        const recent = trafficStats.connections.slice(0, 5).map((conn: { source?: string; target?: string }, idx: number) => ({
          id: idx,
          ip: conn.source || conn.target || 'unknown',
          timestamp: new Date().toISOString()
        }));
        setRecentAssets(recent);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeAgent]);

  // Show skeleton while loading (progressive reveal)
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        {/* Skeleton: TOP ROW - 3 stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-cyber-dark border border-cyber-gray rounded p-4">
              <div className="h-3 w-24 bg-cyber-gray/30 rounded mb-2 animate-pulse" />
              <div className="h-8 w-20 bg-cyber-gray/30 rounded animate-pulse" />
            </div>
          ))}
        </div>
        {/* Skeleton: SECOND ROW - 2 charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-cyber-dark border border-cyber-gray rounded p-6 h-56">
            <div className="h-4 w-32 bg-cyber-gray/30 rounded mb-4 animate-pulse" />
            <div className="h-32 bg-cyber-gray/20 rounded animate-pulse" />
          </div>
          <div className="bg-cyber-dark border border-cyber-gray rounded p-6 h-56">
            <div className="h-4 w-32 bg-cyber-gray/30 rounded mb-4 animate-pulse" />
            <div className="h-32 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full bg-cyber-gray/20 animate-pulse" />
            </div>
          </div>
        </div>
        {/* Skeleton: THIRD ROW - 3 panels */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-cyber-dark border border-cyber-gray rounded p-4 h-28">
              <div className="h-4 w-40 bg-cyber-gray/30 rounded mb-3 animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-3 bg-cyber-gray/20 rounded animate-pulse" style={{ width: `${90 - j * 10}%` }} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* TOP ROW: 3 Combined Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CombinedStatCard
          title="Discovered / Online"
          value1={stats.totalAssets}
          value2={stats.onlineAssets}
          icon="⬢"
          color1="text-cyber-blue"
          color2="text-cyber-green"
          glowColor="border-cyber-blue"
          onClick={() => navigate('/assets')}
        />
        <CombinedStatCard
          title="Scanned / Accessed"
          value1={stats.scannedHosts}
          value2={stats.accessedHosts}
          icon="◈"
          color1="text-cyber-purple"
          color2="text-cyber-green"
          glowColor="border-cyber-purple"
          onClick={() => navigate('/scans')}
        />
        <CombinedStatCard
          title="Vulnerable / Exploited"
          value1={stats.vulnerableHosts}
          value2={stats.exploitedHosts}
          icon="⚠"
          color1="text-yellow-400"
          color2="text-cyber-red"
          glowColor="border-cyber-red"
          onClick={() => navigate('/exploit')}
        />
      </div>

      {/* SECOND ROW: 2 Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Activity + Protocol Breakdown */}
        <div className="dashboard-card p-6 cursor-pointer hover:border-cyber-blue transition-colors" onClick={() => navigate('/traffic')}>
          <h3 className="text-sm font-semibold text-cyber-red mb-4 uppercase tracking-wider font-mono">
            &gt; Traffic Analysis
          </h3>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trafficHistory.length > 0 ? trafficHistory.map((h, i) => ({
                time: h.time || `T-${trafficHistory.length - i}`,
                value: h.value || 0
              })) : [{time: 'Now', value: 0}]}>
                <defs>
                  <linearGradient id="trafficGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#00d4ff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="1 1" stroke="#2a2a2a" />
                <XAxis dataKey="time" stroke="#666666" fontSize={9} fontFamily="JetBrains Mono" />
                <YAxis stroke="#666666" fontSize={9} fontFamily="JetBrains Mono" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111111', 
                    border: '1px solid #ff0040',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '11px'
                  }}
                  formatter={(value: number) => [`${value} flows`, 'Traffic']}
                />
                <Area type="monotone" dataKey="value" stroke="#00d4ff" strokeWidth={2} fill="url(#trafficGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          {/* Protocol Breakdown Bars */}
          <div className="mt-3 space-y-1">
            {protocolData.slice(0, 4).map((proto) => {
              const maxVal = Math.max(...protocolData.map(p => p.value), 1);
              const pct = (proto.value / maxVal) * 100;
              return (
                <div key={proto.name} className="flex items-center gap-2">
                  <span className="text-xs font-mono w-12 text-cyber-gray-light">{proto.name}</span>
                  <div className="flex-1 h-2 bg-cyber-dark rounded-sm overflow-hidden">
                    <div 
                      className="h-full rounded-sm transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: proto.color }}
                    />
                  </div>
                  <span className="text-xs font-mono w-16 text-right" style={{ color: proto.color }}>
                    {proto.value.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Network Topology Snapshot - Force Directed */}
        <div className="dashboard-card p-6 cursor-pointer hover:border-cyber-purple transition-colors" onClick={() => navigate('/topology')}>
          <h3 className="text-sm font-semibold text-cyber-purple mb-4 uppercase tracking-wider font-mono">
            &gt; Network Topology
          </h3>
          <div 
            ref={topologyRef} 
            className="h-64 relative overflow-auto border border-cyber-gray rounded group"
            style={{ scrollbarWidth: 'thin', scrollbarColor: '#00d4ff #111111' }}
          >
            {graphData.nodes.length > 0 ? (
              <ForceGraph2D
                ref={fgRef}
                graphData={graphData}
                width={topologyRef.current?.clientWidth || 400}
                height={256}
                backgroundColor="transparent"
                nodeColor={(node: any) => node.color || '#00ff88'}
                nodeVal={(node: any) => node.val || 2}
                linkColor={(link: any) => link.color || '#00ff88'}
                linkWidth={1.5}
                nodeLabel={(node: any) => node.id}
                enableNodeDrag={false}
                enableZoomInteraction={true}
                enablePanInteraction={true}
                cooldownTicks={100}
                onEngineStop={() => {
                  // Fit all nodes in view after layout stabilizes
                  if (fgRef.current) {
                    fgRef.current.zoomToFit(400, 20);
                  }
                }}
                d3AlphaDecay={0.02}
                d3VelocityDecay={0.4}
                nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D) => {
                  const size = node.val || 2;
                  // Outer glow
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size + 4, 0, 2 * Math.PI);
                  ctx.strokeStyle = node.color || '#00ff88';
                  ctx.globalAlpha = 0.3;
                  ctx.lineWidth = 1;
                  ctx.stroke();
                  ctx.globalAlpha = 1;
                  // Main node
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
                  ctx.fillStyle = '#111111';
                  ctx.fill();
                  ctx.strokeStyle = node.color || '#00ff88';
                  ctx.lineWidth = 2;
                  ctx.stroke();
                  // Inner dot
                  ctx.beginPath();
                  ctx.arc(node.x, node.y, size / 2, 0, 2 * Math.PI);
                  ctx.fillStyle = node.color || '#00ff88';
                  ctx.fill();
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <span className="text-cyber-gray-light text-xs font-mono">Waiting for network connections...</span>
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 justify-center">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-cyber-green"></div>
              <span className="text-cyber-gray-light text-xs font-mono">TCP</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-cyber-blue"></div>
              <span className="text-cyber-gray-light text-xs font-mono">UDP</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <span className="text-cyber-gray-light text-xs font-mono">ICMP</span>
            </div>
            <div className="flex items-center space-x-1 text-cyber-gray-light hover:text-cyber-purple">
              <span className="text-xs font-mono">({graphData.nodes.length} nodes) →</span>
            </div>
          </div>
        </div>
      </div>

      {/* THIRD ROW: 3 Activity Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Last Discovered Assets */}
        <div className="dashboard-card p-4">
          <h3 className="text-sm font-semibold text-cyber-green mb-3 uppercase tracking-wider font-mono">
            &gt; Last Discovered Assets
          </h3>
          <div className="space-y-2">
            {recentAssets.slice(0, 3).length > 0 ? recentAssets.slice(0, 3).map((asset) => (
              <div
                key={asset.id}
                className="p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-green transition-colors cursor-pointer"
                onClick={() => navigate(`/assets`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-cyber-blue font-mono text-sm">{asset.ip}</span>
                  <span className="text-cyber-gray-light text-xs font-mono">{formatTimeAgo(asset.timestamp)}</span>
                </div>
              </div>
            )) : (
              <p className="text-cyber-gray-light font-mono text-xs p-3">No recent discoveries</p>
            )}
            <div 
              className="text-center pt-2 cursor-pointer hover:text-cyber-green text-cyber-gray-light text-xs font-mono"
              onClick={() => navigate('/assets')}
            >
              View All →
            </div>
          </div>
        </div>

        {/* Last Scanned Services */}
        <div className="dashboard-card p-4">
          <h3 className="text-sm font-semibold text-cyber-purple mb-3 uppercase tracking-wider font-mono">
            &gt; Last Scanned Services
          </h3>
          <div className="space-y-2">
            {events.filter(e => e.event_type === 'scan_completed').slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className="p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-purple transition-colors cursor-pointer"
                onClick={() => navigate('/scans')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyber-blue font-mono text-sm">{event.title}</span>
                  <span className="text-cyber-gray-light text-xs font-mono">{formatTimeAgo(event.timestamp)}</span>
                </div>
                {event.description && (
                  <div className="text-cyber-gray-light text-xs font-mono truncate">{event.description}</div>
                )}
              </div>
            ))}
            {events.filter(e => e.event_type === 'scan_completed').length === 0 && (
              <p className="text-cyber-gray-light font-mono text-xs p-3">No recent scans</p>
            )}
            <div 
              className="text-center pt-2 cursor-pointer hover:text-cyber-purple text-cyber-gray-light text-xs font-mono"
              onClick={() => navigate('/scans')}
            >
              View All →
            </div>
          </div>
        </div>

        {/* Last Accessed Assets */}
        <div className="dashboard-card p-4">
          <h3 className="text-sm font-semibold text-cyber-blue mb-3 uppercase tracking-wider font-mono">
            &gt; Last Accessed Assets
          </h3>
          <div className="space-y-2">
            {events.filter(e => e.event_type === 'connection' || e.event_type === 'access').slice(0, 3).map((event, idx) => (
              <div
                key={idx}
                className="p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-blue transition-colors cursor-pointer"
                onClick={() => navigate('/access')}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-cyber-green font-mono text-sm">{event.title}</span>
                  <span className="text-cyber-gray-light text-xs font-mono">{formatTimeAgo(event.timestamp)}</span>
                </div>
                {event.description && (
                  <div className="text-cyber-gray-light text-xs font-mono truncate">{event.description}</div>
                )}
              </div>
            ))}
            {events.filter(e => e.event_type === 'connection' || e.event_type === 'access').length === 0 && (
              <p className="text-cyber-gray-light font-mono text-xs p-3">No recent accesses</p>
            )}
            <div 
              className="text-center pt-2 cursor-pointer hover:text-cyber-blue text-cyber-gray-light text-xs font-mono"
              onClick={() => navigate('/access')}
            >
              View All →
            </div>
          </div>
        </div>
      </div>

      {/* System Activity Log */}
      <div className="dashboard-card p-6">
        <h3 className="text-sm font-semibold text-cyber-green mb-4 uppercase tracking-wider font-mono">
          &gt; System Activity Log
        </h3>
        <div className="space-y-2">
          {events.length > 0 ? events.map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-purple transition-colors">
              <div className={`w-2 h-2 ${
                activity.severity === 'critical' || activity.severity === 'error' ? 'bg-cyber-red' :
                activity.severity === 'warning' ? 'bg-yellow-500' :
                'bg-cyber-blue'
              }`}></div>
              <div className="flex-1 font-mono">
                <p className="text-cyber-gray-light text-sm">
                  <span className="text-cyber-purple">[{new Date(activity.timestamp).toLocaleTimeString()}]</span>{' '}
                  {activity.title}
                  {activity.description && <span className="text-cyber-gray">: {activity.description}</span>}
                </p>
              </div>
            </div>
          )) : (
            <p className="text-cyber-gray-light font-mono text-sm p-3">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;