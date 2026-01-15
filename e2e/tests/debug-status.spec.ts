import { test, expect } from '@playwright/test';

test('Debug block status data', async ({ page }) => {
  await page.goto('http://localhost:12000');
  await page.waitForSelector('.react-flow', { timeout: 10000 });
  await page.waitForTimeout(2000);
  
  // Find Port Scan Pipeline and click
  const pipelines = page.locator('[class*="workflow-item"], .workflow-list-item, [class*="list"] > div');
  const count = await pipelines.count();
  console.log(`Found ${count} items in sidebar`);
  
  for (let i = 0; i < count; i++) {
    const text = await pipelines.nth(i).textContent();
    if (text?.includes('Port Scan')) {
      await pipelines.nth(i).click();
      break;
    }
  }
  
  await page.waitForTimeout(1500);
  
  // Get node count
  const nodes = page.locator('.react-flow__node');
  const nodeCount = await nodes.count();
  console.log(`${nodeCount} nodes loaded`);
  
  // Click RUN
  const runButton = page.locator('button:has-text("▶ RUN")');
  await runButton.click();
  console.log('RUN clicked');
  
  // Wait for execution
  await page.waitForTimeout(5000);
  
  // Debug: Check actual DOM content
  const nodeElements = await page.locator('.react-flow__node').all();
  for (let i = 0; i < Math.min(nodeElements.length, 5); i++) {
    const el = nodeElements[i];
    const text = await el.textContent();
    const borderStyle = await el.locator('> div > div').first().evaluate(e => 
      window.getComputedStyle(e).borderColor
    );
    console.log(`Node ${i}: border=${borderStyle}, text includes PASSED=${text?.includes('PASSED')}`);
  }
  
  // Check specific selector for PASSED text
  const passedNodes = page.locator('.react-flow__node:has-text("PASSED")');
  const passedCount = await passedNodes.count();
  console.log(`Total PASSED nodes: ${passedCount}`);
  
  if (passedCount > 0) {
    const first = await passedNodes.first().textContent();
    console.log(`First PASSED node text: ${first}`);
  }
});
