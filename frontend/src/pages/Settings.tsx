import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface ScanSettings {
  port_scan_enabled: boolean;
  port_scan_type: 'quick' | 'full' | 'custom';
  custom_ports: string;
  port_scan_timeout: number;
  vuln_scan_enabled: boolean;
  vuln_scan_depth: 'basic' | 'standard' | 'deep';
  safe_checks_only: boolean;
  max_concurrent_scans: number;
  scan_throttle: number;
  auto_scan_enabled: boolean;
  auto_scan_interval: number;
  auto_scan_schedule: string;
  generate_reports: boolean;
  report_format: 'pdf' | 'html' | 'json' | 'all';
}

interface DiscoverySettings {
  discovery_enabled: boolean;
  discovery_method: 'arp' | 'ping' | 'both';
  network_range: string;
  discovery_interval: number;
  packets_per_second: number;
  discovery_timeout: number;
  enable_dns_resolution: boolean;
  enable_os_detection: boolean;
  enable_service_detection: boolean;
  passive_discovery: boolean;
  interface_name: string;
  promiscuous_mode: boolean;
  exclude_ranges: string;
  include_only_ranges: string;
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
  const [activeTab, setActiveTab] = useState<'scan' | 'discovery' | 'access' | 'system'>('scan');
  const [settings, setSettings] = useState<AllSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/settings/');
      
      // Validate response structure
      if (response.data && 
          response.data.scan && 
          response.data.discovery && 
          response.data.access && 
          response.data.system) {
        setSettings(response.data);
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
    if (!settings) return;
    
    try {
      setSaving(true);
      await axios.put(`/api/v1/settings/${activeTab}`, settings[activeTab]);
      showMessage('success', `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} settings saved successfully`);
    } catch (error) {
      console.error('Error saving settings:', error);
      showMessage('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
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
    if (!settings) return;
    setSettings({
      ...settings,
      [activeTab]: {
        ...settings[activeTab],
        [key]: value
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-cyber-blue animate-pulse">Loading settings...</div>
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
    { id: 'scan' as const, label: 'Scan Settings', icon: '🔍' },
    { id: 'discovery' as const, label: 'Discovery Settings', icon: '🌐' },
    { id: 'access' as const, label: 'Access Settings', icon: '🔐' },
    { id: 'system' as const, label: 'System Settings', icon: '⚙️' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-cyber-red uppercase tracking-widest cyber-glow-red">
          System Configuration
        </h2>
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
            className={`px-6 py-3 font-bold uppercase text-sm tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-cyber-darker border-t-2 border-x-2 border-cyber-red text-cyber-red'
                : 'text-cyber-gray-light hover:text-cyber-purple'
            }`}
          >
            <span className="mr-2">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="dashboard-card p-6">
        {activeTab === 'scan' && <ScanSettingsPanel settings={settings.scan} onChange={updateSetting} />}
        {activeTab === 'discovery' && <DiscoverySettingsPanel settings={settings.discovery} onChange={updateSetting} />}
        {activeTab === 'access' && <AccessSettingsPanel settings={settings.access} onChange={updateSetting} />}
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
    <div className="space-y-6">
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
            
            <SettingsToggle
              label="Safe Checks Only"
              value={settings.safe_checks_only}
              onChange={(val) => onChange('safe_checks_only', val)}
              description="Only perform non-intrusive vulnerability checks"
            />
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
          </>
        )}
      </SettingsSection>
    </div>
  );
};

// Discovery Settings Panel
const DiscoverySettingsPanel: React.FC<{ settings: DiscoverySettings; onChange: (key: string, value: string | number | boolean) => void }> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
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
      </SettingsSection>

      {/* Advanced Options */}
      <SettingsSection title="Advanced Options">
        <SettingsToggle
          label="Enable DNS Resolution"
          value={settings.enable_dns_resolution}
          onChange={(val) => onChange('enable_dns_resolution', val)}
        />
        
        <SettingsToggle
          label="Enable OS Detection"
          value={settings.enable_os_detection}
          onChange={(val) => onChange('enable_os_detection', val)}
          description="Attempt to detect operating system"
        />
        
        <SettingsToggle
          label="Enable Service Detection"
          value={settings.enable_service_detection}
          onChange={(val) => onChange('enable_service_detection', val)}
          description="Attempt to detect running services"
        />
        
        <SettingsToggle
          label="Passive Discovery"
          value={settings.passive_discovery}
          onChange={(val) => onChange('passive_discovery', val)}
          description="Monitor network traffic for devices"
        />
      </SettingsSection>

      {/* Network Interface */}
      <SettingsSection title="Network Interface">
        <SettingsInput
          label="Interface Name"
          value={settings.interface_name}
          onChange={(val) => onChange('interface_name', val)}
          placeholder="eth0"
        />
        
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
      </SettingsSection>
    </div>
  );
};

// Access Settings Panel
const AccessSettingsPanel: React.FC<{ settings: AccessSettings; onChange: (key: string, value: string | number | boolean) => void }> = ({ settings, onChange }) => {
  return (
    <div className="space-y-6">
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
    <div className="space-y-6">
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
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 accent-cyber-red mt-1"
      />
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
        <label className="text-sm font-bold text-cyber-blue uppercase">{label}</label>
        <span className="text-cyber-purple font-mono">{value} {unit || ''}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full accent-cyber-red"
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

export default Settings;