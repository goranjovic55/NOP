import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useScanStore } from '../store/scanStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { tabs } = useScanStore();

  const isAnyScanRunning = tabs.some(tab => tab.status === 'running');

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '▣', symbol: '◉' },
    { name: 'Assets', href: '/assets', icon: '⬢', symbol: '◈' },
    { name: 'Topology', href: '/topology', icon: '◎', symbol: '⬟' },
    { name: 'Traffic', href: '/traffic', icon: '≋', symbol: '⟐' },
    { name: 'Scans', href: '/scans', icon: '◈', symbol: '⬢' },
    { name: 'Access Hub', href: '/access', icon: '⬡', symbol: '◉' },
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
                  {item.name === 'Scans' && isAnyScanRunning && (
                    <div className={`absolute right-2 w-2 h-2 bg-cyber-red rounded-full animate-pulse ${!sidebarOpen ? 'top-2' : ''}`}></div>
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
              {navigation.find(item => isActive(item.href))?.name || 'Network Observatory Platform'}
            </h1>
            <div className="flex items-center space-x-6">
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
