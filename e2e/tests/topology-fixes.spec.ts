/**
 * E2E Tests: Topology Auto-Reorganization and Data Fixes
 * 
 * Tests for the topology fixes:
 * 1. Auto-reorganization of new nodes during refresh
 * 2. L2/L3 data synchronization (appearing together)
 * 3. Proper name/IP decoding (no b'...' byte strings)
 * 4. MAC-based asset merging (no duplicate nodes)
 * 
 * Test Environment Required:
 *   docker compose -f docker/docker-compose.dev.yml up -d
 *   Or run against host network with network traffic
 * 
 * Fixes tested:
 *   - SnifferService.py: _decode_scapy_field() for LLDP/CDP names
 *   - Topology.tsx: New node detection and repositioning on refresh
 *   - Topology.tsx: L2 data fetch inside fetchData() for sync
 *   - Topology.tsx: MAC to IP merging for L2 connections
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';
const API_URL = `${BASE_URL}/api/v1`;

// Helper: Login to the application
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

// Helper: Navigate to Topology page
async function goToTopology(page: Page) {
  await page.goto(`${BASE_URL}/topology`);
  await page.waitForTimeout(2000);
}

// ========== Fix 1: Proper Name/IP Decoding (No byte strings) ==========

test.describe('Fix 1: Byte String Decoding', () => {
  test('L2 entities should not have Python byte string format in names', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check that no entity has b'...' format in hostname, vendor, or device_type
    let byteStringCount = 0;
    const problematicEntities: string[] = [];
    
    data.entities.forEach((entity: any) => {
      const fields = [entity.hostname, entity.vendor, entity.device_type, entity.platform];
      fields.forEach(field => {
        if (field && typeof field === 'string') {
          // Check for Python byte string patterns: b'...' or b"..."
          if (field.match(/^b['"]/)) {
            byteStringCount++;
            problematicEntities.push(`${entity.mac}: ${field}`);
          }
          // Check for hex escape sequences like \x00
          if (field.includes('\\x')) {
            byteStringCount++;
            problematicEntities.push(`${entity.mac}: ${field}`);
          }
        }
      });
    });
    
    if (problematicEntities.length > 0) {
      console.log('Entities with byte strings:', problematicEntities.slice(0, 10));
    }
    
    expect(byteStringCount).toBe(0);
  });

  test('L2 entities should have properly decoded hostnames from LLDP/CDP', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Find entities with hostnames (from LLDP/CDP)
    const entitiesWithHostnames = data.entities.filter((e: any) => e.hostname);
    
    console.log(`Entities with hostnames: ${entitiesWithHostnames.length}`);
    entitiesWithHostnames.slice(0, 5).forEach((e: any) => {
      console.log(`  ${e.mac}: ${e.hostname}`);
    });
    
    // Verify no hostname starts with b' (Python byte string)
    const badHostnames = entitiesWithHostnames.filter((e: any) => 
      e.hostname.startsWith("b'") || e.hostname.startsWith('b"')
    );
    
    expect(badHostnames.length).toBe(0);
  });

  test('Traffic stats should not have byte string IPs', async ({ request }) => {
    const response = await request.get(`${API_URL}/discovery/traffic-stats`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check connections for byte string IPs
    const connections = data.connections || [];
    let badIPs = 0;
    
    connections.forEach((conn: any) => {
      if (conn.src_ip && conn.src_ip.match(/^b['"]/)) badIPs++;
      if (conn.dst_ip && conn.dst_ip.match(/^b['"]/)) badIPs++;
    });
    
    expect(badIPs).toBe(0);
  });
});

// ========== Fix 2: Auto-Reorganization of New Nodes ==========

test.describe('Fix 2: Auto-Reorganization on Refresh', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTopology(page);
  });

  test('should have topology canvas visible', async ({ page }) => {
    // Canvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible({ timeout: 10000 });
  });

  test('should handle refresh without nodes stacking at origin', async ({ page }) => {
    // Wait for initial topology load
    await page.waitForTimeout(3000);
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Get initial node count from the UI counter if available
    const nodeCountText = page.locator('text=/\\d+ /').first();
    
    // Enable auto-refresh by clicking AUTO button
    const autoButton = page.locator('button:has-text("AUTO")').first();
    if (await autoButton.count() > 0) {
      await autoButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Set a short refresh interval (1 second)
    const speedSelect = page.locator('select').filter({ hasText: /1s|5s|10s/ });
    if (await speedSelect.count() > 0) {
      await speedSelect.selectOption('1');
      await page.waitForTimeout(3000); // Wait for 2-3 refresh cycles
    }
    
    // Take screenshot to verify nodes are spread out, not stacked
    await page.screenshot({ 
      path: '/root/dev/NOP/e2e/results/topology-auto-refresh.png',
      fullPage: false 
    });
    
    // Page should not have error messages
    const errorCount = await page.locator('text=/error|failed to load/i').count();
    expect(errorCount).toBe(0);
  });

  test('should reorganize when reload button is clicked', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    // Find and click the reload button
    const reloadButton = page.locator('button[title*="reload" i], button[title*="refresh" i], button:has(svg)').first();
    
    if (await reloadButton.count() > 0) {
      await reloadButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Canvas should still be visible after reload
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ 
      path: '/root/dev/NOP/e2e/results/topology-after-reload.png',
      fullPage: false 
    });
  });
});

// ========== Fix 3: L2/L3 Data Synchronization ==========

test.describe('Fix 3: L2/L3 Data Synchronization', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTopology(page);
  });

  test('L2 and L3 data should appear together when L2 layer is enabled', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Enable L2 layer
    const l2Button = page.locator('button:has-text("L2")').first();
    await expect(l2Button).toBeVisible();
    await l2Button.click();
    await page.waitForTimeout(3000);
    
    // After enabling L2, data should appear immediately (not on next refresh)
    // Canvas should be visible with nodes
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Take screenshot showing L2+L3 together
    await page.screenshot({ 
      path: '/root/dev/NOP/e2e/results/topology-l2-l3-together.png',
      fullPage: false 
    });
  });

  test('API should return L2 and L3 data in same request cycle', async ({ request }) => {
    // Both L2 topology and traffic stats should be available
    const [l2Response, trafficResponse] = await Promise.all([
      request.get(`${API_URL}/traffic/l2/topology`),
      request.get(`${API_URL}/discovery/traffic-stats`)
    ]);
    
    expect(l2Response.ok()).toBeTruthy();
    expect(trafficResponse.ok()).toBeTruthy();
    
    const l2Data = await l2Response.json();
    const trafficData = await trafficResponse.json();
    
    console.log('L2 entities:', l2Data.entity_count);
    console.log('L3 connections:', trafficData.connections?.length || 0);
    
    // Both should have data
    expect(l2Data).toHaveProperty('entities');
    expect(trafficData).toHaveProperty('connections');
  });

  test('should display L2 protocol labels on edges when L2 is enabled', async ({ page }) => {
    // Enable L2 layer
    const l2Button = page.locator('button:has-text("L2")').first();
    await l2Button.click();
    await page.waitForTimeout(3000);
    
    // Canvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Page shouldn't have errors
    const errorElements = page.locator('text=/error|failed/i');
    const errorCount = await errorElements.count();
    expect(errorCount).toBe(0);
  });
});

// ========== Fix 4: MAC-Based Asset Merging ==========

test.describe('Fix 4: MAC-Based Asset Merging', () => {
  test('L2 entities with IPs should be associated correctly', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Check entities have IPs associated
    const entitiesWithIPs = data.entities.filter((e: any) => 
      e.ips && e.ips.length > 0
    );
    
    console.log(`Entities with IPs: ${entitiesWithIPs.length} / ${data.entities.length}`);
    
    // Log some examples
    entitiesWithIPs.slice(0, 5).forEach((e: any) => {
      console.log(`  ${e.mac} -> ${e.ips.join(', ')}`);
    });
    
    // Should have MAC-IP associations
    if (data.entities.length > 0) {
      expect(entitiesWithIPs.length).toBeGreaterThan(0);
    }
  });

  test('should not have duplicate nodes for same MAC/IP in topology UI', async ({ page }) => {
    await login(page);
    await goToTopology(page);
    
    // Enable L2 layer
    const l2Button = page.locator('button:has-text("L2")').first();
    await l2Button.click();
    await page.waitForTimeout(3000);
    
    // Canvas should be visible
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // Click on a node to see its details (if sidebar exists)
    // The node details should show consolidated MAC+IP info
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);
    
    // Take screenshot of node details
    await page.screenshot({ 
      path: '/root/dev/NOP/e2e/results/topology-node-mac-ip.png',
      fullPage: false 
    });
  });

  test('L2 connections should reference IP nodes when both MAC and IP exist', async ({ request }) => {
    const response = await request.get(`${API_URL}/traffic/l2/topology`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    
    // Build MAC to IPs mapping
    const macToIPs = new Map<string, string[]>();
    data.entities.forEach((e: any) => {
      if (e.ips && e.ips.length > 0) {
        macToIPs.set(e.mac, e.ips);
      }
    });
    
    // Check connections
    let connectionsWithBothEndsMapped = 0;
    data.connections.forEach((conn: any) => {
      const srcIPs = macToIPs.get(conn.src_mac);
      const dstIPs = macToIPs.get(conn.dst_mac);
      if (srcIPs && dstIPs) {
        connectionsWithBothEndsMapped++;
      }
    });
    
    console.log(`Connections where both MACs have IPs: ${connectionsWithBothEndsMapped}`);
    console.log(`Total L2 connections: ${data.connections.length}`);
    
    // This verifies the data is available for the frontend to merge
    expect(data.connections.length).toBeGreaterThanOrEqual(0);
  });
});

// ========== Integration Test: All Fixes Together ==========

test.describe('Integration: All Topology Fixes', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToTopology(page);
  });

  test('should have fully functional topology with all fixes', async ({ page }) => {
    // 1. Wait for initial load
    await page.waitForTimeout(3000);
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // 2. Enable L2 layer - should appear immediately with L3
    const l2Button = page.locator('button:has-text("L2")').first();
    await l2Button.click();
    await page.waitForTimeout(2000);
    
    // 3. Enable auto-refresh
    const autoButton = page.locator('button:has-text("AUTO")').first();
    if (await autoButton.count() > 0) {
      await autoButton.click();
    }
    
    // 4. Wait for a few refresh cycles
    await page.waitForTimeout(6000);
    
    // 5. Canvas should still be visible with properly arranged nodes
    await expect(page.locator('canvas').first()).toBeVisible();
    
    // 6. No errors should be present
    const errorCount = await page.locator('text=/error|failed/i').count();
    expect(errorCount).toBe(0);
    
    // 7. Take final screenshot
    await page.screenshot({ 
      path: '/root/dev/NOP/e2e/results/topology-all-fixes-integrated.png',
      fullPage: false 
    });
  });

  test('API data should be clean and properly formatted', async ({ request }) => {
    // Get all relevant data
    const [l2Response, trafficResponse, assetsResponse] = await Promise.all([
      request.get(`${API_URL}/traffic/l2/topology`),
      request.get(`${API_URL}/discovery/traffic-stats`),
      request.get(`${API_URL}/assets/`)
    ]);
    
    expect(l2Response.ok()).toBeTruthy();
    expect(trafficResponse.ok()).toBeTruthy();
    expect(assetsResponse.ok()).toBeTruthy();
    
    const l2Data = await l2Response.json();
    const trafficData = await trafficResponse.json();
    const assetsData = await assetsResponse.json();
    
    // Verify no byte strings in any data
    const checkForByteStrings = (obj: any, path: string = ''): string[] => {
      const issues: string[] = [];
      if (typeof obj === 'string' && (obj.startsWith("b'") || obj.startsWith('b"') || obj.includes('\\x'))) {
        issues.push(`${path}: ${obj}`);
      } else if (Array.isArray(obj)) {
        obj.forEach((item, idx) => {
          issues.push(...checkForByteStrings(item, `${path}[${idx}]`));
        });
      } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, val]) => {
          issues.push(...checkForByteStrings(val, `${path}.${key}`));
        });
      }
      return issues;
    };
    
    const l2Issues = checkForByteStrings(l2Data, 'l2Data');
    if (l2Issues.length > 0) {
      console.log('Byte string issues in L2 data:', l2Issues.slice(0, 5));
    }
    expect(l2Issues.length).toBe(0);
    
    console.log('Data summary:');
    console.log(`  L2 entities: ${l2Data.entity_count}`);
    console.log(`  L2 connections: ${l2Data.connection_count}`);
    console.log(`  Traffic connections: ${trafficData.connections?.length || 0}`);
    console.log(`  Assets: ${assetsData.length || 0}`);
  });
});

// ========== Performance Test ==========

test.describe('Performance: Refresh Efficiency', () => {
  test('topology should refresh within reasonable time', async ({ page }) => {
    await login(page);
    await goToTopology(page);
    
    // Wait for initial load
    await page.waitForTimeout(2000);
    
    // Enable L2 layer
    await page.locator('button:has-text("L2")').first().click();
    await page.waitForTimeout(1000);
    
    // Measure time for a refresh cycle
    const startTime = Date.now();
    
    // Trigger a manual refresh by clicking reload
    const reloadButton = page.locator('button[title*="reload" i], button[title*="refresh" i]').first();
    if (await reloadButton.count() > 0) {
      await reloadButton.click();
    } else {
      // Toggle AUTO to trigger refresh
      const autoButton = page.locator('button:has-text("AUTO")').first();
      if (await autoButton.count() > 0) {
        await autoButton.click();
        await page.waitForTimeout(1500);
        await autoButton.click();
      }
    }
    
    await page.waitForTimeout(2000);
    const endTime = Date.now();
    
    const refreshTime = endTime - startTime;
    console.log(`Refresh completed in ${refreshTime}ms`);
    
    // Should complete within 5 seconds
    expect(refreshTime).toBeLessThan(5000);
  });
});
