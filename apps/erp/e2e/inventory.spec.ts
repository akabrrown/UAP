import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Inventory & Stock Movements', () => {
  test('renders 3-tab inventory view and navigates to transfer creation', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/inventory');
    await expect(page.getByRole('heading', { name: /Inventory & Stock Control/i })).toBeVisible();

    // Verify tabs exist
    await expect(page.getByRole('button', { name: /Live Stock on Hand/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stock Transfers/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Stock Movements Ledger/i })).toBeVisible();

    // Switch to Stock Transfers tab
    await page.getByRole('button', { name: /Stock Transfers/i }).click();

    // Click New Transfer button
    const transferBtn = page.getByRole('link', { name: /New Transfer/i });
    await expect(transferBtn).toBeVisible();
    await transferBtn.click();

    await expect(page).toHaveURL(/.*\/inventory\/transfers\/new/);
    await expect(page.getByRole('heading', { name: /Create Stock Transfer/i })).toBeVisible();
  });
});
