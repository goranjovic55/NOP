import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CyberPageTitle } from '../components/CyberUI';
import { usePOV, getPOVHeaders } from '../context/POVContext';
import { useAccessStore, RemoteAccessSettings, defaultRemoteAccessSettings } from '../store/accessStore';
import { useTopologyStore, TopologySettings, defaultTopologySettings } from '../store/topologyStore';

interface ScanSettings {
  profile_name: string;
  profile_description: string;
  port_scan_enabled: boolean;
  port_scan_type: 'quick' | 'full' | 'custom';
  custom_ports: string;
  port_scan_timeout: number;
  tcp_scan_enabled: boolean;
  udp_scan_enabled: boolean;
  syn_scan: boolean;
  vuln_scan_enabled: boolean;
  vuln_scan_depth: 'basic' | 'standard' | 'deep';
  safe_checks_only: boolean;
  check_cve_database: boolean;
  detect_versions: boolean;
  max_concurrent_scans: number;
  scan_throttle: number;
  retry_attempts: number;
  parallel_threads: number;
  auto_scan_enabled: boolean;
  auto_scan_interval: number;
  auto_scan_schedule: string;
  generate_reports: boolean;
  report_format: 'pdf' | 'html' | 'json' | 'all';
  verbose_output: boolean;
}

interface DiscoverySettings {
  profile_name: string;
  profile_description: string;
  discovery_enabled: boolean;
  discovery_method: 'arp' | 'ping' | 'both';
  network_range: string;
  discovery_interval: number;
  packets_per_second: number;
  discovery_timeout: number;
  ping_retries: number;
  enable_dns_resolution: boolean;
  enable_os_detection: boolean;
  enable_service_detection: boolean;
  passive_discovery: boolean;
  track_source_only: boolean;
  filter_unicast: boolean;
  filter_multicast: boolean;
  filter_broadcast: boolean;
  fingerprint_os: boolean;
  detect_vpn: boolean;
  interface_name: string;
  promiscuous_mode: boolean;
  exclude_ranges: string;
  include_only_ranges: string;
  min_response_time: number;
  max_response_time: number;
}

interface AccessSettings {
  session_timeout: number;
  max_login_attempts: number;
  lockout_duration: number;
  enable_credential_vault: boolean;
  vault_timeout: number;
  require_password_for_vault: boolean;
  api_access_enabled: boolean;
  api_rate_limit: number;
  log_all_access: boolean;
  log_failed_attempts: boolean;
  retention_days: number;
}

interface SystemSettings {
  system_name: string;
  timezone: string;
  language: 'en' | 'es' | 'fr' | 'de';
  enable_caching: boolean;
  cache_ttl: number;
  max_workers: number;
  data_retention_days: number;
  auto_cleanup_enabled: boolean;
  backup_enabled: boolean;
  backup_interval: number;
  enable_notifications: boolean;
  notification_channels: string;
  webhook_url: string;
  enable_metrics: boolean;
  metrics_interval: number;
  enable_health_checks: boolean;
  db_pool_size: number;
  db_max_overflow: number;
}

interface AllSettings {
  scan: ScanSettings;
  discovery: DiscoverySettings;
  access: AccessSettings;
  system: SystemSettings;
}

const Settings: React.FC = () => {
  const { activeAgent, isAgentPOV } = usePOV();
  const { remoteSettings, updateRemoteSettings, resetRemoteSettings } = useAccessStore();
  const { settings: topologySettings, updateSettings: updateTopologySettings, resetSettings: resetTopologySettings } = useTopologyStore();
  const [activeTab, setActiveTab] = useState<'scan' | 'discovery' | 'access' | 'remote' | 'topology' | 'system'>('scan');
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [agentSettings, setAgentSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [interfaces, setInterfaces] = useState<Array<{ name: string; ip: string; status: string }>>([]);

  useEffect(() => {
    // Define fetchInterfaces inside useEffect to capture current activeAgent value
    // This prevents stale closure issues with the polling interval
    const fetchInterfacesWithAgent = async () => {
      try {
        const response = await axios.get('/api/v1/traffic/interfaces', {
          headers: getPOVHeaders(activeAgent)
        });
        setInterfaces(response.data);
      } catch (error) {
        console.error('Error fetching interfaces:', error);
      }
    };

    fetchSettings();
    fetchInterfacesWithAgent();
    const interval = setInterval(fetchInterfacesWithAgent, 5000);
    return () => clearInterval(interval);
  }, [isAgentPOV, activeAgent]);

  // Keep external version for manual refresh if needed
  const fetchInterfaces = async () => {
    try {
      const response = await axios.get('/api/v1/traffic/interfaces', {
        headers: getPOVHeaders(activeAgent)
      });
      setInterfaces(response.data);
    } catch (error) {
      console.error('Error fetching interfaces:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      
      // Always fetch global settings as base
      const response = await axios.get('/api/v1/settings/');
      
      // Validate response structure
      if (response.data && 
          response.data.scan && 
          response.data.discovery && 
          response.data.access && 
          response.data.system) {
        
        // If in agent POV mode, fetch and merge agent-specific settings
        if (isAgentPOV && activeAgent) {
          try {
            const agentResponse = await axios.get('/api/v1/agent-settings/current/settings', {
              headers: getPOVHeaders(activeAgent)
            });
            setAgentSettings(agentResponse.data);
            
            // Merge agent settings with global settings (agent settings take priority)
            const mergedSettings = {
              scan: { ...response.data.scan, ...(agentResponse.data.scan || {}) },
              discovery: { ...response.data.discovery, ...(agentResponse.data.discovery || {}) },
              access: { ...response.data.access, ...(agentResponse.data.access || {}) },
              system: { ...response.data.system, ...(agentResponse.data.system || {}) }
            };
            setSettings(mergedSettings);
          } catch (error) {
            console.error('Error fetching agent settings:', error);
            setAgentSettings(null);
            setSettings(response.data);
          }
        } else {
          setAgentSettings(null);
          setSettings(response.data);
        }
      } else {
        throw new Error('Invalid settings response structure');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showMessage('error', 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async () => {
    // Remote settings are stored locally in accessStore (automatically persisted)
    if (activeTab === 'remote') {
      showMessage('success', 'Remote access settings saved');
      return;
    }
    
    // Topology settings are stored locally in topologyStore (automatically persisted)
    if (activeTab === 'topology') {
      showMessage('success', 'Topology settings saved');
      return;
    }
    
    if (!settings) return;
    
    try {
      setSaving(true);
      
      // If in agent POV mode, save agent-specific settings
      if (isAgentPOV && activeAgent) {
        // Merge current tab settings with agent settings
        const updatedAgentSettings = {
          ...agentSettings,
          [activeTab]: settings[activeTab as keyof AllSettings]
        };
        
        await axios.put('/api/v1/agent-settings/current/settings', updatedAgentSettings, {
          headers: getPOVHeaders(activeAgent)
        });
        setAgentSettings(updatedAgentSettings);
        showMessage('success', `Agent "${activeAgent.name}" ${activeTab} settings saved`);
      } else {
        // Save global C2 settings
        await axios.put(`/api/v1/settings/${activeTab}`, settings[activeTab as keyof AllSettings]);
        showMessage('success', `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings saved successfully`);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    // Remote settings reset is handled by the RemoteAccessSettingsPanel
    if (activeTab === 'remote') {
      if (window.confirm('Reset remote access settings to defaults?')) {
        resetRemoteSettings();
        showMessage('success', 'Remote access settings reset to defaults');
      }
      return;
    }
    
    // Topology settings reset
    if (activeTab === 'topology') {
      if (window.confirm('Reset topology settings to defaults?')) {
        resetTopologySettings();
        showMessage('success', 'Topology settings reset to defaults');
      }
      return;
    }
    
    if (!window.confirm(`Reset ${activeTab} settings to defaults?`)) return;
    
    try {
      setSaving(true);
      const response = await axios.post(`/api/v1/settings/reset/${activeTab}`);
      setSettings(prev => prev ? { ...prev, [activeTab]: response.data.config } : null);
      showMessage('success', `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings reset to defaults`);
    } catch (error) {
      console.error('Error resetting settings:', error);
      showMessage('error', 'Failed to reset settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: string, value: string | number | boolean) => {
    // Remote settings are handled by updateRemoteSettings from accessStore
    if (activeTab === 'remote') return;
    // Topology settings are handled by updateTopologySettings from topologyStore
    if (activeTab === 'topology') return;
    
    if (settings) {
      const settingsKey = activeTab as keyof AllSettings;
      // Update the settings state (works for both C2 and agent POV)
      setSettings({
        ...settings,
        [settingsKey]: {
          ...settings[settingsKey],
          [key]: value
        }
      });
      
      // Also update agent settings state if in POV mode
      if (isAgentPOV && agentSettings) {
        setAgentSettings({
          ...agentSettings,
          [settingsKey]: {
            ...(agentSettings[settingsKey] || {}),
            [key]: value
          }
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 space-y-4 animate-pulse">
        {/* Tabs skeleton */}
        <div className="flex gap-2 border-b border-cyber-gray pb-2">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-10 w-28 bg-cyber-gray/30 rounded" />
          ))}
        </div>
        {/* Settings form skeleton */}
        <div className="bg-cyber-dark border border-cyber-gray rounded p-6 space-y-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-32 bg-cyber-gray/30 rounded" />
              <div className="h-10 w-full bg-cyber-gray/20 rounded" />
            </div>
          ))}
          <div className="h-10 w-32 bg-cyber-gray/30 rounded" />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-red">Failed to load settings</div>
      </div>
    );
  }

  const tabs = [
    { 
      id: 'scan' as const, 
      label: 'Scan Settings', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </svg>
      )
    },
    { 
      id: 'discovery' as const, 
      label: 'Discovery Settings', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1" opacity="0.3"/>
          <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    },
    { 
      id: 'access' as const, 
      label: 'Access Settings', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          <circle cx="12" cy="16" r="1.5" fill="currentColor"/>
        </svg>
      )
    },
    { 
      id: 'remote' as const, 
      label: 'Remote Access', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
          <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    },
    { 
      id: 'topology' as const, 
      label: 'Topology', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="5" cy="12" r="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="19" cy="5" r="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="19" cy="19" r="2" stroke="currentColor" strokeWidth="2"/>
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M9.5 10.5L7 12M14.5 10L17 7M14.5 14L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )
    },
    { 
      id: 'system' as const, 
      label: 'System Settings', 
      icon: (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
          <path d="M12 1v3M12 20v3M3.5 4.5l2.1 2.1M18.4 18.4l2.1 2.1M1 12h3M20 12h3M3.5 19.5l2.1-2.1M18.4 5.6l2.1-2.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header with POV indicator */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <CyberPageTitle color="red">
            {isAgentPOV && activeAgent ? `Agent Settings: ${activeAgent.name}` : 'System Configuration'}
          </CyberPageTitle>
          {isAgentPOV && activeAgent && (
            <div className="px-3 py-1 bg-purple-900/30 border border-purple-500 text-purple-400 text-xs uppercase tracking-wider">
              Agent POV Mode
            </div>
          )}
        </div>
        {message && (
          <div className={`px-4 py-2 border ${message.type === 'success' ? 'border-green-500 text-green-500' : 'border-cyber-red text-cyber-red'} bg-cyber-darker`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-cyber-gray">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center px-6 py-3 font-bold uppercase text-sm tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-cyber-darker border-t-2 border-x-2 border-cyber-red text-cyber-red'
                : 'text-cyber-gray-light hover:text-cyber-purple'
            }`}
          >
            <span className="mr-2 inline-flex">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="dashboard-card p-6">
        {isAgentPOV && activeAgent && (
          <div className="mb-4 p-3 bg-purple-900/20 border border-purple-500/30 text-purple-300 text-sm">
            <strong>Agent POV Mode:</strong> You are configuring settings for agent "{activeAgent.name}". 
            These settings are stored separately and will be used by this agent.
          </div>
        )}
        
        {activeTab === 'scan' && <ScanSettingsPanel settings={settings.scan} onChange={updateSetting} />}
        {activeTab === 'discovery' && (
          <DiscoverySettingsPanel 
            settings={settings.discovery} 
            onChange={updateSetting} 
            interfaces={interfaces} 
          />
        )}
        {activeTab === 'access' && <AccessSettingsPanel settings={settings.access} onChange={updateSetting} />}
        {activeTab === 'remote' && (
          <RemoteAccessSettingsPanel 
            settings={remoteSettings} 
            onChange={(key, value) => updateRemoteSettings({ [key]: value })}
            onReset={resetRemoteSettings}
          />
        )}
        {activeTab === 'topology' && (
          <TopologySettingsPanel 
            settings={topologySettings} 
            onChange={(key, value) => updateTopologySettings({ [key]: value })}
            onReset={resetTopologySettings}
          />
        )}
        {activeTab === 'system' && <SystemSettingsPanel settings={settings.system} onChange={updateSetting} />}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-4">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-6 py-2 border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple uppercase text-sm font-bold disabled:opacity-50"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-cyber px-8 py-2 border-cyber-red text-cyber-red disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

// Scan Settings Panel
const ScanSettingsPanel: React.FC<{ settings: ScanSettings; onChange: (key: string, value: string | number | boolean) => void }> = ({ settings, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Profile Configuration */}
      <SettingsSection title="Profile Configuration">
        <SettingsInput
          label="Profile Name"
          value={settings.profile_name}
          onChange={(val) => onChange('profile_name', val)}
          placeholder="Default Scan"
          description="Name for this scan profile (visible in scanner)"
        />
        
        <SettingsInput
          label="Profile Description"
          value={settings.profile_description}
          onChange={(val) => onChange('profile_description', val)}
          placeholder="Describe this scan configuration..."
          description="Optional description for this profile"
        />
      </SettingsSection>

      {/* Port Scanning */}
      <SettingsSection title="Port Scanning">
        <SettingsToggle
          label="Enable Port Scanning"
          value={settings.port_scan_enabled}
          onChange={(val) => onChange('port_scan_enabled', val)}
        />
        
        {settings.port_scan_enabled && (
          <>
            <SettingsSelect
              label="Scan Type"
              value={settings.port_scan_type}
              options={[
                { value: 'quick', label: 'Quick Scan (Top 100 Ports)' },
                { value: 'full', label: 'Full Scan (All 65535 Ports)' },
                { value: 'custom', label: 'Custom Port List' }
              ]}
              onChange={(val) => onChange('port_scan_type', val)}
            />
            
            {settings.port_scan_type === 'custom' && (
              <SettingsInput
                label="Custom Ports"
                value={settings.custom_ports}
                onChange={(val) => onChange('custom_ports', val)}
                placeholder="22,80,443,3389"
                description="Comma-separated list of ports"
              />
            )}
            
            <SettingsSlider
              label="Port Scan Timeout"
              value={settings.port_scan_timeout}
              min={1}
              max={60}
              unit="seconds"
              onChange={(val) => onChange('port_scan_timeout', val)}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <SettingsToggle
                label="TCP Scan"
                value={settings.tcp_scan_enabled}
                onChange={(val) => onChange('tcp_scan_enabled', val)}
              />
              
              <SettingsToggle
                label="UDP Scan"
                value={settings.udp_scan_enabled}
                onChange={(val) => onChange('udp_scan_enabled', val)}
              />
            </div>
            
            <SettingsToggle
              label="SYN Scan (Stealth)"
              value={settings.syn_scan}
              onChange={(val) => onChange('syn_scan', val)}
              description="Use SYN packets for stealthier scanning"
            />
          </>
        )}
      </SettingsSection>

      {/* Vulnerability Scanning */}
      <SettingsSection title="Vulnerability Scanning">
        <SettingsToggle
          label="Enable Vulnerability Scanning"
          value={settings.vuln_scan_enabled}
          onChange={(val) => onChange('vuln_scan_enabled', val)}
        />
        
        {settings.vuln_scan_enabled && (
          <>
            <SettingsSelect
              label="Scan Depth"
              value={settings.vuln_scan_depth}
              options={[
                { value: 'basic', label: 'Basic - Quick checks only' },
                { value: 'standard', label: 'Standard - Balanced approach' },
                { value: 'deep', label: 'Deep - Comprehensive scanning' }
              ]}
              onChange={(val) => onChange('vuln_scan_depth', val)}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <SettingsToggle
                label="Safe Checks Only"
                value={settings.safe_checks_only}
                onChange={(val) => onChange('safe_checks_only', val)}
              />
              
              <SettingsToggle
                label="Check CVE Database"
                value={settings.check_cve_database}
                onChange={(val) => onChange('check_cve_database', val)}
              />
              
              <SettingsToggle
                label="Detect Versions"
                value={settings.detect_versions}
                onChange={(val) => onChange('detect_versions', val)}
              />
            </div>
          </>
        )}
      </SettingsSection>

      {/* Performance */}
      <SettingsSection title="Performance & Scheduling">
        <SettingsSlider
          label="Max Concurrent Scans"
          value={settings.max_concurrent_scans}
          min={1}
          max={50}
          onChange={(val) => onChange('max_concurrent_scans', val)}
        />
        
        <SettingsSlider
          label="Scan Throttle"
          value={settings.scan_throttle}
          min={10}
          max={1000}
          unit="pps"
          onChange={(val) => onChange('scan_throttle', val)}
        />
        
        <SettingsSlider
          label="Retry Attempts"
          value={settings.retry_attempts}
          min={1}
          max={10}
          onChange={(val) => onChange('retry_attempts', val)}
          description="Number of retries for failed scans"
        />
        
        <SettingsSlider
          label="Parallel Threads"
          value={settings.parallel_threads}
          min={1}
          max={100}
          onChange={(val) => onChange('parallel_threads', val)}
          description="Number of parallel scanning threads"
        />
        
        <SettingsToggle
          label="Enable Auto Scan"
          value={settings.auto_scan_enabled}
          onChange={(val) => onChange('auto_scan_enabled', val)}
        />
        
        {settings.auto_scan_enabled && (
          <>
            <SettingsSlider
              label="Auto Scan Interval"
              value={settings.auto_scan_interval}
              min={5}
              max={1440}
              unit="minutes"
              onChange={(val) => onChange('auto_scan_interval', val)}
            />
            
            <SettingsInput
              label="Cron Schedule"
              value={settings.auto_scan_schedule}
              onChange={(val) => onChange('auto_scan_schedule', val)}
              placeholder="0 2 * * *"
              description="Cron expression for scheduled scans"
            />
          </>
        )}
      </SettingsSection>

      {/* Reporting */}
      <SettingsSection title="Reporting">
        <SettingsToggle
          label="Generate Reports"
          value={settings.generate_reports}
          onChange={(val) => onChange('generate_reports', val)}
        />
        
        {settings.generate_reports && (
          <>
            <SettingsSelect
              label="Report Format"
              value={settings.report_format}
              options={[
                { value: 'pdf', label: 'PDF' },
                { value: 'html', label: 'HTML' },
                { value: 'json', label: 'JSON' },
                { value: 'all', label: 'All Formats' }
              ]}
              onChange={(val) => onChange('report_format', val)}
            />
            
            <SettingsToggle
              label="Verbose Output"
              value={settings.verbose_output}
              onChange={(val) => onChange('verbose_output', val)}
              description="Include detailed information in reports"
            />
          </>
        )}
      </SettingsSection>
    </div>
  );
};
const DiscoverySettingsPanel: React.FC<{ 
  settings: DiscoverySettings; 
  onChange: (key: string, value: string | number | boolean) => void;
  interfaces: Array<{ name: string; ip: string; status: string }>;
}> = ({ settings, onChange, interfaces }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Profile Configuration */}
      <SettingsSection title="Profile Configuration">
        <SettingsInput
          label="Profile Name"
          value={settings.profile_name}
          onChange={(val) => onChange('profile_name', val)}
          placeholder="Default Discovery"
          description="Name for this discovery profile (visible in scanner)"
        />
        
        <SettingsInput
          label="Profile Description"
          value={settings.profile_description}
          onChange={(val) => onChange('profile_description', val)}
          placeholder="Describe this discovery configuration..."
          description="Optional description for this profile"
        />
      </SettingsSection>

      {/* Discovery Method */}
      <SettingsSection title="Discovery Method">
        <SettingsToggle
          label="Enable Network Discovery"
          value={settings.discovery_enabled}
          onChange={(val) => onChange('discovery_enabled', val)}
        />
        
        {settings.discovery_enabled && (
          <>
            <SettingsSelect
              label="Discovery Method"
              value={settings.discovery_method}
              options={[
                { value: 'arp', label: 'ARP Scan (Local Network)' },
                { value: 'ping', label: 'ICMP Ping Sweep' },
                { value: 'both', label: 'Both Methods' }
              ]}
              onChange={(val) => onChange('discovery_method', val)}
            />
            
            <SettingsInput
              label="Network Range"
              value={settings.network_range}
              onChange={(val) => onChange('network_range', val)}
              placeholder="172.21.0.0/24"
              description="CIDR notation network range"
            />
          </>
        )}
      </SettingsSection>

      {/* Timing */}
      <SettingsSection title="Timing & Performance">
        <SettingsSlider
          label="Discovery Interval"
          value={settings.discovery_interval}
          min={1}
          max={60}
          unit="minutes"
          onChange={(val) => onChange('discovery_interval', val)}
        />
        
        <SettingsSlider
          label="Packets Per Second"
          value={settings.packets_per_second}
          min={10}
          max={1000}
          unit="pps"
          onChange={(val) => onChange('packets_per_second', val)}
          description="Adjust to avoid network storming protection"
        />
        
        <SettingsSlider
          label="Discovery Timeout"
          value={settings.discovery_timeout}
          min={5}
          max={300}
          unit="seconds"
          onChange={(val) => onChange('discovery_timeout', val)}
        />
        
        <SettingsSlider
          label="Ping Retries"
          value={settings.ping_retries}
          min={1}
          max={10}
          onChange={(val) => onChange('ping_retries', val)}
          description="Number of ping retries for unresponsive hosts"
        />
      </SettingsSection>

      {/* Advanced Options */}
      <SettingsSection title="Advanced Options">
        <div className="grid grid-cols-2 gap-4">
          <SettingsToggle
            label="DNS Resolution"
            value={settings.enable_dns_resolution}
            onChange={(val) => onChange('enable_dns_resolution', val)}
          />
          
          <SettingsToggle
            label="OS Detection"
            value={settings.enable_os_detection}
            onChange={(val) => onChange('enable_os_detection', val)}
          />
          
          <SettingsToggle
            label="Service Detection"
            value={settings.enable_service_detection}
            onChange={(val) => onChange('enable_service_detection', val)}
          />
          
          <SettingsToggle
            label="Passive Discovery"
            value={settings.passive_discovery}
            onChange={(val) => onChange('passive_discovery', val)}
            description="Discover hosts from network traffic"
          />
          
          <SettingsToggle
            label="Source Only"
            value={settings.track_source_only}
            onChange={(val) => onChange('track_source_only', val)}
            description="Safe mode: only track senders. Disable to track receivers with filters below"
          />
          
          {!settings.track_source_only && (
            <div className="ml-6 space-y-3 border-l-2 border-cyber-purple pl-4">
              <p className="text-xs text-cyber-purple mb-1">Destination Filters:</p>
              
              <SettingsToggle
                label="Unicast"
                value={settings.filter_unicast}
                onChange={(val) => onChange('filter_unicast', val)}
                description="Filter point-to-point traffic"
              />
              
              <SettingsToggle
                label="Multicast"
                value={settings.filter_multicast}
                onChange={(val) => onChange('filter_multicast', val)}
                description="Filter group traffic (224.0.0.0/4)"
              />
              
              <SettingsToggle
                label="Broadcast"
                value={settings.filter_broadcast}
                onChange={(val) => onChange('filter_broadcast', val)}
                description="Filter network-wide traffic"
              />
            </div>
          )}
          
          <SettingsToggle
            label="OS Fingerprinting"
            value={settings.fingerprint_os}
            onChange={(val) => onChange('fingerprint_os', val)}
          />
          
          <SettingsToggle
            label="Detect VPN"
            value={settings.detect_vpn}
            onChange={(val) => onChange('detect_vpn', val)}
          />
        </div>
      </SettingsSection>

      {/* Network Interface */}
      <SettingsSection title="Network Interface">
        <div className="space-y-2">
          <label className="text-sm font-bold text-cyber-blue uppercase">
            Interface Name
          </label>
          <select
            value={settings.interface_name}
            onChange={(e) => onChange('interface_name', e.target.value)}
            className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue focus:border-cyber-red outline-none"
          >
            {interfaces.map((iface) => (
              <option key={iface.name} value={iface.name} className="bg-cyber-darker text-cyber-blue">
                {iface.name} - {iface.ip} ({iface.status})
              </option>
            ))}
            {interfaces.length === 0 && (
              <option value={settings.interface_name} className="bg-cyber-darker text-cyber-blue">
                {settings.interface_name} (loading...)
              </option>
            )}
          </select>
          <p className="text-xs text-cyber-gray-light">Select network interface for passive discovery</p>
        </div>
        
        <SettingsToggle
          label="Promiscuous Mode"
          value={settings.promiscuous_mode}
          onChange={(val) => onChange('promiscuous_mode', val)}
          description="Capture all network traffic (requires root)"
        />
      </SettingsSection>

      {/* Filters */}
      <SettingsSection title="Network Filters">
        <SettingsInput
          label="Exclude Ranges"
          value={settings.exclude_ranges}
          onChange={(val) => onChange('exclude_ranges', val)}
          placeholder="192.168.1.0/24, 10.0.0.0/8"
          description="Comma-separated CIDR ranges to exclude"
        />
        
        <SettingsInput
          label="Include Only Ranges"
          value={settings.include_only_ranges}
          onChange={(val) => onChange('include_only_ranges', val)}
          placeholder="172.21.0.0/24"
          description="If set, only scan these ranges"
        />
        
        <SettingsSlider
          label="Min Response Time"
          value={settings.min_response_time}
          min={0}
          max={10000}
          unit="ms"
          onChange={(val) => onChange('min_response_time', val)}
          description="Filter out hosts responding faster than this"
        />
        
        <SettingsSlider
          label="Max Response Time"
          value={settings.max_response_time}
          min={100}
          max={30000}
          unit="ms"
          onChange={(val) => onChange('max_response_time', val)}
          description="Filter out hosts responding slower than this"
        />
      </SettingsSection>
    </div>
  );
};

// Access Settings Panel
const AccessSettingsPanel: React.FC<{ settings: AccessSettings; onChange: (key: string, value: string | number | boolean) => void }> = ({ settings, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Authentication */}
      <SettingsSection title="Authentication">
        <SettingsSlider
          label="Session Timeout"
          value={settings.session_timeout}
          min={5}
          max={480}
          unit="minutes"
          onChange={(val) => onChange('session_timeout', val)}
        />
        
        <SettingsSlider
          label="Max Login Attempts"
          value={settings.max_login_attempts}
          min={3}
          max={10}
          onChange={(val) => onChange('max_login_attempts', val)}
        />
        
        <SettingsSlider
          label="Lockout Duration"
          value={settings.lockout_duration}
          min={5}
          max={120}
          unit="minutes"
          onChange={(val) => onChange('lockout_duration', val)}
        />
      </SettingsSection>

      {/* Credential Vault */}
      <SettingsSection title="Credential Vault">
        <SettingsToggle
          label="Enable Credential Vault"
          value={settings.enable_credential_vault}
          onChange={(val) => onChange('enable_credential_vault', val)}
          description="Store and manage saved connection credentials securely"
        />
        
        {settings.enable_credential_vault && (
          <>
            <SettingsSlider
              label="Vault Auto-Lock Timeout"
              value={settings.vault_timeout}
              min={1}
              max={60}
              unit="minutes"
              onChange={(val) => onChange('vault_timeout', val)}
              description="Automatically lock vault after inactivity"
            />
            
            <SettingsToggle
              label="Require Password Re-entry"
              value={settings.require_password_for_vault}
              onChange={(val) => onChange('require_password_for_vault', val)}
              description="Require login password to access credential vault"
            />
          </>
        )}
      </SettingsSection>

      {/* API Access */}
      <SettingsSection title="API Access">
        <SettingsToggle
          label="Enable API Access"
          value={settings.api_access_enabled}
          onChange={(val) => onChange('api_access_enabled', val)}
        />
        
        {settings.api_access_enabled && (
          <SettingsSlider
            label="API Rate Limit"
            value={settings.api_rate_limit}
            min={10}
            max={1000}
            unit="req/min"
            onChange={(val) => onChange('api_rate_limit', val)}
          />
        )}
      </SettingsSection>

      {/* Audit Logging */}
      <SettingsSection title="Audit Logging">
        <SettingsToggle
          label="Log All Access"
          value={settings.log_all_access}
          onChange={(val) => onChange('log_all_access', val)}
        />
        
        <SettingsToggle
          label="Log Failed Attempts"
          value={settings.log_failed_attempts}
          onChange={(val) => onChange('log_failed_attempts', val)}
        />
        
        <SettingsSlider
          label="Log Retention"
          value={settings.retention_days}
          min={30}
          max={365}
          unit="days"
          onChange={(val) => onChange('retention_days', val)}
        />
      </SettingsSection>
    </div>
  );
};

// System Settings Panel
const SystemSettingsPanel: React.FC<{ settings: SystemSettings; onChange: (key: string, value: string | number | boolean) => void }> = ({ settings, onChange }) => {
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* General */}
      <SettingsSection title="General">
        <SettingsInput
          label="System Name"
          value={settings.system_name}
          onChange={(val) => onChange('system_name', val)}
          placeholder="NOP - Network Observatory Platform"
        />
        
        <SettingsInput
          label="Timezone"
          value={settings.timezone}
          onChange={(val) => onChange('timezone', val)}
          placeholder="UTC"
        />
        
        <SettingsSelect
          label="Language"
          value={settings.language}
          options={[
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Español' },
            { value: 'fr', label: 'Français' },
            { value: 'de', label: 'Deutsch' }
          ]}
          onChange={(val) => onChange('language', val)}
        />
      </SettingsSection>

      {/* Performance */}
      <SettingsSection title="Performance">
        <SettingsToggle
          label="Enable Caching"
          value={settings.enable_caching}
          onChange={(val) => onChange('enable_caching', val)}
        />
        
        {settings.enable_caching && (
          <SettingsSlider
            label="Cache TTL"
            value={settings.cache_ttl}
            min={60}
            max={3600}
            unit="seconds"
            onChange={(val) => onChange('cache_ttl', val)}
          />
        )}
        
        <SettingsSlider
          label="Max Workers"
          value={settings.max_workers}
          min={1}
          max={16}
          onChange={(val) => onChange('max_workers', val)}
          description="Number of worker threads"
        />
      </SettingsSection>

      {/* Data Retention */}
      <SettingsSection title="Data Retention">
        <SettingsSlider
          label="Data Retention"
          value={settings.data_retention_days}
          min={7}
          max={365}
          unit="days"
          onChange={(val) => onChange('data_retention_days', val)}
        />
        
        <SettingsToggle
          label="Auto Cleanup"
          value={settings.auto_cleanup_enabled}
          onChange={(val) => onChange('auto_cleanup_enabled', val)}
          description="Automatically delete old data"
        />
        
        <SettingsToggle
          label="Enable Backups"
          value={settings.backup_enabled}
          onChange={(val) => onChange('backup_enabled', val)}
        />
        
        {settings.backup_enabled && (
          <SettingsSlider
            label="Backup Interval"
            value={settings.backup_interval}
            min={1}
            max={168}
            unit="hours"
            onChange={(val) => onChange('backup_interval', val)}
          />
        )}
      </SettingsSection>

      {/* Notifications */}
      <SettingsSection title="Notifications">
        <SettingsToggle
          label="Enable Notifications"
          value={settings.enable_notifications}
          onChange={(val) => onChange('enable_notifications', val)}
        />
        
        {settings.enable_notifications && (
          <>
            <SettingsInput
              label="Notification Channels"
              value={settings.notification_channels}
              onChange={(val) => onChange('notification_channels', val)}
              placeholder="webhook,slack"
              description="Comma-separated list of channels"
            />
            
            <SettingsInput
              label="Webhook URL"
              value={settings.webhook_url}
              onChange={(val) => onChange('webhook_url', val)}
              placeholder="https://hooks.slack.com/services/..."
            />
          </>
        )}
      </SettingsSection>

      {/* Monitoring */}
      <SettingsSection title="Monitoring">
        <SettingsToggle
          label="Enable Metrics"
          value={settings.enable_metrics}
          onChange={(val) => onChange('enable_metrics', val)}
        />
        
        {settings.enable_metrics && (
          <SettingsSlider
            label="Metrics Interval"
            value={settings.metrics_interval}
            min={10}
            max={300}
            unit="seconds"
            onChange={(val) => onChange('metrics_interval', val)}
          />
        )}
        
        <SettingsToggle
          label="Enable Health Checks"
          value={settings.enable_health_checks}
          onChange={(val) => onChange('enable_health_checks', val)}
        />
      </SettingsSection>

      {/* Database */}
      <SettingsSection title="Database">
        <SettingsSlider
          label="Connection Pool Size"
          value={settings.db_pool_size}
          min={5}
          max={50}
          onChange={(val) => onChange('db_pool_size', val)}
        />
        
        <SettingsSlider
          label="Max Overflow Connections"
          value={settings.db_max_overflow}
          min={5}
          max={100}
          onChange={(val) => onChange('db_max_overflow', val)}
        />
      </SettingsSection>
    </div>
  );
};

// Remote Access Settings Panel (RDP/VNC)
const RemoteAccessSettingsPanel: React.FC<{ 
  settings: RemoteAccessSettings; 
  onChange: (key: string, value: string | number | boolean) => void;
  onReset: () => void;
}> = ({ settings, onChange, onReset }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-cyber-gray-light text-sm">
          Configure display settings for RDP and VNC remote connections. These settings apply to all new connections.
        </p>
        <button
          onClick={onReset}
          className="px-4 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple text-xs uppercase"
        >
          Reset to Defaults
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Resolution Settings */}
        <SettingsSection title="Display Resolution">
          <SettingsSelect
            label="Resolution"
            value={settings.resolution}
            options={[
              { value: 'auto', label: 'Auto (Match Window Size)' },
              { value: '1920x1080', label: '1920×1080 (Full HD)' },
              { value: '1680x1050', label: '1680×1050 (WSXGA+)' },
              { value: '1440x900', label: '1440×900 (WXGA+)' },
              { value: '1280x1024', label: '1280×1024 (SXGA)' },
              { value: '1280x720', label: '1280×720 (HD)' },
              { value: '1024x768', label: '1024×768 (XGA)' },
              { value: 'custom', label: 'Custom Resolution' }
            ]}
            onChange={(val) => onChange('resolution', val)}
            description="Resolution sent to remote host on connect"
          />
          
          {settings.resolution === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <SettingsNumberInput
                label="Width"
                value={settings.customWidth}
                min={640}
                max={3840}
                onChange={(val) => onChange('customWidth', val)}
              />
              <SettingsNumberInput
                label="Height"
                value={settings.customHeight}
                min={480}
                max={2160}
                onChange={(val) => onChange('customHeight', val)}
              />
            </div>
          )}
          
          <SettingsSelect
            label="Scaling Mode"
            value={settings.scalingMode}
            options={[
              { value: 'fit', label: 'Fit (Maintain Aspect Ratio)' },
              { value: 'fill', label: 'Fill (Stretch to Container)' },
              { value: 'none', label: 'None (1:1 Pixels)' }
            ]}
            onChange={(val) => onChange('scalingMode', val)}
            description="How to scale display when window is resized"
          />
        </SettingsSection>

        {/* General Display Settings */}
        <SettingsSection title="Display Options">
          <SettingsToggle
            label="Hide Local Cursor"
            value={settings.hideCursor}
            onChange={(val) => onChange('hideCursor', val)}
            description="Hide local cursor inside remote display (shows remote cursor only)"
          />
          
          <SettingsToggle
            label="Clipboard Sync"
            value={settings.clipboardSync}
            onChange={(val) => onChange('clipboardSync', val)}
            description="Sync clipboard between local and remote"
          />
        </SettingsSection>

        {/* RDP Settings */}
        <SettingsSection title="RDP Settings">
          <SettingsSelect
            label="Color Depth"
            value={settings.rdpColorDepth.toString()}
            options={[
              { value: '16', label: '16-bit (High Color)' },
              { value: '24', label: '24-bit (True Color)' },
              { value: '32', label: '32-bit (True Color + Alpha)' }
            ]}
            onChange={(val) => onChange('rdpColorDepth', parseInt(val))}
            description="Higher depth = better quality, more bandwidth"
          />
          
          <div className="space-y-3">
            <p className="text-xs text-cyber-blue uppercase font-bold">Performance Options</p>
            <SettingsToggle
              label="Enable Wallpaper"
              value={settings.rdpEnableWallpaper}
              onChange={(val) => onChange('rdpEnableWallpaper', val)}
            />
            <SettingsToggle
              label="Enable Theming"
              value={settings.rdpEnableTheming}
              onChange={(val) => onChange('rdpEnableTheming', val)}
            />
            <SettingsToggle
              label="Font Smoothing"
              value={settings.rdpEnableFontSmoothing}
              onChange={(val) => onChange('rdpEnableFontSmoothing', val)}
            />
          </div>
          
          <div className="space-y-3">
            <p className="text-xs text-cyber-blue uppercase font-bold">Device Redirection</p>
            <SettingsToggle
              label="Enable Audio"
              value={settings.rdpEnableAudio}
              onChange={(val) => onChange('rdpEnableAudio', val)}
            />
            <SettingsToggle
              label="Enable Printing"
              value={settings.rdpEnablePrinting}
              onChange={(val) => onChange('rdpEnablePrinting', val)}
            />
            <SettingsToggle
              label="Enable Drive Mapping"
              value={settings.rdpEnableDrive}
              onChange={(val) => onChange('rdpEnableDrive', val)}
            />
          </div>
        </SettingsSection>

        {/* VNC Settings */}
        <SettingsSection title="VNC Settings">
          <SettingsSelect
            label="Color Depth"
            value={settings.vncColorDepth.toString()}
            options={[
              { value: '8', label: '8-bit (256 Colors)' },
              { value: '16', label: '16-bit (High Color)' },
              { value: '24', label: '24-bit (True Color)' },
              { value: '32', label: '32-bit (True Color + Alpha)' }
            ]}
            onChange={(val) => onChange('vncColorDepth', parseInt(val))}
          />
          
          <SettingsSlider
            label="Compression Level"
            value={settings.vncCompression}
            min={0}
            max={9}
            onChange={(val) => onChange('vncCompression', val)}
            description="0 = no compression, 9 = max compression"
          />
          
          <SettingsSlider
            label="JPEG Quality"
            value={settings.vncQuality}
            min={0}
            max={9}
            onChange={(val) => onChange('vncQuality', val)}
            description="0 = low quality, 9 = best quality"
          />
          
          <SettingsSelect
            label="Cursor Mode"
            value={settings.vncCursor}
            options={[
              { value: 'local', label: 'Local (Fast, may drift)' },
              { value: 'remote', label: 'Remote (Synced, slight lag)' }
            ]}
            onChange={(val) => onChange('vncCursor', val)}
            description="How cursor position is handled"
          />
        </SettingsSection>
      </div>
    </div>
  );
};

// Topology Settings Panel
const TopologySettingsPanel: React.FC<{ 
  settings: TopologySettings; 
  onChange: (key: string, value: string | number | boolean | string[]) => void;
  onReset: () => void;
}> = ({ settings, onChange, onReset }) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-cyber-gray-light text-sm">
          Configure performance and display settings for the network topology visualization. These settings apply immediately.
        </p>
        <button
          onClick={onReset}
          className="px-4 py-1 border border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple text-xs uppercase"
        >
          Reset to Defaults
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Performance Settings */}
        <SettingsSection title="Performance">
          <SettingsSelect
            label="Performance Mode"
            value={settings.performanceMode}
            options={[
              { value: 'auto', label: 'Auto (Detect from graph size)' },
              { value: 'quality', label: 'Quality (Full effects)' },
              { value: 'balanced', label: 'Balanced (Reduced effects)' },
              { value: 'performance', label: 'Performance (Minimal effects)' }
            ]}
            onChange={(val) => onChange('performanceMode', val)}
            description="Auto mode adjusts settings based on node/link count"
          />
          
          <SettingsToggle
            label="Particles Enabled"
            value={settings.particlesEnabled}
            onChange={(val) => onChange('particlesEnabled', val)}
            description="Show animated particles on links (can impact FPS)"
          />
          
          <SettingsNumberInput
            label="Max Nodes"
            value={settings.maxNodes}
            min={0}
            max={2000}
            onChange={(val) => onChange('maxNodes', val)}
            description="Limit displayed nodes (0 = unlimited)"
          />
          
          <SettingsNumberInput
            label="Max Links"
            value={settings.maxLinks}
            min={0}
            max={5000}
            onChange={(val) => onChange('maxLinks', val)}
            description="Limit displayed links (0 = unlimited)"
          />
        </SettingsSection>

        {/* Animation Settings */}
        <SettingsSection title="Animation">
          <SettingsToggle
            label="Animation Enabled"
            value={settings.animationEnabled}
            onChange={(val) => onChange('animationEnabled', val)}
            description="Enable link particle animations"
          />
          
          <SettingsToggle
            label="Auto Refresh"
            value={settings.autoRefresh}
            onChange={(val) => onChange('autoRefresh', val)}
            description="Automatically poll for new traffic data"
          />
          
          <SettingsSelect
            label="Refresh Rate"
            value={settings.refreshRate.toString()}
            options={[
              { value: '2000', label: '2 seconds (High load)' },
              { value: '5000', label: '5 seconds (Default)' },
              { value: '10000', label: '10 seconds (Low load)' },
              { value: '30000', label: '30 seconds (Minimal)' }
            ]}
            onChange={(val) => onChange('refreshRate', parseInt(val))}
            description="How often to poll for traffic updates"
          />
        </SettingsSection>

        {/* Display Settings */}
        <SettingsSection title="Display Filters">
          <SettingsNumberInput
            label="Traffic Threshold (bytes)"
            value={settings.trafficThreshold}
            min={0}
            max={1000000}
            onChange={(val) => onChange('trafficThreshold', val)}
            description="Minimum bytes to display a link"
          />
          
          <SettingsNumberInput
            label="Link Speed Filter (Mbps)"
            value={settings.linkSpeedFilter}
            min={0}
            max={1000}
            onChange={(val) => onChange('linkSpeedFilter', val)}
            description="Minimum Mbps to display a link (0 = all)"
          />
        </SettingsSection>

        {/* Simulation Settings */}
        <SettingsSection title="Simulation (Advanced)">
          <SettingsNumberInput
            label="Cooldown Ticks"
            value={settings.cooldownTicks}
            min={10}
            max={500}
            onChange={(val) => onChange('cooldownTicks', val)}
            description="Physics simulation iterations"
          />
          
          <SettingsNumberInput
            label="Warmup Ticks"
            value={settings.warmupTicks}
            min={5}
            max={200}
            onChange={(val) => onChange('warmupTicks', val)}
            description="Initial simulation ticks"
          />
          
          <SettingsNumberInput
            label="Cooldown Time (ms)"
            value={settings.cooldownTime}
            min={1000}
            max={30000}
            onChange={(val) => onChange('cooldownTime', val)}
            description="Max simulation duration"
          />
        </SettingsSection>
      </div>
    </div>
  );
};

// Reusable Components
const SettingsSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  return (
    <div className="border border-cyber-gray p-4 space-y-4">
      <h3 className="text-lg font-bold text-cyber-purple uppercase tracking-wider border-b border-cyber-gray pb-2">
        {title}
      </h3>
      {children}
    </div>
  );
};

const SettingsToggle: React.FC<{ 
  label: string; 
  value: boolean; 
  onChange: (value: boolean) => void; 
  description?: string 
}> = ({ label, value, onChange, description }) => {
  return (
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <label className="text-sm font-bold text-cyber-blue uppercase">{label}</label>
        {description && <p className="text-xs text-cyber-gray-light mt-1">{description}</p>}
      </div>
      <label className="cursor-pointer mt-1">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-5 h-5 border-2 border-cyber-red flex items-center justify-center peer-checked:bg-cyber-red transition-all">
          {value && <span className="text-white text-sm">◆</span>}
        </div>
      </label>
    </div>
  );
};

const SettingsSlider: React.FC<{ 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  unit?: string;
  onChange: (value: number) => void; 
  description?: string 
}> = ({ label, value, min, max, unit, onChange, description }) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <label className="cyber-section-title">{label}</label>
        <span className="text-cyber-purple font-mono text-sm">{value} {unit || ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="cyber-slider"
      />
      {description && <p className="text-xs text-cyber-gray-light">{description}</p>}
    </div>
  );
};

const SettingsSelect: React.FC<{ 
  label: string; 
  value: string; 
  options: { value: string; label: string }[];
  onChange: (value: string) => void; 
  description?: string 
}> = ({ label, value, options, onChange, description }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-cyber-blue uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue focus:border-cyber-red outline-none"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {description && <p className="text-xs text-cyber-gray-light">{description}</p>}
    </div>
  );
};

const SettingsInput: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (value: string) => void; 
  placeholder?: string;
  description?: string 
}> = ({ label, value, onChange, placeholder, description }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-cyber-blue uppercase">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue font-mono focus:border-cyber-red outline-none"
      />
      {description && <p className="text-xs text-cyber-gray-light">{description}</p>}
    </div>
  );
};

const SettingsNumberInput: React.FC<{ 
  label: string; 
  value: number; 
  onChange: (value: number) => void; 
  min?: number;
  max?: number;
  description?: string 
}> = ({ label, value, onChange, min, max, description }) => {
  return (
    <div className="space-y-2">
      <label className="text-sm font-bold text-cyber-blue uppercase">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value) || 0)}
        min={min}
        max={max}
        className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue font-mono focus:border-cyber-red outline-none"
      />
      {description && <p className="text-xs text-cyber-gray-light">{description}</p>}
    </div>
  );
};

export default Settings;