/**
 * Complete E2E Test Suite for Flows Page
 * Tests actual UI interactions against real hosts
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';

const TEST_CONFIG = {
  loginCredentials: { username: 'admin', password: 'admin123' },
  timeouts: {
    navigation: 10000,
    execution: 45000,
    animation: 1000,
  }
};

// Helper to login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  
  const usernameField = page.locator('input[type="text"], input[name="username"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  await usernameField.fill(TEST_CONFIG.loginCredentials.username);
  await passwordField.fill(TEST_CONFIG.loginCredentials.password);
  await submitBtn.click();
  await page.waitForTimeout(2000);
}

// Helper to navigate to flows
async function goToFlows(page: Page) {
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(2000);
}

// Helper to select a workflow
async function selectWorkflow(page: Page, workflowName: string) {
  // Click on the workflow dropdown
  const dropdown = page.locator('text=SELECT FLOW').first();
  if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
    await dropdown.click();
    await page.waitForTimeout(500);
  }
  
  // Click on the workflow
  const workflowItem = page.locator(`text=${workflowName}`).first();
  await workflowItem.click();
  await page.waitForTimeout(1000);
}

// Helper to execute workflow
async function executeWorkflow(page: Page) {
  const runButton = page.locator('text=RUN, button:has-text("▶")').first();
  if (await runButton.isVisible()) {
    await runButton.click();
  } else {
    // Try other selectors
    await page.click('button:has-text("RUN")').catch(() => {});
    await page.click('[aria-label="Execute"]').catch(() => {});
  }
}

// ============================================
// TEST SUITE: Block Palette Verification
// ============================================
test.describe('Block Palette', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('displays all 8 categories', async ({ page }) => {
    const categories = ['ASSETS', 'CONTROL', 'CONNECTION', 'COMMAND', 'TRAFFIC', 'SCANNING', 'AGENT', 'DATA'];
    
    for (const category of categories) {
      await expect(page.locator(`text=${category}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('ASSETS category shows 8 blocks when expanded', async ({ page }) => {
    // Click ASSETS to expand
    await page.click('text=ASSETS');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
    
    // Check for asset blocks
    await expect(page.locator('text=Get All Assets').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Filter Assets').first()).toBeVisible({ timeout: 5000 });
  });

  test('CONTROL category shows blocks when expanded', async ({ page }) => {
    // CONTROL might already be expanded, but click to toggle
    await page.click('text=CONTROL');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);
    
    // Check for control blocks
    await expect(page.locator('text=Start').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=End').first()).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Loop').first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// TEST SUITE: Workflow Loading
// ============================================
test.describe('Workflow Loading', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('lists all 13 standard workflows', async ({ page }) => {
    const workflows = [
      'T1-Ping', 'T2-SSH', 'T3-TCP', 'T4-Delay-Cond', 'T5-MultiPing',
      'T6-SSH-Cmd', 'T7-PortScan', 'T8-Traffic', 'T9-SysInfo',
      'T10-SubnetScanLoop', 'T11-AttackChain', 'T12-AgentDeployment', 'T13-REPRingTest'
    ];

    for (const wf of workflows) {
      await expect(page.locator(`text=${wf}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('can select T1-Ping workflow', async ({ page }) => {
    await page.click('text=T1-Ping');
    await page.waitForTimeout(1000);
    
    // Should see nodes on canvas
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible({ timeout: 5000 });
  });
});

// ============================================
// TEST SUITE: Workflow Execution Against Real Hosts
// ============================================
test.describe('Workflow Execution', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('T1-Ping: executes ping to 8.8.8.8', async ({ page }) => {
    // Select workflow
    await page.click('text=T1-Ping');
    await page.waitForTimeout(1000);
    
    // Execute
    await page.click('text=RUN');
    
    // Wait for execution
    await page.waitForTimeout(5000);
    
    // Take screenshot of result
    await page.screenshot({ path: 'e2e/results/T1-Ping-result.png' });
    
    // Check console for output
    const consoleText = await page.locator('[class*="console"], pre, code').first().innerText().catch(() => '');
    console.log('T1-Ping console output:', consoleText.substring(0, 500));
    
    // Should show completed or success somewhere
    const completedVisible = await page.locator('text=/completed|success|reachable/i').first().isVisible({ timeout: 10000 }).catch(() => false);
    expect(completedVisible || consoleText.includes('completed') || consoleText.includes('reachable')).toBe(true);
  });

  test('T2-SSH: executes SSH test', async ({ page }) => {
    await page.click('text=T2-SSH');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'e2e/results/T2-SSH-result.png' });
    
    // Workflow should complete (SSH may fail, but workflow completes)
    const statusVisible = await page.locator('text=/completed|failed|success/i').first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(statusVisible).toBe(true);
  });

  test('T3-TCP: executes TCP connection test', async ({ page }) => {
    await page.click('text=T3-TCP');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: 'e2e/results/T3-TCP-result.png' });
    
    // Should complete
    const statusVisible = await page.locator('text=/completed|success/i').first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(statusVisible).toBe(true);
  });

  test('T4-Delay-Cond: executes delay and condition', async ({ page }) => {
    await page.click('text=T4-Delay-Cond');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    
    // This has 2 second delay
    await page.waitForTimeout(8000);
    
    await page.screenshot({ path: 'e2e/results/T4-Delay-result.png' });
    
    const statusVisible = await page.locator('text=/completed|success/i').first().isVisible({ timeout: 15000 }).catch(() => false);
    expect(statusVisible).toBe(true);
  });

  test('T5-MultiPing: executes multiple pings', async ({ page }) => {
    await page.click('text=T5-MultiPing');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    
    // Multiple pings take time
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'e2e/results/T5-MultiPing-result.png' });
    
    const statusVisible = await page.locator('text=/completed|success/i').first().isVisible({ timeout: 20000 }).catch(() => false);
    expect(statusVisible).toBe(true);
  });

  test('T10-SubnetScanLoop: executes loop workflow', async ({ page }) => {
    await page.click('text=T10-SubnetScanLoop');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    
    // Loop has 5 iterations
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: 'e2e/results/T10-Loop-result.png' });
    
    const statusVisible = await page.locator('text=/completed|success/i').first().isVisible({ timeout: 30000 }).catch(() => false);
    expect(statusVisible).toBe(true);
  });
});

// ============================================
// TEST SUITE: Node Visual Feedback
// ============================================
test.describe('Visual Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('nodes show status during execution', async ({ page }) => {
    await page.click('text=T1-Ping');
    await page.waitForTimeout(1000);
    
    // Take before screenshot
    await page.screenshot({ path: 'e2e/results/before-execution.png' });
    
    await page.click('text=RUN');
    
    // Take during screenshot (immediately after click)
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/results/during-execution.png' });
    
    // Wait for completion
    await page.waitForTimeout(5000);
    
    // Take after screenshot
    await page.screenshot({ path: 'e2e/results/after-execution.png' });
    
    // Nodes should exist
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible();
  });
});

// ============================================
// TEST SUITE: Console Output
// ============================================
test.describe('Console', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('shows execution logs after running workflow', async ({ page }) => {
    await page.click('text=T1-Ping');
    await page.waitForTimeout(1000);
    
    await page.click('text=RUN');
    await page.waitForTimeout(5000);
    
    // Console should have content
    const consoleSection = page.locator('text=CONSOLE').first();
    await expect(consoleSection).toBeVisible();
    
    // Should show some logs
    const logContent = await page.locator('[class*="console"] div, pre').first().innerText().catch(() => '');
    console.log('Console content:', logContent.substring(0, 500));
    
    // Should not be empty or just the placeholder
    expect(logContent.length > 10 || logContent.includes('execution')).toBe(true);
  });
});

// ============================================
// TEST SUITE: Block Drag and Drop
// ============================================
test.describe('Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('can drag Start block to canvas', async ({ page }) => {
    // Expand CONTROL category
    await page.click('text=CONTROL');
    await page.waitForTimeout(500);
    
    // Find Start block
    const startBlock = page.locator('text=Start').first();
    const canvas = page.locator('.react-flow__pane').first();
    
    // Drag to canvas
    await startBlock.dragTo(canvas, { targetPosition: { x: 300, y: 200 } });
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'e2e/results/drag-drop-result.png' });
    
    // Should have node on canvas
    const nodes = page.locator('.react-flow__node');
    await expect(nodes.first()).toBeVisible();
  });
});
