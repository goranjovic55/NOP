import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { logger } from '../utils/logger';

interface ScanSettings {
  autoScanEnabled: boolean;
  autoScanInterval: number; // in minutes
  autoScanType: 'arp' | 'ping';
  manualScanType: 'arp' | 'ping';
  networkRange: string;
  pps: number; // Packets Per Second
  passiveDiscoveryEnabled: boolean;
}

interface ScanSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ScanSettings;
  onSave: (settings: ScanSettings) => void;
  activeAgent?: { id: string; name: string } | null;
  token?: string;
}

const ScanSettingsModal: React.FC<ScanSettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  settings, 
  onSave, 
  activeAgent, 
  token 
}) => {
  const [localSettings, setLocalSettings] = useState<ScanSettings>(settings);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load settings from agent when modal opens in POV mode
  useEffect(() => {
    if (isOpen && activeAgent && token) {
      loadAgentSettings();
    } else if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, activeAgent, token]);

  const loadAgentSettings = async () => {
    if (!activeAgent || !token) return;
    
    setIsLoading(true);
    try {
      const response = await axios.get('/api/v1/agent-settings/current/settings', {
        headers: { 
          Authorization: `Bearer ${token}`,
          'X-Agent-POV': activeAgent.id
        }
      });
      
      const agentSettings = response.data;
      const discovery = agentSettings?.discovery || {};
      
      // Map agent settings to local settings format
      setLocalSettings({
        networkRange: discovery.network_range || settings.networkRange,
        pps: discovery.packets_per_second || settings.pps,
        manualScanType: discovery.discovery_method === 'ping' ? 'ping' : 'arp',
        autoScanType: discovery.discovery_method === 'ping' ? 'ping' : 'arp',
        autoScanEnabled: discovery.discovery_enabled || false,
        autoScanInterval: Math.round((discovery.discovery_interval || 300) / 60),
        passiveDiscoveryEnabled: discovery.passive_discovery || false
      });
    } catch (err) {
      logger.debug('Could not load agent settings, using defaults');
      setLocalSettings(settings);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // If in POV mode, save to agent API
    if (activeAgent && token) {
      setIsSaving(true);
      try {
        await axios.put('/api/v1/agent-settings/current/settings', {
          discovery: {
            network_range: localSettings.networkRange,
            packets_per_second: localSettings.pps,
            discovery_method: localSettings.manualScanType,
            discovery_enabled: localSettings.autoScanEnabled,
            discovery_interval: localSettings.autoScanInterval * 60,
            passive_discovery: localSettings.passiveDiscoveryEnabled
          }
        }, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'X-Agent-POV': activeAgent.id
          }
        });
        logger.debug('Agent settings saved successfully');
      } catch (err) {
        logger.error('Failed to save agent settings:', err);
      } finally {
        setIsSaving(false);
      }
    }
    
    // Also save to local state/localStorage
    onSave(localSettings);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4">
      <div className="bg-cyber-dark border-2 border-cyber-red w-full max-w-md shadow-[0_0_30px_rgba(255,0,64,0.3)]">
        {/* Header */}
        <div className="p-4 border-b border-cyber-gray bg-cyber-darker flex justify-between items-center">
          <h3 className="text-lg font-bold text-cyber-red uppercase tracking-widest cyber-glow-red">Discovery Config</h3>
          <button onClick={onClose} className="text-cyber-gray-light hover:text-cyber-red text-2xl">&times;</button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyber-red"></div>
              <span className="ml-3 text-cyber-gray-light">Loading agent settings...</span>
            </div>
          ) : (
            <>
              {/* POV Mode Indicator */}
              {activeAgent && (
                <div className="bg-cyber-purple bg-opacity-20 border border-cyber-purple p-2 text-xs text-cyber-purple">
                  <span className="font-bold">POV MODE:</span> Settings will be saved to agent "{activeAgent.name}"
                </div>
              )}

              {/* Network Range */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-purple uppercase font-bold">Target Network Range</label>
                <input
                  type="text"
                  value={localSettings.networkRange}
                  onChange={(e) => setLocalSettings({ ...localSettings, networkRange: e.target.value })}
                  className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue font-mono focus:border-cyber-red outline-none"
                  placeholder="e.g. 10.10.2.0/24 (use /24 for LAN)"
                />
              </div>

              {/* PPS Setting */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-purple uppercase font-bold">Timing (Packets Per Second)</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="10"
                    max="1000"
                    step="10"
                    value={localSettings.pps}
                    onChange={(e) => setLocalSettings({ ...localSettings, pps: parseInt(e.target.value) })}
                    className="flex-1 h-2 bg-cyber-darker rounded-none appearance-none cursor-pointer [&::-webkit-slider-track]:bg-cyber-gray [&::-webkit-slider-track]:h-0.5 [&::-webkit-slider-track]:border [&::-webkit-slider-track]:border-cyber-purple [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyber-red [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-cyber-red [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,0,102,0.6)] [&::-webkit-slider-thumb]:hover:shadow-[0_0_12px_rgba(255,0,102,0.9)] [&::-moz-range-track]:bg-cyber-gray [&::-moz-range-track]:h-0.5 [&::-moz-range-track]:border [&::-moz-range-track]:border-cyber-purple [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:bg-cyber-red [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-cyber-red [&::-moz-range-thumb]:rounded-none"
                  />
                  <span className="text-cyber-blue font-mono w-16 text-right">{localSettings.pps}</span>
                </div>
                <p className="text-[10px] text-cyber-gray-light italic">Adjust to avoid network storming protection.</p>
              </div>

              {/* Manual Scan Type */}
              <div className="space-y-2">
                <label className="text-xs text-cyber-purple uppercase font-bold">Discovery Method</label>
                <select
                  value={localSettings.manualScanType}
                  onChange={(e) => setLocalSettings({ ...localSettings, manualScanType: e.target.value as 'arp' | 'ping' })}
                  className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue focus:border-cyber-red outline-none"
                >
                  <option value="arp">ARP Scan (Local Network)</option>
                  <option value="ping">ICMP Ping Sweep</option>
                </select>
              </div>

              <div className="border-t border-cyber-gray pt-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <label className="text-xs text-cyber-purple uppercase font-bold">Enable Passive Discovery</label>
                    <p className="text-[10px] text-cyber-gray-light italic mt-1">Discover hosts from network traffic (less intrusive)</p>
                  </div>
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.passiveDiscoveryEnabled}
                      onChange={(e) => setLocalSettings({ ...localSettings, passiveDiscoveryEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-cyber-green flex items-center justify-center peer-checked:bg-cyber-green transition-all">
                      {localSettings.passiveDiscoveryEnabled && <span className="text-white text-sm">◆</span>}
                    </div>
                  </label>
                </div>
              </div>

              <div className="border-t border-cyber-gray pt-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-xs text-cyber-purple uppercase font-bold">Enable Auto-Discovery</label>
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localSettings.autoScanEnabled}
                      onChange={(e) => setLocalSettings({ ...localSettings, autoScanEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-5 h-5 border-2 border-cyber-red flex items-center justify-center peer-checked:bg-cyber-red transition-all">
                      {localSettings.autoScanEnabled && <span className="text-white text-sm">◆</span>}
                    </div>
                  </label>
                </div>

                {localSettings.autoScanEnabled && (
                  <div className="space-y-4 animate-fadeIn">
                    <div className="space-y-2">
                      <label className="text-xs text-cyber-purple uppercase font-bold">Interval (Minutes)</label>
                      <input
                        type="number"
                        min="1"
                        value={localSettings.autoScanInterval}
                        onChange={(e) => setLocalSettings({ ...localSettings, autoScanInterval: parseInt(e.target.value) || 1 })}
                        className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue font-mono focus:border-cyber-red outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-cyber-purple uppercase font-bold">Auto-Discovery Method</label>
                      <select
                        value={localSettings.autoScanType}
                        onChange={(e) => setLocalSettings({ ...localSettings, autoScanType: e.target.value as 'arp' | 'ping' })}
                        className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue focus:border-cyber-red outline-none"
                      >
                        <option value="arp">ARP Scan</option>
                        <option value="ping">Ping Sweep</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-gray bg-cyber-darker flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-cyber-gray-light uppercase text-xs font-bold hover:text-white">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isSaving || isLoading}
            className="btn-cyber px-6 py-2 border-cyber-red text-cyber-red disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Config'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScanSettingsModal;
