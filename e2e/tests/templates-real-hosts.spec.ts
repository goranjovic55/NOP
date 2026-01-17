/**
 * E2E Tests: Templates + Real Host Execution
 * 
 * Tests all 13 production templates with:
 * 1. Template loading without freezing
 * 2. Node insertion verification
 * 3. Real workflow execution against test hosts
 * 
 * Test Environment Required:
 *   docker compose -f docker/test-environment/docker-compose.e2e.yml up -d
 * 
 * Test Hosts:
 *   - SSH: 172.29.0.100 (root:toor)
 *   - FTP: 172.29.0.105 (ftpuser:ftp123)
 *   - Vuln: 172.29.0.106 (Apache 2.4.49)
 *   - Web: 172.29.0.101
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = 'http://localhost:12000';
const TEST_TIMEOUT = 30000; // 30s timeout for template operations

// All 13 production templates with expected node counts
const ALL_TEMPLATES = [
  // Asset Iteration Templates (3)
  { id: 'assets-ping-scan-loop', name: 'Assets: Ping & Scan Live Hosts', expectedNodes: 8, hasLoop: true },
  { id: 'discovery-ssh-hostinfo', name: 'Discovery: SSH Port 22 → Host Info', expectedNodes: 10, hasLoop: true },
  { id: 'direct-ssh-hostinfo', name: 'Direct: SSH to Host & Get Info', expectedNodes: 6, hasLoop: false },
  // Automation Scenarios (10)
  { id: 'asset-discovery', name: 'Asset Discovery & Inventory', expectedNodes: 6, hasLoop: false },
  { id: 'vuln-assessment', name: 'Vulnerability Assessment Chain', expectedNodes: 7, hasLoop: false },
  { id: 'credential-sweep', name: 'Credential Validation Sweep', expectedNodes: 7, hasLoop: true },
  { id: 'ssh-campaign', name: 'SSH Command Execution Campaign', expectedNodes: 8, hasLoop: true },
  { id: 'traffic-analysis', name: 'Network Traffic Analysis', expectedNodes: 6, hasLoop: false },
  { id: 'exploit-discovery', name: 'Exploit Discovery & Mapping', expectedNodes: 7, hasLoop: false },
  { id: 'ftp-operations', name: 'FTP File Operations', expectedNodes: 8, hasLoop: false },
  { id: 'ping-health-check', name: 'Multi-Host Ping Health Check', expectedNodes: 7, hasLoop: true },
  { id: 'agent-deploy', name: 'Agent Deployment Chain', expectedNodes: 8, hasLoop: false },
  { id: 'traffic-storm', name: 'Traffic Storm Testing', expectedNodes: 8, hasLoop: false },
];

// Templates that can be executed with real test hosts
const EXECUTABLE_TEMPLATES = [
  { id: 'direct-ssh-hostinfo', timeout: 60000, expectSuccess: true },
  { id: 'asset-discovery', timeout: 90000, expectSuccess: true },
  { id: 'ftp-operations', timeout: 60000, expectSuccess: true },
  { id: 'ping-health-check', timeout: 120000, expectSuccess: true },
];

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForSelector('input', { timeout: 10000 });
  await page.locator('input[type="text"], input[name="username"]').first().fill('admin');
  await page.locator('input[type="password"]').first().fill('admin123');
  await page.locator('button[type="submit"]').first().click();
  await page.waitForTimeout(2000);
}

async function goToFlows(page: Page) {
  await page.goto(`${BASE_URL}/flows`);
  await page.waitForTimeout(2000);
}

async function selectOrCreateWorkflow(page: Page): Promise<boolean> {
  const selectDropdown = page.locator('select.cyber-select');
  const options = await selectDropdown.locator('option').allTextContents();
  
  if (options.length > 1) {
    // Select existing workflow (not the placeholder)
    await selectDropdown.selectOption({ index: 1 });
    await page.waitForTimeout(500);
    return true;
  }
  
  // Create new workflow via + NEW button
  console.log('No existing workflows, creating new one...');
  const newBtn = page.locator('button:has-text("+ NEW")');
  if (await newBtn.count() > 0) {
    await newBtn.click();
    await page.waitForTimeout(1000);
    
    // Check if workflow was created (select dropdown should now have an option)
    const newOptions = await selectDropdown.locator('option').allTextContents();
    if (newOptions.length > 1) {
      await selectDropdown.selectOption({ index: 1 });
      await page.waitForTimeout(500);
      return true;
    }
  }
  
  return false;
}

async function openTemplatesPanel(page: Page): Promise<boolean> {
  const templatesBtn = page.locator('button:has-text("TEMPLATES")');
  if (await templatesBtn.count() > 0) {
    await templatesBtn.first().click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function closeTemplatesPanel(page: Page) {
  // Click the X button in templates panel
  const closeBtn = page.locator('.w-80 button:has-text("✕")');
  if (await closeBtn.count() > 0) {
    await closeBtn.first().click();
    await page.waitForTimeout(500);
  }
}

async function loadTemplateWithTimeout(page: Page, templateName: string): Promise<{ success: boolean; timeMs: number }> {
  const startTime = Date.now();
  
  // Find template card by name
  const templateCard = page.locator(`div.p-3.cursor-pointer:has(h4:has-text("${templateName}"))`).first();
  
  if (await templateCard.count() === 0) {
    return { success: false, timeMs: Date.now() - startTime };
  }
  
  // Click template with timeout - CRITICAL test for freeze bug
  const clickPromise = templateCard.click();
  const timeoutPromise = new Promise<'timeout'>((resolve) => 
    setTimeout(() => resolve('timeout'), TEST_TIMEOUT)
  );
  
  const result = await Promise.race([
    clickPromise.then(() => 'success' as const),
    timeoutPromise
  ]);
  
  const timeMs = Date.now() - startTime;
  
  if (result === 'timeout') {
    console.error(`FREEZE DETECTED: Template "${templateName}" took > ${TEST_TIMEOUT}ms`);
    return { success: false, timeMs };
  }
  
  // Wait for nodes to render
  await page.waitForTimeout(1000);
  
  return { success: true, timeMs };
}

async function countNodes(page: Page): Promise<number> {
  const nodes = page.locator('.react-flow__node');
  return await nodes.count();
}

async function countEdges(page: Page): Promise<number> {
  const edges = page.locator('.react-flow__edge');
  return await edges.count();
}

async function runWorkflow(page: Page): Promise<{ started: boolean; completed: boolean }> {
  // Click RUN button
  const runBtn = page.locator('button:has-text("RUN")').first();
  if (await runBtn.isDisabled()) {
    return { started: false, completed: false };
  }
  
  await runBtn.click();
  
  // Wait for execution to start
  await page.waitForTimeout(2000);
  
  // Check if EXECUTING indicator appears
  const executingIndicator = page.locator('span:has-text("EXECUTING")');
  const started = await executingIndicator.count() > 0;
  
  // Wait for completion (up to 2 minutes)
  const completedLocator = page.locator('span:has-text("COMPLETED")');
  const failedLocator = page.locator('span:has-text("FAILED")');
  
  try {
    await Promise.race([
      completedLocator.waitFor({ timeout: 120000 }),
      failedLocator.waitFor({ timeout: 120000 }),
    ]);
    
    const completed = await completedLocator.count() > 0;
    return { started, completed };
  } catch {
    return { started, completed: false };
  }
}

async function clearWorkflowNodes(page: Page) {
  // Select all nodes and delete
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(300);
  await page.keyboard.press('Delete');
  await page.waitForTimeout(500);
}

// =============================================================================
// TEST SUITE 1: Template Loading - No Freeze
// =============================================================================
test.describe('Template Loading Performance (No Freeze)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
    await selectOrCreateWorkflow(page);
  });
  
  for (const template of ALL_TEMPLATES) {
    test(`Template "${template.name}" loads without freezing`, async ({ page }) => {
      // Clear canvas first
      await clearWorkflowNodes(page);
      const initialNodes = await countNodes(page);
      
      // Open templates
      const panelOpened = await openTemplatesPanel(page);
      expect(panelOpened).toBe(true);
      
      // Time the template load - CRITICAL for freeze detection
      const { success, timeMs } = await loadTemplateWithTimeout(page, template.name);
      
      console.log(`Template: ${template.id}, Time: ${timeMs}ms, HasLoop: ${template.hasLoop}`);
      
      // Should NOT freeze (must complete within timeout)
      expect(success).toBe(true);
      expect(timeMs).toBeLessThan(TEST_TIMEOUT);
      
      // Verify nodes were added
      const finalNodes = await countNodes(page);
      const addedNodes = finalNodes - initialNodes;
      
      console.log(`  Nodes added: ${addedNodes} (expected: ${template.expectedNodes})`);
      
      // Allow ±2 node variance for edge cases
      expect(addedNodes).toBeGreaterThanOrEqual(template.expectedNodes - 2);
      expect(addedNodes).toBeLessThanOrEqual(template.expectedNodes + 2);
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: `/workspaces/NOP/e2e/results/template-${template.id}.png`,
        fullPage: true 
      });
    });
  }
});

// =============================================================================
// TEST SUITE 2: Loop Template Stress Test
// =============================================================================
test.describe('Loop Templates Stress Test', () => {
  const loopTemplates = ALL_TEMPLATES.filter(t => t.hasLoop);
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
    await selectOrCreateWorkflow(page);
  });
  
  for (const template of loopTemplates) {
    test(`Loop template "${template.name}" handles cycles correctly`, async ({ page }) => {
      await clearWorkflowNodes(page);
      await openTemplatesPanel(page);
      
      // Load the loop template multiple times to stress test
      for (let i = 0; i < 3; i++) {
        const { success, timeMs } = await loadTemplateWithTimeout(page, template.name);
        
        console.log(`Iteration ${i + 1}: ${template.id} loaded in ${timeMs}ms`);
        
        // Each load must complete without freezing
        expect(success).toBe(true);
        expect(timeMs).toBeLessThan(5000); // Loop templates should be fast
      }
      
      // Verify final node count (3 templates loaded)
      const totalNodes = await countNodes(page);
      const expectedTotal = template.expectedNodes * 3;
      
      console.log(`Total nodes: ${totalNodes} (expected ~${expectedTotal})`);
      expect(totalNodes).toBeGreaterThanOrEqual(expectedTotal - 6);
    });
  }
});

// =============================================================================
// TEST SUITE 3: Real Host Workflow Execution
// =============================================================================
test.describe('Real Host Workflow Execution', () => {
  // NOTE: Requires E2E test environment
  // docker compose -f docker/test-environment/docker-compose.e2e.yml up -d
  
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
    await selectOrCreateWorkflow(page);
  });
  
  test('Direct SSH to Host (172.29.0.100) via UI', async ({ page }) => {
    test.setTimeout(120000);
    
    await clearWorkflowNodes(page);
    await openTemplatesPanel(page);
    
    // Load Direct SSH template
    const { success } = await loadTemplateWithTimeout(page, 'Direct: SSH to Host & Get Info');
    expect(success).toBe(true);
    
    await closeTemplatesPanel(page);
    
    // Save workflow first (check if button is enabled)
    const saveBtn = page.locator('button:has-text("SAVE")');
    if (!(await saveBtn.isDisabled())) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Run workflow
    const result = await runWorkflow(page);
    console.log(`SSH Workflow: started=${result.started}, completed=${result.completed}`);
    
    // Take screenshot of execution result
    await page.screenshot({ 
      path: `/workspaces/NOP/e2e/results/exec-direct-ssh.png`,
      fullPage: true 
    });
    
    // Check started (completed depends on test environment)
    expect(result.started).toBe(true);
  });
  
  test('Asset Discovery (172.29.0.0/24) via UI', async ({ page }) => {
    test.setTimeout(180000);
    
    await clearWorkflowNodes(page);
    await openTemplatesPanel(page);
    
    // Load Asset Discovery template
    const { success } = await loadTemplateWithTimeout(page, 'Asset Discovery & Inventory');
    expect(success).toBe(true);
    
    await closeTemplatesPanel(page);
    
    // Save workflow if button is enabled
    const saveBtn = page.locator('button:has-text("SAVE")');
    if (!(await saveBtn.isDisabled())) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Run workflow
    const result = await runWorkflow(page);
    console.log(`Discovery Workflow: started=${result.started}, completed=${result.completed}`);
    
    await page.screenshot({ 
      path: `/workspaces/NOP/e2e/results/exec-asset-discovery.png`,
      fullPage: true 
    });
    
    expect(result.started).toBe(true);
  });
  
  test('FTP Operations (172.29.0.105) via UI', async ({ page }) => {
    test.setTimeout(120000);
    
    await clearWorkflowNodes(page);
    await openTemplatesPanel(page);
    
    // Load FTP template
    const { success } = await loadTemplateWithTimeout(page, 'FTP File Operations');
    expect(success).toBe(true);
    
    await closeTemplatesPanel(page);
    
    // Save workflow if button is enabled
    const saveBtn = page.locator('button:has-text("SAVE")');
    if (!(await saveBtn.isDisabled())) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Run workflow
    const result = await runWorkflow(page);
    console.log(`FTP Workflow: started=${result.started}, completed=${result.completed}`);
    
    await page.screenshot({ 
      path: `/workspaces/NOP/e2e/results/exec-ftp-operations.png`,
      fullPage: true 
    });
    
    expect(result.started).toBe(true);
  });
  
  test('Ping Health Check (all hosts) via UI', async ({ page }) => {
    test.setTimeout(180000);
    
    await clearWorkflowNodes(page);
    await openTemplatesPanel(page);
    
    // Load Ping template
    const { success } = await loadTemplateWithTimeout(page, 'Multi-Host Ping Health Check');
    expect(success).toBe(true);
    
    await closeTemplatesPanel(page);
    
    // Save workflow if button is enabled
    const saveBtn = page.locator('button:has-text("SAVE")');
    if (!(await saveBtn.isDisabled())) {
      await saveBtn.click();
      await page.waitForTimeout(1000);
    }
    
    // Run workflow
    const result = await runWorkflow(page);
    console.log(`Ping Workflow: started=${result.started}, completed=${result.completed}`);
    
    await page.screenshot({ 
      path: `/workspaces/NOP/e2e/results/exec-ping-health.png`,
      fullPage: true 
    });
    
    expect(result.started).toBe(true);
  });
});

// =============================================================================
// TEST SUITE 4: Template Panel Interaction
// =============================================================================
test.describe('Template Panel UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await goToFlows(page);
    await selectOrCreateWorkflow(page);
  });
  
  test('Template panel opens and closes correctly', async ({ page }) => {
    // Open templates
    const templatesBtn = page.locator('button:has-text("TEMPLATES")');
    await templatesBtn.click();
    await page.waitForTimeout(500);
    
    // Verify panel is visible
    const templatesPanel = page.locator('.w-80');
    await expect(templatesPanel).toBeVisible();
    
    // Verify header
    const header = page.locator('h3:has-text("TEMPLATES")');
    await expect(header).toBeVisible();
    
    // Close panel
    const closeBtn = page.locator('.w-80 button:has-text("✕")');
    await closeBtn.click();
    await page.waitForTimeout(500);
    
    // Panel should be closed (templates button click opens it again)
    await templatesBtn.click();
    await expect(templatesPanel).toBeVisible();
  });
  
  test('Template category filters work correctly', async ({ page }) => {
    await openTemplatesPanel(page);
    
    // Test each category filter
    const categories = ['all', 'scanning', 'access', 'traffic', 'agent', 'utility'];
    
    for (const category of categories) {
      const filterBtn = page.locator(`button:has-text("${category.toUpperCase()}")`).first();
      await filterBtn.click();
      await page.waitForTimeout(300);
      
      // Count visible templates
      const templates = page.locator('div.p-3.cursor-pointer');
      const count = await templates.count();
      
      console.log(`Category "${category}": ${count} templates visible`);
      
      if (category === 'all') {
        // All templates should be visible (at least 10, some may be user-created)
        expect(count).toBeGreaterThanOrEqual(10);
      } else {
        // Each category should have at least 1 template
        expect(count).toBeGreaterThan(0);
      }
    }
  });
  
  test('All 13 templates are listed', async ({ page }) => {
    await openTemplatesPanel(page);
    
    // Set filter to "all"
    const allBtn = page.locator('button:has-text("ALL")').first();
    await allBtn.click();
    await page.waitForTimeout(300);
    
    // Verify each template exists
    for (const template of ALL_TEMPLATES) {
      const templateCard = page.locator(`h4:has-text("${template.name}")`);
      const count = await templateCard.count();
      expect(count).toBeGreaterThanOrEqual(1);
    }
    
    console.log('All 13 templates verified in panel');
  });
});

// =============================================================================
// TEST SUITE 5: Combined Performance Report
// =============================================================================
test.describe('Performance Report', () => {
  test('Generate template loading performance report', async ({ page }) => {
    await login(page);
    await goToFlows(page);
    await selectOrCreateWorkflow(page);
    
    const results: { template: string; hasLoop: boolean; timeMs: number; success: boolean }[] = [];
    
    for (const template of ALL_TEMPLATES) {
      await clearWorkflowNodes(page);
      await openTemplatesPanel(page);
      
      const { success, timeMs } = await loadTemplateWithTimeout(page, template.name);
      
      results.push({
        template: template.id,
        hasLoop: template.hasLoop,
        timeMs,
        success,
      });
      
      await closeTemplatesPanel(page);
    }
    
    // Generate report
    console.log('\n=== TEMPLATE LOADING PERFORMANCE REPORT ===');
    console.log('| Template | HasLoop | Time (ms) | Status |');
    console.log('|----------|---------|-----------|--------|');
    
    for (const r of results) {
      const status = r.success ? '✓ OK' : '✗ FREEZE';
      console.log(`| ${r.template.padEnd(25)} | ${r.hasLoop ? 'Yes' : 'No '} | ${r.timeMs.toString().padStart(6)} | ${status} |`);
    }
    
    // Summary
    const successCount = results.filter(r => r.success).length;
    const avgTime = results.reduce((sum, r) => sum + r.timeMs, 0) / results.length;
    const loopTemplates = results.filter(r => r.hasLoop);
    const loopAvgTime = loopTemplates.reduce((sum, r) => sum + r.timeMs, 0) / loopTemplates.length;
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total Templates: ${results.length}`);
    console.log(`Successful: ${successCount}/${results.length}`);
    console.log(`Average Load Time: ${avgTime.toFixed(0)}ms`);
    console.log(`Loop Templates Avg: ${loopAvgTime.toFixed(0)}ms`);
    
    // All templates should load successfully
    expect(successCount).toBe(results.length);
  });
});
