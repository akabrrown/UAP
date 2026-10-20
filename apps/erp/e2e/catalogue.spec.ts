import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Catalogue Module', () => {
  test('creates a new catalogue item', async ({ page }) => {
    await loginAsAdmin(page);

    // Go to catalogue creation
    await page.goto('/catalogue/items/new');

    // Expect the form to exist
    await expect(page.getByRole('heading', { name: /New Item/i })).toBeVisible();

    const uniqueSku = `SKU-${Date.now()}`;

    // Fill form
    await page.fill('input[name="sku"]', uniqueSku);
    await page.fill('input[name="name"]', 'Test Component');
    await page.fill('textarea[name="description"]', 'A component for testing');
    await page.selectOption('select[name="kind"]', 'component');
    await page.selectOption('select[name="uom"]', 'each');
    await page.selectOption('select[name="tracking"]', 'lot');

    // Submit
    await page.click('button[type="submit"]');

    // Expect to be redirected to catalogue list and see the new item
    await expect(page).toHaveURL(/.*\/catalogue$/);
    await expect(page.locator(`text=${uniqueSku}`)).toBeVisible();
  });
});

