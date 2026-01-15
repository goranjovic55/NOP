/**
 * E2E Test: Full workflow execution with visual feedback verification
 * Specifically tests that block highlighting works during RUN button execution
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

async function loadTemplate(page: Page, templateName: string) {
  const templatesBtn = page.locator('button:has-text("TEMPLATES")');
  await templatesBtn.click();
  await page.waitForTimeout(1000);
  
  const templateCard = page.locator(`div.p-3.cursor-pointer:has(h4:has-text("${templateName}"))`).first();
  if (await templateCard.count() > 0) {
    await templateCard.click();
    await page.waitForTimeout(1500);
    return true;
  }
  return false;
}

test.describe('Full Workflow Execution Visual Feedback', () => {
  test('RUN button execution should highlight blocks in real-time', async ({ page }) => {
    await login(page);
    await setupWorkflow(page);
    
    // Load a template with multiple blocks
    await loadTemplate(page, 'Multi-Host Ping Health Check');
    
    // Count nodes before execution
    const nodesBefore = await page.locator('.react-flow__node').count();
    console.log(`Loaded ${nodesBefore} nodes`);
    
    // Check initial state - no PASSED/FAILED/RUNNING text
    let passedBefore = await page.locator('.react-flow__node:has-text("PASSED")').count();
    let failedBefore = await page.locator('.react-flow__node:has-text("FAILED")').count();
    console.log(`Before execution: ${passedBefore} PASSED, ${failedBefore} FAILED`);
    
    // Save workflow first
    const saveButton = page.locator('button:has-text("SAVE")');
    if (await saveButton.isEnabled()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Click RUN button
    const runButton = page.locator('button:has-text("▶ RUN")');
    console.log('Clicking RUN button...');
    await runButton.click();
    
    // Monitor for visual changes during execution
    let sawRunning = false;
    let sawCompleted = false;
    let maxPassed = 0;
    let maxFailed = 0;
    
    // Capture screenshots at key moments
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/full-exec-start.png' });
    
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(500);
      
      // Count nodes with each status (text indicator)
      const runningCount = await page.locator('.react-flow__node:has-text("RUNNING")').count();
      const passedCount = await page.locator('.react-flow__node:has-text("PASSED")').count();
      const failedCount = await page.locator('.react-flow__node:has-text("FAILED")').count();
      
      if (runningCount > 0) {
        sawRunning = true;
        console.log(`[${i * 0.5}s] RUNNING: ${runningCount} blocks`);
        // Capture running state
        if (i === 2) {
          await page.screenshot({ path: '/workspaces/NOP/e2e/results/full-exec-running.png' });
        }
      }
      
      if (passedCount > maxPassed || failedCount > maxFailed) {
        maxPassed = Math.max(maxPassed, passedCount);
        maxFailed = Math.max(maxFailed, failedCount);
        console.log(`[${i * 0.5}s] Status update: ${passedCount} PASSED, ${failedCount} FAILED`);
      }
      
      if (passedCount > 0 || failedCount > 0) {
        sawCompleted = true;
      }
      
      // Check for green/red BORDER on block containers (not handles)
      // The block container has style="border-color: rgb(0, 255, 136)" when completed
      const greenBorderNodes = await page.locator('.react-flow__node > div > div[style*="border-color: rgb(0, 255, 136)"]').count();
      const redBorderNodes = await page.locator('.react-flow__node > div > div[style*="border-color: rgb(255, 0, 64)"]').count();
      const cyanBorderNodes = await page.locator('.react-flow__node > div > div[style*="border-color: rgb(0, 212, 255)"]').count();
      
      if (greenBorderNodes > 0 || redBorderNodes > 0 || cyanBorderNodes > 0) {
        console.log(`[${i * 0.5}s] Block borders: ${greenBorderNodes} green, ${redBorderNodes} red, ${cyanBorderNodes} cyan`);
      }
      
      // Exit if execution complete
      if ((passedCount > 0 || failedCount > 0) && runningCount === 0) {
        console.log('Execution complete!');
        break;
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/full-exec-complete.png', fullPage: true });
    
    // Verify results
    console.log(`\n=== Execution Summary ===`);
    console.log(`Saw RUNNING state: ${sawRunning}`);
    console.log(`Saw COMPLETED state: ${sawCompleted}`);
    console.log(`Max PASSED blocks: ${maxPassed}`);
    console.log(`Max FAILED blocks: ${maxFailed}`);
    
    // Success criteria
    expect(sawCompleted).toBe(true);
    expect(maxPassed + maxFailed).toBeGreaterThan(0);
    
    // Check block borders for green highlighting (not handles)
    const finalGreenBorders = await page.locator('.react-flow__node > div > div[style*="border-color: rgb(0, 255, 136)"]').count();
    console.log(`Final green-bordered blocks: ${finalGreenBorders}`);
    expect(finalGreenBorders).toBeGreaterThan(0);
  });
  
  test('Close overlay and verify highlighting persists', async ({ page }) => {
    await login(page);
    await setupWorkflow(page);
    await loadTemplate(page, 'Multi-Host Ping Health Check');
    
    // Save and execute
    const saveButton = page.locator('button:has-text("SAVE")');
    if (await saveButton.isEnabled()) {
      await saveButton.click();
      await page.waitForTimeout(1000);
    }
    
    await page.locator('button:has-text("▶ RUN")').click();
    
    // Wait for execution to complete
    for (let i = 0; i < 30; i++) {
      await page.waitForTimeout(1000);
      const running = await page.locator('.react-flow__node:has-text("RUNNING")').count();
      const passed = await page.locator('.react-flow__node:has-text("PASSED")').count();
      if (passed > 0 && running === 0) break;
    }
    
    // Close overlay if present
    const closeButton = page.locator('button:has-text("CLOSE")');
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check highlighting persists after closing overlay
    const passedNodes = await page.locator('.react-flow__node:has-text("PASSED")').count();
    const greenNodes = await page.locator('.react-flow__node').evaluateAll(nodes => 
      nodes.filter(n => n.innerHTML.includes('rgb(0, 255, 136)')).length
    );
    
    console.log(`After closing overlay: ${passedNodes} PASSED, ${greenNodes} green`);
    
    await page.screenshot({ path: '/workspaces/NOP/e2e/results/full-exec-overlay-closed.png', fullPage: true });
    
    expect(passedNodes).toBeGreaterThan(0);
    expect(greenNodes).toBeGreaterThan(0);
  });
});
