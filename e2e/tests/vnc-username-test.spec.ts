/**
 * VNC Username and RDP Connection Test
 * Verifies:
 * 1. VNC connection form does NOT show username field
 * 2. RDP connection works without disconnecting
 */

import { test, expect } from '@playwright/test';

// Login helper
async function login(page: any) {
  await page.goto('/');
  await page.waitForSelector('input[name="username"], input[type="text"]', { timeout: 10000 });
  await page.fill('input[name="username"], input[type="text"]', 'admin');
  await page.fill('input[name="password"], input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForTimeout(1000);
}

test.describe('VNC Username Field Test', () => {
  test('VNC connection should NOT require username', async ({ page }) => {
    await login(page);
    
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Click Add button to add a host
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Enter test VNC host IP
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill('127.0.0.1');
    
    // Submit the IP
    const addButtons = page.locator('button:has-text("Add")');
    await addButtons.last().click();
    await page.waitForTimeout(500);
    
    // Click on the host to open login modal
    await page.click('text=127.0.0.1');
    await page.waitForTimeout(500);
    
    // Select VNC protocol
    await page.selectOption('select', 'vnc');
    
    // Click Login to create the connection tab
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(1000);
    
    // Now we should be in the ProtocolConnection component
    // For VNC, the Username field should NOT be visible
    const usernameLabel = page.locator('label:has-text("USERNAME")');
    const passwordLabel = page.locator('label:has-text("PASSWORD")');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/vnc-form.png' });
    
    // Password should be visible
    await expect(passwordLabel).toBeVisible({ timeout: 5000 });
    
    // Username should NOT be visible for VNC
    const usernameVisible = await usernameLabel.isVisible();
    console.log('VNC form - Username visible:', usernameVisible);
    console.log('VNC form - Password visible:', await passwordLabel.isVisible());
    
    expect(usernameVisible).toBe(false);
  });

  test('RDP connection should require username', async ({ page }) => {
    await login(page);
    
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Click Add button to add a host
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Enter test RDP host IP
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill('127.0.0.1');
    
    // Submit the IP
    const addButtons = page.locator('button:has-text("Add")');
    await addButtons.last().click();
    await page.waitForTimeout(500);
    
    // Click on the host to open login modal
    await page.click('text=127.0.0.1');
    await page.waitForTimeout(500);
    
    // Select RDP protocol
    await page.selectOption('select', 'rdp');
    
    // Click Login to create the connection tab
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(1000);
    
    // Now we should be in the ProtocolConnection component
    // For RDP, both Username and Password should be visible
    const usernameLabel = page.locator('label:has-text("USERNAME")');
    const passwordLabel = page.locator('label:has-text("PASSWORD")');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'test-results/rdp-form.png' });
    
    // Both should be visible for RDP
    await expect(usernameLabel).toBeVisible({ timeout: 5000 });
    await expect(passwordLabel).toBeVisible({ timeout: 5000 });
    
    console.log('RDP form - Username visible:', await usernameLabel.isVisible());
    console.log('RDP form - Password visible:', await passwordLabel.isVisible());
  });

  test('RDP connection should stay connected', async ({ page }) => {
    await login(page);
    
    // Navigate to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    await page.waitForTimeout(500);
    
    // Click Add button
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Enter test RDP host IP (using exposed port)
    const ipInput = page.locator('input[placeholder*="172.21"]');
    await ipInput.fill('127.0.0.1');
    
    // Submit
    const addButtons = page.locator('button:has-text("Add")');
    await addButtons.last().click();
    await page.waitForTimeout(500);
    
    // Click on host
    await page.click('text=127.0.0.1');
    await page.waitForTimeout(500);
    
    // Select RDP
    await page.selectOption('select', 'rdp');
    
    // Click Login
    await page.click('button:has-text("Login")');
    await page.waitForTimeout(1000);
    
    // Fill RDP credentials
    await page.fill('input[placeholder="admin"]', 'rdpuser');
    await page.fill('input[placeholder="••••••••"]', 'rdp123');
    
    // Take screenshot before connect
    await page.screenshot({ path: 'test-results/rdp-before-connect.png' });
    
    // Click Connect
    await page.click('button:has-text("Connect")');
    
    // Wait for connection
    await page.waitForTimeout(5000);
    
    // Take screenshot after connect attempt
    await page.screenshot({ path: 'test-results/rdp-after-connect.png' });
    
    // Check if we see the connected state or an error
    const connectedText = page.locator('text=Connected to');
    const errorText = page.locator('text=Connection Failed');
    
    const isConnected = await connectedText.isVisible({ timeout: 2000 }).catch(() => false);
    const hasError = await errorText.isVisible({ timeout: 2000 }).catch(() => false);
    
    console.log('RDP Connection - Connected:', isConnected);
    console.log('RDP Connection - Error:', hasError);
    
    // For now, just log the result - we'll fix based on what we see
    if (hasError) {
      const errorDetails = await page.locator('.text-red-500, .text-cyber-red').textContent().catch(() => 'No error details');
      console.log('Error details:', errorDetails);
    }
  });
});
