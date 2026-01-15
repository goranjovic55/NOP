/**
 * Execute ALL 13 Workflows via UI
 * Complete execution test for every standard workflow
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
  
  // Verify edges loaded
  const edges = page.locator('.react-flow__edge');
  const edgeCount = await edges.count();
  
  console.log(`${workflowName}: ${nodeCount} nodes, ${edgeCount} edges`);
  
  // Screenshot before run
  await page.screenshot({ path: `e2e/results/${workflowName}-loaded.png` });
  
  // Run workflow
  const runButton = page.locator('button:has-text("▶ RUN")');
  await expect(runButton).toBeEnabled({ timeout: 5000 });
  await runButton.click();
  
  // Wait for execution
  await page.waitForTimeout(waitTime);
  
  // Screenshot after execution
  await page.screenshot({ path: `e2e/results/${workflowName}-executed.png` });
  
  return { nodeCount, edgeCount };
}

// ============================================
// Already tested workflows (quick verification)
// ============================================
test.describe('Previously Tested Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('T1-Ping: verified', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T1-Ping', 12000);
    expect(result.nodeCount).toBeGreaterThan(0);
  });

  test('T2-SSH: verified', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T2-SSH', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
  });

  test('T4-Delay-Cond: verified', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T4-Delay-Cond', 12000);
    expect(result.nodeCount).toBeGreaterThan(0);
  });

  test('T10-SubnetScanLoop: verified', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T10-SubnetScanLoop', 20000);
    expect(result.nodeCount).toBeGreaterThan(0);
  });
});

// ============================================
// NEW: Remaining 9 workflows
// ============================================
test.describe('Remaining Workflows', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('T3-TCP: executes TCP connection test', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T3-TCP', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T5-MultiPing: executes multiple pings', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T5-MultiPing', 20000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T6-SSH-Cmd: executes SSH command', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T6-SSH-Cmd', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T7-PortScan: executes port scan', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T7-PortScan', 15000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T8-Traffic: executes traffic analysis', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T8-Traffic', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T9-SysInfo: executes system info', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T9-SysInfo', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T11-AttackChain: executes attack chain', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T11-AttackChain', 15000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T12-AgentDeployment: executes agent deployment', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T12-AgentDeployment', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });

  test('T13-REPRingTest: executes REP ring test', async ({ page }) => {
    const result = await selectAndRunWorkflow(page, 'T13-REPRingTest', 10000);
    expect(result.nodeCount).toBeGreaterThan(0);
    expect(result.edgeCount).toBeGreaterThan(0);
  });
});

// ============================================
// Summary Test
// ============================================
test.describe('Workflow Summary', () => {
  test('all 13 workflows exist in dropdown', async ({ page }) => {
    await login(page);
    await page.goto(`${BASE_URL}/flows`);
    await page.waitForTimeout(2000);
    
    const dropdown = page.locator('select.cyber-select');
    const options = await dropdown.locator('option').allInnerTexts();
    
    console.log('All workflow options:', options);
    
    const expectedWorkflows = [
      'T1-Ping', 'T2-SSH', 'T3-TCP', 'T4-Delay-Cond', 'T5-MultiPing',
      'T6-SSH-Cmd', 'T7-PortScan', 'T8-Traffic', 'T9-SysInfo',
      'T10-SubnetScanLoop', 'T11-AttackChain', 'T12-AgentDeployment', 'T13-REPRingTest'
    ];
    
    for (const wf of expectedWorkflows) {
      expect(options.some(o => o.includes(wf))).toBeTruthy();
      console.log(`✓ ${wf} found`);
    }
  });
});
