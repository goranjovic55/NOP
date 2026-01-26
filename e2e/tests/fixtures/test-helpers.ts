/**
 * NOP E2E Test Helpers
 * Shared utilities for all test modules
 */

import { Page, expect } from '@playwright/test';

export const BASE_URL = 'http://localhost:12000';

// Test credentials
export const TEST_USER = {
  username: 'admin',
  password: 'admin123'
};

// Real test hosts (update these based on your environment)
export const TEST_HOSTS = {
  // Local network hosts for testing
  localhost: '127.0.0.1',
  gateway: '192.168.1.1',
  dns: '8.8.8.8',
  // Docker network hosts
  backend: 'docker-backend-1',
  postgres: 'nop-postgres',
  redis: 'nop-redis'
};

/**
 * Login to NOP application
 */
export async function login(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState('networkidle');
  
  // Check if login is required
  const usernameInput = page.locator('input[type="text"], input[name="username"]');
  if (await usernameInput.count() > 0) {
    await usernameInput.fill(TEST_USER.username);
    await page.locator('input[type="password"]').fill(TEST_USER.password);
    await page.click('button[type="submit"], button:has-text("Access"), button:has-text("Login")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
  }
}

/**
 * Navigate to a specific page
 */
export async function navigateTo(page: Page, path: string): Promise<void> {
  await page.goto(`${BASE_URL}${path}`);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for API response
 */
export async function waitForApi(page: Page, urlPattern: string | RegExp): Promise<void> {
  await page.waitForResponse(
    response => {
      if (typeof urlPattern === 'string') {
        return response.url().includes(urlPattern);
      }
      return urlPattern.test(response.url());
    },
    { timeout: 30000 }
  );
}

/**
 * Check if element exists
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.locator(selector).count()) > 0;
}

/**
 * Take screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({ 
    path: `e2e/results/${name}-${timestamp}.png`,
    fullPage: true 
  });
}

/**
 * Wait for table to have data
 */
export async function waitForTableData(page: Page, minRows: number = 1): Promise<void> {
  await expect(async () => {
    const rows = await page.locator('tbody tr').count();
    expect(rows).toBeGreaterThanOrEqual(minRows);
  }).toPass({ timeout: 30000 });
}

/**
 * Click sidebar navigation link
 */
export async function clickNavLink(page: Page, text: string): Promise<void> {
  const link = page.locator(`a:has-text("${text}"), button:has-text("${text}")`).first();
  await link.click();
  await page.waitForLoadState('networkidle');
}

/**
 * Verify page has loaded correctly
 */
export async function verifyPageLoaded(page: Page): Promise<void> {
  // Check no error modals or alerts
  const errorModal = page.locator('[role="alert"], .error-modal, .error-message');
  const hasError = await errorModal.count() > 0;
  if (hasError) {
    const errorText = await errorModal.textContent();
    console.warn(`Page has error: ${errorText}`);
  }
  
  // Check page has content
  const bodyText = await page.textContent('body');
  expect(bodyText?.length).toBeGreaterThan(50);
}

/**
 * API request helper
 */
export async function apiRequest(
  request: any, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  endpoint: string,
  body?: object
): Promise<any> {
  const url = `${BASE_URL}/api/v1${endpoint}`;
  
  let response;
  switch (method) {
    case 'GET':
      response = await request.get(url);
      break;
    case 'POST':
      response = await request.post(url, { data: body });
      break;
    case 'PUT':
      response = await request.put(url, { data: body });
      break;
    case 'DELETE':
      response = await request.delete(url);
      break;
  }
  
  return response;
}

/**
 * Wait for WebSocket connection
 */
export async function waitForWebSocket(page: Page): Promise<void> {
  await page.waitForTimeout(2000); // Basic wait for WS connection
}

/**
 * Fill form fields
 */
export async function fillForm(page: Page, fields: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(fields)) {
    const input = page.locator(`input[name="${name}"], textarea[name="${name}"], select[name="${name}"]`);
    if (await input.count() > 0) {
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      if (tagName === 'select') {
        await input.selectOption(value);
      } else {
        await input.fill(value);
      }
    }
  }
}
