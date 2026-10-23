import { test, expect, Page } from '@playwright/test';

async function loginAsAdmin(page: Page) {
  await page.goto('/api/test-login');
  await expect(page).toHaveURL(/\/$/);
}

test.describe('Production & Quality Assurance Flows', () => {
  test('navigates to production board and technician queue', async ({ page }) => {
    await loginAsAdmin(page);

    // Production Kanban Board
    await page.goto('/production/board');
    await expect(page.getByRole('heading', { level: 1, name: /Production Kanban Board/i })).toBeVisible();

    // Technician Queue
    await page.goto('/production/queue');
    await expect(page.getByRole('heading', { level: 1, name: /Technician Production Queue/i })).toBeVisible();
  });

  test('navigates to quality inspections, defect analytics, and rework orders', async ({ page }) => {
    await loginAsAdmin(page);

    // Inspections Queue
    await page.goto('/quality/inspections');
    await expect(page.getByRole('heading', { level: 1, name: /Quality Inspections Queue/i })).toBeVisible();

    // Defect Analytics
    await page.goto('/quality/defects');
    await expect(page.getByRole('heading', { level: 1, name: /Defect Analytics/i })).toBeVisible();

    // Rework Orders
    await page.goto('/quality/rework');
    await expect(page.getByRole('heading', { level: 1, name: /Rework Orders/i })).toBeVisible();
  });
});
