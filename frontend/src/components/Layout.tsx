import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { useAgentStore } from '../store/agentStore';
import { useScanStore } from '../store/scanStore';
import { useAccessStore } from '../store/accessStore';
import { useDiscoveryStore } from '../store/discoveryStore';
import { useExploitStore } from '../store/exploitStore';
import { useTrafficStore } from '../store/trafficStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { activeAgent, setActiveAgent } = usePOV();
  const { agents } = useAgentStore();
  const { tabs: scanTabs, passiveScanEnabled } = useScanStore();
  const { tabs: accessTabs } = useAccessStore();
  const { isDiscovering } = useDiscoveryStore();
  const { getActiveSessionCount } = useExploitStore();
  const { isPinging, isCapturing, isCrafting, isStorming } = useTrafficStore();

  const isAnyScanRunning = scanTabs.some(tab => tab.status === 'running');
  const isAnyVulnScanRunning = scanTabs.some(tab => tab.vulnScanning);
  const connectedCount = accessTabs.filter(tab => tab.status === 'connected').length;
  const activeExploitCount = getActiveSessionCount();
  const isTrafficActive = isPinging || isCapturing || isCrafting || isStorming;
  const agentCount = agents.filter(agent => agent.status === 'online').length;

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '▣', symbol: '◉' },
    { name: 'Assets', href: '/assets', icon: '⬢', symbol: '◈' },
    { name: 'Topology', href: '/topology', icon: '◎', symbol: '⟐' },
    { name: 'Traffic', href: '/traffic', icon: '≋', symbol: '⟐' },
    { name: 'Scans', href: '/scans', icon: '◈', symbol: '⬢' },
    { name: 'ACCESS', href: '/access', icon: '⬡', symbol: '◉' },
    { name: 'Flows', href: '/flows', icon: '◇', symbol: '◆' },
    { name: 'Agents', href: '/agents', icon: '◆', symbol: '◇' },
    { name: 'Host', href: '/host', icon: '◐', symbol: '⎔' },
    { name: 'Settings', href: '/settings', icon: '⚙', symbol: '⬢' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-cyber-black font-terminal">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-cyber-dark border-r border-cyber-gray sidebar-transition flex flex-col`}>
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-cyber-gray">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-cyber-red border border-cyber-red-dark flex items-center justify-center cyber-glow-red relative">
              <span className="text-cyber-red font-bold text-lg">◉</span>
              {isAnyScanRunning && (
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-cyber-red rounded-full animate-ping"></div>
              )}
            </div>
            {sidebarOpen && (
              <span className="text-cyber-red font-bold text-lg tracking-wider cyber-glow-red">NOP</span>
            )}
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-cyber-gray-light hover:text-cyber-red transition-colors duration-300 text-lg"
            title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {sidebarOpen ? '◀' : '▶'}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3">
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={`flex items-center px-3 py-3 transition-all duration-300 border border-transparent relative ${
                    isActive(item.href)
                      ? 'bg-cyber-darker border-cyber-red text-cyber-red cyber-glow-red'
                      : 'text-cyber-gray-light hover:bg-cyber-darker hover:border-cyber-purple hover:text-cyber-purple'
                  }`}
                  title={!sidebarOpen ? item.name : undefined}
                >
                  <span className={`text-lg ${sidebarOpen ? 'mr-3' : 'mx-auto'}`}>
                    {isActive(item.href) ? item.symbol : item.icon}
                  </span>
                  {sidebarOpen && (
                    <span className="font-medium tracking-wide uppercase text-sm">
                      {item.name}
                    </span>
                  )}
                  {item.name === 'Assets' && (isDiscovering || passiveScanEnabled) && (
                    <div className={`absolute right-2 flex items-center gap-1 ${!sidebarOpen ? 'top-2' : ''}`}>
                      {isDiscovering && <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" title="Discovery running"></div>}
                      {passiveScanEnabled && <div className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse" title="Passive discovery on"></div>}
                    </div>
                  )}
                  {item.name === 'Traffic' && isTrafficActive && (
                    <div className={`absolute right-2 flex items-center gap-1 ${!sidebarOpen ? 'top-2' : ''}`}>
                      {isCapturing && <div className="w-2 h-2 bg-cyber-green rounded-full animate-pulse" title="Capturing"></div>}
                      {isPinging && <div className="w-2 h-2 bg-cyber-blue rounded-full animate-pulse" title="Pinging"></div>}
                      {isCrafting && <div className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse" title="Sending"></div>}
                      {isStorming && <div className="w-2 h-2 bg-cyber-red rounded-full animate-ping" title="Storming"></div>}
                    </div>
                  )}
                  {item.name === 'Scans' && (isAnyScanRunning || isAnyVulnScanRunning || passiveScanEnabled) && (
                    <div className={`absolute right-2 flex items-center gap-1 ${!sidebarOpen ? 'top-2' : ''}`}>
                      {isAnyScanRunning && <div className="w-2 h-2 bg-cyber-red rounded-full animate-pulse" title="Port scan running"></div>}
                      {isAnyVulnScanRunning && <div className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse" title="Vulnerability scan running"></div>}
                      {passiveScanEnabled && !isAnyVulnScanRunning && <div className="w-2 h-2 bg-cyber-purple rounded-full" title="Passive scan on"></div>}
                    </div>
                  )}
                  {item.name === 'ACCESS' && (connectedCount > 0 || activeExploitCount > 0) && (
                    <div className={`absolute right-2 flex items-center justify-center ${
                      activeExploitCount > 0 ? 'bg-cyber-red' : 'bg-cyber-green'
                    } text-black text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 ${!sidebarOpen ? 'top-2' : ''}`}>
                      {activeExploitCount || connectedCount}
                    </div>
                  )}
                  {item.name === 'Agents' && agentCount > 0 && (
                    <div className={`absolute right-2 flex items-center justify-center bg-cyber-purple text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 ${!sidebarOpen ? 'top-2' : ''}`}>
                      {agentCount}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-cyber-gray">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-cyber-gray border border-cyber-purple flex items-center justify-center">
              <span className="text-cyber-purple text-sm font-bold">
                {user?.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            {sidebarOpen && (
              <div className="flex-1">
                <p className="text-cyber-purple text-sm font-medium tracking-wide">
                  {user?.username || 'admin'}
                </p>
                <p className="text-cyber-gray-light text-xs uppercase tracking-wider">
                  {user?.role || 'operator'}
                </p>
              </div>
            )}
          </div>
          {sidebarOpen && (
            <button
              onClick={logout}
              className="mt-3 w-full text-left text-cyber-gray-light hover:text-cyber-red text-sm uppercase tracking-wide transition-colors duration-300"
            >
              &gt; logout
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-cyber-dark border-b border-cyber-gray px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-cyber-red text-xl font-bold tracking-wider uppercase cyber-glow-red">
              {activeAgent ? (
                <>
                  NOP - <span className="text-cyber-purple">{activeAgent.name}</span>
                </>
              ) : (
                navigation.find(item => isActive(item.href))?.name || 'Network Observatory Platform'
              )}
            </h1>
            <div className="flex items-center space-x-6">
              {activeAgent && (
                <div className="flex items-center space-x-3 bg-cyber-purple/20 border-2 border-cyber-purple px-5 py-2 rounded cyber-glow-purple shadow-lg shadow-cyber-purple/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-cyber-purple rounded-full animate-pulse"></div>
                    <span className="text-cyber-purple text-sm font-bold tracking-wide uppercase">
                      Agent POV: {activeAgent.name}
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveAgent(null)}
                    className="px-4 py-1.5 bg-cyber-purple border-2 border-cyber-purple text-white text-xs uppercase font-bold hover:bg-cyber-purple-dark hover:border-cyber-purple-light transition cyber-glow-purple flex items-center space-x-1"
                    title="Exit Agent POV and return to global view"
                  >
                    <span>✕</span>
                    <span>Exit POV</span>
                  </button>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyber-green rounded-full cyber-pulse"></div>
                <span className="text-cyber-green text-sm font-medium tracking-wide uppercase">
                  System Online
                </span>
              </div>
              <div className="text-cyber-gray-light text-sm font-mono">
                {new Date().toLocaleTimeString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-cyber-black">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
