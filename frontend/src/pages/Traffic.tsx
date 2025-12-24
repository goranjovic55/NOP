import React from 'react';

const Traffic: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Traffic Analysis</h2>
        <div className="flex space-x-2">
          <select className="bg-slate-700 text-white px-3 py-2 rounded-lg">
            <option>Last 1 hour</option>
            <option>Last 24 hours</option>
            <option>Last 7 days</option>
          </select>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Export
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Talkers</h3>
          <p className="text-slate-400">Network traffic analysis coming soon...</p>
        </div>
        
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Protocol Distribution</h3>
          <p className="text-slate-400">Protocol breakdown visualization...</p>
        </div>
        
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Bandwidth Usage</h3>
          <p className="text-slate-400">Real-time bandwidth monitoring...</p>
        </div>
      </div>
    </div>
  );
};

export default Traffic;