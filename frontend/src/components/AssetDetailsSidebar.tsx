import React from 'react';
import { Asset } from '../services/assetService';

interface AssetDetailsSidebarProps {
  asset: Asset | null;
  onClose: () => void;
}

const AssetDetailsSidebar: React.FC<AssetDetailsSidebarProps> = ({ asset, onClose }) => {
  return (
    <div className={`fixed inset-y-0 right-0 w-96 bg-cyber-dark border-l border-cyber-gray shadow-2xl transform transition-transform duration-300 ease-in-out z-50 ${asset ? 'translate-x-0' : 'translate-x-full'}`}>
      {asset && (
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-cyber-gray flex justify-between items-center bg-cyber-darker">
            <div>
              <h3 className="text-xl font-bold text-cyber-red uppercase tracking-wider cyber-glow-red">Asset Details</h3>
              <p className="text-xs text-cyber-blue font-mono mt-1">{asset.ip_address}</p>
            </div>
            <button onClick={onClose} className="text-cyber-gray-light hover:text-cyber-red transition-colors text-2xl">
              &times;
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {/* Status Section */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyber-purple uppercase font-bold">Status</span>
                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${asset.status === 'online' ? 'text-cyber-green border border-cyber-green shadow-[0_0_5px_rgba(0,255,65,0.5)]' : 'text-cyber-red border border-cyber-red opacity-60'}`}>
                  {asset.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-cyber-purple uppercase font-bold">Last Seen</span>
                <span className="text-sm text-cyber-gray-light">{asset.last_seen ? new Date(asset.last_seen).toLocaleString() : 'Never'}</span>
              </div>
            </div>

            {/* Info Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-cyber-blue uppercase border-b border-cyber-gray pb-1">System Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] text-cyber-purple uppercase font-bold">Hostname</p>
                  <p className="text-sm text-cyber-gray-light truncate">{asset.hostname || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-cyber-purple uppercase font-bold">OS</p>
                  <p className="text-sm text-cyber-gray-light">{asset.os_name || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-cyber-purple uppercase font-bold">MAC Address</p>
                  <p className="text-sm text-cyber-gray-light font-mono">{asset.mac_address || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-cyber-purple uppercase font-bold">Vendor</p>
                  <p className="text-sm text-cyber-gray-light">{asset.vendor || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Ports Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-cyber-blue uppercase border-b border-cyber-gray pb-1">Open Ports</h4>
              {asset.open_ports && asset.open_ports.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {asset.open_ports.map(port => (
                    <span key={port} className="px-2 py-1 bg-cyber-darker border border-cyber-blue text-cyber-blue text-xs font-mono">
                      {port}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-cyber-gray-light italic">No open ports detected</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-6 space-y-3">
              <button className="w-full flex items-center justify-center space-x-2 btn-cyber py-3 border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white transition-all group">
                <span className="font-bold uppercase tracking-widest">Connect</span>
              </button>
              <button className="w-full flex items-center justify-center space-x-2 btn-cyber py-3 border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white transition-all group">
                <span className="font-bold uppercase tracking-widest">Scan</span>
              </button>
              <button className="w-full flex items-center justify-center space-x-2 btn-cyber py-3 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white transition-all group">
                <span className="font-bold uppercase tracking-widest">Exploit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetDetailsSidebar;
