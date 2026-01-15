/**
 * E2E Test: Debug block highlighting - check DOM structure during execution
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(3000);
}

async function setupWorkflow(page: Page) {
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(2000);
  const selectDropdown = page.locator('select.cyber-select');
  const options = await selectDropdown.locator('option').allTextContents();
  if (options.length > 1) {
    await selectDropdown.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

test.describe('Block Highlighting Debug', () => {
  test('Inspect BlockNode DOM during execution', async ({ page }) => {
    await login(page);
    await setupWorkflow(page);
    
    // Load a simple template
    const templatesBtn = page.locator('button:has-text("TEMPLATES")');
    await templatesBtn.click();
    await page.waitForTimeout(1000);
    
    // Click on ping template (fast)
    const pingTemplate = page.locator('div.p-3.cursor-pointer:has(h4:has-text("Ping"))').first();
    if (await pingTemplate.count() > 0) {
      await pingTemplate.click();
      await page.waitForTimeout(1500);
    }
    
    // Get initial block node HTML
    const nodes = page.locator('.react-flow__node');
    const nodeCount = await nodes.count();
    console.log(`Found ${nodeCount} nodes`);
    
    // Get first node's outer HTML
    if (nodeCount > 0) {
      const firstNode = nodes.first();
      const html = await firstNode.innerHTML();
      console.log('First node HTML (before execution):');
      console.log(html.substring(0, 500));
      
      // Get border-color
      const innerDiv = firstNode.locator('div').first();
      const style = await innerDiv.getAttribute('style');
      console.log('Node border style (before):', style);
    }
    
    // Save workflow before executing
    const saveButton = page.locator('button:has-text("SAVE")');
    if (await saveButton.isEnabled()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click RUN
    const runButton = page.locator('button:has-text("▶ RUN")');
    await runButton.click();
    console.log('Execution started');
    
    // Monitor node styles during execution
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      
      const nodesNow = page.locator('.react-flow__node');
      const count = await nodesNow.count();
      
      // Check each node's current style and content
      let runningCount = 0;
      let completedCount = 0;
      let failedCount = 0;
      
      for (let j = 0; j < Math.min(count, 5); j++) {
        const node = nodesNow.nth(j);
        const outerHTML = await node.evaluate(el => el.outerHTML);
        
        // Check for execution status indicators
        if (outerHTML.includes('00d4ff') || outerHTML.includes('RUNNING')) {
          runningCount++;
        }
        if (outerHTML.includes('00ff88') || outerHTML.includes('PASSED')) {
          completedCount++;
        }
        if (outerHTML.includes('ff0040') || outerHTML.includes('FAILED')) {
          failedCount++;
        }
      }
      
      console.log(`[${i}s] Status: ${runningCount} running, ${completedCount} completed, ${failedCount} failed`);
      
      // Check for status bar text in nodes
      const passedText = await page.locator('.react-flow__node:has-text("PASSED")').count();
      const runningText = await page.locator('.react-flow__node:has-text("RUNNING")').count();
      
      console.log(`  Text indicators: ${passedText} PASSED, ${runningText} RUNNING`);
      
      // Stop if execution seems complete
      if (passedText > 0 && runningText === 0) {
        console.log('Execution appears complete!');
        break;
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/highlighting-debug.png', fullPage: true });
    
    // Print final HTML of nodes that have PASSED
    const passedNodes = page.locator('.react-flow__node:has-text("PASSED")');
    const passedCount = await passedNodes.count();
    console.log(`\n=== ${passedCount} nodes with PASSED status ===`);
    
    if (passedCount > 0) {
      const firstPassed = passedNodes.first();
      const html = await firstPassed.innerHTML();
      console.log('First PASSED node HTML:');
      console.log(html.substring(0, 800));
    }
    
    expect(passedCount).toBeGreaterThan(0);
  });
});
