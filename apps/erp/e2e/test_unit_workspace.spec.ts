import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Dell/.gemini/antigravity-ide/brain/492aa2f1-e22e-41aa-9f5d-0ad9ab07c955';

test('Verify unit detail workspace loads without error', async ({ page }) => {
  // Login as super_admin
  await page.goto('http://localhost:3001/api/test-login?role=super_admin');
  await page.waitForTimeout(500);

  // Navigate to the unit bench workspace
  await page.goto('http://localhost:3001/production/units/513b97c1-98cb-4cd6-8f93-24655615e255', {
    waitUntil: 'networkidle'
  });
  await page.waitForTimeout(1000);

  // Check that "Something Went Wrong" error is NOT present
  const errorText = await page.locator('text=Something Went Wrong').count();
  expect(errorText).toBe(0);

  // Assert unit header is visible
  await expect(page.locator('text=UNIT-LAP-2026-001')).toBeVisible();

  // Take screenshot
  const screenshotPath = path.join(ARTIFACTS_DIR, '24_unit_workspace_live.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`✓ Unit workspace screenshot saved to: ${screenshotPath}`);
});
