import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { assetService } from '../services/assetService';
import { dashboardService } from '../services/dashboardService';
import { trafficService, NetworkInterface } from '../services/trafficService';
import { useAuthStore } from '../store/authStore';
import { useScanStore } from '../store/scanStore';
import { usePOV } from '../context/POVContext';
import { CyberPageTitle } from '../components/CyberUI';
import HostContextMenu from '../components/HostContextMenu';
import ConnectionContextMenu from '../components/ConnectionContextMenu';

interface GraphNode {
  id: string;
  name: string;
  val: number; // size based on connections
  group: string; // for coloring
  ip: string;
  status: string;
  details?: any;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number; // velocity x for force simulation
  vy?: number; // velocity y for force simulation
  connectionCount?: number; // number of connections for this node
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number; // traffic volume
  protocols?: string[]; // list of protocols used
  bidirectional?: boolean; // if traffic flows both ways
  reverseValue?: number; // traffic in reverse direction
  last_seen?: number | string; // timestamp of last traffic
  first_seen?: number | string; // timestamp of first traffic
  packet_count?: number; // number of packets
  ports?: number[]; // list of ports used in connection
  sourcePort?: number; // primary source port
  targetPort?: number; // primary destination port
  bytesPerSecond?: number; // calculated throughput for filtering
  
  // DPI (Deep Packet Inspection) fields
  detected_protocols?: string[]; // L7 protocols detected by DPI
  service_label?: string; // Service label (e.g., "HTTP:80", "SSH:22")
  is_encrypted?: boolean; // Whether traffic is encrypted
  protocol_category?: string; // Category (web, mail, database, etc.)
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Color constants for protocol visualization (L4 + L7)
// Color constants for protocol visualization (L4 + L7)
const PROTOCOL_COLORS: Record<string, string> = {
  // L4 Transport protocols
  TCP: '#00ff41',    // Green
  UDP: '#00f0ff',    // Blue
  ICMP: '#ffff00',   // Yellow
  OTHER_IP: '#ff00ff', // Magenta
  
  // L7 Application protocols (DPI detected)
  HTTP: '#00ff00',     // Bright green
  HTTPS: '#00aa00',    // Dark green (encrypted web)
  DNS: '#ff9900',      // Orange
  SSH: '#9900ff',      // Purple
  SMB: '#ff0099',      // Pink
  RDP: '#ff6600',      // Orange-red
  FTP: '#66ff00',      // Lime green
  SMTP: '#0099ff',     // Light blue
  MYSQL: '#ff9966',    // Peach
  POSTGRESQL: '#336699', // Steel blue
  REDIS: '#cc0000',    // Redis red
  MONGODB: '#47a248',  // MongoDB green
  TLS: '#008800',      // Dark green (encrypted)
  VNC: '#5555ff',      // Blue
  LDAP: '#999900',     // Olive
  NTP: '#cc99ff',      // Light purple
  SNMP: '#996633',     // Brown
  SIP: '#00cccc',      // Teal (VoIP)
  MODBUS: '#ff3300',   // Industrial red
  
  // Special categories
  ENCRYPTED: '#006600', // Very dark green for encrypted
  UNKNOWN: '#666666',   // Gray for unknown
  DEFAULT: '#00f0ff'    // Blue default
};

// Protocol to OSI Layer mapping
const PROTOCOL_LAYERS: Record<string, string> = {
  // L2 Data Link Layer
  ETHERNET: 'L2', ARP: 'L2', VLAN: 'L2', STP: 'L2', LLDP: 'L2',
  
  // L4 Transport Layer
  TCP: 'L4', UDP: 'L4', ICMP: 'L4', SCTP: 'L4',
  
  // L5 Session Layer
  NETBIOS: 'L5', RPC: 'L5', SOCKS: 'L5', PPTP: 'L5',
  
  // L7 Application Layer
  HTTP: 'L7', HTTPS: 'L7', DNS: 'L7', SSH: 'L7', SMB: 'L7',
  RDP: 'L7', FTP: 'L7', SMTP: 'L7', MYSQL: 'L7', POSTGRESQL: 'L7',
  REDIS: 'L7', MONGODB: 'L7', TLS: 'L7', VNC: 'L7', LDAP: 'L7',
  NTP: 'L7', SNMP: 'L7', SIP: 'L7', MODBUS: 'L7', TELNET: 'L7',
  POP3: 'L7', IMAP: 'L7', DHCP: 'L7', TFTP: 'L7', OPCUA: 'L7',
  MQTT: 'L7', AMQP: 'L7', COAP: 'L7'
};

// Get the OSI layer for a protocol
const getProtocolLayer = (protocol: string): string => {
  const upper = protocol.toUpperCase();
  return PROTOCOL_LAYERS[upper] || 'L4'; // Default to L4 if unknown
};

// Check if a link matches any of the active layers
const linkMatchesActiveLayers = (
  link: GraphLink,
  activeLayers: Set<string>
): { matches: boolean; matchedLayer: string | null } => {
  // Check L7 detected protocols first (highest priority)
  if (link.detected_protocols && link.detected_protocols.length > 0) {
    for (const proto of link.detected_protocols) {
      const layer = getProtocolLayer(proto);
      if (activeLayers.has(layer)) {
        return { matches: true, matchedLayer: layer };
      }
    }
  }
  
  // Check regular protocols
  if (link.protocols && link.protocols.length > 0) {
    for (const proto of link.protocols) {
      const layer = getProtocolLayer(proto);
      if (activeLayers.has(layer)) {
        return { matches: true, matchedLayer: layer };
      }
    }
  }
  
  // If no protocols, check if L4 is active (assume TCP/UDP for port-based connections)
  if (activeLayers.has('L4')) {
    return { matches: true, matchedLayer: 'L4' };
  }
  
  return { matches: false, matchedLayer: null };
};

// Get color based on matched layer
const getLayerColor = (layer: string | null): string => {
  switch (layer) {
    case 'L2': return '#9900ff'; // Purple for Data Link
    case 'L4': return '#00ff41'; // Green for Transport
    case 'L5': return '#00f0ff'; // Cyan for Session
    case 'L7': return '#ff0040'; // Red for Application
    default: return '#00f0ff';   // Default cyan
  }
};

// Utility functions
const getProtocolColor = (protocols?: string[], detectedProtocol?: string): string => {
  // Prefer L7 detected protocol if available
  if (detectedProtocol && PROTOCOL_COLORS[detectedProtocol.toUpperCase()]) {
    return PROTOCOL_COLORS[detectedProtocol.toUpperCase()];
  }
  
  if (!protocols || protocols.length === 0) return PROTOCOL_COLORS.DEFAULT;
  const protocol = protocols[0].toUpperCase(); // Use primary protocol
  
  // Check L7 protocols first
  if (PROTOCOL_COLORS[protocol]) {
    return PROTOCOL_COLORS[protocol];
  }
  
  // L4 fallbacks
  if (protocol === 'TCP') return PROTOCOL_COLORS.TCP;
  if (protocol === 'UDP') return PROTOCOL_COLORS.UDP;
  if (protocol === 'ICMP') return PROTOCOL_COLORS.ICMP;
  if (protocol.startsWith('IP_')) return PROTOCOL_COLORS.OTHER_IP;
  return PROTOCOL_COLORS.DEFAULT;
};

const formatTrafficMB = (bytes: number): string => {
  return (bytes / 1024 / 1024).toFixed(2);
};

// Visual scaling constants
const LINK_MIN_WIDTH = 0.3;
const LINK_MAX_WIDTH = 3;
const NODE_MIN_SIZE = 4;
const NODE_MAX_SIZE = 15;

// Calculate link width based on traffic volume (logarithmic scale)
const calculateLinkWidth = (totalTraffic: number): number => {
  if (!totalTraffic) return LINK_MIN_WIDTH;
  // Gentler scaling: base 0.3 + log contribution capped at 2.7 more
  return Math.min(LINK_MAX_WIDTH, LINK_MIN_WIDTH + Math.log10(totalTraffic + 1) * 0.5);
};

// Calculate link opacity/brightness based on recency
// Uses packet_count and last_seen to determine brightness
// 3 distinct intensity levels: ACTIVE (1.0), RECENT (0.5), STALE (0.15)
const calculateLinkOpacity = (
  lastSeen: number | string | undefined, 
  serverCurrentTime: number,
  refreshRateMs: number = 5000,
  packetCount?: number
): number => {
  // No timestamp = STALE (very dim)
  if (!lastSeen) return 0.15;
  
  // Parse timestamp - handle both ISO strings and Unix timestamps (seconds)
  let lastSeenTime: number;
  if (typeof lastSeen === 'string') {
    lastSeenTime = new Date(lastSeen).getTime() / 1000; // Convert to seconds
  } else {
    // If it's a large number (> 1 trillion), it's milliseconds; otherwise seconds
    lastSeenTime = lastSeen > 1000000000000 ? lastSeen / 1000 : lastSeen;
  }
  
  const secondsAgo = serverCurrentTime - lastSeenTime;
  
  // Debug: log for troubleshooting (remove after fix confirmed)
  // console.log('Link opacity calc:', { lastSeen, lastSeenTime, serverCurrentTime, secondsAgo, packetCount });
  
  // Thresholds based on refresh rate for 3 clear levels
  const refreshSec = refreshRateMs / 1000;
  
  // Level 1: ACTIVE - within 2x refresh interval (bright)
  const activeThreshold = refreshSec * 2;
  // Level 2: RECENT - within 6x refresh interval (medium)  
  const recentThreshold = refreshSec * 6;
  // Level 3: STALE - older than 6x refresh interval (dim)
  
  // ACTIVE: Very recent traffic with packets = full brightness
  if (secondsAgo < activeThreshold) {
    // Extra bright if we have recent packet count
    return packetCount && packetCount > 0 ? 1.0 : 0.9;
  }
  
  // RECENT: Somewhat recent - medium brightness
  if (secondsAgo < recentThreshold) {
    return 0.5;
  }
  
  // STALE: Old traffic - dim but visible
  return 0.15;
};

// Calculate node size based on connection count
const calculateNodeSize = (connectionCount: number): number => {
  return Math.min(NODE_MAX_SIZE, NODE_MIN_SIZE + Math.log10(connectionCount + 1) * 4);
};

// Apply opacity to hex color
const applyOpacity = (hexColor: string, opacity: number): string => {
  // If color already has alpha, replace it
  if (hexColor.length === 9) {
    hexColor = hexColor.slice(0, 7);
  }
  const alpha = Math.round(opacity * 255).toString(16).padStart(2, '0');
  return hexColor + alpha;
};

// Calculate curve offset for a link to avoid overlapping
// Uses the node IDs to create consistent curvature
const calculateLinkCurvature = (sourceId: string, targetId: string, linkIndex: number = 0): number => {
  // Create a deterministic but varied curvature based on IPs
  // This ensures same link always has same curve, but different links curve differently
  const hash = (sourceId + targetId).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Base curvature varies from -0.3 to 0.3 based on hash
  const baseCurve = ((hash % 60) - 30) / 100;
  
  // Additional offset for multiple links between same pair (if any)
  const indexOffset = linkIndex * 0.15;
  
  return baseCurve + indexOffset;
};

// Draw a curved line between two points using quadratic bezier
const drawCurvedLine = (
  ctx: CanvasRenderingContext2D,
  startX: number, startY: number,
  endX: number, endY: number,
  curvature: number
): { midX: number; midY: number } => {
  // Calculate the midpoint
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  
  // Calculate perpendicular offset for the control point
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  // Perpendicular vector (normalized and scaled by curvature and distance)
  const perpX = -dy / length * length * curvature;
  const perpY = dx / length * length * curvature;
  
  // Control point is offset from midpoint perpendicular to the line
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;
  
  // Draw quadratic bezier curve
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
  ctx.stroke();
  
  // Return the actual midpoint of the curve (on the curve, not the control point)
  // For quadratic bezier at t=0.5: P = (1-t)^2*P0 + 2*(1-t)*t*P1 + t^2*P2
  const curveMidX = 0.25 * startX + 0.5 * ctrlX + 0.25 * endX;
  const curveMidY = 0.25 * startY + 0.5 * ctrlY + 0.25 * endY;
  
  return { midX: curveMidX, midY: curveMidY };
};

const Topology: React.FC = () => {
  const { token } = useAuthStore();
  const { passiveServices, passiveScanEnabled } = useScanStore();
  const { activeAgent, isAgentPOV } = usePOV();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  
  // Enhanced passive scan host info for hover details
  const [enhancedHostInfo, setEnhancedHostInfo] = useState<Record<string, any>>({});
  
  // Persisted settings - restore from localStorage
  const [trafficThreshold, setTrafficThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('nop_topology_threshold');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [isPlaying, setIsPlaying] = useState(() => {
    const saved = localStorage.getItem('nop_topology_playing');
    return saved === 'true';
  });
  const [autoRefresh, setAutoRefresh] = useState(() => {
    const saved = localStorage.getItem('nop_topology_autorefresh');
    return saved === 'true';
  });
  const [refreshRate, setRefreshRate] = useState<number>(() => {
    const saved = localStorage.getItem('nop_topology_refreshrate');
    return saved ? parseInt(saved, 10) : 5000;
  });
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Live traffic capture state
  const [currentTime, setCurrentTime] = useState<number>(Date.now() / 1000);
  const [isLiveCapturing, setIsLiveCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string>('');
  
  // Fullscreen and resize state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphHeight, setGraphHeight] = useState(() => {
    const saved = localStorage.getItem('nop_topology_height');
    return saved ? parseInt(saved, 10) : 600;
  });
  const [isResizing, setIsResizing] = useState(false);

  // Use browser Fullscreen API for true fullscreen
  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  // Listen for fullscreen changes (user presses Escape, etc.)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Resize handlers for manual height adjustment
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };
  
  // Store node positions to preserve them between updates
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; fx?: number; fy?: number }>>(new Map());
  const isInitialLoadRef = useRef(true);
  const simulationCompleteRef = useRef(false); // Track if first simulation has finished
  const hasInitialCenteringRef = useRef(false); // Track if initial centering on hub was done
  
  // Compute connection counts and traffic stats for dynamic sizing
  const sizingStats = useMemo(() => {
    const connectionCounts = new Map<string, number>();
    let maxConnections = 1;
    let maxTraffic = 1;
    
    graphData.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
      connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
      
      const totalTraffic = (link.value || 0) + (link.reverseValue || 0);
      if (totalTraffic > maxTraffic) maxTraffic = totalTraffic;
    });
    
    connectionCounts.forEach((count) => {
      if (count > maxConnections) maxConnections = count;
    });
    
    return { connectionCounts, maxConnections, maxTraffic };
  }, [graphData.links]);
  
  // Calculate node size based on connection count (10% increments, max 100% larger)
  const getNodeSize = useCallback((nodeId: string, baseSize: number = 6) => {
    const connections = sizingStats.connectionCounts.get(nodeId) || 0;
    if (connections === 0 || sizingStats.maxConnections <= 1) return baseSize;
    
    // Normalize to 0-1 range, then scale to 0-100% increase in 10% increments
    const ratio = connections / sizingStats.maxConnections;
    const increment = Math.floor(ratio * 10) / 10; // Round down to nearest 10%
    return baseSize * (1 + increment); // baseSize to 2x baseSize
  }, [sizingStats]);
  
  // Calculate link width based on throughput (10% increments, max 100% thicker)
  const getLinkWidth = useCallback((link: any, baseWidth: number = 1) => {
    const totalTraffic = (link.value || 0) + (link.reverseValue || 0);
    if (totalTraffic === 0 || sizingStats.maxTraffic <= 1) return baseWidth;
    
    // Normalize to 0-1 range, then scale to 0-100% increase in 10% increments
    const ratio = totalTraffic / sizingStats.maxTraffic;
    const increment = Math.floor(ratio * 10) / 10; // Round down to nearest 10%
    return baseWidth * (1 + increment); // baseWidth to 2x baseWidth
  }, [sizingStats]);
  
  // Center on hub node (largest cluster)
  const centerOnHub = useCallback(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    
    const connectionCounts = new Map<string, number>();
    graphData.links.forEach((link: any) => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      connectionCounts.set(sourceId, (connectionCounts.get(sourceId) || 0) + 1);
      connectionCounts.set(targetId, (connectionCounts.get(targetId) || 0) + 1);
    });
    
    let maxConnections = 0;
    let hubNodeId: string | null = null;
    connectionCounts.forEach((count, nodeId) => {
      if (count > maxConnections) {
        maxConnections = count;
        hubNodeId = nodeId;
      }
    });
    
    if (hubNodeId) {
      const hubNode = graphData.nodes.find((n: any) => n.id === hubNodeId);
      if (hubNode && hubNode.x !== undefined && hubNode.y !== undefined) {
        fgRef.current.centerAt(hubNode.x, hubNode.y, 500);
        fgRef.current.zoom(1, 500);
      }
    }
  }, [graphData.nodes, graphData.links]);
  
  // Context menu state for host and connection interactions
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

  // Asset highlighting state - when an asset is clicked, highlight its connections (persistent green)
  const [highlightedAsset, setHighlightedAsset] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const [highlightedLinks, setHighlightedLinks] = useState<Set<string>>(new Set());
  
  // Link highlighting state - when a link is clicked, it stays green highlighted
  const [clickedLink, setClickedLink] = useState<GraphLink | null>(null);

  // Calculate connected nodes and links for a given node
  const calculateConnections = useCallback((nodeId: string | null): { nodes: Set<string>; links: Set<string> } => {
    if (!nodeId) {
      return { nodes: new Set(), links: new Set() };
    }

    const connectedNodes = new Set<string>([nodeId]);
    const connectedLinks = new Set<string>();

    graphData.links.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      
      if (sourceId === nodeId || targetId === nodeId) {
        connectedNodes.add(sourceId);
        connectedNodes.add(targetId);
        // Use sorted key for consistent link identification
        const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
        connectedLinks.add(`${node1}<->${node2}`);
      }
    });

    return { nodes: connectedNodes, links: connectedLinks };
  }, [graphData.links]);

  // Calculate highlighted nodes and links when an asset OR link is clicked (persistent green)
  useEffect(() => {
    const { nodes, links } = calculateConnections(highlightedAsset);
    
    // Also include clicked link in the highlighted set
    if (clickedLink) {
      const sourceId = typeof clickedLink.source === 'object' ? clickedLink.source.id : clickedLink.source;
      const targetId = typeof clickedLink.target === 'object' ? clickedLink.target.id : clickedLink.target;
      nodes.add(sourceId);
      nodes.add(targetId);
      const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
      links.add(`${node1}<->${node2}`);
    }
    
    setHighlightedNodes(nodes);
    setHighlightedLinks(links);
  }, [highlightedAsset, clickedLink, calculateConnections]);

  // Calculate hover-highlighted nodes and links synchronously using useMemo
  // This ensures the values are available immediately for rendering
  const { hoverHighlightedNodes, hoverHighlightedLinks } = React.useMemo(() => {
    // If hovering on a node, use that node's connections (blue hover)
    if (hoveredNode) {
      const connectedNodes = new Set<string>([hoveredNode.id]);
      const connectedLinks = new Set<string>();
      
      graphData.links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (sourceId === hoveredNode.id || targetId === hoveredNode.id) {
          connectedNodes.add(sourceId);
          connectedNodes.add(targetId);
          const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
          connectedLinks.add(`${node1}<->${node2}`);
        }
      });
      
      return { hoverHighlightedNodes: connectedNodes, hoverHighlightedLinks: connectedLinks };
    }
    
    // If hovering on a link, highlight both endpoints and the link (blue hover)
    if (hoveredLink) {
      const sourceId = typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source;
      const targetId = typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target;
      
      const connectedNodes = new Set<string>([sourceId, targetId]);
      const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
      const connectedLinks = new Set<string>([`${node1}<->${node2}`]);
      
      return { hoverHighlightedNodes: connectedNodes, hoverHighlightedLinks: connectedLinks };
    }
    
    // Nothing hovered - return empty sets
    return { hoverHighlightedNodes: new Set<string>(), hoverHighlightedLinks: new Set<string>() };
  }, [hoveredNode, hoveredLink, graphData.links]);

  // Force graph repaint when hover state or selection changes
  useEffect(() => {
    // Trigger a repaint by calling the refresh method if available
    if (fgRef.current) {
      fgRef.current.refresh?.();
    }
  }, [hoveredNode, hoveredLink, highlightedAsset, clickedLink]);

  // Get scan settings for discovery subnet
  const [scanSettings, setScanSettings] = useState(() => {
    const saved = localStorage.getItem('nop_scan_settings');
    return saved ? JSON.parse(saved) : { networkRange: '172.21.0.0/24' };
  });

  // Filter mode with localStorage persistence - default to 'all' to show all hosts initially
  const [filterMode, setFilterMode] = useState<'all' | 'subnet'>(() => {
    const saved = localStorage.getItem('nop_topology_filter');
    return (saved as 'all' | 'subnet') || 'all';
  });

  // OSI Layer toggles for multi-layer topology visualization
  // L2 = Data Link (MAC/Ethernet), L4 = Transport (TCP/UDP), L5 = Session, L7 = Application (DPI)
  const [activeLayers, setActiveLayers] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('nop_topology_layers');
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        return new Set(['L4', 'L7']); // Default to L4 + L7
      }
    }
    return new Set(['L4', 'L7']); // Default to L4 + L7
  });

  // Toggle a layer on/off
  const toggleLayer = useCallback((layer: string) => {
    setActiveLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(layer)) {
        // Don't allow removing all layers - keep at least one
        if (newSet.size > 1) {
          newSet.delete(layer);
        }
      } else {
        newSet.add(layer);
      }
      return newSet;
    });
  }, []);

  // Persist layer selection
  useEffect(() => {
    localStorage.setItem('nop_topology_layers', JSON.stringify(Array.from(activeLayers)));
  }, [activeLayers]);

  // Discovery subnet (editable) - defaults to scan settings
  const [discoverySubnet, setDiscoverySubnet] = useState<string>(() => {
    return scanSettings.networkRange;
  });

  // IP filter for "all subnets" mode
  const [ipFilter, setIpFilter] = useState<string>('');

  // Port filter - filter connections by port number
  const [portFilter, setPortFilter] = useState<string>(() => {
    const saved = localStorage.getItem('nop_topology_port_filter');
    return saved || '';
  });

  // Link speed filter (Mbps) - filter by minimum throughput
  const [linkSpeedFilter, setLinkSpeedFilter] = useState<number>(() => {
    const saved = localStorage.getItem('nop_topology_linkspeed_filter');
    return saved ? parseInt(saved, 10) : 0;
  });

  // Interface selection for traffic capture
  const [availableInterfaces, setAvailableInterfaces] = useState<NetworkInterface[]>([]);
  const [selectedInterface, setSelectedInterface] = useState<string>(() => {
    const saved = localStorage.getItem('nop_topology_interface');
    return saved || 'eth0';
  });

  // Available subnets discovered from assets
  const [availableSubnets, setAvailableSubnets] = useState<string[]>([]);
  
  // Helper to merge protocols without duplicates
  const mergeProtocols = (proto1: string[], proto2: string[]): string[] => {
    const set = new Set<string>();
    (proto1 || []).forEach(p => set.add(p));
    (proto2 || []).forEach(p => set.add(p));
    return Array.from(set);
  };
  
  // Helper to merge burst capture connections with existing connections
  const mergeConnections = useCallback((existing: any[], burst: any[]) => {
    const merged = new Map<string, any>();
    
    // Add existing connections
    existing.forEach(conn => {
      const key = `${conn.source}-${conn.target}`;
      merged.set(key, { ...conn });
    });
    
    // Merge/update with burst connections (burst has fresher data)
    burst.forEach(conn => {
      const key = `${conn.source}-${conn.target}`;
      const reverseKey = `${conn.target}-${conn.source}`;
      
      if (merged.has(key)) {
        const existingConn = merged.get(key);
        merged.set(key, {
          ...existingConn,
          value: existingConn.value + conn.value,
          last_seen: conn.last_seen || existingConn.last_seen,
          packet_count: (existingConn.packet_count || 0) + (conn.packet_count || 0),
          protocols: mergeProtocols(existingConn.protocols, conn.protocols)
        });
      } else if (merged.has(reverseKey)) {
        // Handle reverse direction
        const existingConn = merged.get(reverseKey);
        merged.set(reverseKey, {
          ...existingConn,
          reverseValue: (existingConn.reverseValue || 0) + conn.value,
          bidirectional: true,
          last_seen: conn.last_seen || existingConn.last_seen,
          protocols: mergeProtocols(existingConn.protocols, conn.protocols)
        });
      } else {
        merged.set(key, { ...conn });
      }
    });
    
    return Array.from(merged.values());
  }, []);

  // Persist filter mode changes
  useEffect(() => {
    localStorage.setItem('nop_topology_filter', filterMode);
  }, [filterMode]);

  // Persist discovery subnet changes to scan settings
  useEffect(() => {
    const newSettings = { ...scanSettings, networkRange: discoverySubnet };
    setScanSettings(newSettings);
    localStorage.setItem('nop_scan_settings', JSON.stringify(newSettings));
  }, [discoverySubnet]);

  // Persist traffic threshold changes
  useEffect(() => {
    localStorage.setItem('nop_topology_threshold', trafficThreshold.toString());
  }, [trafficThreshold]);

  // Persist play state changes
  useEffect(() => {
    localStorage.setItem('nop_topology_playing', isPlaying.toString());
  }, [isPlaying]);

  // Persist auto-refresh changes
  useEffect(() => {
    localStorage.setItem('nop_topology_autorefresh', autoRefresh.toString());
  }, [autoRefresh]);

  // Persist refresh rate changes
  useEffect(() => {
    localStorage.setItem('nop_topology_refreshrate', refreshRate.toString());
  }, [refreshRate]);

  // Persist port filter changes
  useEffect(() => {
    localStorage.setItem('nop_topology_port_filter', portFilter);
  }, [portFilter]);

  // Persist link speed filter changes
  useEffect(() => {
    localStorage.setItem('nop_topology_linkspeed_filter', linkSpeedFilter.toString());
  }, [linkSpeedFilter]);

  // Persist selected interface changes
  useEffect(() => {
    localStorage.setItem('nop_topology_interface', selectedInterface);
  }, [selectedInterface]);

  // Fetch available interfaces on mount
  useEffect(() => {
    const fetchInterfaces = async () => {
      if (!token) return;
      try {
        const interfaces = await trafficService.getInterfaces(token, activeAgent?.id);
        setAvailableInterfaces(interfaces);
        // If saved interface isn't available, select first one
        if (interfaces.length > 0 && !interfaces.some(i => i.name === selectedInterface)) {
          setSelectedInterface(interfaces[0].name);
        }
      } catch (error) {
        console.error('Failed to fetch interfaces:', error);
      }
    };
    fetchInterfaces();
  }, [token, activeAgent]);

  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);

  // Manual resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing && containerRef.current) {
        const containerTop = containerRef.current.getBoundingClientRect().top;
        const newHeight = e.clientY - containerTop;
        if (newHeight >= 300 && newHeight <= window.innerHeight - 100) {
          setGraphHeight(newHeight);
        }
      }
    };

    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        // Persist height to localStorage
        localStorage.setItem('nop_topology_height', graphHeight.toString());
      }
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, graphHeight]);

  const fetchData = useCallback(async (useBurstCapture: boolean = false, runSimulation: boolean = false) => {
    if (!token) return;
    try {
      setLoading(true);
      
      // If requesting simulation, reset the completion flag so simulation will run
      if (runSimulation) {
        simulationCompleteRef.current = false;
      }
      
      // Capture strategy:
      // - Auto-refresh enabled: Short 1s capture to detect new traffic and update colors
      // - Play mode enabled: Slightly longer capture for better animation data
      // - Both disabled: Just read from database (lightweight)
      const shouldCapture = useBurstCapture;
      const captureDuration = isPlaying ? 2 : 1; // Longer capture when animating
      
      let trafficStats;
      
      if (shouldCapture) {
        // Live/auto capture mode
        setCaptureStatus(isPlaying ? 'Live...' : 'Polling...');
        setIsLiveCapturing(true);
        try {
          const burstResult = await trafficService.burstCapture(token, captureDuration, activeAgent?.id, selectedInterface);
          // Merge burst connections with existing stats
          const existingStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
          trafficStats = {
            ...existingStats,
            // Prioritize burst connections for recent traffic
            connections: mergeConnections(existingStats.connections, burstResult.connections),
            current_time: burstResult.current_time
          };
          setCaptureStatus(`${burstResult.connection_count}c`);
        } catch (burstError) {
          console.warn('Burst capture failed, using stats:', burstError);
          trafficStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
          setCaptureStatus('');
        }
        setIsLiveCapturing(false);
      } else {
        // Lightweight stats polling - just reads from database
        trafficStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
        setCaptureStatus('');
      }
      
      // Update current time for recency calculations
      setCurrentTime(trafficStats.current_time || Date.now() / 1000);
      
      const assets = await assetService.getAssets(token, undefined, activeAgent?.id);

      // Extract unique subnets from assets (first 3 octets)
      const subnetsSet = new Set<string>();
      assets.forEach(asset => {
        const parts = asset.ip_address.split('.');
        if (parts.length === 4) {
          const subnet = parts.slice(0, 3).join('.') + '.0/24';
          subnetsSet.add(subnet);
        }
      });
      const detectedSubnets = Array.from(subnetsSet).sort();
      setAvailableSubnets(detectedSubnets);
      
      // Auto-detect discovery subnet if not already set or if it's the default
      if (detectedSubnets.length > 0 && filterMode === 'subnet') {
        // Use first detected subnet that matches online assets, or fallback to first
        const preferredSubnet = detectedSubnets.find(s => 
          assets.some(a => a.status === 'online' && a.ip_address.startsWith(s.split('/')[0].split('.').slice(0, 3).join('.') + '.'))
        ) || detectedSubnets[0];
        if (preferredSubnet !== discoverySubnet) {
          setDiscoverySubnet(preferredSubnet);
        }
      }

      // Process Nodes
      const nodesMap = new Map<string, GraphNode>();
      
      // Determine filtering criteria
      const shouldIncludeNode = (asset: any) => {
        if (filterMode === 'all') {
          // Show all subnets, optionally filter by IP
          if (ipFilter) {
            return asset.ip_address.includes(ipFilter) || 
                   (asset.hostname && asset.hostname.toLowerCase().includes(ipFilter.toLowerCase()));
          }
          return true;
        } else {
          // Subnet mode - filter by discovery subnet (auto-detected)
          const subnetPrefix = discoverySubnet.split('/')[0].split('.').slice(0, 3).join('.') + '.';
          return asset.status === 'online' && asset.ip_address.startsWith(subnetPrefix);
        }
      };

      // Add assets as nodes
      assets.forEach(asset => {
        if (!shouldIncludeNode(asset)) return;
        
        // Check if asset was discovered passively
        const isPassiveDiscovered = asset.discovery_method === 'passive' || 
          passiveServices.some(ps => ps.host === asset.ip_address);
        
        nodesMap.set(asset.ip_address, {
          id: asset.ip_address,
          name: asset.hostname || asset.ip_address,
          val: 1,
          group: isPassiveDiscovered ? 'passive' : (asset.status === 'online' ? 'online' : 'offline'),
          ip: asset.ip_address,
          status: asset.status,
          details: asset
        });
      });

      // Process Links - Aggregate bidirectional connections
      const linksMap = new Map<string, GraphLink>();
      const connections = trafficStats.connections || [];
      
      // Helper to check if a string looks like a valid IP address
      const isValidIP = (str: string): boolean => {
        const parts = str.split('.');
        if (parts.length !== 4) return false;
        return parts.every(p => {
          const num = parseInt(p, 10);
          return !isNaN(num) && num >= 0 && num <= 255;
        });
      };
      
      // Helper to check if IP matches filter criteria
      const matchesFilter = (ip: string): boolean => {
        if (!isValidIP(ip)) return false; // Reject UUIDs and non-IP identifiers
        
        if (filterMode === 'subnet') {
          const subnetPrefix = discoverySubnet.split('/')[0].split('.').slice(0, 3).join('.') + '.';
          return ip.startsWith(subnetPrefix);
        }
        
        // 'all' mode with IP filter
        if (ipFilter) {
          return ip.includes(ipFilter);
        }
        
        return true; // 'all' mode without filter
      };
      
      connections.forEach(conn => {
        // Skip connections with non-IP identifiers (UUIDs, hashes)
        if (!isValidIP(conn.source) || !isValidIP(conn.target)) return;
        
        // Check if at least one endpoint matches our filter
        const sourceMatches = matchesFilter(conn.source);
        const targetMatches = matchesFilter(conn.target);
        
        // In subnet mode, at least one endpoint must be in subnet
        // In all mode with IP filter, at least one endpoint must match
        if (filterMode === 'subnet') {
          if (!sourceMatches && !targetMatches) return;
        } else if (ipFilter) {
          if (!sourceMatches && !targetMatches) return;
        }
        
        // Add nodes if they don't exist (external but valid IPs)
        if (!nodesMap.has(conn.source)) {
          nodesMap.set(conn.source, {
            id: conn.source,
            name: conn.source,
            val: 1,
            group: 'external',
            ip: conn.source,
            status: 'unknown'
          });
        }
        if (!nodesMap.has(conn.target)) {
          nodesMap.set(conn.target, {
            id: conn.target,
            name: conn.target,
            val: 1,
            group: 'external',
            ip: conn.target,
            status: 'unknown'
          });
        }
        
        // Create bidirectional link keys (always use alphabetically sorted order)
        const [node1, node2] = conn.source < conn.target 
          ? [conn.source, conn.target] 
          : [conn.target, conn.source];
        const linkKey = `${node1}<->${node2}`;
        
        if (linksMap.has(linkKey)) {
          // Update existing link with reverse traffic
          const existing = linksMap.get(linkKey)!;
          if (existing.source === conn.source) {
            existing.value += conn.value;
          } else {
            existing.reverseValue = (existing.reverseValue || 0) + conn.value;
            existing.bidirectional = true;
          }
          // Merge protocols
          if (conn.protocols) {
            existing.protocols = Array.from(new Set([...(existing.protocols || []), ...conn.protocols]));
          }
          // Update timestamps (keep most recent)
          // Note: backend returns Unix timestamps in seconds, JS Date expects milliseconds
          if (conn.last_seen) {
            const parseTimestamp = (ts: number | string | undefined): number => {
              if (!ts) return 0;
              if (typeof ts === 'string') return new Date(ts).getTime();
              // Unix timestamp in seconds - convert to ms for comparison
              // If already in ms (> year 2001 in seconds), it's actually ms
              return ts > 1000000000000 ? ts : ts * 1000;
            };
            const existingTime = parseTimestamp(existing.last_seen);
            const newTime = parseTimestamp(conn.last_seen);
            if (newTime > existingTime) {
              existing.last_seen = conn.last_seen;
            }
          }
          existing.packet_count = (existing.packet_count || 0) + (conn.packet_count || 0);
        } else {
          // Create new link
          linksMap.set(linkKey, {
            source: node1,
            target: node2,
            value: conn.source === node1 ? conn.value : 0,
            reverseValue: conn.source === node2 ? conn.value : 0,
            bidirectional: false,
            protocols: conn.protocols || [],
            last_seen: conn.last_seen,
            first_seen: conn.first_seen,
            packet_count: conn.packet_count || 0,
            ports: conn.ports || [],
            sourcePort: conn.source_port,
            targetPort: conn.target_port || conn.dest_port
          });
        }
      });
      
      const links = Array.from(linksMap.values()).filter(link => {
        // Filter by traffic threshold
        const totalTraffic = link.value + (link.reverseValue || 0);
        if (totalTraffic < trafficThreshold) return false;
        
        // Filter by port if specified
        if (portFilter) {
          const portNum = parseInt(portFilter, 10);
          if (!isNaN(portNum)) {
            // Check if any of the ports match
            const linkPorts = link.ports || [];
            const hasPort = linkPorts.includes(portNum) ||
              link.sourcePort === portNum ||
              link.targetPort === portNum;
            if (!hasPort) return false;
          }
        }
        
        // Filter by link speed (Mbps) - calculate bytes per second
        if (linkSpeedFilter > 0) {
          // Estimate throughput based on first_seen and last_seen
          const parseTime = (ts: number | string | undefined): number => {
            if (!ts) return 0;
            if (typeof ts === 'string') return new Date(ts).getTime() / 1000;
            return ts > 1000000000000 ? ts / 1000 : ts;
          };
          const firstTime = parseTime(link.first_seen);
          const lastTime = parseTime(link.last_seen);
          const duration = lastTime - firstTime;
          
          if (duration > 0) {
            // Calculate Mbps (totalTraffic is in bytes)
            const mbps = (totalTraffic * 8) / (duration * 1000000);
            link.bytesPerSecond = totalTraffic / duration;
            if (mbps < linkSpeedFilter) return false;
          } else if (linkSpeedFilter > 0) {
            // No duration data, can't calculate speed - filter out if speed filter is set
            return false;
          }
        }
        
        return true;
      });

      // Calculate Centrality (Degree)
      const degreeMap = new Map<string, number>();
      links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        degreeMap.set(sourceId, (degreeMap.get(sourceId) || 0) + 1);
        degreeMap.set(targetId, (degreeMap.get(targetId) || 0) + 1);
      });

      // Update node sizes and preserve positions from previous render
      nodesMap.forEach(node => {
        const connectionCount = degreeMap.get(node.id) || 0;
        node.connectionCount = connectionCount;
        // Scale node size based on connections (more connections = bigger node)
        node.val = calculateNodeSize(connectionCount);
        
        // Restore saved position if available
        const savedPos = nodePositionsRef.current.get(node.id);
        if (savedPos) {
          node.x = savedPos.x;
          node.y = savedPos.y;
          // If simulation already completed, also restore fx/fy to keep node locked
          if (simulationCompleteRef.current && savedPos.fx !== undefined) {
            node.fx = savedPos.fx;
            node.fy = savedPos.fy;
          }
        }
      });
      
      // Mark initial load complete (simulation tracking is separate)
      if (isInitialLoadRef.current && nodesMap.size > 0) {
        isInitialLoadRef.current = false;
      }

      setGraphData({
        nodes: Array.from(nodesMap.values()),
        links: links
      });
    } catch (err) {
      console.error("Failed to fetch topology data", err);
    } finally {
      setLoading(false);
    }
  }, [token, filterMode, discoverySubnet, ipFilter, portFilter, linkSpeedFilter, activeAgent, isPlaying, refreshRate, mergeConnections, trafficThreshold, selectedInterface]);

  useEffect(() => {
    // Initial load - run simulation
    fetchData(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Re-fetch when filters change - run new simulation since graph structure changes
  useEffect(() => {
    // Skip initial render (handled by mount effect above)
    if (!graphData.nodes.length) return;
    
    // Reset simulation flag so new layout is computed
    simulationCompleteRef.current = false;
    nodePositionsRef.current.clear();
    
    fetchData(false, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterMode, discoverySubnet, ipFilter, portFilter, linkSpeedFilter, trafficThreshold]);
  
  useEffect(() => {
    // Auto-refresh interval - separate from initial load
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      // Auto-refresh: poll for updates, NO simulation (just update data/colors)
      // When isPlaying is on, this will trigger burst capture for live traffic
      // When isPlaying is off, this will do lightweight DB polling
      interval = setInterval(() => fetchData(true, false), refreshRate);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshRate, isPlaying, fetchData]); // Include fetchData to pick up filter changes

  // Fetch enhanced host info for hover details (OS, hostname, service versions)
  useEffect(() => {
    if (!token || !passiveScanEnabled) return;
    
    const fetchEnhancedInfo = async () => {
      try {
        const response = await fetch('/api/v1/scans/passive-scan/enhanced-hosts', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          const infoMap: Record<string, any> = {};
          data.hosts?.forEach((host: any) => {
            if (host.ip_address) {
              infoMap[host.ip_address] = host;
            }
          });
          setEnhancedHostInfo(infoMap);
        }
      } catch (err) {
        console.debug('Enhanced host info not available:', err);
      }
    };
    
    fetchEnhancedInfo();
    // Refresh every 10 seconds
    const interval = setInterval(fetchEnhancedInfo, 10000);
    return () => clearInterval(interval);
  }, [token, passiveScanEnabled]);

  // Apply force settings when graph is ready - runs once after first data load
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    
    // Apply strong repulsion forces for better node spacing
    // Always in force mode since layout buttons were removed
    if (!simulationCompleteRef.current) {
      const fg = fgRef.current;
      
      // Strong collision force to prevent node overlaps
      // Radius scales with node count - more nodes = more spacing needed
      const nodeCount = graphData.nodes.length;
      const baseCollisionRadius = nodeCount > 50 ? 30 : nodeCount > 20 ? 50 : 70;
      const collisionForce = forceCollide((node: any) => {
        const sizeBonus = (node.val || 4) * 2;
        return baseCollisionRadius + sizeBonus;
      }).iterations(3); // Multiple iterations for stronger collision resolution
      fg.d3Force('collision', collisionForce);
      
      // Adjust forces based on node count
      const chargeStrength = nodeCount > 50 ? -500 : nodeCount > 20 ? -1500 : -3000;
      const baseLinkDistance = nodeCount > 50 ? 100 : nodeCount > 20 ? 200 : 400;
      
      fg.d3Force('charge')?.strength(chargeStrength).distanceMax(1500);
      
      // Calculate max traffic for normalization
      let maxTraffic = 0;
      graphData.links.forEach((link: any) => {
        const totalTraffic = (link.value || 0) + (link.reverseValue || 0);
        if (totalTraffic > maxTraffic) maxTraffic = totalTraffic;
      });
      
      // Configure link distance based on traffic - higher traffic = closer (shorter distance)
      // This creates an "orbital" effect where high-throughput connections pull nodes closer
      fg.d3Force('link')?.distance((link: any) => {
        const totalTraffic = (link.value || 0) + (link.reverseValue || 0);
        
        if (maxTraffic === 0 || totalTraffic === 0) {
          // No traffic data - use max distance (outer orbit)
          return baseLinkDistance * 1.5;
        }
        
        // Normalize traffic to 0-1 range using logarithmic scale for better distribution
        // Log scale prevents a few high-traffic links from dominating
        const logTraffic = Math.log10(totalTraffic + 1);
        const logMax = Math.log10(maxTraffic + 1);
        const normalizedTraffic = logTraffic / logMax; // 0 to 1
        
        // Invert: high traffic = low distance (close to center)
        // Range: minDistance (closest) to baseLinkDistance * 1.5 (farthest)
        const minDistance = baseLinkDistance * 0.3; // Closest orbit
        const maxDistance = baseLinkDistance * 1.5; // Farthest orbit
        
        // Higher normalized traffic = shorter distance (closer to center)
        const distance = maxDistance - (normalizedTraffic * (maxDistance - minDistance));
        
        return distance;
      }).strength(0.15); // Slightly stronger link force to enforce distance
      
      fg.d3Force('center')?.strength(0.005);
      
      // Reheat simulation with new forces
      fg.d3ReheatSimulation();
    }
  }, [graphData.nodes.length, graphData.links]);

  // Handle Layout - force-directed mode with traffic-aware distances
  // This preserves user's zoom/pan position during auto-refresh
  useEffect(() => {
    if (!fgRef.current) return;

    // Force Directed layout with spread settings
    fgRef.current.d3Force('charge')?.strength(-800).distanceMax(400);
    fgRef.current.d3Force('link')?.distance(180);
    fgRef.current.d3Force('center')?.strength(0.05);
  }, [dimensions]);

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Compact toolbar - wraps on smaller screens */}
      <div className="flex flex-wrap gap-2 items-center bg-cyber-darker p-2 border border-cyber-gray">
        <CyberPageTitle color="red">Network Topology</CyberPageTitle>

        {/* Filter mode buttons */}
        <div className="flex bg-cyber-dark rounded border border-cyber-gray">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-2 py-1 text-xs font-bold uppercase ${filterMode === 'all' ? 'bg-cyber-green text-black' : 'text-cyber-gray-light hover:text-white'}`}
            title="Show all subnets"
          >
            All
          </button>
          <button
            onClick={() => setFilterMode('subnet')}
            className={`px-2 py-1 text-xs font-bold uppercase ${filterMode === 'subnet' ? 'bg-cyber-green text-black' : 'text-cyber-gray-light hover:text-white'}`}
            title="Discovery subnet only"
          >
            Subnet
          </button>
        </div>

        {/* OSI Layer Toggle Buttons */}
        <div className="flex bg-cyber-dark rounded border border-cyber-blue">
          <span className="px-2 py-1 text-xs text-cyber-blue font-bold border-r border-cyber-gray">OSI</span>
          <button
            onClick={() => toggleLayer('L2')}
            className={`px-2 py-1 text-xs font-bold ${activeLayers.has('L2') ? 'bg-cyber-purple text-white' : 'text-cyber-gray-light hover:text-white hover:bg-cyber-dark'}`}
            title="L2 Data Link Layer (MAC/Ethernet)"
          >
            L2
          </button>
          <button
            onClick={() => toggleLayer('L4')}
            className={`px-2 py-1 text-xs font-bold ${activeLayers.has('L4') ? 'bg-cyber-green text-black' : 'text-cyber-gray-light hover:text-white hover:bg-cyber-dark'}`}
            title="L4 Transport Layer (TCP/UDP/ICMP)"
          >
            L4
          </button>
          <button
            onClick={() => toggleLayer('L5')}
            className={`px-2 py-1 text-xs font-bold ${activeLayers.has('L5') ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white hover:bg-cyber-dark'}`}
            title="L5 Session Layer (NetBIOS/RPC)"
          >
            L5
          </button>
          <button
            onClick={() => toggleLayer('L7')}
            className={`px-2 py-1 text-xs font-bold ${activeLayers.has('L7') ? 'bg-cyber-red text-white' : 'text-cyber-gray-light hover:text-white hover:bg-cyber-dark'}`}
            title="L7 Application Layer (HTTP/SSH/DNS - DPI detected)"
          >
            L7
          </button>
        </div>

        {/* Interface Selector */}
        <div className="flex items-center space-x-1 bg-cyber-dark px-2 py-1 rounded border border-cyber-purple">
          <label className="text-xs text-cyber-purple font-bold">IF:</label>
          <select
            value={selectedInterface}
            onChange={(e) => setSelectedInterface(e.target.value)}
            className="bg-cyber-darker text-cyber-gray-light text-xs px-1 py-0.5 border border-cyber-gray rounded focus:outline-none focus:border-cyber-purple"
            title="Select network interface for traffic capture"
          >
            {availableInterfaces.length > 0 ? (
              availableInterfaces.map(iface => (
                <option key={iface.name} value={iface.name}>
                  {iface.name} {iface.ip ? `(${iface.ip})` : ''}
                </option>
              ))
            ) : (
              <option value={selectedInterface}>{selectedInterface}</option>
            )}
          </select>
        </div>

        {/* IP Filter for All Subnets mode */}
        {filterMode === 'all' && (
          <div className="flex items-center space-x-1 bg-cyber-dark px-2 py-1 rounded border border-cyber-blue">
              <label className="text-xs text-cyber-blue font-bold">IP:</label>
              <input
                type="text"
                value={ipFilter}
                onChange={(e) => setIpFilter(e.target.value)}
                placeholder="Filter..."
                className="bg-cyber-darker text-cyber-gray-light text-xs px-1 py-0.5 border border-cyber-gray rounded focus:outline-none focus:border-cyber-blue w-24 font-mono"
                title="Filter nodes by IP address or hostname"
              />
              {ipFilter && (
                <button
                  onClick={() => setIpFilter('')}
                  className="text-xs text-cyber-red hover:text-cyber-gray-light transition-colors"
                  title="Clear filter"
                >
                  ✕
                </button>
              )}
            </div>
          )}

        {/* Auto-detected subnet display for Discovery Subnet mode */}
        {filterMode === 'subnet' && (
          <div className="flex items-center space-x-1 bg-cyber-dark px-2 py-1 rounded border border-cyber-green">
            <label className="text-xs text-cyber-green font-bold">Net:</label>
            {availableSubnets.length > 1 ? (
              <select
                value={discoverySubnet}
                onChange={(e) => setDiscoverySubnet(e.target.value)}
                className="bg-cyber-darker text-cyber-gray-light text-xs px-1 py-0.5 border border-cyber-gray rounded focus:outline-none focus:border-cyber-green"
                title="Select from detected subnets"
              >
                {availableSubnets.map(subnet => (
                  <option key={subnet} value={subnet}>{subnet}</option>
                ))}
              </select>
            ) : (
              <span className="text-cyber-gray-light text-xs font-mono">
                {discoverySubnet || 'Detecting...'}
              </span>
            )}
          </div>
        )}

        {/* Traffic Threshold */}
        <select 
          value={trafficThreshold}
          onChange={(e) => setTrafficThreshold(Number(e.target.value))}
          className="bg-cyber-dark text-cyber-gray-light text-xs px-2 py-1 border border-cyber-gray rounded"
          title="Min traffic threshold"
        >
          <option value={0}>All</option>
          <option value={1024}>1K</option>
          <option value={102400}>100K</option>
          <option value={1048576}>1M</option>
        </select>

        {/* Port Filter */}
        <div className="flex items-center space-x-1 bg-cyber-dark px-2 py-1 rounded border border-cyber-purple">
          <label className="text-xs text-cyber-purple font-bold">Port:</label>
          <input
            type="text"
            value={portFilter}
            onChange={(e) => setPortFilter(e.target.value.replace(/[^0-9]/g, ''))}
            placeholder="Any"
            className="bg-cyber-darker text-cyber-gray-light text-xs px-1 py-0.5 border border-cyber-gray rounded focus:outline-none focus:border-cyber-purple w-14 font-mono"
            title="Filter connections by port number"
          />
          {portFilter && (
            <button
              onClick={() => setPortFilter('')}
              className="text-xs text-cyber-red hover:text-cyber-gray-light transition-colors"
              title="Clear port filter"
            >
              ✕
            </button>
          )}
        </div>

        {/* Link Speed Filter (Mbps) */}
        <select 
          value={linkSpeedFilter}
          onChange={(e) => setLinkSpeedFilter(Number(e.target.value))}
          className="bg-cyber-dark text-cyber-gray-light text-xs px-2 py-1 border border-cyber-gray rounded"
          title="Min link speed (Mbps)"
        >
          <option value={0}>Speed</option>
          <option value={0.1}>0.1M</option>
          <option value={1}>1M</option>
          <option value={10}>10M</option>
          <option value={100}>100M</option>
          <option value={1000}>1G</option>
        </select>

        {/* Refresh Rate Selector */}
        <select 
          value={refreshRate}
          onChange={(e) => setRefreshRate(Number(e.target.value))}
          className="bg-cyber-dark text-cyber-gray-light text-xs px-2 py-1 border border-cyber-gray rounded"
          disabled={!autoRefresh}
          title="Refresh interval"
        >
          <option value={1000}>1s</option>
          <option value={5000}>5s</option>
          <option value={10000}>10s</option>
          <option value={30000}>30s</option>
        </select>

        {/* Auto-refresh Toggle */}
        <button 
          onClick={() => setAutoRefresh(!autoRefresh)}
          className={`px-2 py-1 border text-xs rounded ${autoRefresh ? 'border-cyber-blue text-cyber-blue' : 'border-cyber-gray text-cyber-gray-light'}`}
          title="Toggle automatic data refresh"
        >
          {autoRefresh ? '●AUTO' : '○MAN'}
        </button>

        {/* Play Flow - Animation Only */}
        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className={`px-2 py-1 border text-xs rounded ${isPlaying ? 'border-cyber-green text-cyber-green' : 'border-cyber-gray text-cyber-gray-light'}`}
          title="Toggle traffic flow animation"
        >
          {isPlaying ? '⏸' : '▶'}
        </button>

        <button onClick={() => fetchData(false, true)} className="btn-cyber px-2 py-1 text-xs">↻</button>
        
        {/* Center on hub button */}
        <button 
          onClick={centerOnHub}
          className="px-2 py-1 border text-xs rounded border-cyber-gray text-cyber-gray-light hover:border-cyber-purple hover:text-cyber-purple transition-colors"
          title="Center on main traffic hub"
        >
          ⊕
        </button>
        
        {/* Fullscreen toggle */}
        <button 
          onClick={toggleFullscreen}
          className="px-2 py-1 border text-xs rounded border-cyber-gray text-cyber-gray-light hover:border-cyber-blue hover:text-cyber-blue transition-colors"
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          )}
        </button>
        
        {/* Live capture status indicator */}
        {isLiveCapturing && (
          <span className="text-xs text-cyber-red animate-pulse">●REC</span>
        )}
        
        {/* Node/Link counts - pushed to end */}
        <div className="flex items-center gap-2 text-xs text-cyber-gray-light ml-auto">
          <span><span className="font-bold text-cyber-blue">{graphData.nodes.length}</span>N</span>
          <span><span className="font-bold text-cyber-green">{graphData.links.length}</span>L</span>
        </div>
      </div>

      <div 
        ref={containerRef} 
        className="bg-cyber-darker border border-cyber-gray relative overflow-hidden"
        style={{ height: isFullscreen ? '100vh' : `${graphHeight}px` }}
      >
        {/* Fullscreen close button - shown when in browser fullscreen */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-50 px-4 py-2 bg-cyber-dark border-2 border-cyber-red text-cyber-red hover:bg-cyber-red hover:text-black transition-colors text-sm font-bold uppercase shadow-lg"
          >
            ✕ ESC to Exit
          </button>
        )}
        {loading && graphData.nodes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
            <div className="text-cyber-blue animate-pulse">Loading Topology...</div>
          </div>
        )}
        
        <ForceGraph2D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          cooldownTicks={simulationCompleteRef.current ? 0 : 200}
          cooldownTime={simulationCompleteRef.current ? 0 : 10000}
          warmupTicks={simulationCompleteRef.current ? 0 : 100}
          onEngineTick={() => {
            // Save node positions on every tick during simulation
            if (fgRef.current && graphData.nodes.length > 0) {
              graphData.nodes.forEach((node: any) => {
                if (node.x !== undefined && node.y !== undefined) {
                  nodePositionsRef.current.set(node.id, {
                    x: node.x,
                    y: node.y,
                    fx: node.fx,
                    fy: node.fy
                  });
                }
              });
            }
          }}
          onEngineStop={() => {
            // Simulation finished - lock all positions with fx/fy
            if (fgRef.current && graphData.nodes.length > 0) {
              graphData.nodes.forEach((node: any) => {
                if (node.x !== undefined && node.y !== undefined) {
                  // Lock position with fx/fy
                  node.fx = node.x;
                  node.fy = node.y;
                  // Save locked position
                  nodePositionsRef.current.set(node.id, {
                    x: node.x,
                    y: node.y,
                    fx: node.x,
                    fy: node.y
                  });
                }
              });
              // Mark simulation as complete - future data updates won't re-simulate
              simulationCompleteRef.current = true;
              
              // Only center on first load, not on every engine stop
              if (!hasInitialCenteringRef.current) {
                hasInitialCenteringRef.current = true;
                
                // Check if we have saved canvas position to restore
                const saved = localStorage.getItem('nop_topology_canvas_position');
                if (saved) {
                  try {
                    const pos = JSON.parse(saved);
                    if (pos.x !== undefined && pos.y !== undefined) {
                      fgRef.current.centerAt(pos.x, pos.y, 300);
                      if (pos.zoom) {
                        fgRef.current.zoom(pos.zoom, 300);
                      }
                      return; // Use saved position instead of auto-centering
                    }
                  } catch (e) {
                    console.error('Failed to restore canvas position:', e);
                  }
                }
                
                // No saved position - center on the node with most connections (largest cluster hub)
                centerOnHub();
              }
            }
          }}
          
          nodeLabel="name"
          nodeColor={node => {
            if (node.group === 'passive') return '#8b5cf6'; // Cyber Purple for passive
            if (node.group === 'online') return '#00ff41'; // Cyber Green
            if (node.group === 'offline') return '#ff0040'; // Cyber Red
            return '#8b5cf6'; // Cyber Purple (External/Unknown)
          }}
          nodeRelSize={6}
          linkColor={(link: any) => {
            // Check if link matches active layers
            const layerMatch = linkMatchesActiveLayers(link, activeLayers);
            if (!layerMatch.matches) {
              // Link doesn't match any active layer - dim it significantly
              return '#33333320'; // Nearly invisible gray
            }
            
            // Color based on protocol type (EtherApe-style)
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return '#00f0ff20'; // Very dim blue for no traffic
            
            // Use layer-based coloring when multiple layers are active
            // Otherwise use protocol-specific coloring
            let baseColor: string;
            if (activeLayers.size > 1) {
              // Multi-layer mode: color by layer to distinguish
              baseColor = getLayerColor(layerMatch.matchedLayer);
            } else {
              // Single layer mode: use protocol coloring for more detail
              const detectedProto = link.detected_protocols?.[0] || undefined;
              baseColor = getProtocolColor(link.protocols, detectedProto);
            }
            
            // Fallback to bidirectional coloring if no protocol info
            const finalColor = (baseColor === '#00f0ff' && link.bidirectional) 
              ? '#00ff41'  // Cyber green for bidirectional
              : baseColor;
            
            // Apply opacity based on recency (recent traffic = brighter)
            const opacity = calculateLinkOpacity(link.last_seen, currentTime, refreshRate, link.packet_count);
            return applyOpacity(finalColor, opacity);
          }}
          linkWidth={(link: any) => {
            // Width based on total traffic volume (10% increments, max 100% thicker)
            const baseWidth = 1.5; // Base link width
            return getLinkWidth(link, baseWidth);
          }}
          linkDirectionalParticles={isPlaying ? (link: any) => {
            // Particle count based on recent packet activity, not historical total
            const packetCount = link.packet_count || 0;
            const totalTraffic = link.value + (link.reverseValue || 0);
            
            // If no packets captured recently, show minimal or no particles
            if (packetCount === 0) {
              // Historical connection with no recent activity - very few particles
              return totalTraffic > 0 ? 1 : 0;
            }
            
            // Scale particles by recent packet count (more packets = more particles)
            // Log scale: 1-10 packets = 2-3, 10-100 = 3-5, 100+ = 5-8
            return Math.max(2, Math.min(8, 2 + Math.log10(packetCount + 1) * 3));
          } : 0}
          linkDirectionalParticleSpeed={(link: any) => {
            // Speed based on recent packet activity - active connections = faster particles
            const packetCount = link.packet_count || 0;
            const totalTraffic = link.value + (link.reverseValue || 0);
            
            // Base speed for historical connections
            if (packetCount === 0) {
              return 0.002; // Slow for inactive connections
            }
            
            // Faster for active connections (scaled by traffic volume)
            const baseSpeed = 0.003;
            const speedBonus = Math.min(0.007, totalTraffic * 0.0000001 + packetCount * 0.0001);
            return baseSpeed + speedBonus;
          }}
          linkDirectionalParticleWidth={(link: any) => {
            // Particle size based on recent activity
            const packetCount = link.packet_count || 0;
            const totalTraffic = link.value + (link.reverseValue || 0);
            
            // Larger particles for more active connections
            if (packetCount === 0) {
              return 1; // Small for inactive
            }
            
            return Math.max(1.5, Math.min(5, 1.5 + Math.log10(packetCount + 1) * 1.5));
          }}
          linkDirectionalParticleColor={(link: any) => {
            // Particle color based on link type
            if (link.bidirectional) return '#00ff41'; // Green particles
            return '#ffffff'; // White particles
          }}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            // Custom link rendering with curved lines to reduce overlapping
            const start = link.source;
            const end = link.target;
            
            if (typeof start !== 'object' || typeof end !== 'object') return;
            
            // Check if link matches active layers - skip rendering if not
            const layerMatch = linkMatchesActiveLayers(link, activeLayers);
            if (!layerMatch.matches) return; // Don't render links outside active layers
            
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return; // Early return for zero traffic
            
            // Check if this link is part of the highlighted asset's connections (click - green)
            const sourceId = start.id;
            const targetId = end.id;
            const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
            const linkKey = `${node1}<->${node2}`;
            const isHighlightedLink = highlightedLinks.has(linkKey);
            
            // Check if this link is directly hovered OR connected to hovered node
            // Direct comparison for hovered link (more reliable than Set lookup)
            let isHoverHighlightedLink = hoverHighlightedLinks.has(linkKey);
            
            // Also check direct hover on this specific link
            if (hoveredLink) {
              const hoveredSourceId = typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source;
              const hoveredTargetId = typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target;
              if ((hoveredSourceId === sourceId && hoveredTargetId === targetId) ||
                  (hoveredSourceId === targetId && hoveredTargetId === sourceId)) {
                isHoverHighlightedLink = true;
              }
            }
            
            // Determine if ANY highlight is active (click OR hover)
            const isAnyHighlightActive = highlightedAsset || clickedLink || hoveredNode || hoveredLink;
            // Dim links that are NOT part of click selection AND NOT part of hover
            const isDimmedLink = isAnyHighlightActive && !isHighlightedLink && !isHoverHighlightedLink;
            
            // Check if this link is selected
            const isSelected = selectedLink && 
              ((typeof selectedLink.source === 'object' ? selectedLink.source.id : selectedLink.source) === start.id) &&
              ((typeof selectedLink.target === 'object' ? selectedLink.target.id : selectedLink.target) === end.id);
            
            // Check if this link is hovered (now handled via isHoverHighlightedLink)
            const isHovered = hoveredLink && 
              ((typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source) === start.id) &&
              ((typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target) === end.id);
            
            // Calculate curvature based on node IDs for consistent curves
            const curvature = calculateLinkCurvature(start.id, end.id);
            
            // Calculate link width using dynamic sizing based on throughput (10% increments, max 100% thicker)
            const baseWidth = getLinkWidth(link, 1.5);
            // Scale with zoom - thinner when zoomed out, thicker when zoomed in
            const zoomScale = Math.max(0.3, Math.min(1.5, globalScale));
            // Highlight multiplier scales proportionally to maintain relative thickness
            const highlightWidthMultiplier = isHighlightedLink ? 2.0 : (isHoverHighlightedLink ? 1.8 : (isSelected ? 1.6 : 1));
            const width = baseWidth * highlightWidthMultiplier * zoomScale;
            
            // Use layer-based coloring when multiple layers active, otherwise protocol coloring
            let baseColor: string;
            if (activeLayers.size > 1) {
              // Multi-layer mode: color by layer to distinguish
              baseColor = getLayerColor(layerMatch.matchedLayer);
            } else {
              // Single layer mode: use protocol coloring for more detail
              const detectedProtocolForColor = link.detected_protocols?.[0] || undefined;
              baseColor = getProtocolColor(link.protocols, detectedProtocolForColor) || (link.bidirectional ? '#00ff41' : '#00f0ff');
            }
            
            // Apply opacity based on recency and traffic activity - more visible fading
            // But keep highlighted links bright
            let opacity = calculateLinkOpacity(link.last_seen, currentTime, refreshRate, link.packet_count);
            if (isHighlightedLink || isHoverHighlightedLink) {
              opacity = 1.0; // Full brightness for highlighted links
            } else if (isDimmedLink) {
              opacity = 0.1; // Very dim for non-connected links
            }
            const color = applyOpacity(baseColor, opacity);
            
            // Calculate control point for curve - match library's internal calculation
            // The library uses: ctrl = midpoint + perpendicular * curvature * linkLength
            // Library perpendicular convention: (dy, -dx) not (-dy, dx)
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const linkLength = Math.sqrt(dx * dx + dy * dy);
            if (linkLength === 0) return;
            
            // Perpendicular unit vector - match library's convention (dy, -dx)
            const perpX = dy / linkLength;
            const perpY = -dx / linkLength;
            
            // Control point offset: curvature * linkLength along perpendicular
            const offset = curvature * linkLength;
            const ctrlX = (start.x + end.x) / 2 + perpX * offset;
            const ctrlY = (start.y + end.y) / 2 + perpY * offset;
            
            // Draw hover-highlighted link glow - cyan for hover (works even when something is selected)
            // Show cyan glow for hover-highlighted links that are NOT part of green selection
            if (isHoverHighlightedLink && !isHighlightedLink) {
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y);
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = width + 4;
              ctx.shadowBlur = 18;
              ctx.shadowColor = '#00f0ff';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw highlighted link glow - bright green (for clicked/persistent selection)
            // Green selection takes precedence and stays visible
            if (isHighlightedLink) {
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y);
              ctx.strokeStyle = '#00ff41';
              ctx.lineWidth = width + 6;
              ctx.shadowBlur = 25;
              ctx.shadowColor = '#00ff41';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw selection glow first (behind the curve) - green glow to match asset highlighting
            if (isSelected) {
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y);
              ctx.strokeStyle = '#00ff41';
              ctx.lineWidth = width + 4;
              ctx.shadowBlur = 20;
              ctx.shadowColor = '#00ff41';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw the curved link line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            if (isSelected || isHighlightedLink || isHoverHighlightedLink) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = color;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Draw port and protocol labels on highlighted links (both click and hover)
            if ((isHighlightedLink || isHoverHighlightedLink) && globalScale > 0.5) {
              // Calculate curve midpoint for label placement
              const curveMidX = 0.25 * start.x + 0.5 * ctrlX + 0.25 * end.x;
              const curveMidY = 0.25 * start.y + 0.5 * ctrlY + 0.25 * end.y;
              
              // Build label text: prefer service_label (from DPI) > detected_protocols > protocols
              let labelProtocol: string;
              if (link.service_label) {
                labelProtocol = link.service_label;  // e.g., "HTTP:80"
              } else if (link.detected_protocols && link.detected_protocols.length > 0) {
                const port = link.targetPort || (link.ports?.length ? link.ports[0] : '');
                labelProtocol = `${link.detected_protocols[0]}${port ? ':' + port : ''}`;
              } else {
                const protocols = link.protocols?.join('/') || 'IP';
                const portInfo = link.targetPort ? `:${link.targetPort}` : (link.ports?.length ? `:${link.ports[0]}` : '');
                labelProtocol = `${protocols}${portInfo}`;
              }
              
              const trafficMB = formatTrafficMB(totalTraffic);
              const encryptedIcon = link.is_encrypted ? '🔒' : '';
              
              // Draw label background
              const labelFontSize = Math.max(8, 10 / globalScale);
              ctx.font = `bold ${labelFontSize}px Monospace`;
              const labelText = `${encryptedIcon}${labelProtocol} ${trafficMB}MB`;
              const labelWidth = ctx.measureText(labelText).width + 8;
              const labelHeight = labelFontSize + 4;
              
              const labelColor = isHighlightedLink ? '#00ff41' : '#00f0ff';
              
              ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
              ctx.fillRect(curveMidX - labelWidth / 2, curveMidY - labelHeight / 2, labelWidth, labelHeight);
              ctx.strokeStyle = labelColor;
              ctx.lineWidth = 1;
              ctx.strokeRect(curveMidX - labelWidth / 2, curveMidY - labelHeight / 2, labelWidth, labelHeight);
              
              // Draw label text
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = labelColor;
              ctx.fillText(labelText, curveMidX, curveMidY);
            }
            
            // Draw directional indicators for bidirectional links at curve midpoint
            if (link.bidirectional && globalScale > 1.5 && !isHighlightedLink) {
              if (linkLength > 0) {
                const arrowSize = 8 / globalScale;
                // Midpoint of quadratic bezier at t=0.5
                const curveMidX = 0.25 * start.x + 0.5 * ctrlX + 0.25 * end.x;
                const curveMidY = 0.25 * start.y + 0.5 * ctrlY + 0.25 * end.y;
                
                // Draw small double-headed arrow indicator at curve midpoint
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(curveMidX, curveMidY, arrowSize / 2, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }}
          backgroundColor="#050505"
          linkCurvature={(link: any) => {
            // Add curvature to links to reduce overlapping
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            return calculateLinkCurvature(sourceId, targetId);
          }}
          linkPointerAreaPaint={(link: any, color, ctx) => {
            // Custom hit area for curved links - draw a thick invisible curve for click detection
            const start = link.source;
            const end = link.target;
            
            if (typeof start !== 'object' || typeof end !== 'object') return;
            
            const sourceId = start.id;
            const targetId = end.id;
            const curvature = calculateLinkCurvature(sourceId, targetId);
            
            // Calculate control point matching our curve drawing
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            const linkLength = Math.sqrt(dx * dx + dy * dy);
            if (linkLength === 0) return;
            
            // Perpendicular unit vector - match library's convention (dy, -dx)
            const perpX = dy / linkLength;
            const perpY = -dx / linkLength;
            const offset = curvature * linkLength;
            const ctrlX = (start.x + end.x) / 2 + perpX * offset;
            const ctrlY = (start.y + end.y) / 2 + perpY * offset;
            
            // Draw thick curved hit area
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.quadraticCurveTo(ctrlX, ctrlY, end.x, end.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = 10; // Wide hit area for easier clicking
            ctx.stroke();
          }}
          d3VelocityDecay={0.3}
          onNodeClick={(node: any, event: MouseEvent) => {
            // Toggle asset highlighting on click
            if (highlightedAsset === node.id) {
              // If already highlighted, show context menu
              setSelectedNode(node);
              setSelectedLink(null);
              setContextMenuPosition({ x: event.clientX, y: event.clientY });
            } else {
              // First click - highlight this asset and its connections (green)
              setHighlightedAsset(node.id);
              setClickedLink(null); // Clear link highlight when selecting node
              setSelectedNode(null);
              setSelectedLink(null);
              setContextMenuPosition(null);
            }
          }}
          onBackgroundClick={() => {
            // Clear all highlighting when clicking on empty space
            setHighlightedAsset(null);
            setClickedLink(null);
            setSelectedNode(null);
            setSelectedLink(null);
            setContextMenuPosition(null);
          }}
          onZoomEnd={() => {
            // Save canvas position when user finishes zooming/panning
            if (fgRef.current) {
              const zoom = fgRef.current.zoom?.() || 1;
              const center = fgRef.current.centerAt?.() || { x: 0, y: 0 };
              localStorage.setItem('nop_topology_canvas_position', JSON.stringify({
                x: center.x || 0,
                y: center.y || 0,
                zoom: zoom
              }));
            }
          }}
          onLinkClick={(link: any, event: MouseEvent) => {
            // Get link key for comparison
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            const [node1, node2] = sourceId < targetId ? [sourceId, targetId] : [targetId, sourceId];
            const linkKey = `${node1}<->${node2}`;
            
            // Check if this link is already clicked
            const isAlreadyClicked = clickedLink && (() => {
              const clickedSourceId = typeof clickedLink.source === 'object' ? clickedLink.source.id : clickedLink.source;
              const clickedTargetId = typeof clickedLink.target === 'object' ? clickedLink.target.id : clickedLink.target;
              const [n1, n2] = clickedSourceId < clickedTargetId ? [clickedSourceId, clickedTargetId] : [clickedTargetId, clickedSourceId];
              return `${n1}<->${n2}` === linkKey;
            })();
            
            if (isAlreadyClicked) {
              // If already highlighted, show context menu
              setSelectedLink(link);
              setSelectedNode(null);
              setContextMenuPosition({ x: event.clientX, y: event.clientY });
            } else {
              // First click - highlight this link and its endpoints (green)
              setClickedLink(link);
              setHighlightedAsset(null); // Clear asset highlight when selecting link
              setSelectedNode(null);
              setSelectedLink(null);
              setContextMenuPosition(null);
            }
          }}
          onNodeHover={(node: any) => {
            document.body.style.cursor = node ? 'pointer' : 'default';
            setHoveredNode(node || null);
          }}
          onLinkHover={(link: any) => {
            setHoveredLink(link || null);
            document.body.style.cursor = link ? 'pointer' : 'default';
          }}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            const label = node.name;
            // Scale font with zoom AND node count - smaller when many nodes or zoomed out
            const nodeCount = graphData.nodes.length;
            const baseFontSize = nodeCount > 50 ? 8 : nodeCount > 20 ? 10 : 12;
            const fontSize = Math.max(6, baseFontSize * Math.min(1, globalScale * 0.8));
            ctx.font = `${fontSize}px Sans-Serif`;
            
            const isSelected = selectedNode && selectedNode.id === node.id;
            const isHovered = hoveredNode && hoveredNode.id === node.id;
            const isHighlightedAsset = highlightedAsset === node.id;
            const isConnectedToHighlight = highlightedNodes.has(node.id);
            const isHoverHighlighted = hoveredNode?.id === node.id;
            
            // Check if connected to hover - also check direct link hover
            let isConnectedToHover = hoverHighlightedNodes.has(node.id);
            
            // Also check if this node is an endpoint of the hovered link
            if (hoveredLink) {
              const hoveredSourceId = typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source;
              const hoveredTargetId = typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target;
              if (node.id === hoveredSourceId || node.id === hoveredTargetId) {
                isConnectedToHover = true;
              }
            }
            
            const isHighlighted = isSelected || isHovered || isHighlightedAsset || isConnectedToHighlight || isHoverHighlighted || isConnectedToHover;
            const nodeColor = node.group === 'passive' ? '#8b5cf6' : (node.group === 'online' ? '#00ff41' : (node.group === 'offline' ? '#ff0040' : '#8b5cf6'));
            
            // Dim nodes that are NOT part of click selection AND NOT part of hover
            const isAnyHighlightActive = highlightedAsset || clickedLink || hoveredNode || hoveredLink;
            const isDimmed = isAnyHighlightActive && !isConnectedToHighlight && !isConnectedToHover;
            
            // Always show labels, but dim them when there are many nodes
            const dimLabels = (nodeCount > 30 && !isHighlighted) || isDimmed;
            
            // OS-based outer halo/glow - draw first so it's behind everything
            const osInfo = enhancedHostInfo[node.ip]?.os_info;
            // Calculate dynamic node size for halo (needs to be computed here too)
            const haloNodeSize = getNodeSize(node.id, 6);
            
            // Calculate node's link intensity based on its connections' recency
            let nodeIntensity = 0.3; // Base intensity for nodes with no recent traffic
            const nodeLinks = graphData.links.filter((link: any) => {
              const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
              const targetId = typeof link.target === 'object' ? link.target.id : link.target;
              return sourceId === node.id || targetId === node.id;
            });
            if (nodeLinks.length > 0) {
              // Get max opacity of connected links (most active link determines node intensity)
              const linkOpacities = nodeLinks.map((link: any) => 
                calculateLinkOpacity(link.last_seen, currentTime, refreshRate, link.packet_count)
              );
              nodeIntensity = Math.max(...linkOpacities, 0.3);
            }
            
            if (osInfo && !isDimmed) {
              let osGlowColor = null;
              const osName = osInfo.os?.toLowerCase() || '';
              
              // Determine OS glow color
              if (osName.includes('linux') || osName.includes('unix')) {
                osGlowColor = '#00ff41'; // Green for Linux/Unix
              } else if (osName.includes('windows')) {
                osGlowColor = '#00bfff'; // Blue for Windows
              } else if (osName.includes('android')) {
                osGlowColor = '#a4c639'; // Android green
              } else if (osName.includes('ios') || osName.includes('apple') || osName.includes('mac')) {
                osGlowColor = '#ffffff'; // White for Apple/iOS
              } else if (osName.includes('network') || osName.includes('router') || osName.includes('switch')) {
                osGlowColor = '#9b59b6'; // Purple for network devices
              }
              
              // Draw strong neon halo if OS detected
              if (osGlowColor) {
                // Halo scales with dynamic node size
                const baseRadius = isHighlightedAsset ? haloNodeSize * 2 : (isSelected ? haloNodeSize * 1.7 : haloNodeSize * 1.4);
                
                // Scale opacity values by node intensity (sync with link brightness)
                const intensityScale = nodeIntensity;
                const toHex = (opacity: number) => Math.floor(opacity * intensityScale * 255).toString(16).padStart(2, '0');
                
                // Draw multiple layered glows for neon effect
                // Outer glow - large, soft
                const outerGradient = ctx.createRadialGradient(
                  node.x, node.y, baseRadius * 0.3,
                  node.x, node.y, baseRadius * 1.8
                );
                outerGradient.addColorStop(0, `${osGlowColor}${toHex(0.25)}`); // Semi-transparent center
                outerGradient.addColorStop(0.4, `${osGlowColor}${toHex(0.19)}`);
                outerGradient.addColorStop(0.7, `${osGlowColor}${toHex(0.08)}`);
                outerGradient.addColorStop(1, `${osGlowColor}00`);
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, baseRadius * 1.8, 0, 2 * Math.PI, false);
                ctx.fillStyle = outerGradient;
                ctx.fill();
                
                // Middle glow - medium, brighter
                const midGradient = ctx.createRadialGradient(
                  node.x, node.y, baseRadius * 0.4,
                  node.x, node.y, baseRadius * 1.2
                );
                midGradient.addColorStop(0, `${osGlowColor}${toHex(0.38)}`);
                midGradient.addColorStop(0.5, `${osGlowColor}${toHex(0.25)}`);
                midGradient.addColorStop(1, `${osGlowColor}00`);
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, baseRadius * 1.2, 0, 2 * Math.PI, false);
                ctx.fillStyle = midGradient;
                ctx.fill();
                
                // Inner core glow - small, intense
                const coreGradient = ctx.createRadialGradient(
                  node.x, node.y, 2,
                  node.x, node.y, baseRadius * 0.8
                );
                coreGradient.addColorStop(0, `${osGlowColor}${toHex(0.56)}`);
                coreGradient.addColorStop(0.6, `${osGlowColor}${toHex(0.31)}`);
                coreGradient.addColorStop(1, `${osGlowColor}00`);
                
                ctx.beginPath();
                ctx.arc(node.x, node.y, baseRadius * 0.8, 0, 2 * Math.PI, false);
                ctx.fillStyle = coreGradient;
                ctx.fill();
              }
            }
            
            // Draw hover highlight ring for nodes connected to hovered node (cyan)
            // Show cyan ring on hover-connected nodes - cyan glow can coexist with green selection
            if (isConnectedToHover && !isHoverHighlighted && !isHighlightedAsset) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2 / globalScale;
              ctx.shadowBlur = 12;
              ctx.shadowColor = '#00f0ff';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw hover ring for the hovered node itself (cyan, dashed)
            // Show cyan ring on hovered node if it's NOT the selected asset (green takes priority)
            if (isHoverHighlighted && !isHighlightedAsset) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#00f0ff';
              ctx.lineWidth = 2 / globalScale;
              ctx.setLineDash([4 / globalScale, 2 / globalScale]);
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#00f0ff';
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 0;
            }
            
            // Draw large highlight ring for connected assets (green - click)
            if (isConnectedToHighlight && !isHighlightedAsset) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 14, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#00ff41';
              ctx.lineWidth = 2 / globalScale;
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#00ff41';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw extra-large pulsing ring for the highlighted asset itself (click)
            if (isHighlightedAsset) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 18, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3 / globalScale;
              ctx.setLineDash([6 / globalScale, 3 / globalScale]);
              ctx.shadowBlur = 25;
              ctx.shadowColor = '#00ff41';
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 0;
            }
            
            // Draw selection ring if selected
            if (isSelected && !isHighlightedAsset) {
              ctx.beginPath();
              ctx.arc(node.x, node.y, 12, 0, 2 * Math.PI, false);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 3 / globalScale;
              ctx.setLineDash([4 / globalScale, 2 / globalScale]);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Pulsing glow for selection
              ctx.shadowBlur = 20;
              ctx.shadowColor = '#ffffff';
            }
            
            // Draw Node Circle - dimmer when not highlighted
            // Size based on connection count (10% increments, max 100% larger)
            // Brightness based on link activity (synced with halo intensity)
            const dynamicNodeSize = getNodeSize(node.id, 6);
            const nodeRadius = isHighlightedAsset ? dynamicNodeSize * 1.67 : (isSelected ? dynamicNodeSize * 1.33 : dynamicNodeSize);
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeRadius, 0, 2 * Math.PI, false);
            // Apply node intensity to opacity - highlighted nodes also respect traffic intensity
            const baseOpacity = isDimmed ? 0.2 : (isHighlighted ? Math.max(0.6, nodeIntensity) : nodeIntensity * 0.8);
            ctx.globalAlpha = baseOpacity;
            ctx.fillStyle = nodeColor;
            ctx.fill();
            
            // Glow effect - intensity scales with traffic activity
            if (isHighlighted && !isDimmed) {
              const glowIntensity = Math.max(0.5, nodeIntensity);
              ctx.shadowBlur = (isHighlightedAsset ? 20 : (isSelected ? 15 : 10)) * glowIntensity;
              ctx.shadowColor = nodeColor;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            // Always draw labels - brighter when highlighted, dimmer when many nodes
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // For highlighted/connected nodes (click - green), show IP prominently
            // Green selection takes priority over blue hover - intensity based on traffic
            if (isHighlightedAsset || isConnectedToHighlight) {
              // Draw IP address - brightness scaled by traffic intensity
              const ipFontSize = Math.max(8, fontSize * 1.2);
              ctx.font = `bold ${ipFontSize}px Monospace`;
              ctx.globalAlpha = Math.max(0.6, nodeIntensity);
              ctx.fillStyle = isHighlightedAsset ? '#ffffff' : '#00ff41';
              ctx.shadowBlur = 10 * nodeIntensity;
              ctx.shadowColor = isHighlightedAsset ? '#ffffff' : '#00ff41';
              ctx.fillText(node.ip, node.x, node.y + 16);
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1.0;
              
              // Draw hostname below if different from IP
              if (node.name !== node.ip) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.globalAlpha = Math.max(0.5, nodeIntensity * 0.8);
                ctx.fillStyle = '#00f0ff';
                ctx.fillText(node.name, node.x, node.y + 28);
                ctx.globalAlpha = 1.0;
              }
            } else if (isHoverHighlighted || isConnectedToHover) {
              // Hover highlighting (cyan) - intensity based on traffic
              const ipFontSize = Math.max(8, fontSize * 1.1);
              ctx.font = `bold ${ipFontSize}px Monospace`;
              ctx.globalAlpha = Math.max(0.6, nodeIntensity);
              ctx.fillStyle = isHoverHighlighted ? '#ffffff' : '#00f0ff';
              ctx.shadowBlur = 8 * nodeIntensity;
              ctx.shadowColor = '#00f0ff';
              ctx.fillText(node.ip, node.x, node.y + 14);
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1.0;
              
              // Draw hostname below if different from IP
              if (node.name !== node.ip) {
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.globalAlpha = Math.max(0.5, nodeIntensity * 0.8);
                ctx.fillStyle = '#00f0ff';
                ctx.fillText(node.name, node.x, node.y + 26);
                ctx.globalAlpha = 1.0;
              }
            } else if (isHovered || isSelected) {
              // Bright neon cyan when hovered or selected - intensity based on traffic
              ctx.globalAlpha = Math.max(0.6, nodeIntensity);
              ctx.fillStyle = '#00f0ff';
              ctx.shadowBlur = 8 * nodeIntensity;
              ctx.shadowColor = '#00f0ff';
              const labelOffset = 12;
              ctx.fillText(label, node.x, node.y + labelOffset);
              ctx.shadowBlur = 0;
              ctx.globalAlpha = 1.0;
            } else if (dimLabels) {
              // Very dim for crowded view or dimmed nodes - but still visible
              ctx.fillStyle = isDimmed ? '#1a2a30' : '#2a3a40';
              ctx.shadowBlur = 0;
              const labelOffset = 12;
              ctx.fillText(label, node.x, node.y + labelOffset);
            } else {
              // Normal label - brightness synced with node traffic intensity
              // Convert intensity (0.3-1.0) to hex brightness for label color
              const labelBrightness = Math.floor(0x46 + (nodeIntensity * 0x30)).toString(16).padStart(2, '0');
              ctx.fillStyle = `#${labelBrightness}${labelBrightness}${labelBrightness}`;
              ctx.globalAlpha = Math.max(0.4, nodeIntensity);
              ctx.shadowBlur = 0;
              const labelOffset = 12;
              ctx.fillText(label, node.x, node.y + labelOffset);
              ctx.globalAlpha = 1.0;
            }
            ctx.shadowBlur = 0;
          }}
          nodePointerAreaPaint={(node: any, color, ctx) => {
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 8, 0, 2 * Math.PI, false); // Slightly larger hit area
            ctx.fill();
          }}
        />
        
        {/* Hover Tooltip */}
        {hoveredNode && (
          <div 
            className="absolute z-20 bg-cyber-darker border border-cyber-blue p-4 shadow-lg pointer-events-none"
            style={{ 
              top: 20, 
              right: 20,
              minWidth: '220px'
            }}
          >
            <h3 className="text-cyber-blue font-bold text-sm mb-3 uppercase tracking-widest">{hoveredNode.name}</h3>
            <div className="space-y-1 text-sm text-cyber-gray-light">
              <div className="flex justify-between">
                <span className="font-semibold">IP:</span>
                <span>{hoveredNode.ip}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Status:</span>
                <span className={hoveredNode.status === 'online' ? 'text-cyber-green' : 'text-cyber-red'}>
                  {hoveredNode.status.toUpperCase()}
                </span>
              </div>
              {hoveredNode.details && (
                <>
                  {hoveredNode.details.mac_address && (
                    <div className="flex justify-between">
                      <span className="font-semibold">MAC:</span>
                      <span>{hoveredNode.details.mac_address}</span>
                    </div>
                  )}
                  {hoveredNode.details.os_info && (
                    <div className="flex justify-between">
                      <span className="font-semibold">OS:</span>
                      <span>{hoveredNode.details.os_info}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-darker border border-cyber-gray p-4 text-xs text-cyber-gray-light shadow-lg">
          <div className="font-bold text-cyber-red mb-3 uppercase tracking-widest text-[10px]">Nodes</div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-green shadow-[0_0_5px_#00ff41]"></span>
            <span className="uppercase tracking-wide">Online Asset</span>
          </div>
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-red shadow-[0_0_5px_#ff0040]"></span>
            <span className="uppercase tracking-wide">Offline Asset</span>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-2.5 h-2.5 rounded-full bg-cyber-purple shadow-[0_0_5px_#9d00ff]"></span>
            <span className="uppercase tracking-wide">External/Unknown</span>
          </div>
          
          {/* Layer Colors - shown when multiple layers enabled */}
          {activeLayers.size > 1 && (
            <>
              <div className="font-bold text-cyber-blue mb-3 uppercase tracking-widest text-[10px] border-t border-cyber-gray pt-3">Active Layers</div>
              {activeLayers.has('L2') && (
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-5 h-0.5" style={{backgroundColor: '#9900ff', boxShadow: '0 0 3px #9900ff'}}></span>
                  <span className="uppercase tracking-wide">L2 Data Link</span>
                </div>
              )}
              {activeLayers.has('L4') && (
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-5 h-0.5" style={{backgroundColor: '#00ff41', boxShadow: '0 0 3px #00ff41'}}></span>
                  <span className="uppercase tracking-wide">L4 Transport</span>
                </div>
              )}
              {activeLayers.has('L5') && (
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-5 h-0.5" style={{backgroundColor: '#00f0ff', boxShadow: '0 0 3px #00f0ff'}}></span>
                  <span className="uppercase tracking-wide">L5 Session</span>
                </div>
              )}
              {activeLayers.has('L7') && (
                <div className="flex items-center space-x-2 mb-1.5">
                  <span className="w-5 h-0.5" style={{backgroundColor: '#ff0040', boxShadow: '0 0 3px #ff0040'}}></span>
                  <span className="uppercase tracking-wide">L7 Application</span>
                </div>
              )}
            </>
          )}
          
          {/* Single layer mode - show protocol details */}
          {activeLayers.size === 1 && activeLayers.has('L4') && (
            <>
              <div className="font-bold text-cyber-red mb-3 uppercase tracking-widest text-[10px] border-t border-cyber-gray pt-3">L4 Transport</div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="w-5 h-0.5 bg-cyber-green shadow-[0_0_3px_#00ff41]"></span>
                <span className="uppercase tracking-wide">TCP Traffic</span>
              </div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="w-5 h-0.5 bg-cyber-blue shadow-[0_0_3px_#00f0ff]"></span>
                <span className="uppercase tracking-wide">UDP Traffic</span>
              </div>
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.ICMP, boxShadow: `0 0 3px ${PROTOCOL_COLORS.ICMP}`}}></span>
                <span className="uppercase tracking-wide">ICMP Traffic</span>
              </div>
            </>
          )}
          
          {activeLayers.size === 1 && activeLayers.has('L7') && (
            <>
              <div className="font-bold text-cyber-red mb-3 uppercase tracking-widest text-[10px] border-t border-cyber-gray pt-3">L7 Applications (DPI)</div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.HTTP, boxShadow: `0 0 3px ${PROTOCOL_COLORS.HTTP}`}}></span>
                <span className="uppercase tracking-wide">HTTP/Web</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.TLS, boxShadow: `0 0 3px ${PROTOCOL_COLORS.TLS}`}}></span>
                <span className="uppercase tracking-wide">TLS/Encrypted</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.SSH, boxShadow: `0 0 3px ${PROTOCOL_COLORS.SSH}`}}></span>
                <span className="uppercase tracking-wide">SSH</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.DNS, boxShadow: `0 0 3px ${PROTOCOL_COLORS.DNS}`}}></span>
                <span className="uppercase tracking-wide">DNS</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.SMB, boxShadow: `0 0 3px ${PROTOCOL_COLORS.SMB}`}}></span>
                <span className="uppercase tracking-wide">SMB/File</span>
              </div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.MYSQL, boxShadow: `0 0 3px ${PROTOCOL_COLORS.MYSQL}`}}></span>
                <span className="uppercase tracking-wide">Database</span>
              </div>
            </>
          )}
          
          <div className="font-bold text-cyber-red mb-2 mt-3 uppercase tracking-widest text-[10px] border-t border-cyber-gray pt-3">Intensity</div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-5 h-0.5 bg-cyber-green opacity-100 shadow-[0_0_5px_#00ff41]"></span>
            <span className="uppercase tracking-wide text-cyber-green">Active</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-5 h-0.5 bg-cyber-green opacity-50"></span>
            <span className="uppercase tracking-wide text-cyber-gray-light">Recent</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-5 h-0.5 bg-cyber-green opacity-[0.15]"></span>
            <span className="uppercase tracking-wide text-cyber-gray">Stale</span>
          </div>
          
          <div className="text-[10px] mt-3 pt-3 border-t border-cyber-gray text-cyber-gray uppercase tracking-wide">
            <div>Line width = traffic volume</div>
            <div>Line color = protocol type</div>
            <div>Node size = connections</div>
            <div className="mt-2 text-cyber-blue font-bold">Click node/link for actions</div>
          </div>
        </div>

        {/* Hover Details Sidebar - shows enhanced info on node/link hover OR clicked selection */}
        {/* Stacked vertically: Asset card on top, Connection card below */}
        {(() => {
          // Show details for hovered node OR clicked/highlighted asset
          const displayNode = hoveredNode || (highlightedAsset ? graphData.nodes.find((n: any) => n.ip === highlightedAsset) : null);
          // Show details for hovered link OR clicked link
          const displayLink = hoveredLink || clickedLink;
          const isClickedAsset = !hoveredNode && highlightedAsset;
          const isClickedLink = !hoveredLink && clickedLink;
          
          if (!displayNode && !displayLink) return null;
          
          return (
            <div className="absolute top-4 right-4 w-64 flex flex-col space-y-2 z-30 pointer-events-none">
              {/* Asset Details Card */}
              {displayNode && (
                <div className={`bg-cyber-dark/95 border rounded-lg shadow-lg ${isClickedAsset ? 'border-cyber-green' : 'border-cyber-blue'}`}>
                  <div className="px-3 py-2 border-b border-cyber-gray flex justify-between items-center">
                    <div className={`text-xs font-bold uppercase ${isClickedAsset ? 'text-cyber-green' : 'text-cyber-blue'}`}>
                      Asset Details {isClickedAsset && '(Selected)'}
                    </div>
                  </div>
                  <div className="px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">IP:</span>
                      <span className="text-cyber-green font-mono">{displayNode.ip}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">Name:</span>
                      <span className="text-white">{enhancedHostInfo[displayNode.ip]?.hostname?.hostname || displayNode.name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">Status:</span>
                      <span className={displayNode.status === 'online' ? 'text-cyber-green' : 'text-cyber-red'}>{displayNode.status}</span>
                    </div>
                    {enhancedHostInfo[displayNode.ip]?.os_info && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">OS:</span>
                        <span className={
                          enhancedHostInfo[displayNode.ip].os_info.os?.includes('Linux') ? 'text-cyber-green' :
                          enhancedHostInfo[displayNode.ip].os_info.os?.includes('Windows') ? 'text-cyber-blue' :
                          'text-cyber-purple'
                        }>
                          {enhancedHostInfo[displayNode.ip].os_info.os}
                          <span className="text-cyber-gray-light ml-1 opacity-60">
                            ({Math.round((enhancedHostInfo[displayNode.ip].os_info.confidence || 0) * 100)}%)
                          </span>
                        </span>
                      </div>
                    )}
                    {enhancedHostInfo[displayNode.ip]?.service_versions && Object.keys(enhancedHostInfo[displayNode.ip].service_versions).length > 0 && (
                      <div className="mt-2 pt-2 border-t border-cyber-gray">
                        <div className="text-cyber-purple text-[10px] uppercase font-bold mb-1">Services:</div>
                        {Object.entries(enhancedHostInfo[displayNode.ip].service_versions).slice(0, 3).map(([port, info]: [string, any]) => (
                          <div key={port} className="text-[10px] text-cyber-gray-light font-mono truncate">
                            <span className="text-cyber-blue">{port}</span>: {info.version?.substring(0, 30) || 'unknown'}
                          </div>
                        ))}
                      </div>
                    )}
                    {/* Connections list sorted by traffic strength - no scroll, expand vertically */}
                    {(() => {
                      const nodeConnections = graphData.links
                        .filter((link: any) => {
                          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                          return sourceId === displayNode.ip || targetId === displayNode.ip;
                        })
                        .map((link: any) => {
                          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
                          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
                          const peerId = sourceId === displayNode.ip ? targetId : sourceId;
                          const totalTraffic = (link.value || 0) + (link.reverseValue || 0);
                          return { peerId, totalTraffic, protocols: link.protocols };
                        })
                        .sort((a: any, b: any) => b.totalTraffic - a.totalTraffic);
                      
                      if (nodeConnections.length === 0) return null;
                      
                      return (
                        <div className="mt-2 pt-2 border-t border-cyber-gray">
                          <div className="text-cyber-green text-[10px] uppercase font-bold mb-1">Connections ({nodeConnections.length}):</div>
                          <div>
                            {nodeConnections.map((conn: any, idx: number) => (
                              <div key={conn.peerId} className="text-[10px] font-mono flex justify-between items-center py-0.5">
                                <span className="text-cyber-blue truncate max-w-[120px]">{conn.peerId}</span>
                                <span className={`text-right ${idx === 0 ? 'text-cyber-green font-bold' : 'text-cyber-gray-light'}`}>
                                  {formatTrafficMB(conn.totalTraffic)}MB
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
              
              {/* Connection Details Card */}
              {displayLink && (
                <div className={`bg-cyber-dark/95 border rounded-lg shadow-lg ${isClickedLink ? 'border-cyber-green' : 'border-cyber-purple'}`}>
                  <div className="px-3 py-2 border-b border-cyber-gray">
                    <div className={`text-xs font-bold uppercase ${isClickedLink ? 'text-cyber-green' : 'text-cyber-purple'}`}>
                      Connection Details {isClickedLink && '(Selected)'}
                    </div>
                  </div>
                  <div className="px-3 py-2 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">Source:</span>
                      <span className="text-cyber-green font-mono">{typeof displayLink.source === 'object' ? displayLink.source.id : displayLink.source}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">Target:</span>
                      <span className="text-cyber-blue font-mono">{typeof displayLink.target === 'object' ? displayLink.target.id : displayLink.target}</span>
                    </div>
                    {/* Service Label from DPI */}
                    {displayLink.service_label && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Service:</span>
                        <span className="text-cyber-green font-bold">{displayLink.service_label}</span>
                      </div>
                    )}
                    {/* L7 Detected Protocols from DPI */}
                    {displayLink.detected_protocols && displayLink.detected_protocols.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">App Protocol:</span>
                        <span className="text-yellow-400">{displayLink.detected_protocols.join(', ')}</span>
                      </div>
                    )}
                    {/* L4 Transport Protocol */}
                    {displayLink.protocols && displayLink.protocols.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Transport:</span>
                        <span className="text-cyber-purple">{displayLink.protocols.join(', ')}</span>
                      </div>
                    )}
                    {/* Encryption status */}
                    {displayLink.is_encrypted !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Encrypted:</span>
                        <span className={displayLink.is_encrypted ? 'text-green-400' : 'text-gray-400'}>
                          {displayLink.is_encrypted ? '🔒 Yes' : 'No'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-cyber-gray-light">Outbound:</span>
                      <span className="text-white">{formatTrafficMB(displayLink.value || 0)} MB</span>
                    </div>
                    {displayLink.reverseValue !== undefined && displayLink.reverseValue > 0 && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Inbound:</span>
                        <span className="text-white">{formatTrafficMB(displayLink.reverseValue)} MB</span>
                      </div>
                    )}
                    {displayLink.packet_count !== undefined && (
                      <div className="flex justify-between">
                        <span className="text-cyber-gray-light">Packets:</span>
                        <span className="text-white">{displayLink.packet_count.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* Context menus inside container for fullscreen support */}
        {/* Host Context Menu */}
        {selectedNode && contextMenuPosition && (
          <HostContextMenu
            host={{
              id: selectedNode.id,
              ip: selectedNode.ip,
              name: selectedNode.name,
              status: selectedNode.status,
              details: selectedNode.details
            }}
            position={contextMenuPosition}
            onClose={() => {
              setSelectedNode(null);
              setContextMenuPosition(null);
            }}
          />
        )}

        {/* Connection Context Menu */}
        {selectedLink && contextMenuPosition && (
          <ConnectionContextMenu
            connection={{
              source: typeof selectedLink.source === 'object' ? selectedLink.source.id : selectedLink.source,
              target: typeof selectedLink.target === 'object' ? selectedLink.target.id : selectedLink.target,
              protocols: selectedLink.protocols,
              value: selectedLink.value,
              reverseValue: selectedLink.reverseValue,
              bidirectional: selectedLink.bidirectional
            }}
            position={contextMenuPosition}
            onClose={() => {
              setSelectedLink(null);
              setContextMenuPosition(null);
            }}
          />
        )}

        {/* Click backdrop to close context menus */}
        {(selectedNode || selectedLink) && (
          <div 
            className="absolute inset-0 z-40" 
            onClick={() => {
              setSelectedNode(null);
              setSelectedLink(null);
              setContextMenuPosition(null);
            }}
          />
        )}
      </div>

      {/* Resize Handle - drag to resize graph height */}
      {!isFullscreen && (
        <div
          className="h-2 bg-cyber-gray hover:bg-cyber-blue cursor-ns-resize transition-colors flex items-center justify-center group"
          onMouseDown={handleResizeMouseDown}
        >
          <div className="w-12 h-1 bg-cyber-blue rounded-full group-hover:bg-cyber-green transition-colors"></div>
        </div>
      )}
    </div>
  );
};

export default Topology;
