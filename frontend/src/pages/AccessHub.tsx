import React, { useState, useEffect } from 'react';
import { useAccessStore, Protocol } from '../store/accessStore';
import ProtocolConnection from '../components/ProtocolConnection';
import { CyberPageTitle } from '../components/CyberUI';
import { assetService } from '../services/assetService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';

interface Asset {
  id: string;
  ip_address: string;
  hostname?: string;
  status: string;
  os_type?: string;
  open_ports?: number[];
}

const AccessHub: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, isAgentPOV } = usePOV();
  const { tabs, activeTabId, setActiveTab, removeTab, addTab } = useAccessStore();
  const activeTab = tabs.find(t => t.id === activeTabId);
  const [showNewConnectionModal, setShowNewConnectionModal] = useState(false);
  const [newConnectionIp, setNewConnectionIp] = useState('');
  const [newConnectionProtocol, setNewConnectionProtocol] = useState<Protocol>('vnc');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionHeight, setConnectionHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [discoveredAssets, setDiscoveredAssets] = useState<Asset[]>([]);
  const [showDiscoveredAssets, setShowDiscoveredAssets] = useState(true);
  const [vaultPassword, setVaultPassword] = useState('');
  const [vaultSortBy, setVaultSortBy] = useState<'recent' | 'frequent' | 'name'>('recent');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [groups, setGroups] = useState<string[]>(['Production', 'Development', 'Testing']);
  const [hoveredCredId, setHoveredCredId] = useState<number | null>(null);
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultCredentialsRaw, setVaultCredentialsRaw] = useState<Array<{
    id: number;
    host: string;
    hostname?: string;
    protocol: string;
    username: string;
    lastUsed: string;
    useCount: number;
    lastUsedTimestamp: number;
    group?: string;
  }>>([]);

  // Fetch discovered assets (POV aware)
  useEffect(() => {
    const fetchAssets = async () => {
      if (!token) return;
      try {
        const assets = await assetService.getAssets(token, undefined, activeAgent?.id);
        setDiscoveredAssets(assets.filter((a: Asset) => a.status === 'online'));
      } catch (e) {
        console.error('Failed to fetch assets', e);
      }
    };
    fetchAssets();
    const interval = setInterval(fetchAssets, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, [token, activeAgent]);

  // Load vault credentials from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem('vaultCredentials');
    if (stored) {
      try {
        setVaultCredentialsRaw(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load vault credentials', e);
      }
    }
  }, []);

  // Save vault credentials to localStorage whenever they change
  React.useEffect(() => {
    if (vaultCredentialsRaw.length > 0) {
      localStorage.setItem('vaultCredentials', JSON.stringify(vaultCredentialsRaw));
    }
  }, [vaultCredentialsRaw]);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [reconnectPassword, setReconnectPassword] = useState('');
  const [pendingConnection, setPendingConnection] = useState<{ host: string; protocol: Protocol } | null>(null);

  const handleNewConnection = () => {
    setShowNewConnectionModal(true);
  };

  const handleCreateConnection = () => {
    if (newConnectionIp) {
      addTab(newConnectionIp, newConnectionProtocol);
      
      // Add to vault credentials
      const existingIndex = vaultCredentialsRaw.findIndex(
        cred => cred.host === newConnectionIp && cred.protocol === newConnectionProtocol
      );
      
      if (existingIndex >= 0) {
        // Update existing credential
        const updated = [...vaultCredentialsRaw];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastUsed: 'Just now',
          lastUsedTimestamp: Date.now(),
          useCount: updated[existingIndex].useCount + 1,
        };
        setVaultCredentialsRaw(updated);
      } else {
        // Add new credential
        const newCred = {
          id: Date.now(),
          host: newConnectionIp,
          hostname: newConnectionIp,
          protocol: newConnectionProtocol,
          username: 'user',
          lastUsed: 'Just now',
          useCount: 1,
          lastUsedTimestamp: Date.now(),
          group: selectedGroup !== 'all' ? selectedGroup : undefined,
        };
        setVaultCredentialsRaw([...vaultCredentialsRaw, newCred]);
      }
      
      setNewConnectionIp('');
      setShowNewConnectionModal(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizing) {
      const newHeight = window.innerHeight - e.clientY - 100;
      if (newHeight >= 300 && newHeight <= window.innerHeight - 200) {
        setConnectionHeight(newHeight);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const toggleVault = () => {
    setShowVault(!showVault);
  };

  const handleVaultUnlock = () => {
    // In production, this should verify against the user's actual password
    if (vaultPassword === 'admin123') {
      setIsVaultUnlocked(true);
      setVaultPassword('');
    } else {
      alert('Invalid password');
    }
  };

  const handleVaultLock = () => {
    setIsVaultUnlocked(false);
  };

  const handleRemoveCredential = (id: number) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm('Remove this credential from vault?')) {
      setVaultCredentialsRaw(vaultCredentialsRaw.filter(cred => cred.id !== id));
    }
  };

  const handleAddGroup = () => {
    if (newGroupName && !groups.includes(newGroupName)) {
      setGroups([...groups, newGroupName]);
      setNewGroupName('');
      setShowGroupModal(false);
    }
  };

  // Filter credentials by group
  const filteredCredentials = selectedGroup === 'all'
    ? vaultCredentialsRaw
    : vaultCredentialsRaw.filter(cred => cred.group === selectedGroup);

  // Sort vault credentials based on selected sort option
  const vaultCredentials = [...filteredCredentials].sort((a, b) => {
    switch(vaultSortBy) {
      case 'recent':
        return b.lastUsedTimestamp - a.lastUsedTimestamp; // Most recent first
      case 'frequent':
        return b.useCount - a.useCount; // Most used first
      case 'name':
        return (a.hostname || a.host).localeCompare(b.hostname || b.host); // Alphabetical
      default:
        return 0;
    }
  });

  const handleQuickConnect = (host: string, protocol: Protocol) => {
    setPendingConnection({ host, protocol });
    setShowReconnectModal(true);
  };

  const handleReconnectConfirm = () => {
    // In production, verify against the user's actual password
    if (reconnectPassword === 'admin123') {
      if (pendingConnection) {
        addTab(pendingConnection.host, pendingConnection.protocol);
        
        // Update vault credential usage
        const existingIndex = vaultCredentialsRaw.findIndex(
          cred => cred.host === pendingConnection.host && cred.protocol === pendingConnection.protocol
        );
        
        if (existingIndex >= 0) {
          const updated = [...vaultCredentialsRaw];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastUsed: 'Just now',
            lastUsedTimestamp: Date.now(),
            useCount: updated[existingIndex].useCount + 1,
          };
          setVaultCredentialsRaw(updated);
        }
        
        setShowReconnectModal(false);
        setReconnectPassword('');
        setPendingConnection(null);
      }
    } else {
      alert('Invalid password');
      setReconnectPassword('');
    }
  };

  const handleReconnectCancel = () => {
    setShowReconnectModal(false);
    setReconnectPassword('');
    setPendingConnection(null);
  };

  const getProtocolColor = (protocol: string) => {
    switch(protocol) {
      case 'ssh': return 'text-cyber-green border-cyber-green';
      case 'vnc': return 'text-cyber-purple border-cyber-purple';
      case 'rdp': return 'text-cyber-blue border-cyber-blue';
      case 'ftp': return 'text-facc15 border-facc15';
      default: return 'text-cyber-gray border-cyber-gray';
    }
  };

  // Guess protocol from open ports
  const guessProtocol = (ports?: number[]): Protocol => {
    if (!ports || ports.length === 0) return 'ssh';
    if (ports.includes(22)) return 'ssh';
    if (ports.includes(5900) || ports.includes(5901)) return 'vnc';
    if (ports.includes(3389)) return 'rdp';
    if (ports.includes(21)) return 'ftp';
    if (ports.includes(23)) return 'telnet';
    if (ports.includes(80) || ports.includes(443) || ports.includes(8080)) return 'web';
    return 'ssh';
  };

  // Quick connect to discovered asset
  const handleAssetConnect = (asset: Asset) => {
    const protocol = guessProtocol(asset.open_ports);
    addTab(asset.ip_address, protocol, asset.hostname);
  };

  return (
    <div className={`h-full flex ${isFullscreen ? 'fixed inset-0 z-50 bg-cyber-dark p-4' : ''}`}>
      <div className={`flex-1 flex flex-col ${isFullscreen ? '' : 'space-y-4'}`}>
        {!isFullscreen && (
          <div className="flex justify-between items-center">
            <CyberPageTitle color="red">ACCESS</CyberPageTitle>
            <div className="flex space-x-2">
              <button 
                onClick={() => setShowDiscoveredAssets(!showDiscoveredAssets)}
                className={`btn-cyber px-4 py-2 ${showDiscoveredAssets ? 'border-cyber-purple text-cyber-purple bg-cyber-purple bg-opacity-10' : 'border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black'}`}
              >
                ◎ Targets ({discoveredAssets.length})
              </button>
              <button 
                onClick={toggleVault}
                className={`btn-cyber px-4 py-2 ${showVault ? 'border-cyber-green text-cyber-green bg-cyber-green bg-opacity-10' : 'border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black'}`}
              >
                ◈ Vault
              </button>
              <button 
                onClick={handleNewConnection}
                className="btn-cyber border-cyber-blue text-cyber-blue hover:bg-cyber-blue hover:text-white px-4 py-2"
              >
                + New Connection
              </button>
            </div>
          </div>
        )}

      {/* Discovered Assets Panel */}
      {showDiscoveredAssets && !isFullscreen && discoveredAssets.length > 0 && (
        <div className="bg-cyber-darker border border-cyber-purple p-4 rounded-lg">
          <div className="flex justify-between items-center mb-3">
            <span className="text-cyber-purple font-bold uppercase text-xs tracking-widest">
              {isAgentPOV ? `◎ Agent Targets (${activeAgent?.name})` : '◎ Discovered Targets'}
            </span>
            <span className="text-xs text-cyber-gray">{discoveredAssets.length} online</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {discoveredAssets.slice(0, 12).map((asset) => (
              <button
                key={asset.id}
                onClick={() => handleAssetConnect(asset)}
                className="bg-cyber-dark border border-cyber-gray hover:border-cyber-purple p-2 rounded text-left transition-colors group"
              >
                <div className="text-xs text-cyber-purple font-mono truncate">{asset.ip_address}</div>
                <div className="text-xs text-cyber-gray truncate">{asset.hostname || 'Unknown'}</div>
                {asset.open_ports && asset.open_ports.length > 0 && (
                  <div className="text-xs text-cyber-green mt-1">
                    {asset.open_ports.slice(0, 3).join(', ')}{asset.open_ports.length > 3 ? '...' : ''}
                  </div>
                )}
              </button>
            ))}
          </div>
          {discoveredAssets.length > 12 && (
            <div className="text-xs text-cyber-gray mt-2 text-center">
              +{discoveredAssets.length - 12} more targets
            </div>
          )}
        </div>
      )}

      {/* New Connection Modal */}
      {showNewConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-cyber-dark border border-cyber-gray p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold text-cyber-blue mb-4">New Connection</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-cyber-gray-light mb-1">Host IP / Hostname</label>
                <input
                  type="text"
                  value={newConnectionIp}
                  onChange={(e) => setNewConnectionIp(e.target.value)}
                  className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-blue outline-none"
                  placeholder="e.g., test-vnc or 172.19.0.3"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs text-cyber-gray-light mb-1">Protocol</label>
                <select
                  value={newConnectionProtocol}
                  onChange={(e) => setNewConnectionProtocol(e.target.value as Protocol)}
                  className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-blue outline-none"
                >
                  <option value="vnc">VNC (Remote Desktop)</option>
                  <option value="rdp">RDP (Windows Remote Desktop)</option>
                  <option value="ssh">SSH (Terminal)</option>
                  <option value="telnet">Telnet</option>
                  <option value="ftp">FTP (File Transfer)</option>
                  <option value="web">Web Interface</option>
                </select>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleCreateConnection}
                  className="flex-1 btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-2"
                >
                  Connect
                </button>
                <button
                  onClick={() => setShowNewConnectionModal(false)}
                  className="flex-1 btn-cyber border-cyber-gray text-cyber-gray hover:bg-cyber-gray hover:text-black py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reconnect Password Modal */}
      {showReconnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-cyber-dark border border-cyber-purple p-6 rounded-lg w-96">
            <h3 className="text-lg font-bold text-cyber-purple mb-4">◆ Secure Connection</h3>
            <div className="space-y-4">
              <div className="bg-cyber-darker border border-cyber-gray rounded p-3 mb-4">
                <p className="text-sm text-cyber-gray-light mb-1">Connecting to:</p>
                <p className="text-cyber-blue font-bold">{pendingConnection?.host}</p>
                <p className="text-xs text-cyber-gray mt-1">
                  Protocol: <span className={`uppercase ${getProtocolColor(pendingConnection?.protocol || '')}`}>
                    {pendingConnection?.protocol}
                  </span>
                </p>
              </div>
              <div>
                <label className="block text-xs text-cyber-gray-light mb-1">Enter Your Password</label>
                <input
                  type="password"
                  value={reconnectPassword}
                  onChange={(e) => setReconnectPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleReconnectConfirm()}
                  className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-purple outline-none"
                  placeholder="Password"
                  autoFocus
                />
                <p className="text-xs text-cyber-gray-light mt-1">◆ This connection requires authentication</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleReconnectConfirm}
                  className="flex-1 btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-2"
                >
                  Connect
                </button>
                <button
                  onClick={handleReconnectCancel}
                  className="flex-1 btn-cyber border-cyber-gray text-cyber-gray hover:bg-cyber-gray hover:text-black py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Header */}
      {!isFullscreen && (
        <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t border-x transition-all ${
                activeTabId === tab.id 
                  ? 'bg-cyber-darker border-cyber-blue text-cyber-blue' 
                  : 'bg-cyber-dark border-transparent text-cyber-gray-light hover:bg-cyber-darker'
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="text-xs font-mono uppercase">{tab.protocol}</span>
              <span className="text-sm font-bold">{tab.hostname || tab.ip}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  removeTab(tab.id);
                }}
                className="hover:text-cyber-red ml-2"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab Content */}
      <div 
        className="flex-1 bg-cyber-darker border border-cyber-gray rounded-lg overflow-hidden relative"
        style={!isFullscreen ? { height: `${connectionHeight}px` } : undefined}
      >
        {activeTab ? (
          <div className="h-full flex flex-col">
            <div className="p-4 border-b border-cyber-gray bg-cyber-dark flex justify-between items-center">
              <div className="flex items-center space-x-4">
                <span className="text-cyber-purple font-bold uppercase text-xs">Target: {activeTab.ip}</span>
                <span className={`text-xs font-bold uppercase px-2 py-0.5 border ${
                  activeTab.status === 'connected' ? 'border-cyber-green text-cyber-green' :
                  activeTab.status === 'connecting' ? 'border-cyber-blue text-cyber-blue animate-pulse' :
                  activeTab.status === 'failed' ? 'border-cyber-red text-cyber-red' :
                  'border-cyber-gray text-cyber-gray'
                }`}>
                  {activeTab.status}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleFullscreen}
                  className="text-cyber-gray-light hover:text-cyber-blue transition-colors p-1"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 p-6 overflow-auto">
              <ProtocolConnection key={activeTab.id} tab={activeTab} />
            </div>
            {!isFullscreen && (
              <div
                className="absolute bottom-0 left-0 right-0 h-1 bg-cyber-gray hover:bg-cyber-blue cursor-ns-resize transition-colors"
                onMouseDown={handleMouseDown}
                style={{ cursor: isResizing ? 'ns-resize' : 'ns-resize' }}
              >
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-1 bg-cyber-blue rounded-full"></div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-center items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-cyber-gray opacity-20">
                <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-cyber-gray-light font-mono uppercase tracking-widest">No Active Connections</p>
              <p className="text-xs text-cyber-gray">Select an asset from the dashboard or click "New Connection"</p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Vault Sidebar */}
    {showVault && !isFullscreen && (
      <div className="w-80 bg-cyber-darker border-l border-cyber-green flex flex-col">
        <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-cyber-green uppercase tracking-wider">◈ VAULT</h3>
            <button 
              onClick={toggleVault}
              className="text-cyber-gray hover:text-cyber-red transition-colors text-xl"
            >
              ×
            </button>
          </div>
          {isVaultUnlocked && (
            <button 
              onClick={handleVaultLock}
              className="text-xs text-cyber-gray hover:text-cyber-red transition-colors"
            >
              ◆ Lock Vault
            </button>
          )}
        </div>

        {!isVaultUnlocked ? (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="w-full space-y-4">
              <div className="text-center mb-6">
                <div className="text-6xl mb-4 text-cyber-gray">◆</div>
                <p className="text-cyber-gray-light text-sm">Vault Locked</p>
              </div>
              <div>
                <label className="block text-xs text-cyber-gray-light mb-1">Enter Password</label>
                <input
                  type="password"
                  value={vaultPassword}
                  onChange={(e) => setVaultPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVaultUnlock()}
                  className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-green outline-none"
                  placeholder="Password"
                  autoFocus
                />
              </div>
              <button
                onClick={handleVaultUnlock}
                className="w-full btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-2"
              >
                Unlock Vault
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <div className="space-y-2 mb-4">
              {/* Group Selector */}
              <div className="flex items-center justify-between mb-2">
                <select
                  value={selectedGroup}
                  onChange={(e) => setSelectedGroup(e.target.value)}
                  className="flex-1 bg-cyber-darker border border-cyber-green rounded px-3 py-2 text-sm text-cyber-green font-mono uppercase tracking-wider focus:border-cyber-green focus:ring-1 focus:ring-cyber-green outline-none mr-2 cursor-pointer hover:bg-cyber-dark transition-all"
                  style={{
                    WebkitAppearance: 'none',
                    MozAppearance: 'none',
                    appearance: 'none',
                    backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300ff88' stroke-width='2' stroke-linecap='square' stroke-linejoin='miter'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 0.5rem center',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="all" className="bg-cyber-darker text-cyber-green">◈ All Groups</option>
                  {groups.map(group => (
                    <option key={group} value={group} className="bg-cyber-darker text-cyber-green">◈ {group}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowGroupModal(true)}
                  className="btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black px-3 py-2 text-sm font-bold"
                  title="Add new group"
                >
                  + Group
                </button>
              </div>

              <input
                type="text"
                placeholder="⌕ Search credentials..."
                className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-sm text-white focus:border-cyber-green outline-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-cyber-gray-light">Sort by:</span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => setVaultSortBy('recent')}
                    className={`text-xs px-2 py-1 border rounded transition-all ${
                      vaultSortBy === 'recent'
                        ? 'border-cyber-green text-cyber-green bg-cyber-green bg-opacity-10'
                        : 'border-cyber-gray text-cyber-gray hover:border-cyber-green hover:text-cyber-green'
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    onClick={() => setVaultSortBy('frequent')}
                    className={`text-xs px-2 py-1 border rounded transition-all ${
                      vaultSortBy === 'frequent'
                        ? 'border-cyber-green text-cyber-green bg-cyber-green bg-opacity-10'
                        : 'border-cyber-gray text-cyber-gray hover:border-cyber-green hover:text-cyber-green'
                    }`}
                  >
                    Frequent
                  </button>
                  <button
                    onClick={() => setVaultSortBy('name')}
                    className={`text-xs px-2 py-1 border rounded transition-all ${
                      vaultSortBy === 'name'
                        ? 'border-cyber-green text-cyber-green bg-cyber-green bg-opacity-10'
                        : 'border-cyber-gray text-cyber-gray hover:border-cyber-green hover:text-cyber-green'
                    }`}
                  >
                    Name
                  </button>
                </div>
              </div>
            </div>
            {vaultCredentials.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-cyber-gray-light text-sm mb-2">No credentials saved</p>
                <p className="text-xs text-cyber-gray">Connect to an asset to add it to your vault</p>
              </div>
            ) : (
              vaultCredentials.map(cred => (
                <div 
                  key={cred.id}
                  className="bg-cyber-dark border border-cyber-gray hover:border-cyber-blue rounded p-3 transition-all group relative"
                  onMouseEnter={() => setHoveredCredId(cred.id)}
                  onMouseLeave={() => setHoveredCredId(null)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveCredential(cred.id);
                    }}
                    className="absolute top-2 right-2 text-cyber-gray hover:text-cyber-red transition-colors opacity-0 group-hover:opacity-100"
                    title="Remove from vault"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                  <div className="flex items-start justify-between mb-2 pr-6">
                    <div className="flex-1">
                      <p className="text-cyber-blue font-bold text-sm">{cred.hostname || cred.host}</p>
                      <p className={`text-xs transition-all ${hoveredCredId === cred.id ? 'text-cyber-green cyber-glow' : 'text-cyber-gray-light'}`}>
                        {cred.host}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 border rounded uppercase ${getProtocolColor(cred.protocol)}`}>
                      {cred.protocol}
                    </span>
                  </div>
                  {cred.group && (
                    <div className="mb-2">
                      <span className="text-xs px-2 py-0.5 bg-cyber-darker border border-cyber-purple text-cyber-purple rounded">
                        {cred.group}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-cyber-green mb-2">◉ {cred.username}</p>
                  <div className="flex justify-between items-center text-xs text-cyber-gray">
                    <span>Last: {cred.lastUsed}</span>
                    <span>Uses: {cred.useCount}</span>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleQuickConnect(cred.host, cred.protocol as Protocol);
                    }}
                    className="w-full mt-2 btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ◆ Connect Now ►
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )}

    {/* Group Management Modal */}
    {showGroupModal && (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-cyber-dark border border-cyber-green p-6 rounded-lg w-96">
          <h3 className="text-lg font-bold text-cyber-green mb-4">◈ Add New Group</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-cyber-gray-light mb-1">Group Name</label>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddGroup()}
                className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-green outline-none"
                placeholder="e.g., Staging, QA, Servers"
                autoFocus
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleAddGroup}
                className="flex-1 btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-2"
              >
                Add Group
              </button>
              <button
                onClick={() => {
                  setShowGroupModal(false);
                  setNewGroupName('');
                }}
                className="flex-1 btn-cyber border-cyber-gray text-cyber-gray hover:bg-cyber-gray hover:text-black py-2"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
  );
};

export default AccessHub;