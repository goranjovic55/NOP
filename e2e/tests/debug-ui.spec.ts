/**
 * Debug test to explore UI elements
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';

async function login(page: Page) {
  console.log('Logging in...');
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
  console.log('Logged in successfully');
}

test.describe('Debug UI', () => {
  test('Explore flows page', async ({ page }) => {
    await login(page);
    
    // Navigate to flows
    await page.goto(`${BASE_URL}/flows`);
    await page.waitForTimeout(3000);
    
    // Screenshot the page
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/flows-page.png', fullPage: true });
    
    // First, we need to select or create a workflow
    // Check if dropdown has options
    const selectDropdown = page.locator('select.cyber-select');
    const options = await selectDropdown.locator('option').allTextContents();
    console.log('Workflow options:', options);
    
    // If there are workflows, select the first one; otherwise create new
    if (options.length > 1) {
      console.log('Selecting first workflow...');
      // Select the second option (first is "[ SELECT FLOW ]")
      await selectDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(1000);
    } else {
      console.log('Creating new workflow...');
      const newBtn = page.locator('button:has-text("+ NEW")');
      await newBtn.click();
      await page.waitForTimeout(2000);
    }
    
    // Now open templates panel
    const templatesBtn = page.locator('button:has-text("TEMPLATES")');
    await templatesBtn.click();
    await page.waitForTimeout(1000);
    
    // Screenshot templates panel
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/templates-panel.png', fullPage: true });
    
    // Click first template
    const clickableCards = page.locator('div.p-3.cursor-pointer');
    console.log('Clickable cards count:', await clickableCards.count());
    
    await clickableCards.first().click();
    await page.waitForTimeout(2000);
    
    // Screenshot after template insert
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/after-template-click.png', fullPage: true });
    
    // Check for nodes
    const nodes = await page.locator('.react-flow__node').count();
    console.log('Nodes after template click:', nodes);
    
    // Check console for "Inserted template" message
    page.on('console', msg => {
      if (msg.text().includes('template')) {
        console.log('Console:', msg.text());
      }
    });
    
    expect(nodes).toBeGreaterThan(0);
  });
});
