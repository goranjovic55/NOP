import React from 'react';

const Scans: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Security Scans</h2>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
          New Scan
        </button>
      </div>
      
      <div className="dashboard-card p-6">
        <p className="text-slate-400">Security scanning interface will be implemented here.</p>
        <p className="text-slate-500 text-sm mt-2">
          Features: Vulnerability scans, port scans, service discovery, and security assessments.
        </p>
      </div>
    </div>
  );
};

export default Scans;