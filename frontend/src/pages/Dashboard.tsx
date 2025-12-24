import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalAssets: 0,
    onlineAssets: 0,
    offlineAssets: 0,
    activeScans: 0,
    vulnerabilities: 0,
    trafficVolume: '0 MB/s',
  });

  const [trafficData] = useState([
    { time: '00:00', value: 45 },
    { time: '04:00', value: 32 },
    { time: '08:00', value: 78 },
    { time: '12:00', value: 95 },
    { time: '16:00', value: 123 },
    { time: '20:00', value: 87 },
  ]);

  const [assetTypes] = useState([
    { name: 'Servers', value: 35, color: '#ff0040' },
    { name: 'Workstations', value: 45, color: '#8b5cf6' },
    { name: 'Network Devices', value: 15, color: '#00ff88' },
    { name: 'IoT Devices', value: 5, color: '#00d4ff' },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        trafficVolume: `${(Math.random() * 100).toFixed(1)} MB/s`,
        onlineAssets: 85 + Math.floor(Math.random() * 10),
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

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
          value={stats.totalAssets || 127}
          icon="⬢"
          color="text-cyber-blue cyber-glow"
          glowColor="border-cyber-blue"
        />
        <StatCard
          title="Online Assets"
          value={stats.onlineAssets || 89}
          icon="◉"
          color="text-cyber-green cyber-glow"
          glowColor="border-cyber-green"
        />
        <StatCard
          title="Active Scans"
          value={stats.activeScans || 3}
          icon="◈"
          color="text-cyber-purple cyber-glow"
          glowColor="border-cyber-purple"
        />
        <StatCard
          title="Vulnerabilities"
          value={stats.vulnerabilities || 12}
          icon="⚠"
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
              &gt; Current: <span className="text-cyber-green">{stats.trafficVolume}</span>
            </span>
            <span className="text-cyber-green">
              ↗ +12% from yesterday
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
          {[
            { time: '02:34:12', event: 'New asset discovered: 192.168.1.45', type: 'info' },
            { time: '02:29:08', event: 'Scan completed on subnet 192.168.1.0/24', type: 'success' },
            { time: '02:22:45', event: 'High vulnerability detected on server-01', type: 'warning' },
            { time: '02:16:33', event: 'User admin logged in', type: 'info' },
            { time: '02:09:17', event: 'Backup completed successfully', type: 'success' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-cyber-darker border border-cyber-gray hover:border-cyber-purple transition-colors duration-300">
              <div className={`w-2 h-2 ${
                activity.type === 'success' ? 'bg-cyber-green' :
                activity.type === 'warning' ? 'bg-cyber-red' :
                'bg-cyber-blue'
              } cyber-pulse`}></div>
              <div className="flex-1 font-terminal">
                <p className="text-cyber-gray-light text-sm">
                  <span className="text-cyber-purple">[{activity.time}]</span> {activity.event}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;