# DPI Topology Visualization - Industry Best Practices

## Research Summary

Based on analysis of industry-standard tools (ntopng, Wireshark, SolarWinds, Cisco Prime, EtherApe) and community best practices (D3.js, Cytoscape.js), this document outlines recommended patterns for DPI-enhanced network topology visualization.

---

## 1. Visualization Approach Comparison

| Tool | Layout | DPI Integration | VLAN Handling | Key Strength |
|------|--------|-----------------|---------------|--------------|
| **ntopng** | Force-directed + hierarchical | nDPI (native) | Grouped clusters | Real-time flow analysis |
| **Wireshark** | Tabular + IO graphs | Full decode | Filter-based | Deep protocol analysis |
| **SolarWinds NTM** | Auto-discovery hierarchical | SNMP + capture | Layer grouping | Enterprise polish |
| **Cisco Prime** | Geographic + logical layers | NetFlow | Overlay visualization | Multi-layer switching |
| **EtherApe** | Radial/circular | Protocol detection | Hub-spoke by broadcast | Visual traffic flow |

**Recommended Approach for NOP**: Hybrid force-directed with VLAN clustering (ntopng pattern) + protocol-based coloring (Wireshark/EtherApe pattern).

---

## 2. Standard Protocol Color Palette

Based on Wireshark conventions and RFC layer model:

### Layer 2 (Data Link) - Blues
```javascript
{
  arp: '#4A90E2',    // Light blue
  lldp: '#357ABD',   // Medium blue  
  cdp: '#2563EB',    // Blue
  stp: '#1E5A8E',    // Dark blue
  vlan: '#60A5FA',   // Sky blue
}
```

### Layer 3 (Network) - Greens
```javascript
{
  ip: '#50C878',     // Emerald green
  icmp: '#228B22',   // Forest green
  igmp: '#22C55E',   // Light green
}
```

### Layer 4 (Transport) - Oranges
```javascript
{
  tcp: '#FF8C42',    // Orange
  udp: '#FFA500',    // Gold orange
}
```

### Application Layer - Purples/Reds
```javascript
{
  http: '#9370DB',   // Medium purple
  https: '#8A2BE2',  // Blue violet
  dns: '#DA70D6',    // Orchid
  dhcp: '#DDA0DD',   // Plum
  ssh: '#4B0082',    // Indigo
  ftp: '#6B21A8',    // Purple
  smtp: '#A855F7',   // Violet
  ntp: '#C084FC',    // Light purple
}
```

### Industrial Protocols - Teals
```javascript
{
  modbus: '#14B8A6', // Teal
  bacnet: '#0D9488', // Dark teal
  dnp3: '#0F766E',   // Darker teal
  s7: '#115E59',     // Deep teal
}
```

### Multicast/Special - Magentas
```javascript
{
  multicast: '#FF00FF', // Magenta
  broadcast: '#FFD700', // Gold
  ssdp: '#F472B6',      // Pink
  mdns: '#EC4899',      // Rose
}
```

### Status Colors
```javascript
{
  blocked: '#DC143C',   // Crimson (security)
  alert: '#FF4500',     // Orange red
  unknown: '#808080',   // Gray
}
```

---

## 3. Device Type Icons

### Standard Device Representation (Cisco-inspired)

| Device Type | Icon Shape | Color | Size (relative) |
|-------------|------------|-------|-----------------|
| **Router** | Circle with arrows | Gold (#FFD700) | 1.2x |
| **Switch** | Rectangle with grid | Purple (#8B5CF6) | 1.1x |
| **Firewall** | Shield shape | Red (#EF4444) | 1.1x |
| **Server** | Tower/rack | Blue (#3B82F6) | 1.0x |
| **Workstation** | Monitor | Cyan (#00F0FF) | 0.9x |
| **IoT Device** | Chip/sensor | Green (#22C55E) | 0.8x |
| **Unknown** | Question mark | Gray (#6B7280) | 0.9x |

### Icon Drawing (Canvas)
```javascript
const deviceIcons = {
  router: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    // Circle with 4 arrows
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    // Arrows at cardinal points
    const arrowSize = size * 0.4;
    [[0, -1], [1, 0], [0, 1], [-1, 0]].forEach(([dx, dy]) => {
      ctx.beginPath();
      ctx.moveTo(x + dx * size * 0.8, y + dy * size * 0.8);
      ctx.lineTo(x + dx * (size + arrowSize), y + dy * (size + arrowSize));
      ctx.stroke();
    });
  },
  
  switch: (ctx, x, y, size, color) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color + '40'; // 25% opacity
    ctx.lineWidth = 2;
    // Rectangle with grid
    const w = size * 2;
    const h = size * 1.2;
    ctx.fillRect(x - w/2, y - h/2, w, h);
    ctx.strokeRect(x - w/2, y - h/2, w, h);
    // Grid lines
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      ctx.moveTo(x - w/2 + i * w/4, y - h/2);
      ctx.lineTo(x - w/2 + i * w/4, y + h/2);
    }
    ctx.stroke();
  },
  
  host: (ctx, x, y, size, color) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
};
```

---

## 4. VLAN Visualization

### Grouping Approaches

| Approach | Description | Best For |
|----------|-------------|----------|
| **Convex Hull** | Draw boundary around all VLAN members | Clear separation, few VLANs |
| **Background Color** | Pastel zone behind nodes | Quick identification |
| **Cluster Force** | D3 force attracting same VLAN | Dynamic positioning |
| **Layer Toggle** | Show one VLAN at a time | Complex networks |

### VLAN Background Colors (Pastel)
```javascript
const vlanBackgrounds = [
  '#E3F2FD', // Blue 50
  '#F3E5F5', // Purple 50
  '#E8F5E9', // Green 50
  '#FFF3E0', // Orange 50
  '#FCE4EC', // Pink 50
  '#E0F2F1', // Teal 50
  '#FFF8E1', // Amber 50
  '#F3E5F5', // Deep Purple 50
];
```

### D3 Force for VLAN Clustering
```javascript
// Add custom VLAN clustering force
fgRef.current.d3Force('vlanCluster', () => {
  const strength = 0.5;
  return (alpha) => {
    nodes.forEach((node) => {
      if (node.vlan) {
        const vlanCenter = getVlanCenter(node.vlan);
        node.vx += (vlanCenter.x - node.x) * strength * alpha;
        node.vy += (vlanCenter.y - node.y) * strength * alpha;
      }
    });
  };
});
```

---

## 5. Multicast Visualization

### Hub-Spoke Pattern
- Multicast group address as virtual central node
- Receivers as spoke nodes connected to hub
- Dashed edges for multicast traffic
- Particle animation for active groups

### Visual Encoding
```javascript
{
  multicastLink: {
    strokeDashArray: [5, 5],  // Dashed line
    color: '#FF00FF',         // Magenta
    particleCount: 3,
    particleSpeed: 0.01,
    curvature: 0.2,           // Slight curve to reduce overlap
  }
}
```

---

## 6. Layout Algorithms

### When to Use Each Layout

| Network Size | Layout | D3 Config |
|--------------|--------|-----------|
| **< 50 nodes** | Force-directed | `charge(-500), link(100)` |
| **50-200 nodes** | Force + collision | `charge(-800), collision(30)` |
| **200-500 nodes** | Clustered force | Add VLAN grouping force |
| **500+ nodes** | Hierarchical or LOD | `dagMode='td'` or aggregation |

### View Mode Configurations

```javascript
const layoutConfigs = {
  standard: {
    chargeStrength: -800,
    linkDistance: 180,
    centerStrength: 0.05,
    collisionRadius: 20,
  },
  vlan: {
    chargeStrength: -1200,
    linkDistance: 120,
    centerStrength: 0.02,
    collisionRadius: 25,
    vlanClusterStrength: 0.5,
  },
  multicast: {
    chargeStrength: -600,
    linkDistance: 100,
    centerStrength: 0.1,
    collisionRadius: 15,
    radialStrength: 0.3,
  },
  deviceType: {
    chargeStrength: -1000,
    linkDistance: 150,
    centerStrength: 0.05,
    collisionRadius: 20,
    layerSeparation: true,
  },
  hierarchical: {
    dagMode: 'td',
    dagLevelDistance: 80,
    dagNodeFilter: (node) => node.layer !== undefined,
  },
};
```

---

## 7. Interactive Features

### Essential Interactions (P0)
1. **Pan/Zoom** - Built-in
2. **Node drag** - Reposition manually
3. **Hover highlight** - Show connected neighbors
4. **Click details** - Show node/link metadata
5. **Tooltip** - Quick info on hover

### Advanced Interactions (P1)
1. **Protocol filter** - Toggle protocol visibility
2. **VLAN isolation** - Show single VLAN
3. **Search** - Find by name/IP/MAC
4. **Path tracing** - Highlight route between nodes
5. **Time scrubbing** - Historical playback

### Highlight Pattern
```javascript
const handleNodeHover = (node) => {
  if (!node) {
    setHighlightNodes(new Set());
    setHighlightLinks(new Set());
    return;
  }
  
  const neighbors = new Set([node.id]);
  const links = new Set();
  
  graphData.links.forEach(link => {
    const srcId = typeof link.source === 'object' ? link.source.id : link.source;
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
    
    if (srcId === node.id || tgtId === node.id) {
      neighbors.add(srcId);
      neighbors.add(tgtId);
      links.add(`${srcId}-${tgtId}`);
    }
  });
  
  setHighlightNodes(neighbors);
  setHighlightLinks(links);
};
```

---

## 8. Performance Guidelines

### Thresholds
| Nodes | Rendering | Animation | Labels |
|-------|-----------|-----------|--------|
| < 100 | Full detail | All effects | Always |
| 100-500 | Full detail | Reduced particles | On hover |
| 500-2000 | Simplified | Minimal | Critical only |
| 2000+ | Aggregated | Disabled | Search only |

### Optimization Techniques
```javascript
// 1. Level of Detail
nodeCanvasObject={(node, ctx, globalScale) => {
  if (globalScale < 0.5) {
    // Simple dot when zoomed out
    ctx.fillStyle = node.color;
    ctx.fillRect(node.x - 2, node.y - 2, 4, 4);
  } else if (globalScale < 1) {
    // Basic circle
    ctx.beginPath();
    ctx.arc(node.x, node.y, 6, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Full detail with icon and label
    drawDeviceIcon(node, ctx);
    drawLabel(node, ctx, globalScale);
  }
}}

// 2. Throttle updates
const updateGraph = useCallback(
  throttle((data) => setGraphData(data), 500),
  []
);

// 3. Pause physics when stable
onEngineStop={() => {
  fgRef.current.pauseAnimation();
}}

// 4. Limit particles
linkDirectionalParticles={link => 
  link.active && graphData.nodes.length < 200 ? 2 : 0
}
```

---

## 9. Legend Design

### Standard Legend Components
```
┌──────────────────────────────┐
│  ◆ DPI View: [VLAN/TYPE]     │
├──────────────────────────────┤
│  Device Types                │
│  ○ Router                    │
│  □ Switch                    │
│  ● Host                      │
├──────────────────────────────┤
│  Protocols                   │
│  ── TCP                      │
│  ── UDP                      │
│  -- Multicast                │
├──────────────────────────────┤
│  Traffic                     │
│  ━━ High                     │
│  ── Medium                   │
│  ·· Low                      │
└──────────────────────────────┘
```

### Accessibility
- 4.5:1 minimum contrast ratio
- Pattern + color (not color alone)
- Keyboard navigation support
- Screen reader annotations

---

## 10. Implementation Phases

### Phase 1: Foundation (Current)
- [x] Force-directed layout
- [x] Protocol-based coloring
- [x] Device type view mode
- [x] VLAN view mode
- [x] Multicast view mode
- [x] Basic legend

### Phase 2: Enhancement
- [ ] Convex hull VLAN grouping
- [ ] Device type icons (SVG/Canvas)
- [ ] Neighbor highlighting on hover
- [ ] Protocol filter toggles
- [ ] VLAN isolation mode

### Phase 3: Advanced
- [ ] Time-series scrubbing
- [ ] Path tracing
- [ ] Export (PNG/JSON)
- [ ] LOD rendering
- [ ] Performance optimization

### Phase 4: Enterprise
- [ ] Geographic overlay
- [ ] Hierarchical drill-down
- [ ] Custom layouts
- [ ] API for external tools
- [ ] Alert integration

---

## References

- ntopng: https://www.ntop.org/products/traffic-analysis/ntop/
- Wireshark coloring rules: https://www.wireshark.org/docs/wsug_html_chunked/ChCustColorizationSection.html
- D3-force: https://github.com/d3/d3-force
- react-force-graph: https://github.com/vasturiano/react-force-graph
- WCAG 2.1: https://www.w3.org/WAI/WCAG21/quickref/
- ColorBrewer 2.0: https://colorbrewer2.org/
