/**
 * Execute All 13 Workflows via UI
 * Comprehensive execution test for all standard workflows
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function selectAndRunWorkflow(page: Page, workflowName: string, waitTime = 15000) {
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(2000);
  
  // Select workflow from dropdown
  const dropdown = page.locator('select.cyber-select');
  await dropdown.selectOption({ label: workflowName });
  await page.waitForTimeout(1000);
  
  // Verify nodes loaded
  const nodes = page.locator('.react-flow__node');
  const nodeCount = await nodes.count();
  console.log(`${workflowName}: ${nodeCount} nodes loaded`);
  
  // Run workflow
  const runButton = page.locator('button:has-text("▶ RUN")');
  await expect(runButton).toBeEnabled({ timeout: 5000 });
  await runButton.click();
  
  // Wait for execution
  await page.waitForTimeout(waitTime);
  
  // Take screenshot
  await page.screenshot({ path: `e2e/results/${workflowName}-result.png` });
  
  return nodeCount;
}

test.describe('Execute All 13 Workflows', () => {
  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await login(page);
    await page.close();
  });
  
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const workflows = [
    { name: 'T1-Ping', wait: 15000 },
    { name: 'T2-SSH', wait: 10000 },
    { name: 'T3-TCP', wait: 10000 },
    { name: 'T4-Delay-Cond', wait: 15000 },
    { name: 'T5-MultiPing', wait: 20000 },
    { name: 'T6-SSH-Cmd', wait: 10000 },
    { name: 'T7-PortScan', wait: 15000 },
    { name: 'T8-Traffic', wait: 10000 },
    { name: 'T9-SysInfo', wait: 10000 },
    { name: 'T10-SubnetScanLoop', wait: 25000 },
    { name: 'T11-AttackChain', wait: 15000 },
    { name: 'T12-AgentDeployment', wait: 10000 },
    { name: 'T13-REPRingTest', wait: 10000 },
  ];

  for (const wf of workflows) {
    test(`${wf.name}: loads and executes`, async ({ page }) => {
      const nodeCount = await selectAndRunWorkflow(page, wf.name, wf.wait);
      expect(nodeCount).toBeGreaterThan(0);
    });
  }
});
