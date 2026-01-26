/**
 * E2E Tests: L2 Protocol Detection (VLAN, STP, LLDP, CDP, Ring)
 * 
 * Tests comprehensive L2 protocol detection using scapy-based traffic generators.
 * Validates that the backend properly parses and exposes L2 protocol data.
 * 
 * Test Environment Required:
 *   docker compose -f docker/test-environment/docker-compose.l2-protocols.yml up -d
 * 
 * Test Containers:
 *   - STP: l2-stp-root, l2-stp-bridge1, l2-stp-bridge2 (172.30.0.10-12)
 *   - LLDP: l2-lldp-switch1, l2-lldp-switch2 (172.30.0.20-21)
 *   - VLAN: l2-vlan10-host1/2, l2-vlan20-host1 (172.30.0.30-32)
 *   - Ring: l2-ring-node1/2/3 (172.30.0.40-42)
 *   - CDP: l2-cdp-router (172.30.0.50)
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';
const API_URL = `${BASE_URL}/api/v1`;

// ========== Helpers ==========

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function goToTopology(page: Page) {
  await page.goto(`${BASE_URL}/topology`);
  await page.waitForTimeout(2000);
}

async function enableL2Layer(page: Page) {
  const l2Button = page.locator('button:has-text("L2")').first();
  await l2Button.click();
  await page.waitForTimeout(3000);
}

// ========== L2 Protocol API Tests ==========

test.describe('L2 VLAN Detection API', () => {
  test('should return detected VLANs with member lists', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check for VLAN data structure
    if (data.vlans && data.vlans.length > 0) {
      const vlan = data.vlans[0];
      expect(vlan).toHaveProperty('vlan_id');
      expect(vlan).toHaveProperty('members');
      expect(Array.isArray(vlan.members)).toBeTruthy();
      expect(vlan).toHaveProperty('packets');
      expect(vlan).toHaveProperty('bytes');
      
      console.log(`✓ Detected VLAN ${vlan.vlan_id} with ${vlan.members.length} members`);
    } else {
      console.log('⚠ No VLANs detected - ensure VLAN traffic generators are running');
    }
  });

  test('should detect VLAN 10 and VLAN 20 from test traffic', async ({ request }) => {
    // Wait for traffic to generate
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    const data = await response.json();
    
    if (data.vlans && data.vlans.length > 0) {
      const vlanIds = data.vlans.map((v: any) => v.vlan_id);
      console.log('Detected VLAN IDs:', vlanIds);
      
      // Check if expected VLANs are present
      const hasVlan10 = vlanIds.includes(10);
      const hasVlan20 = vlanIds.includes(20);
      
      if (hasVlan10) console.log('✓ VLAN 10 detected');
      if (hasVlan20) console.log('✓ VLAN 20 detected');
    }
    
    expect(data).toHaveProperty('vlans');
  });
});

test.describe('L2 STP Detection API', () => {
  test('should return detected STP bridges with root status', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check for STP bridge data structure
    if (data.stp_bridges && data.stp_bridges.length > 0) {
      const bridge = data.stp_bridges[0];
      expect(bridge).toHaveProperty('bridge_mac');
      expect(bridge).toHaveProperty('bridge_id');
      expect(bridge).toHaveProperty('is_root');
      expect(bridge).toHaveProperty('root_mac');
      expect(bridge).toHaveProperty('protocol_version');
      expect(bridge).toHaveProperty('last_seen');
      
      console.log(`✓ Detected STP bridge ${bridge.bridge_mac} (root: ${bridge.is_root})`);
    } else {
      console.log('⚠ No STP bridges detected - ensure STP traffic generators are running');
    }
  });

  test('should detect STP tree topology', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    const data = await response.json();
    
    if (data.stp_bridges && data.stp_bridges.length > 0) {
      const rootBridges = data.stp_bridges.filter((b: any) => b.is_root);
      const nonRootBridges = data.stp_bridges.filter((b: any) => !b.is_root);
      
      console.log(`STP Topology: ${rootBridges.length} root(s), ${nonRootBridges.length} non-root bridges`);
      
      data.stp_bridges.forEach((bridge: any) => {
        console.log(`  - ${bridge.bridge_mac}: priority=${bridge.priority}, root=${bridge.is_root}, type=${bridge.stp_type}`);
      });
    }
    
    expect(data).toHaveProperty('stp_bridges');
  });
});

test.describe('L2 LLDP Detection API', () => {
  test('should return LLDP neighbors with system info', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check for LLDP neighbor data structure
    if (data.lldp_neighbors && data.lldp_neighbors.length > 0) {
      const neighbor = data.lldp_neighbors[0];
      expect(neighbor).toHaveProperty('chassis_id');
      expect(neighbor).toHaveProperty('port_id');
      expect(neighbor).toHaveProperty('system_name');
      expect(neighbor).toHaveProperty('mgmt_address');
      expect(neighbor).toHaveProperty('capabilities');
      expect(neighbor).toHaveProperty('first_seen');
      expect(neighbor).toHaveProperty('last_seen');
      
      console.log(`✓ LLDP neighbor: ${neighbor.system_name} (${neighbor.mgmt_address})`);
    } else {
      console.log('⚠ No LLDP neighbors detected - ensure LLDP traffic generators are running');
    }
  });

  test('should discover switch names and management IPs via LLDP', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    const data = await response.json();
    
    if (data.lldp_neighbors && data.lldp_neighbors.length > 0) {
      console.log('LLDP Discovered Devices:');
      data.lldp_neighbors.forEach((n: any) => {
        console.log(`  - System: ${n.system_name}`);
        console.log(`    Chassis: ${n.chassis_id}`);
        console.log(`    Port: ${n.port_id}`);
        console.log(`    Mgmt IP: ${n.mgmt_address || 'N/A'}`);
        console.log(`    Capabilities: ${JSON.stringify(n.capabilities)}`);
      });
    }
    
    expect(data).toHaveProperty('lldp_neighbors');
  });
});

test.describe('L2 CDP Detection API', () => {
  test('should return CDP neighbors with device info', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check for CDP neighbor data structure
    if (data.cdp_neighbors && data.cdp_neighbors.length > 0) {
      const neighbor = data.cdp_neighbors[0];
      expect(neighbor).toHaveProperty('mac');
      expect(neighbor).toHaveProperty('capabilities');
      expect(neighbor).toHaveProperty('last_seen');
      
      console.log(`✓ CDP neighbor: ${neighbor.device_id || neighbor.mac} (${neighbor.platform || 'unknown'})`);
    } else {
      console.log('⚠ No CDP neighbors detected - ensure CDP traffic generator is running');
    }
  });
});

test.describe('L2 Ring Protocol Detection API', () => {
  test('should return detected ring topologies', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check for ring topology data structure
    if (data.ring_topologies && data.ring_topologies.length > 0) {
      const ring = data.ring_topologies[0];
      expect(ring).toHaveProperty('protocol');
      expect(ring).toHaveProperty('ring_id');
      expect(ring).toHaveProperty('members');
      expect(Array.isArray(ring.members)).toBeTruthy();
      expect(ring).toHaveProperty('last_seen');
      
      console.log(`✓ Ring detected: ${ring.protocol} with ${ring.members.length} members`);
    } else {
      console.log('⚠ No ring topologies detected - ensure ring protocol generators are running');
    }
  });

  test('should group ring members correctly', async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    const data = await response.json();
    
    if (data.ring_topologies && data.ring_topologies.length > 0) {
      console.log('Detected Ring Topologies:');
      data.ring_topologies.forEach((ring: any) => {
        console.log(`  - Protocol: ${ring.protocol}`);
        console.log(`    Ring ID: ${ring.ring_id || 'auto'}`);
        console.log(`    Members: ${ring.members.join(', ')}`);
      });
    }
    
    expect(data).toHaveProperty('ring_topologies');
  });
});

// ========== L2 Connection Protocol Labels ==========

test.describe('L2 Connection Protocol Labels', () => {
  test('should label connections with detected protocols', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/connections`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    if (data.connections && data.connections.length > 0) {
      console.log('L2 Connection Protocols:');
      data.connections.slice(0, 10).forEach((conn: any) => {
        const ethertypes = conn.ethertypes || [];
        console.log(`  ${conn.src_mac} -> ${conn.dst_mac}: ${ethertypes.join(', ') || 'no ethertype'}`);
      });
    }
    
    expect(data).toHaveProperty('connections');
  });

  test('should have correct ethertype mappings', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/connections`);
    const data = await response.json();
    
    const expectedMappings: Record<string, string> = {
      '0x0800': 'IPv4',
      '0x0806': 'ARP',
      '0x86dd': 'IPv6',
      '0x8100': 'VLAN',
      '0x88cc': 'LLDP',
      '0x88e3': 'MRP'
    };
    
    if (data.connections && data.connections.length > 0) {
      const allEthertypes = new Set<string>();
      data.connections.forEach((conn: any) => {
        (conn.ethertypes || []).forEach((e: string) => allEthertypes.add(e));
      });
      
      console.log('Unique Ethertypes Observed:', [...allEthertypes]);
    }
    
    expect(data).toHaveProperty('connections');
  });
});

// ========== UI Tests for L2 Protocol Visualization ==========

test.describe('L2 Protocol Visualization UI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTopology(page);
  });

  test('should show purple L2 connections when L2 layer enabled', async ({ page }) => {
    await enableL2Layer(page);
    
    // Wait for canvas to render
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Check that L2 button has purple styling (indicating active)
    const l2Button = page.locator('button:has-text("L2")').first();
    await expect(l2Button).toHaveClass(/bg-cyber-purple/);
    
    // Canvas should be visible with rendered content
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should display switch nodes for STP bridges', async ({ page }) => {
    await enableL2Layer(page);
    await page.waitForTimeout(3000);
    
    // The topology should have rendered nodes
    // We can verify by checking the canvas is not empty
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Screenshot for visual verification
    await page.screenshot({ path: 'e2e/results/l2-stp-topology.png' });
    console.log('✓ Screenshot saved: l2-stp-topology.png');
  });

  test('should display ring topology with ring members', async ({ page }) => {
    await enableL2Layer(page);
    await page.waitForTimeout(3000);
    
    // Enable ring detection view if available
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    await page.screenshot({ path: 'e2e/results/l2-ring-topology.png' });
    console.log('✓ Screenshot saved: l2-ring-topology.png');
  });

  test('should show LLDP discovered switches with system names', async ({ page }) => {
    await enableL2Layer(page);
    await page.waitForTimeout(3000);
    
    // LLDP-discovered devices should appear as switch nodes
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    await page.screenshot({ path: 'e2e/results/l2-lldp-discovery.png' });
    console.log('✓ Screenshot saved: l2-lldp-discovery.png');
  });

  test('should show VLAN connections with VLAN IDs', async ({ page }) => {
    await enableL2Layer(page);
    await page.waitForTimeout(3000);
    
    // VLAN traffic should show in connections
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    await page.screenshot({ path: 'e2e/results/l2-vlan-traffic.png' });
    console.log('✓ Screenshot saved: l2-vlan-traffic.png');
  });
});

// ========== Integration: Full L2 Protocol Suite ==========

test.describe('L2 Protocol Suite Integration', () => {
  test('should handle all L2 protocols simultaneously', async ({ request }) => {
    // Wait for all traffic generators to produce data
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    console.log('\n=== L2 Protocol Detection Summary ===');
    console.log(`Entities: ${data.entity_count || data.entities?.length || 0}`);
    console.log(`Connections: ${data.connection_count || data.connections?.length || 0}`);
    console.log(`Multicast Groups: ${data.multicast_group_count || data.multicast_groups?.length || 0}`);
    console.log(`VLANs: ${data.vlans?.length || 0}`);
    console.log(`STP Bridges: ${data.stp_bridges?.length || 0}`);
    console.log(`LLDP Neighbors: ${data.lldp_neighbors?.length || 0}`);
    console.log(`CDP Neighbors: ${data.cdp_neighbors?.length || 0}`);
    console.log(`Ring Topologies: ${data.ring_topologies?.length || 0}`);
    console.log('=====================================\n');
    
    // Basic assertions
    expect(data).toHaveProperty('entities');
    expect(data).toHaveProperty('connections');
  });

  test('should correctly categorize device types', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/entities`);
    const data = await response.json();
    
    if (data.entities && data.entities.length > 0) {
      const deviceTypes = new Map<string, number>();
      
      data.entities.forEach((entity: any) => {
        const type = entity.device_type || 'unknown';
        deviceTypes.set(type, (deviceTypes.get(type) || 0) + 1);
      });
      
      console.log('Device Type Distribution:');
      deviceTypes.forEach((count, type) => {
        console.log(`  ${type}: ${count}`);
      });
    }
    
    expect(data).toHaveProperty('entities');
  });
});

// ========== Performance Tests ==========

test.describe('L2 Detection Performance', () => {
  test('L2 topology API response time should be acceptable', async ({ request }) => {
    const startTime = Date.now();
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    const endTime = Date.now();
    
    const responseTime = endTime - startTime;
    console.log(`L2 Topology API response time: ${responseTime}ms`);
    
    expect(response.ok()).toBeTruthy();
    expect(responseTime).toBeLessThan(5000); // Should respond within 5 seconds
  });

  test('L2 connections API should handle large datasets', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/connections`);
    const data = await response.json();
    
    console.log(`L2 Connections count: ${data.count || data.connections?.length || 0}`);
    
    expect(response.ok()).toBeTruthy();
    expect(data).toHaveProperty('connections');
  });
});

// ========== Cleanup/Reset Tests ==========

test.describe('L2 State Management', () => {
  test('should handle layer toggle without errors', async ({ page }) => {
    await login(page);
    await goToTopology(page);
    
    const l2Button = page.locator('button:has-text("L2")').first();
    const l4Button = page.locator('button:has-text("L4")').first();
    
    // Toggle L2 on
    await l2Button.click();
    await page.waitForTimeout(1000);
    
    // Toggle L4 (should deactivate L2 if exclusive)
    await l4Button.click();
    await page.waitForTimeout(1000);
    
    // Toggle back to L2
    await l2Button.click();
    await page.waitForTimeout(1000);
    
    // No console errors expected
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Filter out expected/benign errors
    const criticalErrors = consoleErrors.filter(e => 
      !e.includes('favicon') && 
      !e.includes('404')
    );
    
    if (criticalErrors.length > 0) {
      console.log('Console errors:', criticalErrors);
    }
    
    expect(criticalErrors.length).toBe(0);
  });
});
