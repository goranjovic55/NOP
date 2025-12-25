import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { assetService } from '../services/assetService';
import { dashboardService } from '../services/dashboardService';
import { useAuthStore } from '../store/authStore';

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
  source: string;
  target: string;
  value: number; // traffic volume
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

const Topology: React.FC = () => {
  const { token } = useAuthStore();
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [layoutMode, setLayoutMode] = useState<'force' | 'circular' | 'hierarchical'>('force');
  const [isPlaying, setIsPlaying] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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
        assetService.getAssets(token),
        dashboardService.getTrafficStats(token)
      ]);

      // Process Nodes
      const nodesMap = new Map<string, GraphNode>();
      
      // Add assets as nodes
      assets.forEach(asset => {
        if (asset.status !== 'online') return; // Only show online hosts
        nodesMap.set(asset.ip_address, {
          id: asset.ip_address,
          name: asset.hostname || asset.ip_address,
          val: 1,
          group: 'online',
          ip: asset.ip_address,
          status: asset.status,
          details: asset
        });
      });

      // Process Links
      const links: GraphLink[] = [];
      const connections = trafficStats.connections || [];
      
      connections.forEach(conn => {
        // Only add links if both source and target are known online nodes
        if (nodesMap.has(conn.source) && nodesMap.has(conn.target)) {
          links.push({
            source: conn.source,
            target: conn.target,
            value: conn.value
          });
        }
      });

      // Calculate Centrality (Degree)
      const degreeMap = new Map<string, number>();
      links.forEach(link => {
        degreeMap.set(link.source, (degreeMap.get(link.source) || 0) + 1);
        degreeMap.set(link.target, (degreeMap.get(link.target) || 0) + 1);
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
  }, [token]);

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
        <h2 className="text-2xl font-bold text-cyber-blue uppercase tracking-wider cyber-glow">Network Topology</h2>
        
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

          <button 
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center space-x-2 px-4 py-2 border ${isPlaying ? 'border-cyber-green text-cyber-green' : 'border-cyber-gray text-cyber-gray-light'} hover:bg-cyber-darker transition-colors`}
          >
            <span>{isPlaying ? '⏸ PAUSE FLOW' : '▶ PLAY FLOW'}</span>
          </button>

          <button onClick={fetchData} className="btn-cyber px-4 py-2">Refresh</button>
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
          linkColor={() => '#00f0ff'} // Cyber Blue
          linkWidth={(link: any) => Math.max(0.5, Math.min(3, Math.log10((link.value || 0) + 1)))}
          linkDirectionalParticles={isPlaying ? 4 : 0}
          linkDirectionalParticleSpeed={d => d.value * 0.001 + 0.001}
          linkDirectionalParticleWidth={(link: any) => Math.max(1, Math.min(3, Math.log10((link.value || 0) + 1)))}
          linkDirectionalParticleColor={() => '#ffffff'}
          backgroundColor="#050505"
          dagMode={layoutMode === 'hierarchical' ? 'td' : undefined}
          dagLevelDistance={100}
          d3VelocityDecay={0.3}
          onNodeHover={(node: any) => {
            document.body.style.cursor = node ? 'pointer' : 'null';
            setHoveredNode(node || null);
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

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-cyber-darker border border-cyber-gray p-2 text-xs text-cyber-gray-light opacity-80">
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-cyber-green"></span>
            <span>Online Asset</span>
          </div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="w-3 h-3 rounded-full bg-cyber-red"></span>
            <span>Offline Asset</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-cyber-purple"></span>
            <span>External/Unknown</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Topology;
