import React, { useEffect, useState, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { assetService } from '../services/assetService';
import { dashboardService } from '../services/dashboardService';
import { useAuthStore } from '../store/authStore';
import { usePOV } from '../context/POVContext';
import { CyberPageTitle } from '../components/CyberUI';

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
}

interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  value: number; // traffic volume
  protocols?: string[]; // list of protocols used
  bidirectional?: boolean; // if traffic flows both ways
  reverseValue?: number; // traffic in reverse direction
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

const Topology: React.FC = () => {
  const { token } = useAuthStore();
  const { activeAgent, isAgentPOV } = usePOV();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [trafficThreshold, setTrafficThreshold] = useState<number>(0); // Minimum bytes to show connection
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [hoveredLink, setHoveredLink] = useState<GraphLink | null>(null);
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Get scan settings for discovery subnet
  const [scanSettings, setScanSettings] = useState(() => {
    const saved = localStorage.getItem('nop_scan_settings');
    return saved ? JSON.parse(saved) : { networkRange: '172.21.0.0/24' };
  });

  // Filter mode with localStorage persistence - default to 'subnet' to show discovery subnet
  const [filterMode, setFilterMode] = useState<'all' | 'subnet'>(() => {
    const saved = localStorage.getItem('nop_topology_filter');
    return (saved as 'all' | 'subnet') || 'subnet';
  });

  // Discovery subnet (editable) - defaults to scan settings
  const [discoverySubnet, setDiscoverySubnet] = useState<string>(() => {
    return scanSettings.networkRange;
  });

  // Available subnets discovered from assets
  const [availableSubnets, setAvailableSubnets] = useState<string[]>([]);

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

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      setLoading(true);
      const [assets, trafficStats] = await Promise.all([
        assetService.getAssets(token, undefined, activeAgent?.id),
        dashboardService.getTrafficStats(token, activeAgent?.id)
      ]);

      // Extract unique subnets from assets (first 3 octets)
      const subnetsSet = new Set<string>();
      assets.forEach(asset => {
        const parts = asset.ip_address.split('.');
        if (parts.length === 4) {
          const subnet = parts.slice(0, 3).join('.') + '.0/24';
          subnetsSet.add(subnet);
        }
      });
      setAvailableSubnets(Array.from(subnetsSet).sort());

      // Process Nodes
      const nodesMap = new Map<string, GraphNode>();
      
      // Determine filtering criteria
      const shouldIncludeNode = (asset: any) => {
        if (filterMode === 'all') {
          // Show all subnets
          return true;
        } else {
          // Subnet mode - filter by discovery subnet
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
      
      connections.forEach(conn => {
        const shouldInclude = filterMode === 'all' || 
          (nodesMap.has(conn.source) && nodesMap.has(conn.target));
        
        if (!shouldInclude) return;
        
        // Add external nodes if in 'all' mode
        if (filterMode === 'all') {
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
        } else {
          // Create new link
          linksMap.set(linkKey, {
            source: node1,
            target: node2,
            value: conn.source === node1 ? conn.value : 0,
            reverseValue: conn.source === node2 ? conn.value : 0,
            bidirectional: false,
            protocols: conn.protocols || []
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

      // Update node sizes based on centrality
      nodesMap.forEach(node => {
        // Constant size for all nodes as requested
        node.val = 1; 
      });

      setGraphData({
        nodes: Array.from(nodesMap.values()),
        links: links
      });
    } catch (err) {
      console.error("Failed to fetch topology data", err);
    } finally {
      setLoading(false);
    }
  }, [token, filterMode, discoverySubnet, activeAgent]);

  useEffect(() => {
    fetchData();
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(fetchData, 5000); // Refresh every 5s only when playing
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [fetchData, isPlaying]);

  // Handle Layout Changes
  useEffect(() => {
    if (!fgRef.current) return;

    // Reset fixed positions
    const nodes = graphData.nodes;
    nodes.forEach(node => {
      node.fx = undefined;
      node.fy = undefined;
    });

    if (layoutMode === 'circular') {
      // Arrange in a circle
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
      fgRef.current.d3Force('charge').strength(-100);
      fgRef.current.d3ReheatSimulation();
    } else if (layoutMode === 'hierarchical') {
      // Use dagMode
      fgRef.current.d3Force('charge').strength(-300);
      // dagMode is handled via prop
    } else {
      // Force Directed (Default)
      // Center hubs (handled by d3 forces naturally, but we can add custom forces)
      fgRef.current.d3Force('charge').strength(-400); // Stronger repulsion
      fgRef.current.d3Force('link').distance(100); // Longer links
      fgRef.current.d3ReheatSimulation();
    }
  }, [layoutMode, graphData, dimensions]);

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-cyber-darker p-4 border border-cyber-gray">
        <CyberPageTitle color="blue">Network Topology</CyberPageTitle>
        
        <div className="flex items-center space-x-4">
          <div className="flex space-x-2 bg-cyber-dark p-1 rounded border border-cyber-gray">
            <button 
              onClick={() => setLayoutMode('force')}
              className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${layoutMode === 'force' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
            >
              Force
            </button>
            <button 
              onClick={() => setLayoutMode('circular')}
              className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${layoutMode === 'circular' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
            >
              Circular
            </button>
            <button 
              onClick={() => setLayoutMode('hierarchical')}
              className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${layoutMode === 'hierarchical' ? 'bg-cyber-blue text-black' : 'text-cyber-gray-light hover:text-white'}`}
            >
              Hierarchical
            </button>
          </div>
          <div className="flex space-x-2 bg-cyber-dark p-1 rounded border border-cyber-gray">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${filterMode === 'all' ? 'bg-cyber-green text-black' : 'text-cyber-gray-light hover:text-white'}`}
              title="Show all subnets and external traffic"
            >
              All Subnets
            </button>
            <button
              onClick={() => setFilterMode('subnet')}
              className={`px-3 py-1 text-xs font-bold uppercase transition-colors ${filterMode === 'subnet' ? 'bg-cyber-green text-black' : 'text-cyber-gray-light hover:text-white'}`}
              title="Filter by discovery subnet"
            >
              Discovery Subnet
            </button>
          </div>

          {filterMode === 'subnet' && (
            <div className="flex items-center space-x-2 bg-cyber-dark p-2 rounded border border-cyber-green">
              <label className="text-xs text-cyber-green font-bold whitespace-nowrap">Discovery:</label>
              <input
                type="text"
                value={discoverySubnet}
                onChange={(e) => setDiscoverySubnet(e.target.value)}
                placeholder="172.21.0.0/24"
                className="bg-cyber-darker text-cyber-gray-light text-xs px-2 py-1 border border-cyber-gray rounded focus:outline-none focus:border-cyber-blue min-w-[140px] font-mono"
                title="Edit discovery subnet (syncs with Assets settings)"
              />
              <span className="text-xs text-cyber-gray-light">│</span>
              <button
                onClick={() => setDiscoverySubnet(scanSettings.networkRange)}
                className="text-xs text-cyber-blue hover:text-cyber-green transition-colors px-2"
                title="Reset to Assets settings"
              >
                ⟲
              </button>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-cyber-dark p-2 rounded border border-cyber-gray"
            title="Minimum traffic volume to show connection">
            <label className="text-xs text-cyber-gray-light whitespace-nowrap">Min Traffic:</label>
            <select 
              value={trafficThreshold}
              onChange={(e) => setTrafficThreshold(Number(e.target.value))}
              className="bg-cyber-darker text-cyber-gray-light text-xs px-2 py-1 border border-cyber-gray rounded focus:outline-none focus:border-cyber-blue"
            >
              <option value={0}>All</option>
              <option value={1024}>1 KB</option>
              <option value={10240}>10 KB</option>
              <option value={102400}>100 KB</option>
              <option value={1048576}>1 MB</option>
              <option value={10485760}>10 MB</option>
            </select>
          </div>


          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-2 px-4 py-2 border ${isPlaying ? 'border-cyber-green text-cyber-green' : 'border-cyber-gray text-cyber-gray-light'} hover:bg-cyber-darker transition-colors`}
          >
            <span>{isPlaying ? '⏸ PAUSE FLOW' : '▶ PLAY FLOW'}</span>
          </button>

          <button onClick={fetchData} className="btn-cyber px-4 py-2">Refresh</button>
          
          <div className="flex items-center space-x-4 text-xs text-cyber-gray-light border-l border-cyber-gray pl-4">
            <div className="flex items-center space-x-1">
              <span className="font-bold text-cyber-blue">{graphData.nodes.length}</span>
              <span>Nodes</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="font-bold text-cyber-green">{graphData.links.length}</span>
              <span>Links</span>
            </div>
          </div>
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
            if (color === '#00f0ff' && link.bidirectional) {
              return '#00ff41'; // Cyber green for bidirectional
            }
            return color;
          }}
          linkWidth={(link: any) => {
            // Width based on total traffic volume
            const totalTraffic = link.value + (link.reverseValue || 0);
            if (!totalTraffic) return 0.5;
            // Logarithmic scale for better visualization
            return Math.max(1, Math.min(5, Math.log10(totalTraffic + 1) * 1.5));
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
            
            // Calculate link color and width
            const width = Math.max(1, Math.min(5, Math.log10(totalTraffic + 1) * 1.5));
            const color = getProtocolColor(link.protocols) || (link.bidirectional ? '#00ff41' : '#00f0ff');
            
            // Draw the link line
            ctx.beginPath();
            ctx.moveTo(start.x, start.y);
            ctx.lineTo(end.x, end.y);
            ctx.strokeStyle = color;
            ctx.lineWidth = width / globalScale;
            ctx.stroke();
            
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
            const fontSize = 12/globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            
            // Draw Node Circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false); // Fixed radius 6
            ctx.fillStyle = node.group === 'online' ? '#00ff41' : (node.group === 'offline' ? '#ff0040' : '#8b5cf6');
            ctx.fill();
            
            // Glow effect
            ctx.shadowBlur = 10;
            ctx.shadowColor = ctx.fillStyle;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Draw Label only if hovered or always? 
            // Let's draw label always but small
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#00f0ff';
            ctx.fillText(label, node.x, node.y + 10);
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
            className="absolute z-20 bg-cyber-darker border border-cyber-blue p-3 rounded shadow-lg pointer-events-none"
            style={{ 
              top: 20, 
              right: 20,
              minWidth: '200px'
            }}
          >
            <h3 className="text-cyber-blue font-bold text-lg mb-2">{hoveredNode.name}</h3>
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
            className="absolute z-20 bg-cyber-darker border border-cyber-green p-3 rounded shadow-lg pointer-events-none"
            style={{ 
              top: 20, 
              right: 20,
              minWidth: '250px'
            }}
          >
            <h3 className="text-cyber-green font-bold text-lg mb-2">Connection</h3>
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
        <div className="absolute bottom-4 left-4 bg-cyber-darker border border-cyber-gray p-3 text-xs text-cyber-gray-light opacity-90">
          <div className="font-bold text-cyber-blue mb-2 uppercase">Nodes</div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-cyber-green"></span>
            <span>Online Asset</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-cyber-red"></span>
            <span>Offline Asset</span>
          </div>
          <div className="flex items-center space-x-2 mb-3">
            <span className="w-3 h-3 rounded-full bg-cyber-purple"></span>
            <span>External/Unknown</span>
          </div>
          
          <div className="font-bold text-cyber-blue mb-2 uppercase border-t border-cyber-gray pt-2">Connections</div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-6 h-0.5 bg-cyber-green"></span>
            <span>TCP Traffic</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-6 h-0.5 bg-cyber-blue"></span>
            <span>UDP Traffic</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-6 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.ICMP}}></span>
            <span>ICMP Traffic</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-6 h-0.5" style={{backgroundColor: PROTOCOL_COLORS.OTHER_IP}}></span>
            <span>Other IP</span>
          </div>
          <div className="text-xs mt-2 pt-2 border-t border-cyber-gray text-cyber-gray">
            <div>Line width = traffic volume</div>
            <div>Particles = active flow</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topology;
