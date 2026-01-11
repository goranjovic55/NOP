/**
 * DynamicDropdown - Smart dropdown that fetches NOP resources
 * Shows discovered IPs, ports, vault credentials based on field type
 */

import React, { useState, useEffect, useRef } from 'react';
import { flowConfigService, DiscoveredHost, DiscoveredPort, VaultCredential } from '../../services/flowConfigService';

type DropdownType = 'ip' | 'port' | 'credential' | 'interface' | 'agent' | 'custom';

interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: string;
}

interface DynamicDropdownProps {
  type: DropdownType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  hostFilter?: string;  // For port dropdown, filter by host
  serviceFilter?: string;  // For port dropdown, filter by service type
  customOptions?: DropdownOption[];  // For custom type
  allowCustom?: boolean;  // Allow typing custom values
}

const DynamicDropdown: React.FC<DynamicDropdownProps> = ({
  type,
  value,
  onChange,
  placeholder,
  disabled = false,
  className = '',
  hostFilter,
  serviceFilter,
  customOptions = [],
  allowCustom = true,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState(value || '');
  const [hasLoaded, setHasLoaded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef(false);
  
  // Memoize customOptions to prevent infinite re-renders
  const customOptionsKey = JSON.stringify(customOptions);

  // Load options based on type
  useEffect(() => {
    const loadOptions = async () => {
      // Prevent concurrent loading
      if (loadingRef.current) return;
      
      loadingRef.current = true;
      setLoading(true);
      
      try {
        let loadedOptions: DropdownOption[] = [];

        switch (type) {
          case 'ip': {
            const hosts = await flowConfigService.getDiscoveredHosts();
            loadedOptions = hosts.map((h: DiscoveredHost) => ({
              value: h.ip,
              label: h.ip,
              sublabel: h.hostname || h.vendor || h.status,
              icon: h.status === 'online' ? '◉' : '◌',
            }));
            break;
          }

          case 'port': {
            // First get discovered ports
            const discoveredPorts = await flowConfigService.getDiscoveredPorts(hostFilter);
            const portMap = new Map<number, DropdownOption>();

            discoveredPorts.forEach((p: DiscoveredPort) => {
              if (!portMap.has(p.port)) {
                portMap.set(p.port, {
                  value: String(p.port),
                  label: `${p.port}`,
                  sublabel: p.service ? `${p.service}${p.version ? ` (${p.version})` : ''} - ${p.host}` : p.host,
                  icon: '◎',
                });
              }
            });

            // Add common ports
            const commonPorts = flowConfigService.getCommonPorts(serviceFilter);
            commonPorts.forEach(p => {
              if (!portMap.has(p.port)) {
                portMap.set(p.port, {
                  value: String(p.port),
                  label: p.label,
                  sublabel: 'common port',
                  icon: '○',
                });
              }
            });

            loadedOptions = Array.from(portMap.values()).sort((a, b) => 
              Number(a.value) - Number(b.value)
            );
            break;
          }

          case 'credential': {
            const creds = await flowConfigService.getVaultCredentials();
            loadedOptions = creds.map((c: VaultCredential) => ({
              value: c.id,
              label: c.name,
              sublabel: `${c.username}@${c.host} (${c.protocol})`,
              icon: '🔐',
            }));
            break;
          }

          case 'interface': {
            const interfaces = await flowConfigService.getNetworkInterfaces();
            loadedOptions = interfaces.map(i => ({
              value: i.name,
              label: i.description,
              sublabel: i.name,
              icon: '≋',
            }));
            break;
          }

          case 'agent': {
            const agents = await flowConfigService.getActiveAgents();
            loadedOptions = agents.map(a => ({
              value: a.id,
              label: a.name,
              sublabel: a.status,
              icon: a.status === 'online' ? '◆' : '◇',
            }));
            break;
          }

          case 'custom':
            loadedOptions = customOptions;
            break;
        }

        setOptions(loadedOptions);
        setHasLoaded(true);
      } catch (error) {
        console.error('Failed to load dropdown options:', error);
        setOptions([]);
      } finally {
        setLoading(false);
        loadingRef.current = false;
      }
    };

    // Only load when dropdown opens and hasn't loaded yet
    if (isOpen && !hasLoaded && !loadingRef.current) {
      loadOptions();
    }
  }, [type, isOpen, hostFilter, serviceFilter, customOptionsKey, hasLoaded]);
  
  // Reset hasLoaded when type or filters change
  useEffect(() => {
    setHasLoaded(false);
  }, [type, hostFilter, serviceFilter]);

  // Sync input value with prop value
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options by search term
  const filteredOptions = options.filter(opt => {
    const term = searchTerm.toLowerCase();
    return (
      opt.value.toLowerCase().includes(term) ||
      opt.label.toLowerCase().includes(term) ||
      (opt.sublabel?.toLowerCase().includes(term) ?? false)
    );
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSearchTerm(newValue);
    
    if (allowCustom) {
      onChange(newValue);
    }
    
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleOptionClick = (option: DropdownOption) => {
    setInputValue(option.value);
    onChange(option.value);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay close to allow click events on options
    setTimeout(() => {
      if (allowCustom) {
        onChange(inputValue);
      }
    }, 100);
  };

  const getPlaceholder = (): string => {
    if (placeholder) return placeholder;
    
    switch (type) {
      case 'ip': return 'Select or enter IP address...';
      case 'port': return 'Select or enter port...';
      case 'credential': return 'Select saved credential...';
      case 'interface': return 'Select network interface...';
      case 'agent': return 'Select agent...';
      default: return 'Select...';
    }
  };

  const getTypeIcon = (): string => {
    switch (type) {
      case 'ip': return '◎';
      case 'port': return '⬢';
      case 'credential': return '🔐';
      case 'interface': return '≋';
      case 'agent': return '◆';
      default: return '▾';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input with dropdown trigger */}
      <div className="relative group">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-cyber-gray-light text-sm group-hover:text-cyber-blue transition-colors">
          {getTypeIcon()}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={getPlaceholder()}
          disabled={disabled}
          className="cyber-input w-full pl-8 pr-8 cursor-pointer hover:border-cyber-blue transition-colors"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-cyber-gray-light hover:text-cyber-blue transition-colors"
        >
          {loading ? (
            <span className="animate-spin">⟳</span>
          ) : (
            <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
          )}
        </button>
      </div>

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-cyber-darker border border-cyber-gray rounded shadow-lg cyber-scrollbar">
          {loading ? (
            <div className="p-3 text-center text-cyber-gray-light text-sm font-mono">
              <span className="animate-pulse">◇ Loading...</span>
            </div>
          ) : filteredOptions.length === 0 ? (
            <div className="p-3 text-center text-cyber-gray-light text-sm font-mono">
              {options.length === 0 ? (
                <>
                  <span className="text-cyber-blue">◇</span> No {type === 'ip' ? 'hosts' : type === 'credential' ? 'credentials' : 'options'} found
                  {allowCustom && inputValue && (
                    <div className="mt-1 text-xs">
                      Press Enter to use "{inputValue}"
                    </div>
                  )}
                </>
              ) : (
                <>
                  <span className="text-cyber-blue">◇</span> No matches for "{searchTerm}"
                  {allowCustom && (
                    <div className="mt-1 text-xs">
                      Press Enter to use custom value
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="py-1">
              {/* Discovered/Active section header */}
              {type === 'ip' && filteredOptions.some(o => o.icon === '◉') && (
                <div className="px-3 py-1 text-xs text-cyber-green font-mono border-b border-cyber-gray/30">
                  ◉ DISCOVERED HOSTS
                </div>
              )}
              
              {type === 'port' && filteredOptions.some(o => o.icon === '◎') && (
                <div className="px-3 py-1 text-xs text-cyber-blue font-mono border-b border-cyber-gray/30">
                  ◎ DISCOVERED PORTS
                </div>
              )}

              {filteredOptions.map((option, idx) => {
                // Add section header for common ports
                const showCommonHeader = type === 'port' && 
                  option.icon === '○' && 
                  (idx === 0 || filteredOptions[idx - 1]?.icon !== '○');

                return (
                  <React.Fragment key={option.value}>
                    {showCommonHeader && (
                      <div className="px-3 py-1 text-xs text-cyber-gray-light font-mono border-t border-cyber-gray/30 mt-1">
                        ○ COMMON PORTS
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleOptionClick(option)}
                      className="w-full px-3 py-2 text-left hover:bg-cyber-gray/30 transition-colors flex items-center gap-2"
                    >
                      {option.icon && (
                        <span className={`text-sm ${
                          option.icon === '◉' ? 'text-cyber-green' :
                          option.icon === '◎' ? 'text-cyber-blue' :
                          option.icon === '🔐' ? '' :
                          option.icon === '◆' ? 'text-cyber-red' :
                          'text-cyber-gray-light'
                        }`}>
                          {option.icon}
                        </span>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-mono truncate">
                          {option.label}
                        </div>
                        {option.sublabel && (
                          <div className="text-xs text-cyber-gray-light truncate">
                            {option.sublabel}
                          </div>
                        )}
                      </div>
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DynamicDropdown;
