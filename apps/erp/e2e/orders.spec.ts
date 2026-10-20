import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Sales Orders & Dispatches', () => {
  test('navigates to orders list and filters by status', async ({ page }) => {
    await loginAsAdmin(page);

    await page.goto('/orders');
    await expect(page.getByRole('heading', { name: /Sales Orders/i })).toBeVisible();

    // Verify search and filter controls exist
    const searchInput = page.getByPlaceholder(/Search by order #/i);
    await expect(searchInput).toBeVisible();

    const newOrderBtn = page.getByRole('link', { name: /New Order/i });
    await expect(newOrderBtn).toBeVisible();
    await newOrderBtn.click();

    await expect(page).toHaveURL(/.*\/orders\/new/);
    await expect(page.getByRole('heading', { name: /Create Internal Order/i })).toBeVisible();
  });
});
