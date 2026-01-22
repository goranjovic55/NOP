import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { ConnectionTab, useAccessStore } from '../store/accessStore';
import { accessService, Credential } from '../services/accessService';
import { useAuthStore } from '../store/authStore';
import Guacamole from 'guacamole-common-js';

// Convert DOM KeyboardEvent to X11 keysym
const getKeysym = (e: KeyboardEvent): number | null => {
  // Use key code for special keys
  const specialKeys: { [key: string]: number } = {
    'Backspace': 0xFF08,
    'Tab': 0xFF09,
    'Enter': 0xFF0D,
    'Escape': 0xFF1B,
    'Delete': 0xFFFF,
    'Home': 0xFF50,
    'End': 0xFF57,
    'PageUp': 0xFF55,
    'PageDown': 0xFF56,
    'ArrowLeft': 0xFF51,
    'ArrowUp': 0xFF52,
    'ArrowRight': 0xFF53,
    'ArrowDown': 0xFF54,
    'Insert': 0xFF63,
    'F1': 0xFFBE, 'F2': 0xFFBF, 'F3': 0xFFC0, 'F4': 0xFFC1,
    'F5': 0xFFC2, 'F6': 0xFFC3, 'F7': 0xFFC4, 'F8': 0xFFC5,
    'F9': 0xFFC6, 'F10': 0xFFC7, 'F11': 0xFFC8, 'F12': 0xFFC9,
    'Shift': 0xFFE1, 'Control': 0xFFE3, 'Alt': 0xFFE9, 'Meta': 0xFFEB,
    'CapsLock': 0xFFE5, 'NumLock': 0xFF7F, 'ScrollLock': 0xFF14,
  };
  
  if (specialKeys[e.key]) {
    return specialKeys[e.key];
  }
  
  // For printable characters, use char code
  if (e.key.length === 1) {
    return e.key.charCodeAt(0);
  }
  
  return null;
};

interface ProtocolConnectionProps {
  tab: ConnectionTab;
  isFullscreen?: boolean;
  sidebarCollapsed?: boolean;
  onConnected?: () => void;
}

const ProtocolConnection: React.FC<ProtocolConnectionProps> = ({ tab, isFullscreen, sidebarCollapsed, onConnected }) => {
  const { updateTabStatus, updateTabCredentials, remoteSettings } = useAccessStore();
  const { token } = useAuthStore();
  const [username, setUsername] = useState(tab.credentials?.username || '');
  const [password, setPassword] = useState(tab.credentials?.password || '');
  const [remember, setRemember] = useState(tab.credentials?.remember || false);
  const [savedCredentials, setSavedCredentials] = useState<Credential[]>([]);
  
  // Internal connection status (since tab.status from props may not update)
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>(tab.status || 'disconnected');

  // Terminal state
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // Guacamole state
  const displayRef = useRef<HTMLDivElement>(null);
  const clientRef = useRef<Guacamole.Client | null>(null);
  // Store event handler refs for proper cleanup
  const keydownHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const keyupHandlerRef = useRef<((e: KeyboardEvent) => void) | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [displayAttached, setDisplayAttached] = useState(false);
  const [displaySize, setDisplaySize] = useState({ width: 1024, height: 768 });

  // Use useLayoutEffect to attach display immediately after DOM update
  useLayoutEffect(() => {
    console.log('[GUACAMOLE-CLIENT] useLayoutEffect triggered, connectionStatus:', connectionStatus);
    if (connectionStatus === 'connected' && (tab.protocol === 'rdp' || tab.protocol === 'vnc')) {
      console.log('[GUACAMOLE-CLIENT] useLayoutEffect: checking for display attachment');
      console.log('[GUACAMOLE-CLIENT] displayRef.current:', !!displayRef.current);
      console.log('[GUACAMOLE-CLIENT] clientRef.current:', !!clientRef.current);
      console.log('[GUACAMOLE-CLIENT] displayAttached:', displayAttached);
      
      if (displayRef.current && clientRef.current && !displayAttached) {
        console.log('[GUACAMOLE-CLIENT] Attaching display...');
        try {
          const display = clientRef.current.getDisplay();
          const displayElement = display.getElement();
          
          if (displayElement) {
            displayRef.current.innerHTML = '';
            displayRef.current.appendChild(displayElement);
            setDisplayAttached(true);
            console.log('[GUACAMOLE-CLIENT] ✓ Display element attached to DOM successfully');
            
            // Scale the display based on scaling mode
            const containerWidth = displayRef.current.clientWidth || 1024;
            const containerHeight = displayRef.current.clientHeight || 768;
            const displayWidth = display.getWidth() || 1024;
            const displayHeight = display.getHeight() || 768;
            
            let scale = 1;
            if (remoteSettings.scalingMode === 'fit') {
              // Fit: scale to fit container maintaining aspect ratio (can scale up or down)
              scale = Math.min(containerWidth / displayWidth, containerHeight / displayHeight);
            } else if (remoteSettings.scalingMode === 'fill') {
              // Fill: scale to fill container (may crop)
              scale = Math.max(containerWidth / displayWidth, containerHeight / displayHeight);
            }
            // 'none': scale = 1 (1:1 pixels)
            
            display.scale(scale);
            console.log('[GUACAMOLE-CLIENT] Display scaled to:', scale, '(mode:', remoteSettings.scalingMode, ')');
            
            // Make display element focusable for keyboard input
            displayElement.setAttribute('tabindex', '0');
            displayElement.style.outline = 'none';
            // Hide local cursor based on settings - remote cursor shown by RDP/VNC
            if (remoteSettings.hideCursor) {
              displayElement.style.cursor = 'none';
            }
            
            // Set up mouse input - NO pointer lock, just track within element
            const mouse = new Guacamole.Mouse(displayElement);
            const sendMouseState = (state: Guacamole.Mouse.State) => {
              clientRef.current?.sendMouseState(state);
            };
            (mouse as any).onmousedown = sendMouseState;
            (mouse as any).onmouseup = sendMouseState;
            (mouse as any).onmousemove = sendMouseState;
            
            // Focus display when clicked so keyboard works
            displayElement.addEventListener('click', () => {
              displayElement.focus();
            });
            
            // Show cursor when leaving display area, hide when entering (if hideCursor enabled)
            displayElement.addEventListener('mouseenter', () => {
              if (remoteSettings.hideCursor) {
                displayElement.style.cursor = 'none';
              }
            });
            displayElement.addEventListener('mouseleave', () => {
              displayElement.style.cursor = 'default';
            });
            
            console.log('[GUACAMOLE-CLIENT] Mouse handler attached (hideCursor:', remoteSettings.hideCursor, ')');
          }
        } catch (e) {
          console.error('[GUACAMOLE-CLIENT] Error attaching display:', e);
        }
      }
    }
  }, [connectionStatus, tab.protocol, displayAttached]);


    // FTP state
    const [ftpPath, setFtpPath] = useState('/');
    const [ftpFiles, setFtpFiles] = useState<any[]>([]);
    const [ftpLoading, setFtpLoading] = useState(false);
    const [ftpError, setFtpError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, tab.ip, tab.protocol]);

  useEffect(() => {
    if (outputEndRef.current) {
      outputEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output]);

  // Reset displayAttached and cleanup keyboard when disconnected
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setDisplayAttached(false);
      // Clean up keyboard event listeners from document
      if (keydownHandlerRef.current) {
        console.log('[GUACAMOLE-CLIENT] Cleaning up keyboard handlers from document');
        document.removeEventListener('keydown', keydownHandlerRef.current);
        keydownHandlerRef.current = null;
      }
      if (keyupHandlerRef.current) {
        document.removeEventListener('keyup', keyupHandlerRef.current);
        keyupHandlerRef.current = null;
      }
      // Clean up resize observer
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
        resizeTimeoutRef.current = null;
      }
    }
  }, [connectionStatus]);

  // Set up resize observer to track container size for dynamic resolution
  useEffect(() => {
    if (displayRef.current && (tab.protocol === 'rdp' || tab.protocol === 'vnc')) {
      const updateSize = () => {
        if (displayRef.current) {
          const width = displayRef.current.clientWidth || 1024;
          const height = displayRef.current.clientHeight || 768;
          setDisplaySize({ width, height });
        }
      };
      
      // Initial size
      updateSize();
      
      // Set up resize observer for dynamic resolution
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Debounce resize events
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          for (const entry of entries) {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) {
              const newWidth = Math.floor(width);
              const newHeight = Math.floor(height);
              setDisplaySize({ width: newWidth, height: newHeight });
              
              // If connected, handle resize
              if (clientRef.current && connectionStatus === 'connected') {
                const display = clientRef.current.getDisplay();
                
                // Always send new size to remote host for RDP/VNC to support dynamic resizing
                // For 'auto' resolution, this enables the remote to adjust
                // For fixed resolution, the remote may ignore it but scaling will handle display
                clientRef.current.sendSize(newWidth, newHeight);
                console.log('[GUACAMOLE-CLIENT] Sent resize to remote:', newWidth, 'x', newHeight);
                
                // Scale display to fit container after a small delay to allow remote to respond
                setTimeout(() => {
                  if (clientRef.current) {
                    const display = clientRef.current.getDisplay();
                    const displayWidth = display.getWidth() || newWidth;
                    const displayHeight = display.getHeight() || newHeight;
                    
                    // Fit to container - allow scaling up to fill available space
                    const scale = Math.min(newWidth / displayWidth, newHeight / displayHeight);
                    display.scale(scale);
                    console.log('[GUACAMOLE-CLIENT] Display scaled to fit:', scale, 'container:', newWidth, 'x', newHeight, 'remote:', displayWidth, 'x', displayHeight);
                  }
                }, 100);
              }
            }
          }
        }, 200); // Debounce resize events
      });
      
      resizeObserverRef.current.observe(displayRef.current);
      
      return () => {
        if (resizeObserverRef.current) {
          resizeObserverRef.current.disconnect();
        }
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
      };
    }
  }, [tab.protocol, connectionStatus]);

  // Trigger immediate resize when fullscreen or sidebar changes - reuse existing connection
  useEffect(() => {
    if (displayRef.current && clientRef.current && connectionStatus === 'connected' && (tab.protocol === 'rdp' || tab.protocol === 'vnc')) {
      // Delay to let the DOM update after fullscreen/sidebar toggle
      const timeoutId = setTimeout(() => {
        if (displayRef.current && clientRef.current) {
          const newWidth = Math.floor(displayRef.current.clientWidth);
          const newHeight = Math.floor(displayRef.current.clientHeight);
          
          if (newWidth > 0 && newHeight > 0) {
            console.log('[GUACAMOLE-CLIENT] Container size changed, reusing existing connection');
            console.log('[GUACAMOLE-CLIENT] New container size:', newWidth, 'x', newHeight);
            setDisplaySize({ width: newWidth, height: newHeight });
            
            // Send resize request to remote - this tells RDP/VNC to change resolution
            // The existing connection stays open, just the resolution changes
            clientRef.current.sendSize(newWidth, newHeight);
            console.log('[GUACAMOLE-CLIENT] Sent resize to remote (reusing connection):', newWidth, 'x', newHeight);
            
            // Scale display to fit after remote responds
            setTimeout(() => {
              if (clientRef.current) {
                const display = clientRef.current.getDisplay();
                const displayWidth = display.getWidth() || newWidth;
                const displayHeight = display.getHeight() || newHeight;
                
                // Fit to container - use maximum available space
                const scale = Math.min(newWidth / displayWidth, newHeight / displayHeight);
                display.scale(scale);
                console.log('[GUACAMOLE-CLIENT] Display scaled to fit:', scale, 'container:', newWidth, 'x', newHeight);
              }
            }, 150);
          }
        }
      }, 100); // Wait for DOM to settle after toggle
      
      return () => clearTimeout(timeoutId);
    }
  }, [isFullscreen, sidebarCollapsed, connectionStatus, tab.protocol]);


    const fetchFtpFiles = async (path: string) => {
      if (!token) return;
      setFtpLoading(true);
      setFtpError('');
      try {
        const result = await accessService.listFTP(token, {
          host: tab.ip,
          port: 21,
          username,
          password,
          path
        });
        if (result.success) {
          setFtpFiles(result.files);
          setFtpPath(result.path);
        } else {
          setFtpError(result.error || 'Failed to list files');
        }
      } catch (err: any) {
        setFtpError(err.message || 'Error listing files');
      } finally {
        setFtpLoading(false);
      }
    };

    useEffect(() => {
      if (tab.status === 'connected' && tab.protocol === 'ftp') {
        fetchFtpFiles(ftpPath);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab.status, tab.protocol]);

    const handleFtpDownload = async (filename: string) => {
      if (!token) return;
      try {
        const filePath = ftpPath === '/' ? filename : `${ftpPath}/${filename}`;
        const result = await accessService.downloadFTP(token, {
          host: tab.ip,
          port: 21,
          username,
          password,
          path: filePath
        });
        
        if (result.success) {
          // Create blob and download
          let content = result.content;
          if (result.is_binary) {
            // Convert base64 to blob
            const byteCharacters = atob(content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
          } else {
            const blob = new Blob([content], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        } else {
          alert(`Download failed: ${result.error}`);
        }
      } catch (err: any) {
        alert(`Error downloading file: ${err.message}`);
      }
    };

    const handleFtpUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!token || !e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        if (event.target?.result) {
          const content = event.target.result as string;
          // Check if binary (simple check)
          const isBinary = content.startsWith('data:');
          let fileContent = content;
          
          if (isBinary) {
            fileContent = content.split(',')[1];
          }
          
          try {
            const filePath = ftpPath === '/' ? file.name : `${ftpPath}/${file.name}`;
            const result = await accessService.uploadFTP(token, {
              host: tab.ip,
              port: 21,
              username,
              password,
              path: filePath,
              content: fileContent,
              is_binary: isBinary
            });
            
            if (result.success) {
              fetchFtpFiles(ftpPath);
              alert('File uploaded successfully');
            } else {
              alert(`Upload failed: ${result.error}`);
            }
          } catch (err: any) {
            alert(`Error uploading file: ${err.message}`);
          }
        }
      };
      
      reader.readAsDataURL(file);
    };

    const handleFtpNavigate = (dirname: string) => {
      if (dirname === '..') {
        const parts = ftpPath.split('/').filter(p => p);
        parts.pop();
        const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
        fetchFtpFiles(newPath);
      } else {
        const newPath = ftpPath === '/' ? `/${dirname}` : `${ftpPath}/${dirname}`;
        fetchFtpFiles(newPath);
      }
    };

  // HTTP Tunnel implementation for environments where WebSocket doesn't work
  const setupHTTPTunnel = async () => {
    console.log('[HTTP-TUNNEL] Setting up HTTP tunnel connection (fallback mode)');
    console.log('[HTTP-TUNNEL] Target:', tab.ip);
    console.log('[HTTP-TUNNEL] Protocol:', tab.protocol);
    
    const port = tab.protocol === 'rdp' ? 3389 : 5900;
    const width = displayRef.current?.clientWidth || 1024;
    const height = displayRef.current?.clientHeight || 768;
    
    try {
      // Step 1: Create tunnel session
      const connectUrl = `/api/v1/access/http-tunnel/connect?` + new URLSearchParams({
        host: tab.ip,
        port: port.toString(),
        protocol: tab.protocol,
        username: username,
        password: password,
        width: width.toString(),
        height: height.toString(),
        dpi: '96'
      }).toString();
      
      console.log('[HTTP-TUNNEL] Connecting...');
      const connectResponse = await fetch(connectUrl, { method: 'POST' });
      
      if (!connectResponse.ok) {
        throw new Error(`Failed to connect: ${connectResponse.status}`);
      }
      
      const connectData = await connectResponse.json();
      const sessionId = connectData.session_id;
      console.log('[HTTP-TUNNEL] Session created:', sessionId);
      
      // Step 2: Create display canvas
      if (displayRef.current) {
        displayRef.current.innerHTML = `
          <div style="color: #00ff88; padding: 20px; font-family: monospace; background: #000; text-align: center;">
            <h3>🔗 HTTP Tunnel Connected</h3>
            <p>Session: ${sessionId.substring(0, 8)}...</p>
            <p>Target: ${tab.protocol.toUpperCase()}://${tab.ip}:${port}</p>
            <canvas id="guac-display" width="${width}" height="${height}" style="border: 1px solid #333;"></canvas>
            <p style="color: #888; font-size: 12px; margin-top: 10px;">
              Using HTTP tunnel mode (WebSocket unavailable in this environment)
            </p>
          </div>
        `;
      }
      
      // Step 3: Start reading from the tunnel using Server-Sent Events
      const eventSource = new EventSource(`/api/v1/access/http-tunnel/read/${sessionId}`);
      
      eventSource.onmessage = (event) => {
        console.log('[HTTP-TUNNEL] Received:', event.data.substring(0, 100));
        // TODO: Parse Guacamole instructions and render to canvas
      };
      
      eventSource.onerror = (error) => {
        console.error('[HTTP-TUNNEL] EventSource error:', error);
        eventSource.close();
      };
      
      updateTabStatus(tab.id, 'connected');
      setConnectionStatus('connected');
      console.log('[HTTP-TUNNEL] ✓ Connection established');
      
    } catch (error) {
      console.error('[HTTP-TUNNEL] Connection failed:', error);
      updateTabStatus(tab.id, 'failed');
      setConnectionStatus('failed');
      if (displayRef.current) {
        displayRef.current.innerHTML = `
          <div style="color: #ff3366; padding: 20px; font-family: monospace; background: #000;">
            <h3>⚠️ HTTP Tunnel Connection Failed</h3>
            <p>${error}</p>
          </div>
        `;
      }
    }
  };

  const setupGuacamole = (containerWidth?: number, containerHeight?: number) => {
    console.log('[GUACAMOLE-CLIENT] Setting up Guacamole connection');
    console.log('[GUACAMOLE-CLIENT] Target:', tab.ip);
    console.log('[GUACAMOLE-CLIENT] Protocol:', tab.protocol);
    console.log('[GUACAMOLE-CLIENT] Username:', username);
    console.log('[GUACAMOLE-CLIENT] Port:', (tab.protocol === 'rdp' ? 3389 : 5900));
    console.log('[GUACAMOLE-CLIENT] Remote Settings:', remoteSettings);
    console.log('[GUACAMOLE-CLIENT] Passed container dimensions:', containerWidth, 'x', containerHeight);
    
    // Calculate resolution based on settings
    // Priority: passed dimensions > container measurement > displaySize state > defaults
    let width = containerWidth || displaySize.width;
    let height = containerHeight || displaySize.height;
    
    // Ensure minimum dimensions
    width = Math.max(width, 800);
    height = Math.max(height, 600);
    
    if (remoteSettings.resolution === 'custom') {
      width = remoteSettings.customWidth;
      height = remoteSettings.customHeight;
    } else if (remoteSettings.resolution !== 'auto') {
      const [w, h] = remoteSettings.resolution.split('x').map(Number);
      width = w;
      height = h;
    }
    // 'auto' uses the measured container dimensions
    
    console.log('[GUACAMOLE-CLIENT] Final resolution for RDP request:', width, 'x', height);
    
    // Build base params
    const params = new URLSearchParams({
      host: tab.ip,
      port: (tab.protocol === 'rdp' ? 3389 : 5900).toString(),
      protocol: tab.protocol,
      username: username,
      password: password,
      width: width.toString(),
      height: height.toString(),
      dpi: '96',
      token: token || ''
    });
    
    // Add protocol-specific settings
    if (tab.protocol === 'rdp') {
      // RDP color depth
      params.set('color-depth', remoteSettings.rdpColorDepth.toString());
      
      // RDP performance options
      if (!remoteSettings.rdpEnableWallpaper) params.set('disable-wallpaper', 'true');
      if (!remoteSettings.rdpEnableTheming) params.set('disable-theming', 'true');
      if (!remoteSettings.rdpEnableFontSmoothing) params.set('disable-font-smoothing', 'true');
      if (!remoteSettings.rdpEnableAudio) params.set('disable-audio', 'true');
      if (remoteSettings.rdpEnablePrinting) params.set('enable-printing', 'true');
      if (remoteSettings.rdpEnableDrive) params.set('enable-drive', 'true');
    } else if (tab.protocol === 'vnc') {
      // VNC settings
      params.set('color-depth', remoteSettings.vncColorDepth.toString());
      params.set('compression', remoteSettings.vncCompression.toString());
      params.set('quality', remoteSettings.vncQuality.toString());
      params.set('cursor', remoteSettings.vncCursor);
    }
    
    // Clipboard sync
    if (!remoteSettings.clipboardSync) params.set('disable-copy', 'true');

    // Use WebSocket tunnel through nginx proxy
    // Nginx proxies /api/v1/access/tunnel to backend WebSocket
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/v1/access/tunnel?${params.toString()}`;
    
    console.log('[GUACAMOLE-CLIENT] WebSocket URL:', wsUrl.replace(/password=[^&]*/, 'password=***'));
    console.log('[GUACAMOLE-CLIENT] Display dimensions:', width, 'x', height);

    // Create tunnel with explicit subprotocol if needed, but Guacamole.WebSocketTunnel usually handles it
    const tunnel = new Guacamole.WebSocketTunnel(wsUrl);
    
    // Add tunnel event handlers for debugging
    (tunnel as any).onerror = (status: any) => {
      console.error('[GUACAMOLE-CLIENT] Tunnel error:', status);
      // Fallback to HTTP tunnel if WebSocket fails
      // console.log('[GUACAMOLE-CLIENT] WebSocket failed, falling back to HTTP tunnel...');
      // setupHTTPTunnel();
      
      // Show error directly instead of falling back to incomplete HTTP tunnel
      if (displayRef.current) {
        displayRef.current.innerHTML = `
          <div style="color: #ff3366; padding: 20px; font-family: monospace; background: #000; border: 1px solid #ff3366;">
            <h3 style="margin-bottom: 15px;">⚠️ Tunnel Connection Failed</h3>
            <p><strong>Status:</strong> ${JSON.stringify(status)}</p>
            <p>WebSocket connection to backend failed.</p>
          </div>
        `;
      }
    };
    
    (tunnel as any).onstatechange = (state: number) => {
      const stateNames = ['IDLE', 'CONNECTING', 'WAITING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED'];
      console.log('[GUACAMOLE-CLIENT] Tunnel state changed:', stateNames[state] || state);
    };
    
    const client = new Guacamole.Client(tunnel);
    clientRef.current = client;

    if (displayRef.current) {
      displayRef.current.innerHTML = '';
      const displayElement = client.getDisplay().getElement();
      displayRef.current.appendChild(displayElement);
      console.log('[GUACAMOLE-CLIENT] Display element attached to DOM');
    }

    client.onerror = (error) => {
      console.error('[GUACAMOLE-CLIENT] Client error:', error);
      const errorMsg = error?.message || JSON.stringify(error);
      console.error('[GUACAMOLE-CLIENT] Error details:', errorMsg);
      updateTabStatus(tab.id, 'failed');
      
      // Show user-friendly error message with debugging info
      if (displayRef.current) {
        displayRef.current.innerHTML = `
          <div style="color: #ff3366; padding: 20px; font-family: monospace; background: #000; border: 1px solid #ff3366;">
            <h3 style="margin-bottom: 15px;">⚠️ Connection Failed</h3>
            <p><strong>Error:</strong> ${errorMsg}</p>
            <p><strong>Host:</strong> ${tab.ip}:${tab.protocol === 'rdp' ? 3389 : 5900}</p>
            <p><strong>Protocol:</strong> ${tab.protocol.toUpperCase()}</p>
            <p><strong>Username:</strong> ${username}</p>
            <hr style="border-color: #333; margin: 15px 0;" />
            <p style="color: #888; font-size: 12px;">
              <strong>Debugging Tips:</strong><br/>
              1. Check browser console (F12) for detailed logs<br/>
              2. Verify the target host is reachable<br/>
              3. Confirm credentials are correct<br/>
              4. For VNC: password is typically required, username may be optional<br/>
              5. For RDP: both username and password are required
            </p>
          </div>
        `;
      }
    };

    client.onstatechange = (state) => {
      const stateNames = ['IDLE', 'CONNECTING', 'WAITING', 'CONNECTED', 'DISCONNECTING', 'DISCONNECTED'];
      console.log('[GUACAMOLE-CLIENT] Client state changed:', stateNames[state] || state);
      
      if (state === 3) { // CONNECTED
        console.log('[GUACAMOLE-CLIENT] ✓ Successfully connected to remote host');
        updateTabStatus(tab.id, 'connected');
        setConnectionStatus('connected');
        // Notify parent component
        if (onConnected) {
          console.log('[GUACAMOLE-CLIENT] Calling onConnected callback');
          onConnected();
        }
      } else if (state === 5) { // DISCONNECTED
        console.log('[GUACAMOLE-CLIENT] Disconnected from remote host');
        updateTabStatus(tab.id, 'disconnected');
        setConnectionStatus('disconnected');
      }
    };

    // Handle mouse - NO pointer lock
    const displayElement = client.getDisplay().getElement();
    // Hide local cursor based on settings - remote cursor shown by RDP/VNC
    if (remoteSettings.hideCursor) {
      displayElement.style.cursor = 'none';
    }
    const mouse = new Guacamole.Mouse(displayElement);
    (mouse as any).onmousedown = (mouse as any).onmouseup = (mouse as any).onmousemove = (mouseState: any) => {
      client.sendMouseState(mouseState);
    };

    // Make display element focusable
    displayElement.setAttribute('tabindex', '0');
    displayElement.style.outline = 'none';
    
    // Focus display when clicked
    displayElement.addEventListener('click', () => {
      displayElement.focus();
    });
    
    // Show cursor when leaving display area, hide when entering (if hideCursor enabled)
    displayElement.addEventListener('mouseenter', () => {
      if (remoteSettings.hideCursor) {
        displayElement.style.cursor = 'none';
      }
    });
    displayElement.addEventListener('mouseleave', () => {
      displayElement.style.cursor = 'default';
    });

    // Clean up existing keyboard handlers
    if (keydownHandlerRef.current) {
      document.removeEventListener('keydown', keydownHandlerRef.current);
    }
    if (keyupHandlerRef.current) {
      document.removeEventListener('keyup', keyupHandlerRef.current);
    }

    // Use native keyboard events - only capture when display is focused
    // This allows normal typing in other inputs
    const keydownHandler = (e: KeyboardEvent) => {
      // Only send keys if display element is focused
      if (document.activeElement === displayElement) {
        const keysym = getKeysym(e);
        if (keysym) {
          client.sendKeyEvent(1, keysym);
          e.preventDefault();
        }
      }
    };
    
    const keyupHandler = (e: KeyboardEvent) => {
      if (document.activeElement === displayElement) {
        const keysym = getKeysym(e);
        if (keysym) {
          client.sendKeyEvent(0, keysym);
          e.preventDefault();
        }
      }
    };
    
    keydownHandlerRef.current = keydownHandler;
    keyupHandlerRef.current = keyupHandler;
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    console.log('[GUACAMOLE-CLIENT] Initiating connection...');
    client.connect('');
    console.log('[GUACAMOLE-CLIENT] Connection initiated');
  };


  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    updateTabStatus(tab.id, 'connecting');
    setConnectionStatus('connecting');
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
      setConnectionStatus('connected');
      setOutput(['[!] EXPLOIT MODULE LOADED', '[*] Target: ' + tab.ip, '[*] Status: Ready for deployment', '[!] WARNING: This module is for educational purposes only.']);
      return;
    }

    if (tab.protocol === 'rdp' || tab.protocol === 'vnc') {
      // Measure container size RIGHT NOW before connecting
      // This ensures we request the correct resolution from the remote
      if (displayRef.current) {
        const measuredWidth = displayRef.current.clientWidth || window.innerWidth - 200;
        const measuredHeight = displayRef.current.clientHeight || window.innerHeight - 150;
        console.log('[GUACAMOLE-CLIENT] Pre-connect container measurement:', measuredWidth, 'x', measuredHeight);
        setDisplaySize({ width: measuredWidth, height: measuredHeight });
        // Pass measured size directly to setupGuacamole
        setupGuacamole(measuredWidth, measuredHeight);
      } else {
        // Fallback to window size if container not available
        const fallbackWidth = window.innerWidth - 200;
        const fallbackHeight = window.innerHeight - 150;
        console.log('[GUACAMOLE-CLIENT] Using fallback dimensions:', fallbackWidth, 'x', fallbackHeight);
        setupGuacamole(fallbackWidth, fallbackHeight);
      }
      return;
    }

    if (tab.protocol === 'web') {
      updateTabStatus(tab.id, 'connected');
      setConnectionStatus('connected');
      return;
    }

    if (tab.protocol === 'ftp') {
      updateTabStatus(tab.id, 'connected');
      setConnectionStatus('connected');
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
        setConnectionStatus('connected');
        setOutput([`Connected to ${tab.ip} via ${tab.protocol.toUpperCase()}`, `Welcome to ${tab.hostname || tab.ip}`, `Last login: ${new Date().toLocaleString()}`]);
      } else {
        updateTabStatus(tab.id, 'failed');
        setConnectionStatus('failed');
        alert(`Connection failed: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      updateTabStatus(tab.id, 'failed');
      setConnectionStatus('failed');
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

  if (connectionStatus === 'connected') {
    if (tab.protocol === 'rdp' || tab.protocol === 'vnc') {
      // For RDP/VNC, use 100% of container and let display scale
      return (
        <div className="h-full w-full flex flex-col bg-black overflow-hidden">
          <div className="bg-cyber-darker px-4 py-2 text-xs opacity-50 flex justify-between border-b border-cyber-gray shrink-0">
            <span>Connected to {tab.ip} ({tab.protocol.toUpperCase()})</span>
            <span>{username} | {remoteSettings.resolution === 'auto' ? `${displaySize.width}×${displaySize.height}` : remoteSettings.resolution}</span>
          </div>
          <div 
            ref={displayRef} 
            className="flex-1 flex items-center justify-center overflow-hidden bg-black"
            style={{ minHeight: 0 }}
          />
        </div>
      );
    }

    if (tab.protocol === 'web') {
      return (
        <div className="h-full flex flex-col bg-cyber-dark rounded border border-cyber-gray shadow-2xl overflow-hidden">
          <div className="bg-cyber-darker px-4 py-2 text-xs opacity-50 flex justify-between items-center border-b border-cyber-gray">
             <div className="flex items-center space-x-2 flex-1 mr-4">
               <span className="text-cyber-blue font-bold">URL:</span>
               <input 
                 type="text" 
                 defaultValue={`http://${tab.ip}`}
                 className="bg-cyber-dark border border-cyber-gray text-cyber-green px-2 py-1 w-full text-xs font-mono focus:border-cyber-blue outline-none"
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     const iframe = document.getElementById(`iframe-${tab.id}`) as HTMLIFrameElement;
                     if (iframe) iframe.src = e.currentTarget.value;
                   }
                 }}
               />
             </div>
             <a href={`http://${tab.ip}`} target="_blank" rel="noopener noreferrer" className="text-cyber-blue hover:underline whitespace-nowrap font-bold">Open in new tab</a>
          </div>
          <iframe 
            id={`iframe-${tab.id}`}
            src={`http://${tab.ip}`} 
            className="flex-1 w-full h-full border-none bg-white"
            title={`Web interface for ${tab.ip}`}
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          />
        </div>
      );
    }

    if (tab.protocol === 'ftp') {
      return (
        <div className="h-full flex flex-col bg-cyber-dark rounded border border-cyber-gray shadow-2xl overflow-hidden">
          <div className="bg-cyber-darker px-4 py-2 text-xs opacity-50 flex justify-between items-center border-b border-cyber-gray">
            <div className="flex items-center space-x-2">
              <span className="text-cyber-blue font-bold">FTP:</span>
              <span className="text-cyber-green font-mono">{ftpPath}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => fetchFtpFiles(ftpPath)}
                className="text-cyber-blue hover:text-white mr-2"
                title="Refresh"
              >
                ↻
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-cyber-blue hover:text-white font-bold"
                title="Upload File"
              >
                ↑ Upload
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleFtpUpload}
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-4">
            {ftpLoading ? (
              <div className="text-cyber-blue animate-pulse">Loading files...</div>
            ) : ftpError ? (
              <div className="text-red-500">Error: {ftpError}</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-cyber-gray-light border-b border-cyber-gray">
                    <th className="pb-2">Name</th>
                    <th className="pb-2">Size</th>
                    <th className="pb-2">Date</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-cyber-green">
                  {ftpPath !== '/' && (
                    <tr className="hover:bg-cyber-darker cursor-pointer" onClick={() => handleFtpNavigate('..')}>
                      <td className="py-2" colSpan={4}>..</td>
                    </tr>
                  )}
                  {ftpFiles.map((file, i) => (
                    <tr key={i} className="hover:bg-cyber-darker border-b border-cyber-gray border-opacity-20">
                      <td className="py-2 cursor-pointer" onClick={() => file.type === 'directory' ? handleFtpNavigate(file.name) : null}>
                        <span className="mr-2">{file.type === 'directory' ? '◈' : '◆'}</span>
                        {file.name}
                      </td>
                      <td className="py-2">{file.size}</td>
                      <td className="py-2">{file.date}</td>
                      <td className="py-2">
                        {file.type === 'file' && (
                          <button 
                            onClick={() => handleFtpDownload(file.name)}
                            className="text-cyber-blue hover:underline text-xs"
                          >
                            Download
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {ftpFiles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-cyber-gray-light">No files found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
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
    <div className="max-w-md mx-auto mt-10 p-6 bg-cyber-darker border-2 border-cyber-gray rounded-lg shadow-xl shadow-cyber-blue/10">
      <h3 className="text-xl font-bold uppercase mb-6 flex items-center">
        <span className="mr-3 text-2xl">
          {tab.protocol === 'ssh' && <span className="text-cyber-green">◉</span>}
          {tab.protocol === 'rdp' && <span className="text-cyber-blue">◉</span>}
          {tab.protocol === 'vnc' && <span className="text-cyber-purple">◉</span>}
          {tab.protocol === 'telnet' && <span className="text-cyber-blue">◉</span>}
          {tab.protocol === 'exploit' && <span className="text-cyber-red">◆</span>}
        </span>
        <span className={
          tab.protocol === 'ssh' ? 'text-cyber-green' :
          tab.protocol === 'rdp' ? 'text-cyber-blue' :
          tab.protocol === 'vnc' ? 'text-cyber-purple' :
          tab.protocol === 'telnet' ? 'text-cyber-blue' :
          'text-cyber-red'
        }>
          {tab.protocol.toUpperCase()} Connection
        </span>
      </h3>

      {savedCredentials.length > 0 && (
        <div className="mb-6">
          <label className="block text-[10px] font-bold text-cyber-gray-light uppercase mb-2 tracking-wider">◆ Saved Credentials</label>
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
        {/* Username - required for RDP/SSH, optional for VNC */}
        {tab.protocol !== 'vnc' && (
          <div>
            <label className="block text-xs font-bold text-cyber-purple uppercase mb-1 tracking-wider">◆ Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-cyber-dark border border-cyber-gray rounded px-3 py-2 text-white font-mono focus:border-cyber-green outline-none transition-colors"
              placeholder="admin"
              required={tab.protocol === 'rdp' || tab.protocol === 'ssh'}
            />
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-cyber-purple uppercase mb-1 tracking-wider">
            ◆ Password {tab.protocol === 'vnc' && <span className="text-cyber-gray">(VNC password)</span>}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-cyber-dark border border-cyber-gray rounded px-3 py-2 text-white font-mono focus:border-cyber-green outline-none transition-colors"
            placeholder="••••••••"
          />
        </div>

        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-4 h-4 border-2 border-cyber-purple flex items-center justify-center peer-checked:bg-cyber-purple transition-all mr-2">
            {remember && <span className="text-white text-xs">◆</span>}
          </div>
          <span className="text-xs text-cyber-gray-light uppercase tracking-wide">◇ Remember Credentials</span>
        </label>

          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={connectionStatus === 'connecting'}
              className={`flex-1 btn-cyber py-3 border-cyber-green text-cyber-green hover:bg-cyber-green hover:text-black font-bold uppercase tracking-widest transition-all ${
                connectionStatus === 'connecting' ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {connectionStatus === 'connecting' ? 'Establishing Connection...' : 'Connect'}
            </button>
            {connectionStatus === 'connecting' && (
              <button
                type="button"
                onClick={() => { updateTabStatus(tab.id, 'disconnected'); setConnectionStatus('disconnected'); }}
                className="btn-cyber px-4 py-3 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-white font-bold uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            )}
          </div>
      </form>
    </div>
  );
};

export default ProtocolConnection;
