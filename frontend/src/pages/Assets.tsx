import React, { useState, useEffect, useRef } from 'react';
import { assetService, Asset } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import AssetDetailsSidebar from '../components/AssetDetailsSidebar';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [refreshInterval, setRefreshInterval] = useState<number>(30); // Default 30s
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const { token, isAuthenticated } = useAuthStore();

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAssets = async (showLoading = true) => {
    if (!token) {
      if (isAuthenticated) {
        setError('Session error: Token missing. Please try logging out and back in.');
      } else {
        setError('Please log in to view assets.');
      }
      setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const data = await assetService.getAssets(token, statusFilter === 'all' ? undefined : statusFilter);
      setAssets(data);
      
      // Update selected asset if it exists in the new data
      if (selectedAsset) {
        const updated = data.find(a => a.id === selectedAsset.id);
        if (updated) setSelectedAsset(updated);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch assets');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  // Initial fetch and interval setup
  useEffect(() => {
    fetchAssets();
  }, [token, isAuthenticated, statusFilter]);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    if (refreshInterval > 0) {
      timerRef.current = setInterval(() => {
        fetchAssets(false); // Don't show loading spinner for background refreshes
      }, refreshInterval * 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [token, isAuthenticated, statusFilter, refreshInterval, selectedAsset]);

  const startScan = async () => {
    if (!token) return;
    try {
      await assetService.startScan(token);
      alert('Scan started. Please wait a few moments for results to update.');
    } catch (err) {
      alert('Scan failed');
    }
  };

  return (
    <div className="relative min-h-full">
      <div className={`space-y-6 transition-all duration-300 ${selectedAsset ? 'mr-96' : ''}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h2 className="text-2xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">Assets</h2>

          <div className="flex flex-wrap items-center gap-4">
            {/* Auto Refresh Control */}
            <div className="flex items-center space-x-2 bg-cyber-darker border border-cyber-gray px-3 py-1">
              <span className="text-xs text-cyber-purple uppercase font-bold">Auto-Refresh:</span>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className="bg-transparent text-cyber-blue text-sm focus:outline-none border-none cursor-pointer"
              >
                <option value={0} className="bg-cyber-darker">OFF</option>
                <option value={5} className="bg-cyber-darker">5s</option>
                <option value={10} className="bg-cyber-darker">10s</option>
                <option value={30} className="bg-cyber-darker">30s</option>
                <option value={60} className="bg-cyber-darker">1m</option>
                <option value={300} className="bg-cyber-darker">5m</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2 bg-cyber-darker border border-cyber-gray px-3 py-1">
              <span className="text-xs text-cyber-purple uppercase font-bold">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-transparent text-cyber-blue text-sm focus:outline-none border-none cursor-pointer"
              >
                <option value="all" className="bg-cyber-darker">ALL ASSETS</option>
                <option value="online" className="bg-cyber-darker">ONLINE ONLY</option>
                <option value="offline" className="bg-cyber-darker">OFFLINE ONLY</option>
              </select>
            </div>

            <button onClick={() => fetchAssets(true)} className="btn-cyber px-4 py-2">Refresh</button>
            <button onClick={startScan} className="btn-cyber px-4 py-2 border-cyber-red text-cyber-red">Scan</button>
          </div>
        </div>

        {error && (
          <div className="bg-cyber-darker border border-cyber-red text-cyber-red p-4 cyber-glow">
            &gt; ERROR: {error}
          </div>
        )}

        <div className="bg-cyber-dark border border-cyber-gray overflow-hidden">
          <table className="min-w-full divide-y divide-cyber-gray">
            <thead className="bg-cyber-darker">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">IP Address</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Hostname</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-cyber-purple uppercase">Last Seen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyber-gray">
              {loading && assets.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-cyber-gray-light">Loading assets...</td></tr>
              ) : assets.length === 0 && !error ? (
                <tr><td colSpan={4} className="px-6 py-4 text-center text-cyber-gray-light">No assets found matching criteria.</td></tr>
              ) : (
                assets.map((asset) => (
                  <tr 
                    key={asset.id} 
                    className={`hover:bg-cyber-darker cursor-pointer transition-colors ${selectedAsset?.id === asset.id ? 'bg-cyber-darker border-l-2 border-cyber-red' : ''}`}
                    onClick={() => setSelectedAsset(asset)}
                  >
                    <td className="px-6 py-4 text-sm text-cyber-blue font-mono">{asset.ip_address}</td>
                    <td className="px-6 py-4 text-sm text-cyber-gray-light">{asset.hostname || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${asset.status === 'online' ? 'text-cyber-green border border-cyber-green shadow-[0_0_5px_rgba(0,255,65,0.5)]' : 'text-cyber-red border border-cyber-red opacity-60'}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-cyber-gray-light">
                      {asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Never'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sidebar */}
      <AssetDetailsSidebar 
        asset={selectedAsset} 
        onClose={() => setSelectedAsset(null)} 
      />
    </div>
  );
};

export default Assets;
