import React, { useState, useEffect, useRef } from 'react';
import { ConnectionTab, useAccessStore } from '../store/accessStore';
import { accessService, Credential } from '../services/accessService';
import { useAuthStore } from '../store/authStore';
import Guacamole from 'guacamole-common-js';

interface ProtocolConnectionProps {
  tab: ConnectionTab;
}

const ProtocolConnection: React.FC<ProtocolConnectionProps> = ({ tab }) => {
  const { updateTabStatus, updateTabCredentials } = useAccessStore();
  const { token } = useAuthStore();
  const [username, setUsername] = useState(tab.credentials?.username || '');
  const [password, setPassword] = useState(tab.credentials?.password || '');
  const [remember, setRemember] = useState(tab.credentials?.remember || false);
  const [savedCredentials, setSavedCredentials] = useState<Credential[]>([]);

  // Terminal state
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Guacamole state
  const displayRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);

  useEffect(() => {
    const fetchCreds = async () => {
      if (token && tab.ip) {
        const creds = await accessService.getCredentials(token, tab.ip, tab.protocol);
        setSavedCredentials(creds);

        if (creds.length > 0 && !username) {
          setUsername(creds[0].username);
          if (creds[0].password) setPassword(creds[0].password);
        }
      }
    };
    fetchCreds();
  }, [token, tab.ip, tab.protocol]);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  const setupGuacamole = () => {
    const tunnel = new Guacamole.WebSocketTunnel(`ws://${window.location.hostname}:8000/api/v1/access/tunnel`);
    const client = new Guacamole.Client(tunnel);
    clientRef.current = client;

    if (displayRef.current) {
      displayRef.current.innerHTML = '';
      displayRef.current.appendChild(client.getDisplay().getElement());
    }

    client.onerror = (error) => {
      console.error('Guacamole error:', error);
      updateTabStatus(tab.id, 'failed');
    };

    client.onstatechange = (state) => {
      if (state === 3) { // CONNECTED
        updateTabStatus(tab.id, 'connected');
      }
    };

    // Handle mouse and keyboard
    const mouse = new Guacamole.Mouse(client.getDisplay().getElement());
    (mouse as any).onmousedown = (mouse as any).onmouseup = (mouse as any).onmousemove = (mouseState: any) => {
      client.sendMouseState(mouseState);
    };

    const keyboard = new Guacamole.Keyboard(document);
    (keyboard as any).onkeydown = (keysym: number) => {
      client.sendKeyEvent(1, keysym);
    };
    (keyboard as any).onkeyup = (keysym: number) => {
      client.sendKeyEvent(0, keysym);
    };

    tunnel.onstatechange = (state) => {
      if (state === 1) { // OPEN
        const params = {
          protocol: tab.protocol,
          hostname: tab.ip,
          port: tab.protocol === 'rdp' ? 3389 : 5900,
          username,
          password,
          width: displayRef.current?.clientWidth || 1024,
          height: displayRef.current?.clientHeight || 768,
          dpi: 96
        };
        tunnel.sendMessage(JSON.stringify(params));
      }
    };

    client.connect();
  };


  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    updateTabStatus(tab.id, 'connecting');
    updateTabCredentials(tab.id, { username, password, remember });

    if (remember && token) {
      accessService.saveCredential(token, {
        asset_id: tab.ip,
        protocol: tab.protocol,
        username,
        password
      }).catch(err => console.error('Failed to save credential:', err));
    }

    if (tab.protocol === 'exploit') {
      updateTabStatus(tab.id, 'connected');
      setOutput(['[!] EXPLOIT MODULE LOADED', '[*] Target: ' + tab.ip, '[*] Status: Ready for deployment', '[!] WARNING: This module is for educational purposes only.']);
      return;
    }

    if (tab.protocol === 'rdp' || tab.protocol === 'vnc') {
      setupGuacamole();
      return;
    }

    try {
      let result: any;
      const protocol = tab.protocol as string;
      if (protocol === 'ssh') {
        result = await accessService.testSSH(token || '', {
          host: tab.ip,
          port: 22,
          username,
          password
        });
      } else if (protocol === 'rdp') {
        result = await accessService.testRDP(token || '', {
          host: tab.ip,
          port: 3389,
          username,
          password
        });
      } else {
        const port = protocol === 'vnc' ? 5900 : 23;
        result = await accessService.testTCP(token || '', {
          host: tab.ip,
          port
        });
      }

      if (result.success) {
        updateTabStatus(tab.id, 'connected');
        setOutput([`Connected to ${tab.ip} via ${tab.protocol.toUpperCase()}`, `Welcome to ${tab.hostname || tab.ip}`, `Last login: ${new Date().toLocaleString()}`]);
      } else {
        updateTabStatus(tab.id, 'failed');
        alert(`Connection failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      updateTabStatus(tab.id, 'failed');
      alert(`Error: ${error.message}`);
    }
  };

  const handleSendCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const currentCommand = command;
    setCommand('');
    setOutput(prev => [...prev, `$ ${currentCommand}`]);

    if (tab.protocol === 'exploit') {
      setOutput(prev => [...prev, `[!] EXPLOIT ERROR: Module '${currentCommand}' not found or not yet implemented.`]);
      return;
    }

    if (tab.protocol === 'ssh' || tab.protocol === 'rdp' || tab.protocol === 'telnet') {
      try {
        let result: any;
        if (tab.protocol === 'ssh') {
          result = await accessService.executeSSH(token || '', {
            host: tab.ip,
            port: 22,
            username,
            password,
            command: currentCommand
          });
        } else {
          // For RDP and Telnet, we simulate command execution for now
          // In a real implementation, this would go through a proxy or specialized service
          result = {
            success: true,
            output: `[${tab.protocol.toUpperCase()} Simulation] Executed: ${currentCommand}\nResult: Command processed successfully.`
          };
        }

        if (result.success) {
          if (result.output) {
            const lines = result.output.split('\n').filter((l: string) => l.length > 0);
            setOutput(prev => [...prev, ...lines]);
          }
          if (result.error && result.error.length > 0) {
            setOutput(prev => [...prev, `STDERR: ${result.error}`]);
          }
          if (!result.output && !result.error) {
            setOutput(prev => [...prev, "(No output)"]);
          }
        } else {
          setOutput(prev => [...prev, `Execution failed: ${result.error || 'Unknown error'}`]);
        }
      } catch (error: any) {
        setOutput(prev => [...prev, `Error: ${error.message}`]);
      }
    } else {
      setOutput(prev => [...prev, `Command execution not supported for ${tab.protocol.toUpperCase()} in this view.`]);
    }
  };

  const selectCredential = (cred: Credential) => {
    setUsername(cred.username);
    if (cred.password) setPassword(cred.password);
  };

  if (tab.status === 'connected') {
    if (tab.protocol === 'rdp' || tab.protocol === 'vnc') {
      return (
        <div className="h-full flex flex-col bg-black rounded border border-cyber-gray shadow-2xl overflow-hidden">
          <div className="bg-cyber-darker px-4 py-2 text-xs opacity-50 flex justify-between border-b border-cyber-gray">
            <span>Connected to {tab.ip} ({tab.protocol.toUpperCase()})</span>
            <span>{username}</span>
          </div>
          <div ref={displayRef} className="flex-1 flex items-center justify-center overflow-auto bg-black" />
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col bg-black text-green-500 font-mono p-4 text-[13px] rounded border border-cyber-gray shadow-2xl">
        <div className="mb-2 text-xs opacity-50 flex justify-between">
          <span>Connected to {tab.ip} ({tab.protocol.toUpperCase()})</span>
          <span>{username}</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar mb-4 space-y-1">
          {output.map((line, i) => (
            <div key={i} className="whitespace-pre-wrap break-all">{line}</div>
          ))}
          <div ref={outputEndRef} />
        </div>
        <form onSubmit={handleSendCommand} className="flex space-x-2 border-t border-cyber-gray pt-4">
          <span className="text-cyber-blue font-bold">$</span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-green-500"
            placeholder="Type command and press Enter..."
            autoFocus
          />
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-cyber-dark border border-cyber-gray rounded-lg shadow-xl">
      <h3 className="text-xl font-bold text-cyber-blue uppercase mb-6 flex items-center">
        <span className="mr-2">
          {tab.protocol === 'ssh' && '🔒'}
          {tab.protocol === 'rdp' && '🖥️'}
          {tab.protocol === 'vnc' && '👁️'}
          {tab.protocol === 'telnet' && '📟'}
          {tab.protocol === 'exploit' && '💀'}
        </span>
        {tab.protocol.toUpperCase()} Connection
      </h3>

      {savedCredentials.length > 0 && (
        <div className="mb-6">
          <label className="block text-[10px] font-bold text-cyber-gray-light uppercase mb-2">Saved Credentials</label>
          <div className="flex flex-wrap gap-2">
            {savedCredentials.map(cred => (
              <button
                key={cred.id}
                onClick={() => selectCredential(cred)}
                className="text-[10px] px-2 py-1 border border-cyber-purple text-cyber-purple hover:bg-cyber-purple hover:text-white transition-colors"
              >
                {cred.username}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleConnect} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-cyber-purple uppercase mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
            placeholder="admin"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-cyber-purple uppercase mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-cyber-darker border border-cyber-gray rounded px-3 py-2 text-white focus:border-cyber-blue outline-none transition-colors"
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="remember"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="mr-2"
          />
          <label htmlFor="remember" className="text-xs text-cyber-gray-light uppercase cursor-pointer">Remember Credentials</label>
        </div>

        <button
          type="submit"
          disabled={tab.status === 'connecting'}
          className={`w-full btn-cyber py-3 border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black font-bold uppercase tracking-widest transition-all ${
            tab.status === 'connecting' ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {tab.status === 'connecting' ? 'Establishing Connection...' : 'Connect'}
        </button>
      </form>
    </div>
  );
};

export default ProtocolConnection;
