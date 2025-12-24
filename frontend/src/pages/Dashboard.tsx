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
    { name: 'Servers', value: 35, color: '#3b82f6' },
    { name: 'Workstations', value: 45, color: '#10b981' },
    { name: 'Network Devices', value: 15, color: '#f59e0b' },
    { name: 'IoT Devices', value: 5, color: '#ef4444' },
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

  const StatCard: React.FC<{ title: string; value: string | number; icon: string; color: string }> = 
    ({ title, value, icon, color }) => (
    <div className="dashboard-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${color}`}>
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
          icon="🖥️"
          color="bg-blue-600"
        />
        <StatCard
          title="Online Assets"
          value={stats.onlineAssets || 89}
          icon="✅"
          color="bg-green-600"
        />
        <StatCard
          title="Active Scans"
          value={stats.activeScans || 3}
          icon="🔍"
          color="bg-yellow-600"
        />
        <StatCard
          title="Vulnerabilities"
          value={stats.vulnerabilities || 12}
          icon="⚠️"
          color="bg-red-600"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Chart */}
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Network Traffic</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trafficData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-slate-400">Current: {stats.trafficVolume}</span>
            <span className="text-green-400">↗ +12% from yesterday</span>
          </div>
        </div>

        {/* Asset Types Chart */}
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Asset Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={assetTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {assetTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1f2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {assetTypes.map((type, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: type.color }}
                ></div>
                <span className="text-slate-300 text-sm">{type.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[
            { time: '2 minutes ago', event: 'New asset discovered: 192.168.1.45', type: 'info' },
            { time: '5 minutes ago', event: 'Scan completed on subnet 192.168.1.0/24', type: 'success' },
            { time: '12 minutes ago', event: 'High vulnerability detected on server-01', type: 'warning' },
            { time: '18 minutes ago', event: 'User admin logged in', type: 'info' },
            { time: '25 minutes ago', event: 'Backup completed successfully', type: 'success' },
          ].map((activity, index) => (
            <div key={index} className="flex items-center space-x-3 p-3 bg-slate-800 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${
                activity.type === 'success' ? 'bg-green-500' :
                activity.type === 'warning' ? 'bg-yellow-500' :
                'bg-blue-500'
              }`}></div>
              <div className="flex-1">
                <p className="text-white text-sm">{activity.event}</p>
                <p className="text-slate-400 text-xs">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;