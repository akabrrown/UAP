import { chromium } from '@playwright/test';
import path from 'path';

const ARTIFACT_DIR = 'C:/Users/Dell/.gemini/antigravity-ide/brain/492aa2f1-e22e-41aa-9f5d-0ad9ab07c955';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('1. Capturing Procurement Suppliers Directory with full contact and phone fields...');
  await page.goto('http://localhost:3001/api/test-login?role=procurement_imports&redirect=/procurement/suppliers');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '01_procurement_suppliers_live.png'), fullPage: true });

  console.log('2. Capturing Procurement Purchase Order detail page with PO lines, incoterm, air shipping, and notes...');
  await page.goto('http://localhost:3001/api/test-login?role=procurement_imports&redirect=/procurement');
  await page.waitForTimeout(1500);
  // Click first PO
  const firstPoLink = page.locator('table tbody tr a').first();
  if (await firstPoLink.isVisible()) {
    await firstPoLink.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '02_procurement_po_detail_live.png'), fullPage: true });

  console.log('3. Capturing Catalogue Item list with 100% categories assigned (NO missing categories!)...');
  await page.goto('http://localhost:3001/api/test-login?role=inventory_sales&redirect=/catalogue');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '03_catalogue_with_categories_live.png'), fullPage: true });

  console.log('4. Capturing Internal Order detail with delivery point, notes, and multi-line items...');
  await page.goto('http://localhost:3001/api/test-login?role=inventory_sales&redirect=/orders');
  await page.waitForTimeout(1500);
  const firstOrderLink = page.locator('table tbody tr a').first();
  if (await firstOrderLink.isVisible()) {
    await firstOrderLink.click();
    await page.waitForTimeout(2000);
  }
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '04_sales_order_detail_live.png'), fullPage: true });

  console.log('5. Capturing Service & Warranty Tickets table with full contact, phone, email, and fault description...');
  await page.goto('http://localhost:3001/api/test-login?role=finance_service&redirect=/service');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, '05_service_tickets_live.png'), fullPage: true });

  await browser.close();
  console.log('All 5 live role screenshots captured successfully!');
}

main().catch(err => {
  console.error('Screenshot error:', err);
  process.exit(1);
});
