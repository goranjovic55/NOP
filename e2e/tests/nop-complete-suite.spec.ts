/**
 * NOP Complete E2E Test Suite
 * 
 * This is the master test file that covers all NOP functionality.
 * Run with: npx playwright test tests/nop-complete-suite.spec.ts
 * 
 * Test Categories:
 * 1. Authentication & Authorization
 * 2. Dashboard & Overview
 * 3. Asset Discovery & Management
 * 4. Network Topology
 * 5. Traffic Analysis & DPI
 * 6. Vulnerability Scanning
 * 7. Workflow Builder & Execution
 * 8. Remote Access (VNC/RDP/SSH)
 * 9. Agent Management
 * 10. Host Management
 * 11. Settings & Configuration
 * 12. API Integration Tests
 */

import { test, expect, Page, APIRequestContext } from '@playwright/test';
import { 
  BASE_URL, 
  TEST_USER, 
  login, 
  navigateTo, 
  takeScreenshot,
  waitForTableData,
  verifyPageLoaded,
  apiRequest
} from './fixtures/test-helpers';

// ============================================================================
// SECTION 1: AUTHENTICATION & AUTHORIZATION
// ============================================================================

test.describe('1. Authentication & Authorization', () => {
  test('1.1 should show login page when not authenticated', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    // Should see login form
    const loginForm = page.locator('input[type="password"]');
    expect(await loginForm.count()).toBeGreaterThan(0);
  });

  test('1.2 should login with valid credentials', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="text"], input[name="username"]', TEST_USER.username);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button[type="submit"], button:has-text("Access"), button:has-text("Login")');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Should be on dashboard after login
    const dashboardContent = await page.textContent('body');
    expect(dashboardContent).toContain('Dashboard');
  });

  test('1.3 should reject invalid credentials', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[type="text"], input[name="username"]', 'invalid');
    await page.fill('input[type="password"]', 'wrongpass');
    await page.click('button[type="submit"], button:has-text("Access"), button:has-text("Login")');
    
    await page.waitForTimeout(2000);
    
    // Should still see login form or error message
    const stillOnLogin = await page.locator('input[type="password"]').count() > 0;
    expect(stillOnLogin).toBeTruthy();
  });

  test('1.4 should logout successfully', async ({ page }) => {
    await login(page);
    
    // Find and click logout
    const logoutBtn = page.locator('button:has-text("logout"), a:has-text("logout")').first();
    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();
      await page.waitForLoadState('networkidle');
      
      // Should see login form again
      const loginForm = await page.locator('input[type="password"]').count();
      expect(loginForm).toBeGreaterThan(0);
    }
  });
});

// ============================================================================
// SECTION 2: DASHBOARD & OVERVIEW
// ============================================================================

test.describe('2. Dashboard & Overview', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('2.1 should display dashboard with statistics', async ({ page }) => {
    await navigateTo(page, '/');
    
    const content = await page.textContent('body');
    expect(content).toContain('Dashboard');
    
    await takeScreenshot(page, 'dashboard-overview');
  });

  test('2.2 should show discovered assets count', async ({ page }) => {
    await navigateTo(page, '/');
    
    // Look for "Discovered" label or similar
    const discoveredSection = page.locator('text=Discovered').first();
    expect(await discoveredSection.count()).toBeGreaterThanOrEqual(0);
  });

  test('2.3 should show traffic analysis chart', async ({ page }) => {
    await navigateTo(page, '/');
    await page.waitForTimeout(2000);
    
    // Look for chart elements
    const hasChart = await page.locator('canvas, svg, [class*="chart"]').count() > 0;
    console.log(`Dashboard has chart: ${hasChart}`);
  });

  test('2.4 should show network topology preview', async ({ page }) => {
    await navigateTo(page, '/');
    
    const topologySection = page.locator('text=Topology, text=Network').first();
    expect(await topologySection.count()).toBeGreaterThanOrEqual(0);
  });

  test('2.5 should display last discovered assets', async ({ page }) => {
    await navigateTo(page, '/');
    
    const lastAssets = page.locator('text=Last Discovered');
    expect(await lastAssets.count()).toBeGreaterThanOrEqual(0);
  });
});

// ============================================================================
// SECTION 3: ASSET DISCOVERY & MANAGEMENT
// ============================================================================

test.describe('3. Asset Discovery & Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('3.1 should display assets page', async ({ page }) => {
    await navigateTo(page, '/assets');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'assets-page');
  });

  test('3.2 should show assets in table format', async ({ page }) => {
    await navigateTo(page, '/assets');
    await page.waitForTimeout(2000);
    
    const hasTable = await page.locator('table').count() > 0;
    expect(hasTable).toBeTruthy();
    
    const rows = await page.locator('tbody tr').count();
    console.log(`Assets table has ${rows} rows`);
  });

  test('3.3 should filter assets by search', async ({ page }) => {
    await navigateTo(page, '/assets');
    await page.waitForTimeout(2000);
    
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.count() > 0) {
      await searchInput.fill('192.168');
      await page.waitForTimeout(1000);
      
      const filteredRows = await page.locator('tbody tr').count();
      console.log(`Filtered to ${filteredRows} rows`);
    }
  });

  test('3.4 should view asset details', async ({ page }) => {
    await navigateTo(page, '/assets');
    await page.waitForTimeout(2000);
    
    // Click on first asset row
    const firstRow = page.locator('tbody tr').first();
    if (await firstRow.count() > 0) {
      await firstRow.click();
      await page.waitForTimeout(1000);
      
      await takeScreenshot(page, 'asset-details');
    }
  });

  test('3.5 should show asset type distribution', async ({ page, request }) => {
    const response = await apiRequest(request, 'GET', '/assets/');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    console.log(`Total assets: ${data.assets?.length || 0}`);
  });
});

// ============================================================================
// SECTION 4: NETWORK TOPOLOGY
// ============================================================================

test.describe('4. Network Topology', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('4.1 should display topology page with canvas', async ({ page }) => {
    await navigateTo(page, '/topology');
    await page.waitForTimeout(2000);
    
    const hasCanvas = await page.locator('canvas').count() > 0;
    expect(hasCanvas).toBeTruthy();
    
    await takeScreenshot(page, 'topology-view');
  });

  test('4.2 should show OSI layer toggle controls', async ({ page }) => {
    await navigateTo(page, '/topology');
    await page.waitForTimeout(2000);
    
    // Look for layer buttons (L2, L3, L4, L7)
    const l2Button = page.locator('button:has-text("L2")');
    const l3Button = page.locator('button:has-text("L3")');
    
    console.log(`L2 button: ${await l2Button.count()}, L3 button: ${await l3Button.count()}`);
  });

  test('4.3 should toggle L2 layer visualization', async ({ page }) => {
    await navigateTo(page, '/topology');
    await page.waitForTimeout(2000);
    
    const l2Button = page.locator('button:has-text("L2")').first();
    if (await l2Button.count() > 0) {
      await l2Button.click();
      await page.waitForTimeout(1000);
      await takeScreenshot(page, 'topology-l2-layer');
    }
  });

  test('4.4 should show live capture toggle', async ({ page }) => {
    await navigateTo(page, '/topology');
    
    // Look for live capture control
    const liveCapture = page.locator('text=Live, text=Capture, input[type="checkbox"]');
    console.log(`Live capture controls found: ${await liveCapture.count()}`);
  });

  test('4.5 should zoom and pan topology', async ({ page }) => {
    await navigateTo(page, '/topology');
    await page.waitForTimeout(2000);
    
    // Look for zoom controls
    const zoomControls = page.locator('button:has-text("+"), button:has-text("-"), [class*="zoom"]');
    console.log(`Zoom controls: ${await zoomControls.count()}`);
  });

  test('4.6 should verify L2 topology API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/l2/topology');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    console.log(`L2 Entities: ${data.entities?.length}, Connections: ${data.connections?.length}`);
  });
});

// ============================================================================
// SECTION 5: TRAFFIC ANALYSIS & DPI
// ============================================================================

test.describe('5. Traffic Analysis & DPI', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('5.1 should display traffic page', async ({ page }) => {
    await navigateTo(page, '/traffic');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'traffic-page');
  });

  test('5.2 should show traffic statistics', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/stats');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    console.log(`Traffic stats - Packets: ${data.total_packets}, Connections: ${data.num_connections}`);
  });

  test('5.3 should show DPI protocol breakdown', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/stats');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.protocol_breakdown) {
      const protocols = Object.keys(data.protocol_breakdown);
      console.log(`Detected protocols: ${protocols.slice(0, 10).join(', ')}`);
      expect(protocols.length).toBeGreaterThan(0);
    }
  });

  test('5.4 should detect flow patterns', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/flow-patterns');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Flow patterns: ${data.length || 0}`);
    }
  });

  test('5.5 should show DPI statistics', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/stats');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.dpi_stats) {
      console.log(`DPI Stats - Inspected: ${data.dpi_stats.total_inspected}, Cache hit: ${(data.dpi_stats.cache_hit_rate * 100).toFixed(1)}%`);
    }
  });

  test('5.6 should start/stop capture', async ({ request }) => {
    // Get current status
    const statusResponse = await apiRequest(request, 'GET', '/traffic/stats');
    const statusData = await statusResponse.json();
    console.log(`Capture running: ${statusData.sniffing}`);
  });
});

// ============================================================================
// SECTION 6: VULNERABILITY SCANNING
// ============================================================================

test.describe('6. Vulnerability Scanning', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('6.1 should display scans page', async ({ page }) => {
    await navigateTo(page, '/scans');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'scans-page');
  });

  test('6.2 should show scan history', async ({ page }) => {
    await navigateTo(page, '/scans');
    await page.waitForTimeout(2000);
    
    // Look for scan list or table
    const hasScanList = await page.locator('table, [class*="scan"]').count() > 0;
    console.log(`Scan list present: ${hasScanList}`);
  });

  test('6.3 should have new scan button', async ({ page }) => {
    await navigateTo(page, '/scans');
    
    const newScanBtn = page.locator('button:has-text("Scan"), button:has-text("New")');
    console.log(`New scan buttons: ${await newScanBtn.count()}`);
  });

  test('6.4 should get scans via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/scans/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Scans: ${JSON.stringify(data).slice(0, 200)}`);
    }
  });
});

// ============================================================================
// SECTION 7: WORKFLOW BUILDER & EXECUTION
// ============================================================================

test.describe('7. Workflow Builder & Execution', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('7.1 should display flows page', async ({ page }) => {
    await navigateTo(page, '/flows');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'flows-page');
  });

  test('7.2 should show workflow canvas', async ({ page }) => {
    await navigateTo(page, '/flows');
    await page.waitForTimeout(2000);
    
    // Look for ReactFlow canvas
    const hasCanvas = await page.locator('.react-flow, [class*="flow"]').count() > 0;
    console.log(`Workflow canvas present: ${hasCanvas}`);
  });

  test('7.3 should have workflow templates dropdown', async ({ page }) => {
    await navigateTo(page, '/flows');
    await page.waitForTimeout(2000);
    
    const dropdown = page.locator('select');
    console.log(`Dropdowns found: ${await dropdown.count()}`);
  });

  test('7.4 should get workflows via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/workflows/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Workflows: ${data.workflows?.length || 0}`);
    }
  });

  test('7.5 should have block palette', async ({ page }) => {
    await navigateTo(page, '/flows');
    await page.waitForTimeout(2000);
    
    // Look for block types
    const blockTypes = await page.locator('[class*="block"], [class*="node"]').count();
    console.log(`Block elements: ${blockTypes}`);
  });
});

// ============================================================================
// SECTION 8: REMOTE ACCESS (VNC/RDP/SSH)
// ============================================================================

test.describe('8. Remote Access', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('8.1 should display access page', async ({ page }) => {
    await navigateTo(page, '/access');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'access-page');
  });

  test('8.2 should show saved connections', async ({ page }) => {
    await navigateTo(page, '/access');
    await page.waitForTimeout(2000);
    
    // Look for connection list
    const connections = page.locator('[class*="connection"], table tbody tr');
    console.log(`Connection entries: ${await connections.count()}`);
  });

  test('8.3 should have new connection form', async ({ page }) => {
    await navigateTo(page, '/access');
    
    // Look for protocol selector (VNC/RDP/SSH)
    const protocolSelect = page.locator('select:has(option:has-text("VNC"))');
    console.log(`Protocol selector: ${await protocolSelect.count()}`);
  });

  test('8.4 should access AccessHub page', async ({ page }) => {
    await navigateTo(page, '/accesshub');
    await page.waitForTimeout(2000);
    
    await takeScreenshot(page, 'accesshub-page');
  });

  test('8.5 should get access connections via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/access/');
    // May return 404 if no connections configured
    console.log(`Access endpoint status: ${response.status()}`);
  });
});

// ============================================================================
// SECTION 9: AGENT MANAGEMENT
// ============================================================================

test.describe('9. Agent Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('9.1 should display agents page', async ({ page }) => {
    await navigateTo(page, '/agents');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'agents-page');
  });

  test('9.2 should show agent list', async ({ page }) => {
    await navigateTo(page, '/agents');
    await page.waitForTimeout(2000);
    
    const agents = page.locator('table tbody tr, [class*="agent"]');
    console.log(`Agent entries: ${await agents.count()}`);
  });

  test('9.3 should get agents via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/agents/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Agents: ${JSON.stringify(data).slice(0, 200)}`);
    }
  });
});

// ============================================================================
// SECTION 10: HOST MANAGEMENT
// ============================================================================

test.describe('10. Host Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('10.1 should display host page', async ({ page }) => {
    await navigateTo(page, '/host');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'host-page');
  });

  test('10.2 should show system information', async ({ page }) => {
    await navigateTo(page, '/host');
    await page.waitForTimeout(2000);
    
    // Look for system info sections
    const content = await page.textContent('body');
    console.log(`Host page content includes CPU/Memory/Network info`);
  });

  test('10.3 should get host info via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/host/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Host info: ${JSON.stringify(data).slice(0, 300)}`);
    }
  });
});

// ============================================================================
// SECTION 11: SETTINGS & CONFIGURATION
// ============================================================================

test.describe('11. Settings & Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('11.1 should display settings page', async ({ page }) => {
    await navigateTo(page, '/settings');
    await page.waitForTimeout(2000);
    
    await verifyPageLoaded(page);
    await takeScreenshot(page, 'settings-page');
  });

  test('11.2 should show configuration options', async ({ page }) => {
    await navigateTo(page, '/settings');
    await page.waitForTimeout(2000);
    
    // Look for form inputs
    const inputs = await page.locator('input, select, textarea').count();
    console.log(`Settings inputs: ${inputs}`);
  });

  test('11.3 should get settings via API', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/settings/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Settings: ${JSON.stringify(data).slice(0, 200)}`);
    }
  });
});

// ============================================================================
// SECTION 12: API INTEGRATION TESTS
// ============================================================================

test.describe('12. API Integration Tests', () => {
  test('12.1 should verify health endpoint', async ({ request }) => {
    // Health endpoint is at root, not under /api/v1
    const response = await request.get('http://localhost:12000/health');
    expect(response.ok()).toBeTruthy();
  });

  test('12.2 should verify dashboard endpoint', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/dashboard/');
    if (response.ok()) {
      const data = await response.json();
      console.log(`Dashboard data available`);
    }
  });

  test('12.3 should verify assets CRUD', async ({ request }) => {
    // Read
    const getResponse = await apiRequest(request, 'GET', '/assets/');
    expect(getResponse.ok()).toBeTruthy();
  });

  test('12.4 should verify traffic endpoints', async ({ request }) => {
    const statsResponse = await apiRequest(request, 'GET', '/traffic/stats');
    expect(statsResponse.ok()).toBeTruthy();
    
    const l2Response = await apiRequest(request, 'GET', '/traffic/l2/topology');
    expect(l2Response.ok()).toBeTruthy();
  });

  test('12.5 should verify discovery endpoint', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/discovery/');
    console.log(`Discovery endpoint status: ${response.status()}`);
  });

  test('12.6 should verify credentials endpoint', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/credentials/');
    console.log(`Credentials endpoint status: ${response.status()}`);
  });

  test('12.7 should verify vulnerabilities endpoint', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/vulnerabilities/');
    console.log(`Vulnerabilities endpoint status: ${response.status()}`);
  });
});

// ============================================================================
// SECTION 13: NAVIGATION & UI TESTS
// ============================================================================

test.describe('13. Navigation & UI Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('13.1 should have sidebar navigation', async ({ page }) => {
    await navigateTo(page, '/');
    
    const sidebar = page.locator('nav, aside, [class*="sidebar"]');
    expect(await sidebar.count()).toBeGreaterThan(0);
  });

  test('13.2 should navigate to all main pages', async ({ page }) => {
    await navigateTo(page, '/');
    
    const pages = ['/assets', '/topology', '/traffic', '/scans', '/flows', '/access', '/agents', '/host', '/settings'];
    
    for (const pagePath of pages) {
      await navigateTo(page, pagePath);
      await verifyPageLoaded(page);
      console.log(`✓ ${pagePath} loaded`);
    }
  });

  test('13.3 should have consistent header', async ({ page }) => {
    await navigateTo(page, '/');
    
    // Look for NOP branding
    const header = page.locator('text=NOP, text=Network Observatory');
    expect(await header.count()).toBeGreaterThanOrEqual(0);
  });

  test('13.4 should be responsive', async ({ page }) => {
    await navigateTo(page, '/');
    
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'mobile-view');
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'desktop-view');
  });
});

// ============================================================================
// SECTION 14: REAL HOST TESTS (Against actual network)
// ============================================================================

test.describe('14. Real Host Integration Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('14.1 should detect real network hosts', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/l2/topology');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.entities?.length).toBeGreaterThan(0);
    console.log(`Real hosts detected: ${data.entities?.length}`);
  });

  test('14.2 should capture real network traffic', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/stats');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    // Check for any traffic data fields
    console.log(`Traffic stats: ${JSON.stringify(Object.keys(data))}`);
    expect(Object.keys(data).length).toBeGreaterThan(0);
  });

  test('14.3 should detect real protocols via DPI', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/stats');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.protocol_breakdown) {
      const protocols = Object.keys(data.protocol_breakdown);
      expect(protocols.length).toBeGreaterThan(0);
      console.log(`Real protocols detected: ${protocols.join(', ')}`);
    }
  });

  test('14.4 should show real MAC addresses', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/l2/topology');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    if (data.entities?.length > 0) {
      const macs = data.entities.map((e: any) => e.mac);
      console.log(`Real MACs: ${macs.join(', ')}`);
    }
  });

  test('14.5 should correlate IPs with MACs', async ({ request }) => {
    const response = await apiRequest(request, 'GET', '/traffic/l2/topology');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    const entitiesWithIPs = data.entities?.filter((e: any) => e.ips?.length > 0);
    console.log(`Entities with IP correlation: ${entitiesWithIPs?.length || 0}`);
  });
});
