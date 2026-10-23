import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Inventory & Stock Movements', () => {
  test('renders multi-tab inventory view and navigates to transfer creation', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Inventory Management/i })).toBeVisible();

    // Verify tabs exist
    await expect(page.getByRole('button', { name: /Stock On Hand/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Transfers/i })).toBeVisible();

    // Switch to Transfers tab
    await page.getByRole('button', { name: /Transfers/i }).click();

    // Click New Transfer button
    const transferBtn = page.getByRole('link', { name: /New Transfer/i });
    await expect(transferBtn).toBeVisible();
    await transferBtn.click();

    await expect(page).toHaveURL(/.*\/inventory\/transfers\/new/);
    await expect(page.getByRole('heading', { name: /New Stock Transfer/i })).toBeVisible();
  });
});

