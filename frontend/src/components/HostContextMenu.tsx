import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScanStore } from '../store/scanStore';
import { useAccessStore, Protocol } from '../store/accessStore';

interface HostInfo {
  id: string;
  ip: string;
  name: string;
  status: string;
  details?: {
    mac_address?: string;
    os_info?: string;
    hostname?: string;
    open_ports?: number[];
    vendor?: string;
    last_seen?: string;
  };
}

interface HostContextMenuProps {
  host: HostInfo;
  position: { x: number; y: number };
  onClose: () => void;
}

const HostContextMenu: React.FC<HostContextMenuProps> = ({ host, position, onClose }) => {
  const navigate = useNavigate();
  const { addTab: addScanTab } = useScanStore();
  const { addTab: addAccessTab } = useAccessStore();

  const handleViewDetails = () => {
    navigate('/assets', { state: { selectedAssetIp: host.ip } });
    onClose();
  };

  const handleScanHost = () => {
    addScanTab(host.ip, host.name);
    navigate('/scans', { state: { targetIp: host.ip } });
    onClose();
  };

  const handleConnect = (protocol: Protocol) => {
    addAccessTab(host.ip, protocol, host.name);
    navigate('/access');
    onClose();
  };

  const handleSniffTraffic = () => {
    navigate('/traffic', { 
      state: { 
        filterHost: host.ip,
        autoStart: true,
        autoDetectInterface: true
      } 
    });
    onClose();
  };

  const getAvailableProtocols = (): Protocol[] => {
    const ports = host.details?.open_ports || [];
    const protocols: Protocol[] = [];
    
    if (ports.includes(22)) protocols.push('ssh');
    if (ports.includes(3389)) protocols.push('rdp');
    if (ports.includes(5900) || ports.includes(5901)) protocols.push('vnc');
    if (ports.includes(23)) protocols.push('telnet');
    if (ports.includes(80) || ports.includes(443) || ports.includes(8080)) protocols.push('web');
    if (ports.includes(21)) protocols.push('ftp');
    
    return protocols;
  };

  const availableProtocols = getAvailableProtocols();

  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 280),
    y: Math.min(position.y, window.innerHeight - 450)
  };

  return (
    <div 
      className="fixed z-50 bg-cyber-darker border border-cyber-gray shadow-2xl min-w-[260px]"
      style={{ 
        left: adjustedPosition.x, 
        top: adjustedPosition.y,
        maxHeight: '420px',
        position: 'fixed' // Ensure fixed works in fullscreen by being inside the fullscreen container
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-cyber-gray bg-cyber-dark">
        <div className="flex items-center justify-between">
          <div className="text-cyber-blue font-bold text-sm truncate uppercase tracking-wider">{host.name}</div>
          <span className={`w-2 h-2 rounded-full ${host.status === 'online' ? 'bg-cyber-green' : 'bg-cyber-red'}`} />
        </div>
        <div className="text-cyber-gray-light text-xs font-mono mt-1">{host.ip}</div>
      </div>

      {/* Host Details Summary */}
      {host.details && (
        <div className="px-4 py-2 border-b border-cyber-gray text-xs space-y-1 bg-black/30">
          {host.details.mac_address && (
            <div className="flex justify-between">
              <span className="text-cyber-purple uppercase font-bold">MAC</span>
              <span className="text-cyber-gray-light font-mono">{host.details.mac_address}</span>
            </div>
          )}
          {host.details.os_info && (
            <div className="flex justify-between">
              <span className="text-cyber-purple uppercase font-bold">OS</span>
              <span className="text-cyber-gray-light truncate max-w-[140px]">{host.details.os_info}</span>
            </div>
          )}
          {host.details.vendor && (
            <div className="flex justify-between">
              <span className="text-cyber-purple uppercase font-bold">Vendor</span>
              <span className="text-cyber-gray-light truncate max-w-[140px]">{host.details.vendor}</span>
            </div>
          )}
          {host.details.open_ports && host.details.open_ports.length > 0 && (
            <div className="flex justify-between">
              <span className="text-cyber-purple uppercase font-bold">Ports</span>
              <span className="text-cyber-green font-mono">
                {host.details.open_ports.slice(0, 5).join(', ')}
                {host.details.open_ports.length > 5 && '...'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="py-1">
        <button
          onClick={handleViewDetails}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-blue/20 hover:text-cyber-blue flex items-center gap-3 transition-colors tracking-wider"
        >
          <span className="text-cyber-blue">◈</span>
          View Full Details
        </button>

        <button
          onClick={handleScanHost}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-red/20 hover:text-cyber-red flex items-center gap-3 transition-colors tracking-wider"
        >
          <span className="text-cyber-red">◉</span>
          Scan Host
        </button>

        <button
          onClick={handleSniffTraffic}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-purple/20 hover:text-cyber-purple flex items-center gap-3 transition-colors tracking-wider"
        >
          <span className="text-cyber-purple">◎</span>
          Sniff Traffic
        </button>

        {availableProtocols.length > 0 && (
          <>
            <div className="border-t border-cyber-gray my-1" />
            <div className="px-4 py-1 text-[10px] text-cyber-green uppercase font-bold tracking-widest">Connect via</div>
            {availableProtocols.map(protocol => (
              <button
                key={protocol}
                onClick={() => handleConnect(protocol)}
                className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-green/20 hover:text-cyber-green flex items-center gap-3 transition-colors tracking-wider"
              >
                <span className="text-cyber-green">▸</span>
                {protocol.toUpperCase()}
              </button>
            ))}
          </>
        )}

        <div className="border-t border-cyber-gray my-1" />
        <div className="px-4 py-1 text-[10px] text-cyber-blue uppercase font-bold tracking-widest">Quick Connect</div>
        {(['ssh', 'rdp', 'vnc', 'web'] as Protocol[]).map(protocol => (
          <button
            key={`quick-${protocol}`}
            onClick={() => handleConnect(protocol)}
            className={`w-full px-4 py-2 text-left text-xs font-bold uppercase flex items-center gap-3 transition-colors tracking-wider ${
              availableProtocols.includes(protocol)
                ? 'text-cyber-green hover:bg-cyber-green/20'
                : 'text-cyber-gray hover:bg-cyber-gray/20 hover:text-cyber-gray-light'
            }`}
          >
            <span className={availableProtocols.includes(protocol) ? 'text-cyber-green' : 'text-cyber-gray'}>▸</span>
            {protocol.toUpperCase()}
            {!availableProtocols.includes(protocol) && (
              <span className="text-[10px] text-cyber-gray ml-auto">(try)</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-4 py-2 border-t border-cyber-gray text-[10px] text-cyber-gray text-center uppercase tracking-wider">
        Click outside to close
      </div>
    </div>
  );
};

export default HostContextMenu;
