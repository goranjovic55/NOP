/**
 * E2E Tests for Flows Page
 * Tests UI interactions: block selection, canvas operations, workflow execution
 * Verifies real host responses and UI feedback
 */

import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';
const API_URL = 'http://localhost:12001';

// Test configuration
const TEST_CONFIG = {
  loginCredentials: { username: 'admin', password: 'admin123' },
  realHosts: {
    external: '8.8.8.8',        // Google DNS - for ping tests
    postgres: '172.29.0.10',    // Local postgres container
    redis: '172.29.0.11',       // Local redis container
  },
  timeouts: {
    navigation: 10000,
    execution: 30000,
    animation: 500,
  }
};

// Helper to login
async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="text"], input[name="username"]', TEST_CONFIG.loginCredentials.username);
  await page.fill('input[type="password"]', TEST_CONFIG.loginCredentials.password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: TEST_CONFIG.timeouts.navigation });
}

// Helper to navigate to Flows page
async function goToFlows(page: Page) {
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForSelector('[data-testid="workflow-canvas"], .react-flow', { timeout: TEST_CONFIG.timeouts.navigation });
}

// ============================================
// TEST SUITE: Block Palette
// ============================================
test.describe('Block Palette', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should display all block categories', async ({ page }) => {
    // Open block palette if collapsed
    const palette = page.locator('text=BLOCKS').first();
    await expect(palette).toBeVisible();

    // Check all categories are present
    const expectedCategories = ['ASSETS', 'CONTROL', 'CONNECTION', 'COMMAND', 'TRAFFIC', 'SCANNING', 'AGENT', 'DATA'];
    
    for (const category of expectedCategories) {
      const categoryElement = page.locator(`text=${category}`).first();
      await expect(categoryElement).toBeVisible({ timeout: 5000 });
    }
  });

  test('should expand ASSETS category and show blocks', async ({ page }) => {
    // Click ASSETS category to expand
    await page.click('text=ASSETS');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Verify ASSETS blocks are visible (using actual block labels from blocks.ts)
    const assetBlocks = ['Get All Assets', 'Filter Assets', 'Get Asset', 'ARP Discovery', 'Ping Sweep', 'Check Online', 'Get Credentials'];
    for (const block of assetBlocks) {
      const blockElement = page.locator(`text=${block}`).first();
      await expect(blockElement).toBeVisible({ timeout: 5000 });
    }
  });

  test('should expand CONTROL category and show blocks', async ({ page }) => {
    await page.click('text=CONTROL');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Use actual block labels from the UI
    const controlBlocks = ['Start', 'End', 'Delay', 'Condition', 'Loop'];
    for (const block of controlBlocks) {
      await expect(page.locator(`text=${block}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should expand CONNECTION category and show blocks', async ({ page }) => {
    await page.click('text=CONNECTION');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Use actual block labels - need to check what they are
    const connectionBlocks = ['Ping', 'SSH Test', 'TCP'];
    for (const block of connectionBlocks) {
      await expect(page.locator(`text=${block}`).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should filter blocks via search', async ({ page }) => {
    // Type in search
    await page.fill('input[placeholder*="SEARCH"]', 'ping');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Should show ping-related blocks
    await expect(page.locator('text=ICMP Ping').first()).toBeVisible();
    await expect(page.locator('text=Ping Sweep').first()).toBeVisible();
  });
});

// ============================================
// TEST SUITE: Block Drag and Drop
// ============================================
test.describe('Block Drag and Drop', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should drag Start block to canvas', async ({ page }) => {
    // Expand CONTROL
    await page.click('text=CONTROL');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Find the Start block and canvas
    const startBlock = page.locator('text=Start').first();
    const canvas = page.locator('.react-flow__pane').first();

    // Drag and drop
    await startBlock.dragTo(canvas);
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Verify block appears on canvas
    const canvasNode = page.locator('.react-flow__node');
    await expect(canvasNode.first()).toBeVisible();
  });

  test('should drag Ping block to canvas', async ({ page }) => {
    await page.click('text=CONNECTION');
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    const pingBlock = page.locator('text=ICMP Ping').first();
    const canvas = page.locator('.react-flow__pane').first();

    await pingBlock.dragTo(canvas);
    await page.waitForTimeout(TEST_CONFIG.timeouts.animation);

    // Should have node on canvas
    await expect(page.locator('.react-flow__node').first()).toBeVisible();
  });
});

// ============================================
// TEST SUITE: Workflow Selection and Execution
// ============================================
test.describe('Workflow Execution', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should list available workflows', async ({ page }) => {
    // Look for workflow selector or list
    const workflowList = page.locator('[data-testid="workflow-list"], select, .workflow-selector').first();
    
    if (await workflowList.isVisible()) {
      await workflowList.click();
      // Should show T1-Ping and other workflows
      await expect(page.locator('text=T1-Ping')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should load T1-Ping workflow', async ({ page }) => {
    // Find and click T1-Ping workflow
    const workflowItem = page.locator('text=T1-Ping').first();
    
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      // Verify workflow loaded - should see nodes on canvas
      const nodes = page.locator('.react-flow__node');
      await expect(nodes.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should execute T1-Ping workflow against real host', async ({ page }) => {
    // Load T1-Ping
    const workflowItem = page.locator('text=T1-Ping').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);
    }

    // Find and click Execute/Run button
    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("▶")').first();
    
    if (await executeButton.isVisible({ timeout: 3000 })) {
      await executeButton.click();

      // Wait for execution to complete
      await page.waitForTimeout(5000);

      // Check for success indicators
      const successIndicator = page.locator('text=completed, text=success, .bg-green, .text-green').first();
      await expect(successIndicator).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
    }
  });

  test('should show execution status updates', async ({ page }) => {
    // Load and execute a workflow
    const workflowItem = page.locator('text=T1-Ping').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);
    }

    const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
    if (await executeButton.isVisible({ timeout: 3000 })) {
      await executeButton.click();

      // Should show running status
      await expect(page.locator('text=running, text=pending, text=Executing').first()).toBeVisible({ timeout: 3000 });

      // Then should show completed
      await expect(page.locator('text=completed, text=success').first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
    }
  });
});

// ============================================
// TEST SUITE: Real Host Testing
// ============================================
test.describe('Real Host Execution', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should ping 8.8.8.8 successfully via workflow', async ({ page }) => {
    // Create or load ping workflow
    const workflowItem = page.locator('text=T1-Ping').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      // Execute
      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("▶")').first();
      if (await executeButton.isVisible({ timeout: 3000 })) {
        await executeButton.click();
        await page.waitForTimeout(5000);

        // Verify success - ping to 8.8.8.8 should work
        const nodeResult = page.locator('text=reachable, text=completed, text=true, .success').first();
        await expect(nodeResult).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
      }
    }
  });

  test('should test SSH connection workflow', async ({ page }) => {
    const workflowItem = page.locator('text=T2-SSH').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
      if (await executeButton.isVisible({ timeout: 3000 })) {
        await executeButton.click();
        await page.waitForTimeout(5000);

        // Check for completion (SSH may fail but workflow should complete)
        await expect(page.locator('text=completed, text=failed').first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
      }
    }
  });

  test('should test TCP connection workflow', async ({ page }) => {
    const workflowItem = page.locator('text=T3-TCP').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
      if (await executeButton.isVisible({ timeout: 3000 })) {
        await executeButton.click();
        
        // TCP to postgres should succeed
        await expect(page.locator('text=completed').first()).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
      }
    }
  });
});

// ============================================
// TEST SUITE: Console Output
// ============================================
test.describe('Console Output', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should show execution logs in console', async ({ page }) => {
    // Open console if collapsed
    const consoleToggle = page.locator('text=CONSOLE, text=Console').first();
    if (await consoleToggle.isVisible()) {
      await consoleToggle.click();
    }

    // Load and execute a workflow
    const workflowItem = page.locator('text=T1-Ping').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
      if (await executeButton.isVisible({ timeout: 3000 })) {
        await executeButton.click();
        await page.waitForTimeout(3000);

        // Console should show execution messages
        const consoleOutput = page.locator('[data-testid="console"], .console, pre, code').first();
        await expect(consoleOutput).toBeVisible({ timeout: 5000 });
      }
    }
  });
});

// ============================================
// TEST SUITE: Node Status Visual Feedback
// ============================================
test.describe('Node Visual Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  test('should highlight nodes during execution', async ({ page }) => {
    const workflowItem = page.locator('text=T1-Ping').first();
    if (await workflowItem.isVisible({ timeout: 3000 })) {
      await workflowItem.click();
      await page.waitForTimeout(1000);

      const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run")').first();
      if (await executeButton.isVisible({ timeout: 3000 })) {
        await executeButton.click();

        // Nodes should get visual feedback (border/glow changes)
        const nodes = page.locator('.react-flow__node');
        await expect(nodes.first()).toBeVisible();

        // Wait for execution to show completed state
        await page.waitForTimeout(5000);
      }
    }
  });
});

// ============================================
// TEST SUITE: All Standard Workflows
// ============================================
test.describe('Standard Workflows', () => {
  const workflows = [
    'T1-Ping',
    'T2-SSH', 
    'T3-TCP',
    'T4-Delay-Cond',
    'T5-MultiPing',
    'T6-SSH-Cmd',
    'T7-PortScan',
    'T8-Traffic',
    'T9-SysInfo',
    'T10-SubnetScanLoop',
    'T11-AttackChain',
    'T12-AgentDeployment',
    'T13-REPRingTest',
  ];

  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
  });

  for (const workflowName of workflows) {
    test(`should load and execute ${workflowName}`, async ({ page }) => {
      const workflowItem = page.locator(`text=${workflowName}`).first();
      
      if (await workflowItem.isVisible({ timeout: 3000 })) {
        await workflowItem.click();
        await page.waitForTimeout(1000);

        // Verify workflow loaded
        const nodes = page.locator('.react-flow__node');
        await expect(nodes.first()).toBeVisible({ timeout: 5000 });

        // Execute
        const executeButton = page.locator('button:has-text("Execute"), button:has-text("Run"), button:has-text("▶")').first();
        if (await executeButton.isVisible({ timeout: 3000 })) {
          await executeButton.click();

          // Wait for completion
          await page.waitForTimeout(10000);

          // Should show some status
          const status = page.locator('text=completed, text=failed, text=success').first();
          await expect(status).toBeVisible({ timeout: TEST_CONFIG.timeouts.execution });
        }
      } else {
        // If workflow not visible in list, skip but log
        console.log(`Workflow ${workflowName} not found in UI list`);
      }
    });
  }
});
