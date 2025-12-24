import React from 'react';

const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Discovery Settings</h3>
          <p className="text-slate-400">Network discovery configuration...</p>
        </div>
        
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Scan Settings</h3>
          <p className="text-slate-400">Security scan configuration...</p>
        </div>
        
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">User Management</h3>
          <p className="text-slate-400">User accounts and permissions...</p>
        </div>
        
        <div className="dashboard-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4">System Settings</h3>
          <p className="text-slate-400">General system configuration...</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;