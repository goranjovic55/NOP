import React from 'react';
import { useNavigate } from 'react-router-dom';

interface ConnectionInfo {
  source: string;
  target: string;
  protocols?: string[];
  value: number;
  reverseValue?: number;
  bidirectional?: boolean;
}

interface ConnectionContextMenuProps {
  connection: ConnectionInfo;
  position: { x: number; y: number };
  onClose: () => void;
}

const formatTrafficMB = (bytes: number): string => {
  return (bytes / 1024 / 1024).toFixed(2);
};

const ConnectionContextMenu: React.FC<ConnectionContextMenuProps> = ({ connection, position, onClose }) => {
  const navigate = useNavigate();

  const handleSniffConnection = () => {
    const filter = `host ${connection.source} and host ${connection.target}`;
    navigate('/traffic', { 
      state: { 
        filterHost: filter,
        connectionFilter: {
          source: connection.source,
          target: connection.target
        },
        autoStart: true,
        autoDetectInterface: true
      } 
    });
    onClose();
  };

  const handleSniffSource = () => {
    navigate('/traffic', { 
      state: { 
        filterHost: connection.source,
        autoStart: true,
        autoDetectInterface: true
      } 
    });
    onClose();
  };

  const handleSniffTarget = () => {
    navigate('/traffic', { 
      state: { 
        filterHost: connection.target,
        autoStart: true,
        autoDetectInterface: true
      } 
    });
    onClose();
  };

  const handleViewSourceDetails = () => {
    navigate('/assets', { state: { selectedAssetIp: connection.source } });
    onClose();
  };

  const handleViewTargetDetails = () => {
    navigate('/assets', { state: { selectedAssetIp: connection.target } });
    onClose();
  };

  const handleScanSource = () => {
    navigate('/scans', { state: { targetIp: connection.source } });
    onClose();
  };

  const handleScanTarget = () => {
    navigate('/scans', { state: { targetIp: connection.target } });
    onClose();
  };

  const totalTraffic = connection.value + (connection.reverseValue || 0);

  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 300),
    y: Math.min(position.y, window.innerHeight - 500)
  };

  return (
    <div 
      className="fixed z-50 bg-cyber-darker border border-cyber-gray shadow-2xl min-w-[280px]"
      style={{ 
        left: adjustedPosition.x, 
        top: adjustedPosition.y,
        maxHeight: '500px',
        position: 'fixed' // Ensure fixed works in fullscreen by being inside the fullscreen container
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-cyber-gray bg-cyber-dark">
        <div className="text-cyber-green font-bold text-sm uppercase tracking-wider">Connection</div>
        <div className="flex items-center gap-2 mt-2 text-xs font-mono">
          <span className="text-cyber-blue">{connection.source}</span>
          <span className="text-cyber-gray">{connection.bidirectional ? '↔' : '→'}</span>
          <span className="text-cyber-blue">{connection.target}</span>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="px-4 py-2 border-b border-cyber-gray text-xs space-y-1 bg-black/30">
        <div className="flex justify-between">
          <span className="text-cyber-purple uppercase font-bold">Direction</span>
          <span className={connection.bidirectional ? 'text-cyber-green' : 'text-cyber-blue'}>
            {connection.bidirectional ? 'Bidirectional' : 'Unidirectional'}
          </span>
        </div>
        {connection.protocols && connection.protocols.length > 0 && (
          <div className="flex justify-between">
            <span className="text-cyber-purple uppercase font-bold">Protocols</span>
            <span className="text-cyber-green font-mono">{connection.protocols.join(', ')}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-cyber-purple uppercase font-bold">Total Traffic</span>
          <span className="text-cyber-gray-light">{formatTrafficMB(totalTraffic)} MB</span>
        </div>
        {connection.bidirectional && (
          <>
            <div className="flex justify-between text-xs">
              <span className="text-cyber-gray">→ Forward</span>
              <span className="text-cyber-gray-light">{formatTrafficMB(connection.value)} MB</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-cyber-gray">← Reverse</span>
              <span className="text-cyber-gray-light">{formatTrafficMB(connection.reverseValue || 0)} MB</span>
            </div>
          </>
        )}
      </div>

      {/* Primary Action - Sniff This Connection */}
      <div className="py-1 border-b border-cyber-gray">
        <button
          onClick={handleSniffConnection}
          className="w-full px-4 py-3 text-left text-xs font-bold uppercase text-cyber-purple hover:bg-cyber-purple/20 flex items-center gap-3 transition-colors tracking-wider"
        >
          <span className="text-lg">◎</span>
          <div>
            <div>Sniff This Connection</div>
            <div className="text-[10px] text-cyber-gray font-normal normal-case mt-1">Capture traffic between both hosts</div>
          </div>
        </button>
      </div>

      {/* Source Host Actions */}
      <div className="py-1 border-b border-cyber-gray">
        <div className="px-4 py-1 text-[10px] text-cyber-blue uppercase font-bold tracking-widest flex items-center gap-2">
          <span>◇</span> Source: {connection.source}
        </div>
        <button
          onClick={handleViewSourceDetails}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-blue/20 hover:text-cyber-blue flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◈</span> View Details
        </button>
        <button
          onClick={handleScanSource}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-red/20 hover:text-cyber-red flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◉</span> Scan Host
        </button>
        <button
          onClick={handleSniffSource}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-purple/20 hover:text-cyber-purple flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◎</span> Sniff All Traffic
        </button>
      </div>

      {/* Target Host Actions */}
      <div className="py-1">
        <div className="px-4 py-1 text-[10px] text-cyber-green uppercase font-bold tracking-widest flex items-center gap-2">
          <span>◆</span> Target: {connection.target}
        </div>
        <button
          onClick={handleViewTargetDetails}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-blue/20 hover:text-cyber-blue flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◈</span> View Details
        </button>
        <button
          onClick={handleScanTarget}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-red/20 hover:text-cyber-red flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◉</span> Scan Host
        </button>
        <button
          onClick={handleSniffTarget}
          className="w-full px-4 py-2 text-left text-xs font-bold uppercase text-cyber-gray-light hover:bg-cyber-purple/20 hover:text-cyber-purple flex items-center gap-3 transition-colors tracking-wider"
        >
          <span>◎</span> Sniff All Traffic
        </button>
      </div>

      {/* Close hint */}
      <div className="px-4 py-2 border-t border-cyber-gray text-[10px] text-cyber-gray text-center uppercase tracking-wider">
        Click outside to close
      </div>
    </div>
  );
};

export default ConnectionContextMenu;
