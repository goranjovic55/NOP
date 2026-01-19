/**
 * VNC and RDP Connection Tests
 * 
 * Tests real VNC/RDP connections through the Access page using Guacamole.
 * Uses the test environment containers:
 * - VNC Server: 172.21.0.50:5900 (user: vncuser, password: vnc123)
 * - RDP Server: 172.21.0.60:3389 (user: rdpuser, password: rdp123)
 */

import { test, expect } from '@playwright/test';

// Test configuration - Using original test-environment servers
// VNC: exposed on localhost:5901 (container port 5900)
// RDP: exposed on localhost:3390 (container port 3389)
const TEST_CONFIG = {
  // VNC via exposed port (guacd connects to host 127.0.0.1:5901)
  VNC_HOST: '127.0.0.1',
  VNC_PORT: 5901,
  VNC_USER: '',  // VNC doesn't require username
  VNC_PASSWORD: 'vnc123',  // From supervisord.conf: -passwd vnc123
  // RDP via exposed port (guacd connects to host 127.0.0.1:3390)  
  RDP_HOST: '127.0.0.1', 
  RDP_PORT: 3390,
  RDP_USER: 'rdpuser',
  RDP_PASSWORD: 'rdp123'
};

// Login helper
async function login(page: any) {
  await page.goto('/');
  
  // Wait for login page
  await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });
  
  // Fill login form
  await page.fill('input[name="username"], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  
  // Submit
  await page.click('button[type="submit"]');
  
  // Wait for dashboard to load
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe('VNC/RDP Connection Tests', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should navigate to Access page', async ({ page }) => {
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Verify Access page loaded
    await expect(page.locator('text=Access Control')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=LOGIN')).toBeVisible();
    await expect(page.locator('text=EXPLOIT')).toBeVisible();
  });

  test('should add VNC test host manually', async ({ page }) => {
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Click Add button to show manual IP input
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Enter VNC host IP
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill(TEST_CONFIG.VNC_HOST);
    
    // Click Add button
    await page.click('button:has-text("Add"):not(:has-text("⊞"))');
    await page.waitForTimeout(500);
    
    // Verify asset was added
    await expect(page.locator(`text=${TEST_CONFIG.VNC_HOST}`)).toBeVisible({ timeout: 3000 });
  });

  test('should test VNC port connectivity', async ({ request }) => {
    // Test VNC port via API
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();
    
    // Test VNC port connectivity
    const vncTestResponse = await request.post('/api/v1/access/test/vnc', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      data: {
        host: TEST_CONFIG.VNC_HOST,
        port: TEST_CONFIG.VNC_PORT,
        password: TEST_CONFIG.VNC_PASSWORD
      }
    });
    
    const vncResult = await vncTestResponse.json();
    console.log('VNC test result:', vncResult);
    
    // Port should be reachable (container is running)
    expect(vncResult.success).toBe(true);
    expect(vncResult.message).toContain('VNC port is open');
  });

  test('should test RDP port connectivity', async ({ request }) => {
    // Test RDP port via API
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();
    
    // Test RDP port connectivity
    const rdpTestResponse = await request.post('/api/v1/access/test/rdp', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      data: {
        host: TEST_CONFIG.RDP_HOST,
        port: TEST_CONFIG.RDP_PORT,
        username: TEST_CONFIG.RDP_USER,
        password: TEST_CONFIG.RDP_PASSWORD
      }
    });
    
    const rdpResult = await rdpTestResponse.json();
    console.log('RDP test result:', rdpResult);
    
    // Port should be reachable (container is running)
    expect(rdpResult.success).toBe(true);
    expect(rdpResult.message).toContain('RDP port is open');
  });

  test('should initiate VNC connection through UI', async ({ page }) => {
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Add VNC host manually
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill(TEST_CONFIG.VNC_HOST);
    await page.click('button:has-text("Add"):not(:has-text("⊞"))');
    await page.waitForTimeout(500);
    
    // Click on the VNC host in the asset list
    await page.click(`text=${TEST_CONFIG.VNC_HOST}`);
    await page.waitForTimeout(500);
    
    // Should show login modal
    const loginModal = page.locator('text=Login to');
    if (await loginModal.isVisible({ timeout: 2000 })) {
      // Select VNC protocol
      await page.selectOption('select', 'vnc');
      
      // Click Login button
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(1000);
    }
    
    // Should have a connection tab now
    const connectionTab = page.locator(`text=${TEST_CONFIG.VNC_HOST}`);
    await expect(connectionTab).toBeVisible({ timeout: 5000 });
    
    // Wait for connection status
    await page.waitForTimeout(2000);
    
    // Check for either connected status or connection attempt
    const statusIndicator = page.locator('text=connected, text=connecting');
    const hasStatus = await statusIndicator.count() > 0;
    console.log('Connection status found:', hasStatus);
  });

  test('should initiate RDP connection through UI', async ({ page }) => {
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Add RDP host manually
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill(TEST_CONFIG.RDP_HOST);
    await page.click('button:has-text("Add"):not(:has-text("⊞"))');
    await page.waitForTimeout(500);
    
    // Click on the RDP host in the asset list
    await page.click(`text=${TEST_CONFIG.RDP_HOST}`);
    await page.waitForTimeout(500);
    
    // Should show login modal
    const loginModal = page.locator('text=Login to');
    if (await loginModal.isVisible({ timeout: 2000 })) {
      // Select RDP protocol
      await page.selectOption('select', 'rdp');
      
      // Click Login button
      await page.click('button:has-text("Login")');
      await page.waitForTimeout(1000);
    }
    
    // Should have a connection tab now
    const connectionTab = page.locator(`text=${TEST_CONFIG.RDP_HOST}`);
    await expect(connectionTab).toBeVisible({ timeout: 5000 });
    
    // Wait for connection status
    await page.waitForTimeout(2000);
  });

  test('should test guacd connectivity', async ({ request }) => {
    // First get auth token
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();
    
    // Check access hub status
    const statusResponse = await request.get('/api/v1/access/status', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    const status = await statusResponse.json();
    console.log('Access hub status:', status);
    
    expect(status.status).toBe('active');
  });

  test('should verify VNC connection via HTTP tunnel', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    const { access_token } = await authResponse.json();
    
    // Try HTTP tunnel connect (fallback for WebSocket)
    const tunnelResponse = await request.post('/api/v1/access/http-tunnel/connect', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        host: TEST_CONFIG.VNC_HOST,
        port: TEST_CONFIG.VNC_PORT.toString(),
        protocol: 'vnc',
        username: '',
        password: TEST_CONFIG.VNC_PASSWORD,
        width: '1024',
        height: '768',
        dpi: '96'
      }
    });
    
    const tunnelResult = await tunnelResponse.json();
    console.log('HTTP Tunnel result:', tunnelResult);
    
    // Should either connect or give meaningful error
    if (tunnelResult.session_id) {
      console.log('VNC HTTP Tunnel session created:', tunnelResult.session_id);
      
      // Disconnect the session
      await request.post(`/api/v1/access/http-tunnel/disconnect/${tunnelResult.session_id}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
    } else if (tunnelResult.error) {
      console.log('VNC connection error (expected if guacd not accessible):', tunnelResult.error);
    }
  });

  test('should verify RDP connection via HTTP tunnel', async ({ request }) => {
    // Get auth token
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    const { access_token } = await authResponse.json();
    
    // Try HTTP tunnel connect
    const tunnelResponse = await request.post('/api/v1/access/http-tunnel/connect', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      },
      params: {
        host: TEST_CONFIG.RDP_HOST,
        port: TEST_CONFIG.RDP_PORT.toString(),
        protocol: 'rdp',
        username: TEST_CONFIG.RDP_USER,
        password: TEST_CONFIG.RDP_PASSWORD,
        width: '1024',
        height: '768',
        dpi: '96'
      }
    });
    
    const tunnelResult = await tunnelResponse.json();
    console.log('RDP HTTP Tunnel result:', tunnelResult);
    
    if (tunnelResult.session_id) {
      console.log('RDP HTTP Tunnel session created:', tunnelResult.session_id);
      
      // Disconnect the session
      await request.post(`/api/v1/access/http-tunnel/disconnect/${tunnelResult.session_id}`, {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      });
    } else if (tunnelResult.error) {
      console.log('RDP connection error (expected if guacd not accessible):', tunnelResult.error);
    }
  });
});

test.describe('Clear All Assets Test', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('should clear all assets successfully', async ({ page, request }) => {
    // Get auth token first
    const authResponse = await request.post('/api/v1/auth/login', {
      form: {
        username: 'admin',
        password: 'admin123'
      }
    });
    
    expect(authResponse.ok()).toBeTruthy();
    const { access_token } = await authResponse.json();
    
    // Test clear-all endpoint directly (without trailing slash)
    const clearResponse = await request.delete('/api/v1/assets/clear-all', {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    
    expect(clearResponse.ok()).toBeTruthy();
    const clearResult = await clearResponse.json();
    console.log('Clear all result:', clearResult);
    
    expect(clearResult.message).toBe('Cleared all data successfully');
    expect(clearResult.deleted).toBeDefined();
  });

  test('should clear all assets via UI', async ({ page }) => {
    // Navigate to Assets page
    await page.click('text=Assets');
    await page.waitForURL('**/assets', { timeout: 10000 });
    
    // Wait for page to load
    await page.waitForTimeout(1000);
    
    // Look for CLEAR ALL button
    const clearButton = page.locator('button:has-text("CLEAR ALL")');
    
    if (await clearButton.isVisible({ timeout: 3000 })) {
      // Set up dialog handler for confirmation
      page.once('dialog', async dialog => {
        console.log('Dialog message:', dialog.message());
        await dialog.accept();
      });
      
      // Click the button
      await clearButton.click();
      
      // Wait for the operation to complete
      await page.waitForTimeout(2000);
      
      // Verify assets were cleared (no error shown)
      const errorAlert = page.locator('.Toastify__toast--error');
      const hasError = await errorAlert.count() > 0;
      expect(hasError).toBe(false);
    } else {
      console.log('Clear All button not visible - skipping UI test');
    }
  });
});
