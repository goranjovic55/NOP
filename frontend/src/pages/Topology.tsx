import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { forceCollide } from 'd3-force';
import { assetService } from '../services/assetService';
import { dashboardService } from '../services/dashboardService';
import { trafficService } from '../services/trafficService';
import { useAuthStore } from '../store/authStore';
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
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Color constants for protocol visualization
const PROTOCOL_COLORS = {
  TCP: '#00ff41',    // Green
  UDP: '#00f0ff',    // Blue
  ICMP: '#ffff00',   // Yellow
  OTHER_IP: '#ff00ff', // Magenta
  DEFAULT: '#00f0ff'   // Blue
};

// Utility functions
const getProtocolColor = (protocols?: string[]): string => {
  if (!protocols || protocols.length === 0) return PROTOCOL_COLORS.DEFAULT;
  const protocol = protocols[0]; // Use primary protocol
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
// Connections with traffic stay bright; old connections fade
const calculateLinkOpacity = (
  lastSeen: number | string | undefined, 
  serverCurrentTime: number,
  _refreshRateMs: number = 5000, // Kept for API compatibility
  packetCount?: number
): number => {
  // If we have packet count > 0, this is an active connection - full brightness
  if (packetCount && packetCount > 0) {
    return 1.0;
  }
  
  // No timestamp = dim
  if (!lastSeen) return 0.4;
  
  const lastSeenTime = typeof lastSeen === 'string' 
    ? new Date(lastSeen).getTime() / 1000 
    : lastSeen;
  const secondsAgo = serverCurrentTime - lastSeenTime;
  
  // Lenient thresholds - connections stay visible for a while
  // < 60s = full brightness (actively monitored)
  // 60-300s = gradual fade
  // > 300s = dim
  if (secondsAgo < 60) return 1.0;
  if (secondsAgo < 300) {
    // Fade from 1.0 to 0.4 over 4 minutes
    const fadeProgress = (secondsAgo - 60) / 240;
    return 1.0 - fadeProgress * 0.6;
  }
  return 0.4; // Old traffic - dim but visible
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

const Topology: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, isAgentPOV } = usePOV();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [trafficThreshold, setTrafficThreshold] = useState<number>(0); // Minimum bytes to show connection
  const [isPlaying, setIsPlaying] = useState(false); // Controls particle animation
  const [autoRefresh, setAutoRefresh] = useState(false); // Controls auto-refresh
  const [refreshRate, setRefreshRate] = useState<number>(5000); // Refresh rate in ms (default 5s)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Live traffic capture state
  const [currentTime, setCurrentTime] = useState<number>(Date.now() / 1000);
  const [isLiveCapturing, setIsLiveCapturing] = useState(false);
  const [captureStatus, setCaptureStatus] = useState<string>('');
  
  // Store node positions to preserve them between updates
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; fx?: number; fy?: number }>>(new Map());
  const isInitialLoadRef = useRef(true);
  const simulationCompleteRef = useRef(false); // Track if first simulation has finished
  // Context menu state for host and connection interactions
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [selectedLink, setSelectedLink] = useState<GraphLink | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);

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

  // Discovery subnet (editable) - defaults to scan settings
  const [discoverySubnet, setDiscoverySubnet] = useState<string>(() => {
    return scanSettings.networkRange;
  });

  // IP filter for "all subnets" mode
  const [ipFilter, setIpFilter] = useState<string>('');

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

  const fetchData = useCallback(async (useBurstCapture: boolean = false, runSimulation: boolean = false) => {
    if (!token) return;
    try {
      setLoading(true);
      
      // If requesting simulation, reset the completion flag so simulation will run
      if (runSimulation) {
        simulationCompleteRef.current = false;
      }
      
      // Always do burst capture when playing to get fresh timestamps
      // This ensures connections get updated last_seen values
      const shouldBurstCapture = useBurstCapture && isPlaying;
      
      let trafficStats;
      
      if (shouldBurstCapture) {
        // Do burst capture - duration scales with refresh rate
        // Faster refresh = shorter capture (but at least 2s to catch traffic)
        const captureDuration = Math.max(2, Math.min(5, Math.ceil(refreshRate / 1000)));
        setCaptureStatus(`Capturing ${captureDuration}s...`);
        setIsLiveCapturing(true);
        try {
          const burstResult = await trafficService.burstCapture(token, captureDuration, activeAgent?.id);
          // Merge burst connections with existing stats
          const existingStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
          trafficStats = {
            ...existingStats,
            // Prioritize burst connections for recent traffic
            connections: mergeConnections(existingStats.connections, burstResult.connections),
            current_time: burstResult.current_time
          };
          setCaptureStatus(`Captured ${burstResult.connection_count} flows`);
        } catch (burstError) {
          console.warn('Burst capture failed, using stats:', burstError);
          trafficStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
        }
        setIsLiveCapturing(false);
      } else {
        // Direct stats fetch for live mode or initial load
        trafficStats = await dashboardService.getTrafficStats(token, activeAgent?.id);
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
        
        nodesMap.set(asset.ip_address, {
          id: asset.ip_address,
          name: asset.hostname || asset.ip_address,
          val: 1,
          group: asset.status === 'online' ? 'online' : 'offline',
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
          if (conn.last_seen) {
            const existingTime = existing.last_seen ? 
              (typeof existing.last_seen === 'string' ? new Date(existing.last_seen).getTime() : existing.last_seen) : 0;
            const newTime = typeof conn.last_seen === 'string' ? new Date(conn.last_seen).getTime() : conn.last_seen;
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
            packet_count: conn.packet_count || 0
          });
        }
      });
      
      const links = Array.from(linksMap.values()).filter(link => {
        // Filter by traffic threshold
        const totalTraffic = link.value + (link.reverseValue || 0);
        return totalTraffic >= trafficThreshold;
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
  }, [token, filterMode, discoverySubnet, ipFilter, activeAgent, isPlaying, refreshRate, mergeConnections]);

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
  }, [filterMode, discoverySubnet, ipFilter]);
  
  useEffect(() => {
    // Auto-refresh interval - separate from initial load
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      // Auto-refresh: burst capture, NO simulation (just update data/colors)
      interval = setInterval(() => fetchData(true, false), refreshRate);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, refreshRate]); // Only depend on autoRefresh and refresh rate

  // Apply force settings when graph is ready - runs once after first data load
  useEffect(() => {
    if (!fgRef.current || graphData.nodes.length === 0) return;
    
    // Apply strong repulsion forces for better node spacing
    if (layoutMode === 'force' && !simulationCompleteRef.current) {
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
      const linkDistance = nodeCount > 50 ? 100 : nodeCount > 20 ? 200 : 400;
      
      fg.d3Force('charge')?.strength(chargeStrength).distanceMax(1500);
      fg.d3Force('link')?.distance(linkDistance).strength(0.1);
      fg.d3Force('center')?.strength(0.005);
      
      // Reheat simulation with new forces
      fg.d3ReheatSimulation();
    }
  }, [graphData.nodes.length, layoutMode]);

  // Handle Layout Changes - only when layout mode or dimensions change, NOT on data refresh
  // This preserves user's zoom/pan position during auto-refresh
  useEffect(() => {
    if (!fgRef.current) return;

    if (layoutMode === 'circular') {
      // Reset fixed positions only for circular layout
      const nodes = graphData.nodes;
      const radius = Math.min(dimensions.width, dimensions.height) / 3;
      const angleStep = (2 * Math.PI) / nodes.length;
      
      // Sort nodes by degree for better circular layout (hubs together or spread)
      // Let's just sort by IP for stability
      const sortedNodes = [...nodes].sort((a, b) => a.id.localeCompare(b.id));

      sortedNodes.forEach((node, i) => {
        node.fx = Math.cos(i * angleStep) * radius;
        node.fy = Math.sin(i * angleStep) * radius;
      });
      
      // Re-heat simulation to move to new positions
      fgRef.current.d3Force('charge')?.strength(-100);
      fgRef.current.d3ReheatSimulation();
    } else if (layoutMode === 'hierarchical') {
      // Use dagMode
      fgRef.current.d3Force('charge')?.strength(-300);
      // dagMode is handled via prop
    } else {
      // Force Directed (Default)
      // Increase repulsion for better spacing - more negative = more spread
      fgRef.current.d3Force('charge')?.strength(-800).distanceMax(400);
      // Increase link distance for more space between connected nodes
      fgRef.current.d3Force('link')?.distance(180);
      // Weaken center force to allow more spread
      fgRef.current.d3Force('center')?.strength(0.05);
      // Only reheat on initial load or layout change, not data refresh
    }
  }, [layoutMode, dimensions]); // Removed graphData - don't re-layout on refresh

  return (
    <div className="h-full flex flex-col space-y-2">
      {/* Compact toolbar - wraps on smaller screens */}
      <div className="flex flex-wrap gap-2 items-center bg-cyber-darker p-2 border border-cyber-gray">
        <CyberPageTitle color="red">Network Topology</CyberPageTitle>
        
        {/* Layout mode buttons */}
        <div className="flex bg-cyber-dark rounded border border-cyber-gray">
          <button 
            onClick={() => setLayoutMode('force')}
            className={`px-2 py-1 text-xs font-bold uppercase ${layoutMode === 'force' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
          >
            Force
          </button>
          <button 
            onClick={() => setLayoutMode('circular')}
            className={`px-2 py-1 text-xs font-bold uppercase ${layoutMode === 'circular' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
          >
            Circ
          </button>
          <button 
            onClick={() => setLayoutMode('hierarchical')}
            className={`px-2 py-1 text-xs font-bold uppercase ${layoutMode === 'hierarchical' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
          >
            Hier
          </button>
        </div>

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

      <div ref={containerRef} className="flex-1 bg-cyber-darker border border-cyber-gray relative overflow-hidden min-h-[600px]">
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
            }
          }}
          
          nodeLabel="name"
          nodeColor={node => {
            if (node.group === 'online') return '#00ff41'; // Cyber Green
            if (node.group === 'offline') return '#ff0040'; // Cyber Red
            return '#8b5cf6'; // Cyber Purple (External/Unknown)
          }}
          nodeRelSize={6}
          linkColor={(link: any) => {
            // Color based on protocol type (EtherApe-style)
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return '#00f0ff20'; // Very dim blue for no traffic
            
            // Use utility function for protocol coloring
            const color = getProtocolColor(link.protocols);
            
            // Fallback to bidirectional coloring if no protocol info
            const baseColor = (color === '#00f0ff' && link.bidirectional) 
              ? '#00ff41'  // Cyber green for bidirectional
              : color;
            
            // Apply opacity based on recency (recent traffic = brighter)
            const opacity = calculateLinkOpacity(link.last_seen, currentTime, refreshRate, link.packet_count);
            return applyOpacity(baseColor, opacity);
          }}
          linkWidth={(link: any) => {
            // Width based on total traffic volume with proper scaling
            const totalTraffic = link.value + (link.reverseValue || 0);
            return calculateLinkWidth(totalTraffic);
          }}
          linkDirectionalParticles={isPlaying ? (link: any) => {
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return 0;
            // More particles for higher traffic
            return Math.max(2, Math.min(8, Math.log10(totalTraffic + 1)));
          } : 0}
          linkDirectionalParticleSpeed={(link: any) => {
            const totalTraffic = link.value + (link.reverseValue || 0);
            // Speed proportional to traffic volume
            return Math.max(0.001, Math.min(0.01, totalTraffic * 0.000001 + 0.002));
          }}
          linkDirectionalParticleWidth={(link: any) => {
            const totalTraffic = link.value + (link.reverseValue || 0);
            return Math.max(1, Math.min(4, Math.log10(totalTraffic + 1)));
          }}
          linkDirectionalParticleColor={(link: any) => {
            // Particle color based on link type
            if (link.bidirectional) return '#00ff41'; // Green particles
            return '#ffffff'; // White particles
          }}
          linkCanvasObject={(link: any, ctx, globalScale) => {
            // Custom link rendering with bidirectional arrows
            const start = link.source;
            const end = link.target;
            
            if (typeof start !== 'object' || typeof end !== 'object') return;
            
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return; // Early return for zero traffic
            
            // Check if this link is selected
            const isSelected = selectedLink && 
              ((typeof selectedLink.source === 'object' ? selectedLink.source.id : selectedLink.source) === start.id) &&
              ((typeof selectedLink.target === 'object' ? selectedLink.target.id : selectedLink.target) === end.id);
            
            // Calculate link color and width using new scaling functions
            const baseWidth = calculateLinkWidth(totalTraffic);
            // Scale with zoom - thinner when zoomed out, thicker when zoomed in
            const zoomScale = Math.max(0.3, Math.min(1.5, globalScale));
            const width = (isSelected ? baseWidth * 2 : baseWidth) * zoomScale;
            const baseColor = getProtocolColor(link.protocols) || (link.bidirectional ? '#00ff41' : '#00f0ff');
            // Apply opacity based on recency and traffic activity
            const opacity = calculateLinkOpacity(link.last_seen, currentTime, refreshRate, link.packet_count);
            const color = applyOpacity(baseColor, opacity);
            
            // Draw selection glow first (behind the line)
            if (isSelected) {
              ctx.beginPath();
              ctx.moveTo(start.x, start.y);
              ctx.lineTo(end.x, end.y);
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = width + 2;
              ctx.shadowBlur = 15;
              ctx.shadowColor = '#ffffff';
              ctx.stroke();
              ctx.shadowBlur = 0;
            }
            
            // Draw the link line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            if (isSelected) {
              ctx.shadowBlur = 10;
              ctx.shadowColor = color;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Draw directional indicators for bidirectional links
            if (link.bidirectional && globalScale > 1.5) {
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              
              if (length > 0) {
                const arrowSize = 8 / globalScale;
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2;
                
                // Normalize direction
                const ux = dx / length;
                const uy = dy / length;
                
                // Draw small double-headed arrow indicator
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(midX, midY, arrowSize / 2, 0, 2 * Math.PI);
                ctx.fill();
              }
            }
          }}
          backgroundColor="#050505"
          dagMode={layoutMode === 'hierarchical' ? 'td' : undefined}
          dagLevelDistance={100}
          d3VelocityDecay={0.3}
          onNodeClick={(node: any, event: MouseEvent) => {
            // Open context menu for host
            setSelectedNode(node);
            setSelectedLink(null);
            setContextMenuPosition({ x: event.clientX, y: event.clientY });
          }}
          onLinkClick={(link: any, event: MouseEvent) => {
            // Open context menu for connection
            setSelectedLink(link);
            setSelectedNode(null);
            setContextMenuPosition({ x: event.clientX, y: event.clientY });
          }}
          onNodeHover={(node: any) => {
            document.body.style.cursor = node ? 'pointer' : 'default';
            setHoveredNode(node || null);
            if (node) setHoveredLink(null); // Clear link hover when hovering node
          }}
          onLinkHover={(link: any) => {
            setHoveredLink(link || null);
            if (link) setHoveredNode(null); // Clear node hover when hovering link
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
            const isHighlighted = isSelected || isHovered;
            const nodeColor = node.group === 'online' ? '#00ff41' : (node.group === 'offline' ? '#ff0040' : '#8b5cf6');
            
            // Always show labels, but dim them when there are many nodes
            const dimLabels = nodeCount > 30 && !isHighlighted;
            
            // Draw selection ring if selected
            if (isSelected) {
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
            ctx.beginPath();
            ctx.arc(node.x, node.y, isSelected ? 8 : 6, 0, 2 * Math.PI, false);
            ctx.globalAlpha = isHighlighted ? 1.0 : 0.6;
            ctx.fillStyle = nodeColor;
            ctx.fill();
            
            // Glow effect - only when highlighted
            if (isHighlighted) {
              ctx.shadowBlur = isSelected ? 15 : 10;
              ctx.shadowColor = nodeColor;
            }
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            // Always draw labels - brighter when highlighted, dimmer when many nodes
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            if (isHighlighted) {
              // Bright neon cyan when hovered or selected
              ctx.fillStyle = '#00f0ff';
              ctx.shadowBlur = 8;
              ctx.shadowColor = '#00f0ff';
            } else if (dimLabels) {
              // Very dim for crowded view - but still visible
              ctx.fillStyle = '#2a3a40';
              ctx.shadowBlur = 0;
            } else {
              // Normal dim label
              ctx.fillStyle = '#4a6670';
              ctx.shadowBlur = 0;
            }
            // Offset label below node
            const labelOffset = 12;
            ctx.fillText(label, node.x, node.y + labelOffset);
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
        
        {/* Link Hover Tooltip */}
        {hoveredLink && (
          <div 
            className="absolute z-20 bg-cyber-darker border border-cyber-green p-4 shadow-lg pointer-events-none"
            style={{ 
              top: 20, 
              right: 20,
              minWidth: '260px'
            }}
          >
            <h3 className="text-cyber-green font-bold text-sm mb-3 uppercase tracking-widest">Connection</h3>
            <div className="space-y-1 text-sm text-cyber-gray-light">
              <div className="flex justify-between">
                <span className="font-semibold">Source:</span>
                <span className="text-cyber-blue">{typeof hoveredLink.source === 'object' ? hoveredLink.source.id : hoveredLink.source}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Target:</span>
                <span className="text-cyber-blue">{typeof hoveredLink.target === 'object' ? hoveredLink.target.id : hoveredLink.target}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Direction:</span>
                <span className={hoveredLink.bidirectional ? 'text-cyber-green' : 'text-cyber-blue'}>
                  {hoveredLink.bidirectional ? '↔ Bidirectional' : '→ Unidirectional'}
                </span>
              </div>
              {hoveredLink.protocols && hoveredLink.protocols.length > 0 && (
                <div className="flex justify-between">
                  <span className="font-semibold">Protocols:</span>
                  <span className="text-cyber-purple">{hoveredLink.protocols.join(', ')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold">Traffic:</span>
                <span>
                  {formatTrafficMB(hoveredLink.value + (hoveredLink.reverseValue || 0))} MB
                </span>
              </div>
              {hoveredLink.bidirectional && (
                <>
                  <div className="flex justify-between text-xs mt-2 pt-2 border-t border-cyber-gray">
                    <span>→ Forward:</span>
                    <span>{formatTrafficMB(hoveredLink.value)} MB</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>← Reverse:</span>
                    <span>{formatTrafficMB(hoveredLink.reverseValue || 0)} MB</span>
                  </div>
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
          
          <div className="font-bold text-cyber-red mb-3 uppercase tracking-widest text-[10px] border-t border-cyber-gray pt-3">Connections</div>
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
          <div className="flex items-center space-x-2 mb-1.5">
            <span className="w-5 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.OTHER_IP, boxShadow: `0 0 3px ${PROTOCOL_COLORS.OTHER_IP}`}}></span>
            <span className="uppercase tracking-wide">Other IP</span>
          </div>
          <div className="text-[10px] mt-3 pt-3 border-t border-cyber-gray text-cyber-gray uppercase tracking-wide">
            <div>Line width = traffic volume</div>
            <div>Line brightness = recency</div>
            <div>Node size = connections</div>
            <div>Particles = active flow</div>
            <div className="mt-2 text-cyber-blue font-bold">Click node/link for actions</div>
          </div>
        </div>
      </div>

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
          className="fixed inset-0 z-40" 
          onClick={() => {
            setSelectedNode(null);
            setSelectedLink(null);
            setContextMenuPosition(null);
          }}
        />
      )}
    </div>
  );
};

export default Topology;
