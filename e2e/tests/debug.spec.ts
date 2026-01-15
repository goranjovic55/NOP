/**
 * Debug test to check what the UI actually shows
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';

// Helper to login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  
  // Wait for login form
  await page.waitForSelector('input', { timeout: 10000 });
  
  // Find username field (could be various selectors)
  const usernameField = page.locator('input[type="text"], input[name="username"], input[placeholder*="user"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign")').first();

  await usernameField.fill('admin');
  await passwordField.fill('admin123');
  await submitBtn.click();

  // Wait for navigation
  await page.waitForTimeout(2000);
}

test('debug: check flows page structure', async ({ page }) => {
  await login(page);
  
  // Navigate to flows
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'e2e/debug-flows-page.png', fullPage: true });
  
  // Get page content
  const bodyText = await page.locator('body').innerText();
  console.log('=== PAGE CONTENT ===');
  console.log(bodyText.substring(0, 3000));
  console.log('===================');
  
  // Check for block palette
  const hasBlocks = await page.locator('text=BLOCKS').isVisible();
  console.log('Has BLOCKS text:', hasBlocks);
  
  // Check for categories
  const categories = ['ASSETS', 'CONTROL', 'CONNECTION', 'COMMAND', 'TRAFFIC', 'SCANNING', 'AGENT', 'DATA'];
  for (const cat of categories) {
    const isVisible = await page.locator(`text=${cat}`).first().isVisible({ timeout: 1000 }).catch(() => false);
    console.log(`Category ${cat}:`, isVisible);
  }
  
  // Try clicking on ASSETS category if visible
  if (await page.locator('text=ASSETS').first().isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.click('text=ASSETS');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'e2e/debug-assets-expanded.png', fullPage: true });
    
    // Check what blocks appear
    const paletteContent = await page.locator('[class*="palette"], [class*="sidebar"]').first().innerText().catch(() => '');
    console.log('=== PALETTE CONTENT ===');
    console.log(paletteContent.substring(0, 2000));
    console.log('======================');
  }
});

test('debug: check available workflows', async ({ page }) => {
  await login(page);
  
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(3000);
  
  // Check for workflow list/dropdown
  const workflowElements = await page.locator('text=/T[0-9]+-/').all();
  console.log('Found workflow elements:', workflowElements.length);
  
  for (const el of workflowElements.slice(0, 10)) {
    const text = await el.innerText();
    console.log('Workflow:', text);
  }
});
