import { test, expect } from '@playwright/test';

test.describe('VNC Form Test', () => {
  test('VNC login should NOT show username field', async ({ page }) => {
    // Login first
    await page.goto('/');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 15000 });
    
    // Go to Access page
    await page.click('text=Access');
    await page.waitForURL('**/access', { timeout: 10000 });
    
    // Click the Add button and add an IP
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(500);
    
    // Enter IP
    const ipInput = page.locator('input[placeholder*="172"]').first();
    if (await ipInput.isVisible()) {
      await ipInput.fill('127.0.0.1');
      // Click Add to add the host
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
    
    // Look for the host and click it
    await page.click('text=127.0.0.1');
    await page.waitForTimeout(500);
    
    // Select VNC protocol in the modal
    const protocolSelect = page.locator('select').first();
    if (await protocolSelect.isVisible()) {
      await protocolSelect.selectOption('vnc');
      await page.waitForTimeout(200);
    }
    
    // Click the Login/Connect button
    await page.click('button:has-text("Login"), button:has-text("Connect")');
    await page.waitForTimeout(1000);
    
    // Now we should be in the ProtocolConnection component
    // Check if username field is visible - IT SHOULD NOT BE for VNC
    const usernameField = page.locator('input[placeholder="admin"]');
    const usernameLabel = page.locator('text=Username').first();
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'vnc-form-screenshot.png', fullPage: true });
    
    // For VNC, username field should be hidden
    const isUsernameVisible = await usernameLabel.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Username field visible:', isUsernameVisible);
    
    // Check for password field which should be visible
    const passwordLabel = page.locator('text=Password').first();
    const isPasswordVisible = await passwordLabel.isVisible({ timeout: 2000 }).catch(() => false);
    console.log('Password field visible:', isPasswordVisible);
    
    // VNC should show password but NOT username
    expect(isPasswordVisible).toBe(true);
    expect(isUsernameVisible).toBe(false);
  });
});
