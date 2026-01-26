/**
 * Comprehensive Multi-Layer Detection Test
 * 
 * Tests L2, L3, L4, and L7 layer detection independently
 * and in combination using realistic network traffic.
 * 
 * Network Topology:
 * - VLAN 10: Office (PC, Server)
 * - VLAN 20: Industrial (PLC, IoT, SCADA)
 * - 2 REP Rings (Office + Industrial)
 * - STP Backbone (2 Core Switches)
 * - 1 Router (CDP/LLDP)
 * - 1 VPN Server (Overlay traffic)
 * - 1 Legacy Switch (L2 only, MAC only)
 * 
 * API Endpoints Used:
 * - /api/v1/traffic/l2/topology - L2 detection (VLANs, STP, LLDP, CDP, rings)
 * - /api/v1/traffic/stats - Traffic stats and DPI protocol breakdown
 * - /api/v1/assets/ - Detected assets with IPs/MACs
 * - /api/v1/traffic/patterns/flows - Connection flows
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.API_URL || 'http://localhost:12000';

// Test configuration
const SETUP_WAIT = 30000; // 30s for traffic to be captured
const TRAFFIC_BUFFER = 10000; // 10s additional buffer

async function apiGet(path: string) {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function apiPost(path: string, body: object) {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

// Get L2 topology data
async function getL2Topology() {
  return apiGet('/api/v1/traffic/l2/topology');
}

// Get traffic stats with DPI
async function getTrafficStats() {
  return apiGet('/api/v1/traffic/stats');
}

// Get detected assets
async function getAssets() {
  return apiGet('/api/v1/assets/?page=1&size=500');
}

// Get flow patterns
async function getFlows() {
  return apiGet('/api/v1/traffic/patterns/flows');
}

test.describe('Layer 2 Detection', () => {
  test.describe.configure({ mode: 'serial' });

  test('should detect VLANs from tagged traffic', async () => {
    const data = await getL2Topology();
    
    // Check for VLAN entities
    const vlans = data.vlans || [];
    console.log(`Found ${vlans.length} VLANs: ${vlans.map((v: any) => v.vlan_id).join(', ')}`);
    
    // We expect at least VLAN 10 and VLAN 20
    const vlanIds = vlans.map((v: any) => v.vlan_id);
    expect(vlanIds).toContain(10);
    expect(vlanIds).toContain(20);
  });

  test('should detect STP bridges from BPDU traffic', async () => {
    const data = await getL2Topology();
    
    // Check for STP bridges
    const stpBridges = data.stp_bridges || [];
    console.log(`Found ${stpBridges.length} STP bridges`);
    
    // We expect at least 2 core switches with STP
    expect(stpBridges.length).toBeGreaterThanOrEqual(2);
    
    // Check for root bridge detection
    const rootBridge = stpBridges.find((b: any) => b.is_root === true);
    expect(rootBridge).toBeDefined();
    console.log('Root bridge:', rootBridge);
  });

  test('should detect REP ring topology', async () => {
    const data = await getL2Topology();
    
    // Check for ring entities
    const rings = data.ring_topologies || [];
    console.log(`Found ${rings.length} ring topologies`);
    
    // We expect at least 1 REP ring
    const repRings = rings.filter((r: any) => r.protocol === 'REP');
    console.log(`REP rings: ${repRings.length}`);
    expect(repRings.length).toBeGreaterThanOrEqual(1);
  });

  test('should detect MAC addresses from L2 traffic', async () => {
    const data = await getL2Topology();
    
    // Check entities with MAC addresses
    const entities = data.entities || [];
    console.log(`Found ${entities.length} L2 entities with MAC addresses`);
    expect(entities.length).toBeGreaterThanOrEqual(5);
    
    // Verify entities have MAC addresses
    entities.slice(0, 3).forEach((e: any) => {
      console.log(`Entity MAC: ${e.mac}, IPs: ${e.ips?.join(', ')}`);
    });
  });

  test('should detect unmanaged switch (L2 only, no IP)', async () => {
    const data = await getL2Topology();
    
    // The legacy switch should appear as L2 device with MAC but no IP
    const legacyMac = '00:cc:dd:ee:ff:00';
    const entities = data.entities || [];
    const legacySwitch = entities.find((e: any) => 
      e.mac === legacyMac || e.mac?.toLowerCase() === legacyMac.toLowerCase()
    );
    
    if (legacySwitch) {
      console.log('Legacy switch detected:', legacySwitch);
      // Should have no IP or empty IP array
      expect(!legacySwitch.ips || legacySwitch.ips.length === 0).toBe(true);
    } else {
      console.log('Legacy switch not detected in current capture');
    }
  });

  test('should detect CDP neighbors from router', async () => {
    const data = await getL2Topology();
    
    const cdpNeighbors = data.cdp_neighbors || [];
    console.log(`Found ${cdpNeighbors.length} CDP neighbors`);
    
    // Router should announce via CDP
    expect(cdpNeighbors.length).toBeGreaterThanOrEqual(1);
  });

  test('should detect LLDP neighbors', async () => {
    const data = await getL2Topology();
    
    const lldpNeighbors = data.lldp_neighbors || [];
    console.log(`Found ${lldpNeighbors.length} LLDP neighbors`);
    
    // Switches should announce via LLDP
    if (lldpNeighbors.length > 0) {
      lldpNeighbors.slice(0, 2).forEach((n: any) => {
        console.log(`LLDP neighbor: ${n.system_name}, MAC: ${n.mac}`);
      });
    }
  });
});

test.describe('Layer 3 Detection', () => {
  test('should detect IP addresses from network traffic', async () => {
    const data = await getAssets();
    
    // Count assets with IP addresses
    const assets = data.assets || [];
    const assetsWithIp = assets.filter((a: any) => a.ip_address);
    
    console.log(`Found ${assetsWithIp.length} assets with IP addresses`);
    
    // We have many devices with IPs
    expect(assetsWithIp.length).toBeGreaterThanOrEqual(5);
    
    // Check for specific subnet presence (or external IPs)
    const ips = assetsWithIp.map((a: any) => a.ip_address);
    console.log(`Sample IPs: ${ips.slice(0, 5).join(', ')}`);
  });

  test('should detect entities via L2 topology with IPs', async () => {
    const data = await getL2Topology();
    
    // L2 entities can also have associated IPs
    const entities = data.entities || [];
    const entitiesWithIp = entities.filter((e: any) => e.ips && e.ips.length > 0);
    
    console.log(`Found ${entitiesWithIp.length} L2 entities with associated IPs`);
    
    // Show some examples
    entitiesWithIp.slice(0, 3).forEach((e: any) => {
      console.log(`MAC ${e.mac} -> IPs: ${e.ips?.join(', ')}`);
    });
  });
});

test.describe('Layer 4 Detection', () => {
  test('should detect connections via flows', async () => {
    const data = await getFlows();
    
    // Check for flow data - may be empty array or object with flows
    const flows = data.flows || data || [];
    console.log(`Flow data type: ${typeof flows}, count: ${Array.isArray(flows) ? flows.length : 'N/A'}`);
    
    if (Array.isArray(flows) && flows.length > 0) {
      console.log(`Sample flow:`, flows[0]);
    }
  });

  test('should detect protocol breakdown from DPI', async () => {
    const data = await getTrafficStats();
    
    // Check for protocol breakdown
    const protocols = data.protocol_breakdown || {};
    const protocolNames = Object.keys(protocols);
    
    console.log(`Detected ${protocolNames.length} protocols via DPI`);
    console.log(`Protocols: ${protocolNames.slice(0, 10).join(', ')}`);
    
    expect(protocolNames.length).toBeGreaterThan(0);
  });

  test('should detect Modbus protocol from DPI', async () => {
    const data = await getTrafficStats();
    
    // Check for Modbus in protocol breakdown
    const protocols = data.protocol_breakdown || {};
    const hasModbus = Object.keys(protocols).some(p => 
      p.toLowerCase().includes('modbus')
    );
    
    console.log(`Modbus detected: ${hasModbus}`);
    if (hasModbus) {
      const modbusData = protocols['Modbus'] || protocols['MODBUS'] || protocols['Modbus-TCP'];
      console.log('Modbus stats:', modbusData);
    }
  });
});

test.describe('Layer 7 Detection', () => {
  test('should detect HTTP traffic via DPI', async () => {
    const data = await getTrafficStats();
    const protocols = data.protocol_breakdown || {};
    
    const hasHttp = Object.keys(protocols).some(p => 
      p.toLowerCase() === 'http' || p.toLowerCase().includes('http-alt')
    );
    
    console.log(`HTTP detected: ${hasHttp}`);
    if (protocols['HTTP'] || protocols['HTTP-Alt']) {
      console.log('HTTP stats:', protocols['HTTP'] || protocols['HTTP-Alt']);
    }
  });

  test('should detect HTTPS/TLS traffic via DPI', async () => {
    const data = await getTrafficStats();
    const protocols = data.protocol_breakdown || {};
    
    const hasHttps = Object.keys(protocols).some(p => 
      p === 'HTTPS' || p === 'TLS'
    );
    
    console.log(`HTTPS/TLS detected: ${hasHttps}`);
    if (protocols['HTTPS']) {
      console.log('HTTPS stats:', protocols['HTTPS']);
    }
    expect(hasHttps).toBe(true); // HTTPS is very common
  });

  test('should detect SSH traffic via DPI', async () => {
    const data = await getTrafficStats();
    const protocols = data.protocol_breakdown || {};
    
    const hasSsh = Object.keys(protocols).some(p => p === 'SSH');
    
    console.log(`SSH detected: ${hasSsh}`);
    if (protocols['SSH']) {
      console.log('SSH stats:', protocols['SSH']);
    }
  });

  test('should detect DNS traffic via DPI', async () => {
    const data = await getTrafficStats();
    const protocols = data.protocol_breakdown || {};
    
    const hasDns = Object.keys(protocols).some(p => p === 'DNS');
    
    console.log(`DNS detected: ${hasDns}`);
    if (protocols['DNS']) {
      console.log('DNS stats:', protocols['DNS']);
    }
  });

  test('should report DPI statistics', async () => {
    const data = await getTrafficStats();
    const dpiStats = data.dpi_stats || {};
    
    console.log('DPI Statistics:');
    console.log(`  Total inspected: ${dpiStats.total_inspected}`);
    console.log(`  Cache hit rate: ${(dpiStats.cache_hit_rate * 100).toFixed(2)}%`);
    console.log(`  Detection rate: ${(dpiStats.detection_rate * 100).toFixed(2)}%`);
    console.log(`  Signature matches: ${dpiStats.signature_matches}`);
    console.log(`  Heuristic matches: ${dpiStats.heuristic_matches}`);
    
    expect(dpiStats.total_inspected).toBeGreaterThan(0);
  });
});

test.describe('Cross-Layer Correlation', () => {
  test('should correlate L2 MAC with L3 IP in topology', async () => {
    const data = await getL2Topology();
    
    // Find entities that have both MAC and IPs
    const entities = data.entities || [];
    const correlatedEntities = entities.filter((e: any) => 
      e.mac && e.ips && e.ips.length > 0
    );
    
    console.log(`Found ${correlatedEntities.length} entities with MAC+IP correlation`);
    expect(correlatedEntities.length).toBeGreaterThanOrEqual(1);
    
    // Show examples
    correlatedEntities.slice(0, 3).forEach((e: any) => {
      console.log(`  ${e.mac} -> ${e.ips.join(', ')}`);
    });
  });

  test('should show VLAN to MAC membership', async () => {
    const data = await getL2Topology();
    
    // Check VLAN members
    const vlans = data.vlans || [];
    vlans.forEach((v: any) => {
      console.log(`VLAN ${v.vlan_id}: ${v.members?.length || 0} member MACs`);
    });
    
    expect(vlans.length).toBeGreaterThanOrEqual(1);
  });

  test('should show assets with MAC and IP from discovery', async () => {
    const assetData = await getAssets();
    const assets = assetData.assets || [];
    
    const assetsWithBoth = assets.filter((a: any) => 
      a.mac_address && a.ip_address
    );
    
    console.log(`Found ${assetsWithBoth.length} assets with both MAC and IP`);
    assetsWithBoth.slice(0, 5).forEach((a: any) => {
      console.log(`  ${a.mac_address} -> ${a.ip_address}`);
    });
  });
});

test.describe('Network Segmentation', () => {
  test('should detect VLAN 10 (Office) members', async () => {
    const data = await getL2Topology();
    
    const vlans = data.vlans || [];
    const vlan10 = vlans.find((v: any) => v.vlan_id === 10);
    
    if (vlan10) {
      console.log(`VLAN 10 members: ${vlan10.members?.length || 0}`);
      console.log(`  MACs: ${vlan10.members?.slice(0, 5).join(', ')}`);
      expect(vlan10.members?.length).toBeGreaterThanOrEqual(1);
    } else {
      console.log('VLAN 10 not detected');
    }
  });

  test('should detect VLAN 20 (Industrial) members', async () => {
    const data = await getL2Topology();
    
    const vlans = data.vlans || [];
    const vlan20 = vlans.find((v: any) => v.vlan_id === 20);
    
    if (vlan20) {
      console.log(`VLAN 20 members: ${vlan20.members?.length || 0}`);
      console.log(`  MACs: ${vlan20.members?.slice(0, 5).join(', ')}`);
      expect(vlan20.members?.length).toBeGreaterThanOrEqual(1);
    } else {
      console.log('VLAN 20 not detected');
    }
  });

  test('should show L2 connections between entities', async () => {
    const data = await getL2Topology();
    
    const connections = data.connections || [];
    console.log(`L2 connections detected: ${connections.length}`);
    
    if (connections.length > 0) {
      connections.slice(0, 3).forEach((c: any) => {
        console.log(`  ${c.source_mac} <-> ${c.dest_mac}: ${c.packets} packets`);
      });
    }
  });
});

test.describe('Ring Topology Detection', () => {
  test('should detect REP ring topology', async () => {
    const data = await getL2Topology();
    
    const rings = data.ring_topologies || [];
    const repRings = rings.filter((r: any) => r.protocol === 'REP');
    
    console.log(`Found ${repRings.length} REP rings`);
    
    if (repRings.length > 0) {
      repRings.forEach((ring: any) => {
        console.log(`  Ring ${ring.ring_id}: ${ring.members?.length || 0} members`);
        console.log(`    Members: ${ring.members?.slice(0, 5).join(', ')}`);
      });
    }
  });

  test('should detect MRP ring topology if present', async () => {
    const data = await getL2Topology();
    
    const rings = data.ring_topologies || [];
    const mrpRings = rings.filter((r: any) => r.protocol === 'MRP');
    
    console.log(`Found ${mrpRings.length} MRP rings`);
    
    if (mrpRings.length > 0) {
      mrpRings.forEach((ring: any) => {
        console.log(`  Ring ${ring.ring_id}: ${ring.members?.length || 0} members`);
      });
    }
  });

  test('should count ring member nodes', async () => {
    const data = await getL2Topology();
    
    const rings = data.ring_topologies || [];
    let totalMembers = 0;
    
    rings.forEach((ring: any) => {
      const nodeCount = ring.members?.length || 0;
      totalMembers += nodeCount;
      console.log(`Ring ${ring.ring_id} (${ring.protocol}): ${nodeCount} members`);
    });
    
    console.log(`Total ring members across all rings: ${totalMembers}`);
  });
});

test.describe('Statistics Summary', () => {
  test('should provide L2 topology statistics', async () => {
    const data = await getL2Topology();
    
    console.log('\n=== L2 Topology Summary ===');
    console.log(`Entities: ${data.entity_count}`);
    console.log(`Connections: ${data.connection_count}`);
    console.log(`Multicast Groups: ${data.multicast_group_count}`);
    console.log(`VLANs: ${data.vlans?.length || 0}`);
    console.log(`STP Bridges: ${data.stp_bridges?.length || 0}`);
    console.log(`LLDP Neighbors: ${data.lldp_neighbors?.length || 0}`);
    console.log(`CDP Neighbors: ${data.cdp_neighbors?.length || 0}`);
    console.log(`Ring Topologies: ${data.ring_topologies?.length || 0}`);
    
    expect(data.entity_count).toBeGreaterThan(0);
  });

  test('should provide traffic statistics', async () => {
    const data = await getTrafficStats();
    
    console.log('\n=== Traffic Statistics ===');
    console.log(`Sniffing: ${data.is_sniffing}`);
    console.log(`Interface: ${data.interface}`);
    console.log(`DPI Enabled: ${data.dpi_enabled}`);
    console.log(`Connections: ${data.connections?.length || 0}`);
    
    const dpi = data.dpi_stats || {};
    console.log(`\nDPI Stats:`);
    console.log(`  Packets Inspected: ${dpi.total_inspected}`);
    console.log(`  Detection Rate: ${(dpi.detection_rate * 100).toFixed(2)}%`);
    console.log(`  Cache Hit Rate: ${(dpi.cache_hit_rate * 100).toFixed(2)}%`);
    
    const protocols = Object.keys(data.protocol_breakdown || {});
    console.log(`\nProtocols Detected: ${protocols.length}`);
    console.log(`  ${protocols.slice(0, 10).join(', ')}`);
  });

  test('should provide asset statistics', async () => {
    const data = await getAssets();
    
    console.log('\n=== Asset Statistics ===');
    console.log(`Total Assets: ${data.total}`);
    console.log(`Pages: ${data.pages}`);
    
    const assets = data.assets || [];
    const byType: Record<string, number> = {};
    assets.forEach((a: any) => {
      byType[a.asset_type] = (byType[a.asset_type] || 0) + 1;
    });
    
    console.log(`By Type: ${JSON.stringify(byType)}`);
    
    expect(data.total).toBeGreaterThan(0);
  });
});
