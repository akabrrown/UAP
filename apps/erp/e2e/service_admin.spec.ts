import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Service, Warranties & Admin Management', () => {
  test('navigates to warranty lookup register and service tickets', async ({ page }) => {
    await loginAsAdmin(page);

    // Warranty Register
    await page.goto('/service/warranties');
    await expect(page.getByRole('heading', { level: 1, name: /Warranty Register & Device Lookup/i })).toBeVisible();

    // Verify search input for serial/customer lookup
    const searchInput = page.getByPlaceholder(/Scan serial/i);
    await expect(searchInput).toBeVisible();

    // Service Tickets
    await page.goto('/service');
    await expect(page.getByRole('heading', { level: 1, name: /Service Tickets/i })).toBeVisible();
  });

  test('navigates to admin users and approval matrix', async ({ page }) => {
    await loginAsAdmin(page);

    // Admin Users Directory
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { level: 1, name: /System Administration/i })).toBeVisible();

    // Approval Rules Simulator
    await page.goto('/admin/approval-rules');
    await expect(page.getByRole('heading', { level: 1, name: /Approval Rules Matrix/i })).toBeVisible();

    // Platform Settings
    await page.goto('/admin/settings');
    await expect(page.getByRole('heading', { level: 1, name: /Platform Settings/i })).toBeVisible();
  });
});
