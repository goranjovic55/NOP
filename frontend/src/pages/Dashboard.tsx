import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { dashboardService, SystemEvent } from '../services/dashboardService';
import { useAuthStore } from '../store/authStore';

const Dashboard: React.FC = () => {
  const { token } = useAuthStore();
  const [stats, setStats] = useState({
    totalAssets: 0,
    onlineAssets: 0,
    activeScans: 0,
    activeConnections: 0,
    trafficVolume: '0 MB/s',
  });

  const [trafficData, setTrafficData] = useState([
    { time: '00:00', value: 0 },
    { time: '04:00', value: 0 },
    { time: '08:00', value: 0 },
    { time: '12:00', value: 0 },
    { time: '16:00', value: 0 },
    { time: '20:00', value: 0 },
  ]);

  const [assetTypes, setAssetTypes] = useState([
    { name: 'Unknown', value: 1, color: '#8b5cf6' },
  ]);

  const [events, setEvents] = useState<SystemEvent[]>([]);

  const fetchData = async () => {
    if (!token) return;

    try {
      const [assetStats, trafficStats, , recentEvents] = await Promise.all([
        dashboardService.getAssetStats(token),
        dashboardService.getTrafficStats(token),
        dashboardService.getAccessStatus(token),
        dashboardService.getEvents(token, 5)
      ]);

      setStats({
        totalAssets: assetStats.total_assets,
        onlineAssets: assetStats.online_assets,
        activeScans: assetStats.active_scans,
        activeConnections: assetStats.active_connections,
        trafficVolume: `${(trafficStats.total_bytes / 1024 / 1024).toFixed(2)} MB`,
      });

      if (assetStats.by_type && Object.keys(assetStats.by_type).length > 0) {
        const colors = ['#ff0040', '#8b5cf6', '#00ff88', '#00d4ff', '#facc15'];
        const types = Object.entries(assetStats.by_type).map(([name, value], index) => ({
          name,
          value,
          color: colors[index % colors.length]
        }));
        setAssetTypes(types);
      }

      setEvents(recentEvents);

      // Update traffic data if history is available
      if (trafficStats.traffic_history && trafficStats.traffic_history.length > 0) {
        setTrafficData(trafficStats.traffic_history);
      } else if (trafficStats.protocols && Object.keys(trafficStats.protocols).length > 0) {
        // Fallback to protocols if no history (should not happen with new backend)
        const mockTraffic = Object.entries(trafficStats.protocols).map(([name, value]) => ({
          time: name,
          value: value as number
        }));
        if (mockTraffic.length > 0) setTrafficData(mockTraffic);
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string; glowColor: string }> = 
    ({ title, value, icon, color, glowColor }) => (
    <div className="dashboard-card p-6 hover:shadow-cyber">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-cyber-gray-light text-sm font-medium uppercase tracking-wider">{title}</p>
          <p className={`text-2xl font-bold mt-1 font-terminal ${color}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 border flex items-center justify-center ${glowColor}`}>
          <span className="text-2xl">{icon}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Assets"
          value={stats.totalAssets}
          icon="⬢"
          color="text-cyber-blue cyber-glow"
          glowColor="border-cyber-blue"
        />
        <StatCard
          title="Online Assets"
          value={stats.onlineAssets}
          icon="◉"
          color="text-cyber-green cyber-glow"
          glowColor="border-cyber-green"
        />
        <StatCard
          title="Active Scans"
          value={stats.activeScans}
          icon="◈"
          color="text-cyber-purple cyber-glow"
          glowColor="border-cyber-purple"
        />
        <StatCard
          title="Active Connections"
          value={stats.activeConnections}
          icon="⇄"
          color="text-cyber-red cyber-glow"
          glowColor="border-cyber-red"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-cyber-red mb-4 uppercase tracking-wider cyber-glow-red">
            &gt; Network Traffic Analysis
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="1 1" stroke="#2a2a2a" />
                <XAxis 
                  dataKey="time" 
                  stroke="#666666" 
                  fontSize={12}
                  fontFamily="JetBrains Mono"
                />
                <YAxis 
                  stroke="#666666" 
                  fontSize={12}
                  fontFamily="JetBrains Mono"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111111', 
                    border: '1px solid #ff0040',
                    borderRadius: '2px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ff0040" 
                  strokeWidth={2}
                  dot={{ fill: '#ff0040', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: '#ff0040', strokeWidth: 2, fill: '#ff0040' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm font-terminal">
            <span className="text-cyber-gray-light">
              &gt; Total Volume: <span className="text-cyber-green">{stats.trafficVolume}</span>
            </span>
          </div>
        </div>

        {/* Asset Types Chart */}
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-cyber-purple mb-4 uppercase tracking-wider cyber-glow-purple">
            &gt; Asset Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="#2a2a2a"
                  strokeWidth={1}
                >
                  {assetTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#111111', 
                    border: '1px solid #8b5cf6',
                    borderRadius: '2px',
                    fontFamily: 'JetBrains Mono',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {assetTypes.map((type, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3" 
                  style={{ backgroundColor: type.color }}
                ></div>
                <span className="text-cyber-gray-light text-sm font-terminal uppercase tracking-wide">
                  {type.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-card p-6">
        <h3 className="text-lg font-semibold text-cyber-green mb-4 uppercase tracking-wider cyber-glow">
          &gt; System Activity Log
        </h3>
        <div className="space-y-2">
          {events.length > 0 ? events.map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-purple transition-colors duration-300">
              <div className={`w-2 h-2 ${
                activity.severity === 'critical' || activity.severity === 'error' ? 'bg-cyber-red' :
                activity.severity === 'warning' ? 'bg-facc15' :
                'bg-cyber-blue'
              } cyber-pulse`}></div>
              <div className="flex-1 font-terminal">
                <p className="text-cyber-gray-light text-sm">
                  <span className="text-cyber-purple">[{new Date(activity.timestamp).toLocaleTimeString()}]</span> {activity.title}: {activity.description}
                </p>
              </div>
            </div>
          )) : (
            <p className="text-cyber-gray-light font-terminal text-sm p-3">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;