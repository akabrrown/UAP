import { test, expect } from '@playwright/test';

test.describe('Authentication and Core Flows', () => {
  test('landing page redirects to login when unauthenticated', async ({ page }) => {
    // Going to root when unauthenticated should bounce to login
    await page.goto('/');
    
    // We expect the URL to contain /login
    await expect(page).toHaveURL(/.*\/login/);
    
    // The login form should be visible
    await expect(page.locator('form')).toBeVisible();
    await expect(page.getByRole('heading', { name: /UPSA Assembly/i })).toBeVisible();
  });
});
