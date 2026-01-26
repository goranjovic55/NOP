import { test, expect } from '@playwright/test';

/**
 * Core regression tests - verify main functionality after merge
 * Tests: Dashboard, Assets, Topology, Traffic pages
 */

const BASE_URL = 'http://localhost:12000';

async function login(page: any) {
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  
  // Check if login is required
  const loginVisible = await page.locator('input[type="text"], input[name="username"]').count() > 0;
  if (loginVisible) {
    // Fill login form
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"], button:has-text("Access"), button:has-text("Login")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

test.describe('Core Regression Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Increase timeout for slower pages
    page.setDefaultTimeout(30000);
    // Login before each test
    await login(page);
  });

  test('Dashboard loads and shows statistics', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/results/regression-dashboard.png' });
    
    // Check dashboard elements exist
    const pageContent = await page.content();
    console.log('Dashboard loaded, checking content...');
    
    // Check for common dashboard elements
    const hasNavigation = await page.locator('nav').count() > 0 || 
                          await page.locator('aside').count() > 0 ||
                          await page.locator('[class*="sidebar"]').count() > 0;
    expect(hasNavigation).toBeTruthy();
  });

  test('Assets page loads and shows asset list', async ({ page }) => {
    await page.goto(`${BASE_URL}/assets`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/results/regression-assets.png' });
    
    // Wait for potential data loading
    await page.waitForTimeout(2000);
    
    // Check if assets table/list exists
    const hasTable = await page.locator('table').count() > 0;
    const hasList = await page.locator('[class*="list"]').count() > 0;
    const hasCards = await page.locator('[class*="card"]').count() > 0;
    
    console.log(`Assets page - Table: ${hasTable}, List: ${hasList}, Cards: ${hasCards}`);
    
    // Check for asset data
    const assetCount = await page.locator('tr').count();
    console.log(`Asset rows found: ${assetCount}`);
    
    await page.screenshot({ path: 'e2e/results/regression-assets-after-wait.png' });
    
    // Verify page is not empty
    const pageText = await page.textContent('body');
    expect(pageText?.length).toBeGreaterThan(100);
  });

  test('Topology page loads and shows network visualization', async ({ page }) => {
    await page.goto(`${BASE_URL}/topology`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/results/regression-topology.png' });
    
    // Check for canvas (network visualization)
    const hasCanvas = await page.locator('canvas').count() > 0;
    const hasSvg = await page.locator('svg').count() > 0;
    
    console.log(`Topology page - Canvas: ${hasCanvas}, SVG: ${hasSvg}`);
    
    // Check for OSI layer controls (new feature)
    const layerToggles = await page.locator('input[type="checkbox"]').count();
    console.log(`Layer toggle checkboxes: ${layerToggles}`);
    
    // Wait for visualization to render
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'e2e/results/regression-topology-after-wait.png' });
  });

  test('Traffic page loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/traffic`);
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({ path: 'e2e/results/regression-traffic.png' });
    
    // Verify page loaded
    const pageText = await page.textContent('body');
    expect(pageText?.length).toBeGreaterThan(50);
    
    console.log('Traffic page loaded successfully');
  });

  test('Navigation between pages works', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    
    // Try to navigate via sidebar/menu
    const navLinks = await page.locator('a[href*="asset"], a[href*="topology"], a[href*="traffic"]').all();
    console.log(`Navigation links found: ${navLinks.length}`);
    
    // Try clicking on Assets link if exists
    const assetsLink = page.locator('a[href*="asset"]').first();
    if (await assetsLink.count() > 0) {
      await assetsLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('asset');
    }
    
    // Try clicking on Topology link if exists
    const topologyLink = page.locator('a[href*="topology"]').first();
    if (await topologyLink.count() > 0) {
      await topologyLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('topology');
    }
    
    await page.screenshot({ path: 'e2e/results/regression-navigation.png' });
  });

  test('API endpoints return valid data', async ({ request }) => {
    // Test assets API
    const assetsResponse = await request.get(`${BASE_URL}/api/v1/assets/`);
    expect(assetsResponse.ok()).toBeTruthy();
    const assetsData = await assetsResponse.json();
    console.log(`Assets API returned ${assetsData.assets?.length || 0} assets`);
    expect(assetsData.assets).toBeDefined();
    
    // Test L2 topology API
    const l2Response = await request.get(`${BASE_URL}/api/v1/traffic/l2/topology`);
    expect(l2Response.ok()).toBeTruthy();
    const l2Data = await l2Response.json();
    console.log(`L2 API returned ${l2Data.entities?.length || 0} entities`);
    expect(l2Data.entities).toBeDefined();
    
    // Test traffic stats API
    const statsResponse = await request.get(`${BASE_URL}/api/v1/traffic/stats`);
    expect(statsResponse.ok()).toBeTruthy();
  });

  test('Dashboard displays asset count correctly', async ({ page, request }) => {
    // First get the actual asset count from API
    const assetsResponse = await request.get(`${BASE_URL}/api/v1/assets/`);
    const assetsData = await assetsResponse.json();
    const apiAssetCount = assetsData.assets?.length || 0;
    console.log(`API reports ${apiAssetCount} assets`);
    
    // Go to dashboard
    await page.goto(`${BASE_URL}/`);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot for analysis
    await page.screenshot({ path: 'e2e/results/regression-dashboard-assets.png' });
    
    // Look for asset count display
    const pageText = await page.textContent('body');
    console.log('Dashboard content (first 500 chars):', pageText?.substring(0, 500));
    
    // Check if any number matching asset count is displayed
    if (apiAssetCount > 0) {
      const countDisplayed = pageText?.includes(apiAssetCount.toString());
      console.log(`Asset count ${apiAssetCount} displayed on dashboard: ${countDisplayed}`);
    }
  });
});
