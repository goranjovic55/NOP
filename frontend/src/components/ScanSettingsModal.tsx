import React, { useState } from 'react';

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
}

const ScanSettingsModal: React.FC<ScanSettingsModalProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [localSettings, setLocalSettings] = useState<ScanSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(localSettings);
    onClose();
  };

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
          {/* Network Range */}
          <div className="space-y-2">
            <label className="text-xs text-cyber-purple uppercase font-bold">Target Network Range</label>
            <input
              type="text"
              value={localSettings.networkRange}
              onChange={(e) => setLocalSettings({ ...localSettings, networkRange: e.target.value })}
              className="w-full bg-cyber-darker border border-cyber-gray p-2 text-cyber-blue font-mono focus:border-cyber-red outline-none"
              placeholder="e.g. 172.21.0.0/24"
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
                className="flex-1 accent-cyber-red"
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
              <input
                type="checkbox"
                checked={localSettings.passiveDiscoveryEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, passiveDiscoveryEnabled: e.target.checked })}
                className="w-5 h-5 accent-cyber-green"
              />
            </div>
          </div>

          <div className="border-t border-cyber-gray pt-4">
            <div className="flex items-center justify-between mb-4">
              <label className="text-xs text-cyber-purple uppercase font-bold">Enable Auto-Discovery</label>
              <input
                type="checkbox"
                checked={localSettings.autoScanEnabled}
                onChange={(e) => setLocalSettings({ ...localSettings, autoScanEnabled: e.target.checked })}
                className="w-5 h-5 accent-cyber-red"
              />
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-cyber-gray bg-cyber-darker flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-cyber-gray-light uppercase text-xs font-bold hover:text-white">Cancel</button>
          <button onClick={handleSave} className="btn-cyber px-6 py-2 border-cyber-red text-cyber-red">Save Config</button>
        </div>
      </div>
    </div>
  );
};

export default ScanSettingsModal;
