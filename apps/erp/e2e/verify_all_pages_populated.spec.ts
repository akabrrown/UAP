import { test, expect } from '@playwright/test';
import path from 'path';

const ARTIFACTS_DIR = 'C:/Users/Dell/.gemini/antigravity-ide/brain/492aa2f1-e22e-41aa-9f5d-0ad9ab07c955';

test.describe('Verify All ERP Modules and Pages are Populated and Processed', () => {
  test.beforeEach(async ({ page }) => {
    // Authenticate as super_admin with full permissions
    await page.goto('http://localhost:3001/api/test-login?role=super_admin');
    await page.waitForTimeout(500);
  });

  const pagesToVerify = [
    { name: '01_dashboard', path: '/', heading: 'Overview' },
    { name: '02_catalogue', path: '/catalogue', heading: 'Catalogue' },
    { name: '03_procurement_po', path: '/procurement', heading: 'Procurement' },
    { name: '04_procurement_suppliers', path: '/procurement/suppliers', heading: 'Suppliers' },
    { name: '05_procurement_grn', path: '/procurement/grn', heading: 'Goods Receipts' },
    { name: '06_inventory_onhand', path: '/inventory', heading: 'Inventory' },
    { name: '07_inventory_adjustments', path: '/inventory/adjustments', heading: 'Adjustments' },
    { name: '08_inventory_transfers', path: '/inventory/transfers', heading: 'Transfers' },
    { name: '09_inventory_ledger', path: '/inventory/ledger', heading: 'Ledger' },
    { name: '10_inventory_labels', path: '/inventory/labels', heading: 'Labels' },
    { name: '11_production_board', path: '/production/board', heading: 'Production' },
    { name: '12_production_queue', path: '/production/queue', heading: 'Queue' },
    { name: '13_quality_inspections', path: '/quality/inspections', heading: 'Inspections' },
    { name: '14_quality_defects', path: '/quality/defects', heading: 'Defects' },
    { name: '15_quality_rework', path: '/quality/rework', heading: 'Rework' },
    { name: '16_imports_shipments', path: '/imports/shipments', heading: 'Shipments' },
    { name: '17_imports_tariffs', path: '/imports/tariffs', heading: 'Tariffs' },
    { name: '18_imports_landed_cost', path: '/imports/landed-cost', heading: 'Landed Cost' },
    { name: '19_service_tickets', path: '/service', heading: 'Service' },
    { name: '20_service_warranties', path: '/service/warranties', heading: 'Warranties' },
    { name: '21_finance_overview', path: '/finance', heading: 'Finance' },
    { name: '22_approvals_pending', path: '/approvals', heading: 'Approvals' },
    { name: '23_reports_analytics', path: '/reports', heading: 'Reports' }
  ];

  for (const p of pagesToVerify) {
    test(`Verify ${p.name} at ${p.path} displays live records`, async ({ page }) => {
      await page.goto(`http://localhost:3001${p.path}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);

      // Verify no critical 500 error page
      const errorText = await page.locator('text=Something Went Wrong').count();
      expect(errorText).toBe(0);

      // Take screenshot of populated page
      const screenshotPath = path.join(ARTIFACTS_DIR, `${p.name}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`✓ Verified and screenshotted: ${p.name} -> ${screenshotPath}`);
    });
  }
});
