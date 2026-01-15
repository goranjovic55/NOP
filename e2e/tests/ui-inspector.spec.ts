/**
 * UI Inspector Test - Debug Actual Element Structure
 */
import { test, expect } from '@playwright/test';

test('inspect UI element structure', async ({ page }) => {
  // Login
  await page.goto('http://localhost:12000/login');
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);

  // Go to flows
  await page.goto('http://localhost:12000/flows');
  await page.waitForTimeout(3000);
  
  // Take screenshot
  await page.screenshot({ path: 'results/ui-structure.png', fullPage: true });
  
  // Find all select elements
  const selects = await page.locator('select').all();
  console.log(`\n=== SELECT ELEMENTS: ${selects.length} ===`);
  
  for (let i = 0; i < selects.length; i++) {
    const sel = selects[i];
    const html = await sel.evaluate(el => el.outerHTML.substring(0, 500));
    console.log(`\nSELECT ${i}:\n${html}\n`);
  }
  
  // Find workflow selector - look for elements with workflow-related text
  const workflowSelect = page.locator('select').filter({ hasText: 'T1' }).first();
  const hasWorkflowSelect = await workflowSelect.isVisible().catch(() => false);
  console.log(`\nWorkflow select found: ${hasWorkflowSelect}`);
  
  if (hasWorkflowSelect) {
    // Get all options
    const options = await workflowSelect.locator('option').allInnerTexts();
    console.log('\nWorkflow options:', options);
  }
  
  // Find buttons
  const buttons = await page.locator('button').all();
  console.log(`\n=== BUTTONS: ${buttons.length} ===`);
  for (let i = 0; i < Math.min(buttons.length, 15); i++) {
    const text = await buttons[i].innerText().catch(() => '[empty]');
    console.log(`Button ${i}: "${text.trim()}"`);
  }
  
  // Find RUN button specifically
  const runBtn = page.locator('button:has-text("RUN"), button:has-text("▶"), [aria-label*="run" i]');
  const runBtnCount = await runBtn.count();
  console.log(`\n=== RUN BUTTONS: ${runBtnCount} ===`);
  for (let i = 0; i < runBtnCount; i++) {
    const html = await runBtn.nth(i).evaluate(el => el.outerHTML.substring(0, 200));
    console.log(`RUN button ${i}: ${html}`);
  }
  
  // Find canvas area
  const canvas = page.locator('.react-flow, [class*="react-flow"], [class*="canvas"]');
  const canvasCount = await canvas.count();
  console.log(`\n=== CANVAS ELEMENTS: ${canvasCount} ===`);
  
  // Find block palette items (draggable blocks)
  const paletteItems = page.locator('[draggable="true"], [data-draggable="true"]');
  const paletteCount = await paletteItems.count();
  console.log(`\n=== DRAGGABLE ITEMS: ${paletteCount} ===`);
  
  console.log('\n=== UI INSPECTION COMPLETE ===\n');
});
