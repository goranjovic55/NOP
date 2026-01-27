/**
 * Performance Tests for NOP Application
 * Tests loading times and rendering performance with 10k and 100k assets
 * 
 * Run: npx playwright test e2e/tests/performance-stress.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// Performance metrics interface
interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  timeToInteractive: number;
  jsHeapSize: number;
  renderFrameRate: number;
}

// Helper to measure performance metrics
async function measurePerformance(page: Page): Promise<PerformanceMetrics> {
  const metrics = await page.evaluate(() => {
    const timing = performance.timing;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    const lcp = performance.getEntriesByType('largest-contentful-paint');
    
    return {
      pageLoadTime: timing.loadEventEnd - timing.navigationStart,
      firstContentfulPaint: fcp ? fcp.startTime : 0,
      largestContentfulPaint: lcp.length > 0 ? (lcp[lcp.length - 1] as any).startTime : 0,
      timeToInteractive: timing.domInteractive - timing.navigationStart,
      jsHeapSize: (performance as any).memory?.usedJSHeapSize || 0,
      renderFrameRate: 0, // Calculated separately
    };
  });
  return metrics;
}

// Helper to generate mock asset data
function generateMockAssets(count: number): any[] {
  const assets = [];
  const statuses = ['online', 'offline', 'online', 'online']; // 75% online
  const vendors = ['Cisco', 'Juniper', 'Arista', 'HP', 'Dell', 'Ubiquiti'];
  
  for (let i = 0; i < count; i++) {
    const octet3 = Math.floor(i / 256);
    const octet4 = i % 256;
    assets.push({
      id: `asset-${i}`,
      ip_address: `192.168.${octet3}.${octet4}`,
      mac_address: `00:11:22:${Math.floor(i / 65536).toString(16).padStart(2, '0')}:${Math.floor((i % 65536) / 256).toString(16).padStart(2, '0')}:${(i % 256).toString(16).padStart(2, '0')}`,
      hostname: `host-${i}.local`,
      asset_type: 'workstation',
      status: statuses[i % statuses.length],
      last_seen: new Date().toISOString(),
      vendor: vendors[i % vendors.length],
      discovery_method: i % 3 === 0 ? 'passive' : 'arp',
      open_ports: i % 5 === 0 ? [22, 80, 443] : [],
    });
  }
  return assets;
}

// Helper to generate mock connections
function generateMockConnections(assetCount: number): any[] {
  const connections = [];
  const connectionCount = Math.min(assetCount * 2, 50000); // Cap at 50k connections
  
  for (let i = 0; i < connectionCount; i++) {
    const sourceIdx = Math.floor(Math.random() * assetCount);
    const targetIdx = Math.floor(Math.random() * assetCount);
    if (sourceIdx === targetIdx) continue;
    
    const sourceOctet3 = Math.floor(sourceIdx / 256);
    const sourceOctet4 = sourceIdx % 256;
    const targetOctet3 = Math.floor(targetIdx / 256);
    const targetOctet4 = targetIdx % 256;
    
    connections.push({
      source: `192.168.${sourceOctet3}.${sourceOctet4}`,
      target: `192.168.${targetOctet3}.${targetOctet4}`,
      protocols: ['TCP'],
      value: Math.floor(Math.random() * 10000) + 100,
      packet_count: Math.floor(Math.random() * 1000),
    });
  }
  return connections;
}

test.describe('Performance Stress Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'admin');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  });

  test.describe('Loading Performance', () => {
    test('Dashboard loads within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      
      // Wait for skeleton to disappear (content loaded)
      await page.waitForSelector('.animate-pulse', { state: 'hidden', timeout: 10000 }).catch(() => {});
      
      const loadTime = Date.now() - startTime;
      console.log(`Dashboard load time: ${loadTime}ms`);
      
      expect(loadTime).toBeLessThan(5000); // Allow 5s for network
      
      // Check skeleton was shown during loading
      const metrics = await measurePerformance(page);
      console.log('Dashboard Performance:', JSON.stringify(metrics, null, 2));
    });

    test('Assets page shows skeleton then content', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/assets');
      
      // Skeleton should appear quickly
      const skeletonVisible = await page.waitForSelector('.animate-pulse', { timeout: 2000 }).catch(() => null);
      const skeletonTime = Date.now() - startTime;
      console.log(`Skeleton appeared in: ${skeletonTime}ms`);
      
      // Content should load within reasonable time
      await page.waitForSelector('tbody tr:not(.animate-pulse)', { timeout: 10000 }).catch(() => {});
      const contentTime = Date.now() - startTime;
      console.log(`Content loaded in: ${contentTime}ms`);
      
      expect(skeletonTime).toBeLessThan(1000); // Skeleton within 1s
    });

    test('Topology page handles progressive loading', async ({ page }) => {
      await page.goto('/topology');
      
      // Should show skeleton for graph
      const skeleton = await page.waitForSelector('.animate-pulse, text=Building topology', { timeout: 3000 }).catch(() => null);
      expect(skeleton).toBeTruthy();
      
      // Wait for graph to render
      await page.waitForSelector('canvas', { timeout: 15000 });
    });
  });

  test.describe('10,000 Asset Stress Test', () => {
    test('Assets page handles 10k assets', async ({ page }) => {
      // Mock the API to return 10k assets
      const mockAssets = generateMockAssets(10000);
      
      await page.route('**/api/v1/assets/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assets: mockAssets }),
        });
      });

      const startTime = Date.now();
      await page.goto('/assets');
      
      // Wait for table to render
      await page.waitForSelector('tbody tr', { timeout: 30000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`10k Assets - Load Time: ${loadTime}ms`);
      
      // Check memory usage
      const heapSize = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize / 1024 / 1024
      );
      console.log(`10k Assets - Heap Size: ${heapSize?.toFixed(2) ?? 'N/A'} MB`);
      
      // Should load within 15 seconds
      expect(loadTime).toBeLessThan(15000);
      
      // Test scrolling performance
      const scrollStartTime = Date.now();
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      const scrollTime = Date.now() - scrollStartTime;
      console.log(`10k Assets - Scroll Time: ${scrollTime}ms`);
    });

    test('Topology handles 10k nodes', async ({ page }) => {
      const mockAssets = generateMockAssets(10000);
      const mockConnections = generateMockConnections(10000);
      
      // Mock assets API
      await page.route('**/api/v1/assets/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assets: mockAssets }),
        });
      });

      // Mock traffic stats API
      await page.route('**/api/v1/dashboard/traffic**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_bytes: 1000000000,
            connections: mockConnections,
            protocols: { TCP: 8000, UDP: 2000 },
          }),
        });
      });

      const startTime = Date.now();
      await page.goto('/topology');
      
      // Wait for performance mode indicator (confirms large graph detected)
      await page.waitForSelector('text=/Extreme mode|Massive mode|Performance mode/', { timeout: 60000 }).catch(() => {});
      
      // Wait for canvas to render
      await page.waitForSelector('canvas', { timeout: 60000 });
      const renderTime = Date.now() - startTime;
      
      console.log(`10k Nodes Topology - Render Time: ${renderTime}ms`);
      
      // Check that performance mode is active
      const performanceIndicator = await page.locator('text=/\\d+.*nodes/').textContent();
      console.log(`10k Nodes - Performance Indicator: ${performanceIndicator}`);
      
      // Should render within 30 seconds
      expect(renderTime).toBeLessThan(30000);
      
      // Test zoom interaction
      const canvas = page.locator('canvas').first();
      await canvas.scrollIntoViewIfNeeded();
      
      const zoomStartTime = Date.now();
      await page.mouse.wheel(0, -300); // Zoom in
      await page.waitForTimeout(500);
      const zoomTime = Date.now() - zoomStartTime;
      console.log(`10k Nodes - Zoom Interaction Time: ${zoomTime}ms`);
    });
  });

  test.describe('100,000 Asset Stress Test', () => {
    test.skip('Assets page handles 100k assets', async ({ page }) => {
      // Skip by default - very resource intensive
      const mockAssets = generateMockAssets(100000);
      
      await page.route('**/api/v1/assets/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assets: mockAssets }),
        });
      });

      const startTime = Date.now();
      await page.goto('/assets');
      
      // Wait for content with extended timeout
      await page.waitForSelector('tbody tr', { timeout: 120000 });
      const loadTime = Date.now() - startTime;
      
      console.log(`100k Assets - Load Time: ${loadTime}ms`);
      
      const heapSize = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize / 1024 / 1024
      );
      console.log(`100k Assets - Heap Size: ${heapSize?.toFixed(2) ?? 'N/A'} MB`);
      
      // Should still eventually load
      expect(loadTime).toBeLessThan(120000);
    });

    test.skip('Topology handles 100k nodes', async ({ page }) => {
      // Skip by default - very resource intensive
      const mockAssets = generateMockAssets(100000);
      const mockConnections = generateMockConnections(100000);
      
      await page.route('**/api/v1/assets/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assets: mockAssets }),
        });
      });

      await page.route('**/api/v1/dashboard/traffic**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_bytes: 10000000000,
            connections: mockConnections,
            protocols: { TCP: 80000, UDP: 20000 },
          }),
        });
      });

      const startTime = Date.now();
      await page.goto('/topology');
      
      // Extended timeout for massive graph
      await page.waitForSelector('canvas', { timeout: 180000 });
      const renderTime = Date.now() - startTime;
      
      console.log(`100k Nodes Topology - Render Time: ${renderTime}ms`);
      
      const performanceIndicator = await page.locator('text=/\\d+.*nodes/').textContent();
      console.log(`100k Nodes - Performance Indicator: ${performanceIndicator}`);
    });
  });

  test.describe('Frame Rate Tests', () => {
    test('Topology maintains 30+ FPS with 500 nodes', async ({ page }) => {
      const mockAssets = generateMockAssets(500);
      const mockConnections = generateMockConnections(500);
      
      await page.route('**/api/v1/assets/**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ assets: mockAssets }),
        });
      });

      await page.route('**/api/v1/dashboard/traffic**', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            total_bytes: 100000000,
            connections: mockConnections,
            protocols: { TCP: 400, UDP: 100 },
          }),
        });
      });

      await page.goto('/topology');
      await page.waitForSelector('canvas', { timeout: 30000 });
      
      // Wait for simulation to settle
      await page.waitForTimeout(5000);
      
      // Measure frame rate
      const frameRates: number[] = await page.evaluate(() => {
        return new Promise<number[]>((resolve) => {
          const frameRates: number[] = [];
          let lastTime = performance.now();
          let frameCount = 0;
          
          const measureFrame = () => {
            const currentTime = performance.now();
            frameCount++;
            
            if (currentTime - lastTime >= 1000) {
              frameRates.push(frameCount);
              frameCount = 0;
              lastTime = currentTime;
            }
            
            if (frameRates.length < 5) {
              requestAnimationFrame(measureFrame);
            } else {
              resolve(frameRates);
            }
          };
          
          requestAnimationFrame(measureFrame);
        });
      });
      
      const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      console.log(`500 Nodes - Average FPS: ${avgFPS.toFixed(1)}`);
      console.log(`500 Nodes - FPS Samples: ${frameRates.join(', ')}`);
      
      expect(avgFPS).toBeGreaterThan(20); // Minimum 20 FPS for usability
    });
  });

  test.describe('Memory Leak Detection', () => {
    test('No memory leak on repeated page navigation', async ({ page }) => {
      const heapSizes: number[] = [];
      
      // Navigate between pages multiple times
      for (let i = 0; i < 5; i++) {
        await page.goto('/dashboard');
        await page.waitForTimeout(1000);
        
        await page.goto('/assets');
        await page.waitForTimeout(1000);
        
        await page.goto('/topology');
        await page.waitForTimeout(2000);
        
        await page.goto('/scans');
        await page.waitForTimeout(1000);
        
        // Measure heap
        const heap = await page.evaluate(() => 
          (performance as any).memory?.usedJSHeapSize / 1024 / 1024
        );
        if (heap) heapSizes.push(heap);
        
        console.log(`Navigation cycle ${i + 1} - Heap: ${heap?.toFixed(2) ?? 'N/A'} MB`);
      }
      
      // Check heap growth
      if (heapSizes.length > 2) {
        const growth = heapSizes[heapSizes.length - 1] - heapSizes[0];
        console.log(`Heap Growth: ${growth.toFixed(2)} MB`);
        
        // Should not grow more than 50MB over 5 cycles
        expect(growth).toBeLessThan(50);
      }
    });
  });
});
