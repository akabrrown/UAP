import { test, expect } from '@playwright/test';

test.describe('Real-World Multi-Role ERP Lifecycle Scenario (Zero Fields Skipped)', () => {
  let createdSupplierName: string;

  test('Step 1a: Procurement Officer registers an international supplier with all fields completed', async ({ page }) => {
    // 1. Authenticate as Procurement Officer
    await page.goto('/api/test-login?role=procurement_imports&redirect=/procurement/suppliers');
    await expect(page.getByRole('heading', { level: 1, name: /Suppliers Directory/i })).toBeVisible();

    // 2. Open Add Supplier Modal
    const addBtn = page.getByRole('button', { name: /Add Supplier/i });
    await expect(addBtn).toBeVisible();
    await addBtn.click();

    // 3. Fill Supplier Details in modal - filling ALL fields without skipping
    createdSupplierName = `Tokyo Silicon Components Ltd ${Date.now()}`;
    await page.fill('form input[placeholder*="Acer West Africa"]', createdSupplierName);
    await page.locator('form select').nth(0).selectOption('manufacturer');
    await page.fill('form input[placeholder="GH, US, CN, TW"]', 'JP');
    await page.locator('form select').nth(1).selectOption('USD');
    await page.locator('form select').nth(2).selectOption('30_days');
    await page.fill('form input[placeholder="Sales Representative"]', 'Kenji Takahashi (Export Director)');
    await page.fill('form input[placeholder="e.g. C0001234567"]', 'C00987654321');
    await page.fill('form input[placeholder="sales@supplier.com"]', 'export@tokyo-silicon.jp');
    await page.fill('form input[placeholder="+233 24 000 0000"]', '+81 3 5555 0199');

    // 4. Submit
    await page.click('form button:has-text("Register Supplier")');

    // 5. Verify Supplier appears in list
    await expect(page.locator(`text=${createdSupplierName}`)).toBeVisible({ timeout: 10000 });
  });

  test('Step 1b: Procurement Officer issues a Purchase Order with lines, shipping mode, and notes', async ({ page }) => {
    // 1. Authenticate as Procurement Officer and navigate to New PO
    await page.goto('/api/test-login?role=procurement_imports&redirect=/procurement/new');
    await expect(page.getByRole('heading', { level: 1, name: /New Purchase Order/i })).toBeVisible();

    // 2. Fill all PO Header Fields
    await page.selectOption('select[name="supplier_id"]', { index: 1 });
    await page.selectOption('select[name="currency"]', 'USD');
    await page.selectOption('select[name="incoterm"]', 'CIF');
    await page.selectOption('select[name="shipping_mode"]', 'air');

    const futureArrival = new Date();
    futureArrival.setDate(futureArrival.getDate() + 30);
    await page.fill('input[name="expected_arrival"]', futureArrival.toISOString().slice(0, 10));

    await page.fill('input[name="notes"]', 'Priority international components batch for university workstation line.');

    // 3. Fill Line Items (Item, Qty, Unit Price)
    await page.locator('tbody tr select').first().selectOption({ index: 1 });
    await page.locator('tbody tr input[type="number"]').first().fill('100');

    // 4. Submit
    await page.click('button:has-text("Create PO")');

    // 5. Verify redirected to PO detail page with PO number
    await expect(page).toHaveURL(/.*\/procurement\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(/PO-/i, { timeout: 10000 });
    await expect(page.locator('text=Priority international components batch')).toBeVisible();
  });

  test('Step 2: Stores Officer creates category then adds item with all fields populated', async ({ page }) => {
    // 1. Authenticate as Inventory / Stores Officer
    await page.goto('/api/test-login?role=inventory_sales&redirect=/catalogue/items/new');
    await expect(page.getByRole('heading', { level: 1, name: /New Item/i })).toBeVisible();

    // 2. Create a new Category first via the "+ New Category" button (never skip empty category!)
    const newCategoryBtn = page.locator('button:has-text("New Category")');
    await expect(newCategoryBtn).toBeVisible();
    await newCategoryBtn.click();

    const catName = `PCIe Gen4 NVMe Storage ${Date.now().toString().slice(-4)}`;
    await page.fill('input[placeholder="e.g. Hardware Components"]', catName);
    await page.locator('div.fixed form select').selectOption('serial');
    await page.click('button:has-text("Save Category")');

    // Verify modal closes and category is now selected
    await expect(page.locator('select#category_id')).toContainText(catName, { timeout: 10000 });

    const uniqueSku = `NVME-990PRO-${Date.now().toString().slice(-5)}`;
    const itemName = 'Samsung 990 Pro 4TB NVMe PCIe 4.0 SSD';

    // 3. Fill Item Form - 100% of fields filled
    await page.fill('input[name="sku"]', uniqueSku);
    await page.fill('input[name="name"]', itemName);
    await page.fill('textarea[name="description"]', 'Ultra-high-performance 7,450 MB/s read NVMe M.2 drive for university rendering clusters.');
    await page.selectOption('select[name="kind"]', 'component');
    await page.selectOption('select[name="tracking"]', 'serial');
    await page.selectOption('select[name="uom"]', 'each');

    // 4. Submit
    await page.click('button[type="submit"]');

    // 5. Verify redirected to /catalogue and item appears with its category
    await expect(page).toHaveURL(/.*\/catalogue$/, { timeout: 15000 });
    await expect(page.locator(`text=${uniqueSku}`)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${catName}`)).toBeVisible({ timeout: 10000 });
  });

  test('Step 3: Stores & Sales Officer creates an internal order with multiple lines and full notes', async ({ page }) => {
    // 1. Authenticate as Inventory / Sales Officer
    await page.goto('/api/test-login?role=inventory_sales&redirect=/orders/new');
    await expect(page.getByRole('heading', { level: 1, name: /New Internal Order/i })).toBeVisible();

    // 2. Fill Order Details - Account, Delivery Point, Required By, and Notes
    await page.selectOption('select[name="account_id"]', { index: 1 });
    await page.fill('input[name="delivery_point"]', 'Auditorium Server Room A-10');
    
    // Set required by date (14 days ahead)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    const dateStr = futureDate.toISOString().slice(0, 10);
    await page.fill('input[name="required_by"]', dateStr);

    await page.fill('textarea[name="notes"]', 'Priority installation for UPSA accounting computing lab. Please deliver during morning hours.');

    // Line 1: select item and quantity
    await page.locator('tbody tr select').first().selectOption({ index: 1 });
    await page.locator('tbody tr input[type="number"]').first().fill('6');

    // Add Line 2 using "+ Add Item Line"
    await page.click('button:has-text("Add Item Line")');
    await expect(page.locator('tbody tr')).toHaveCount(2);
    await page.locator('tbody tr select').nth(1).selectOption({ index: 2 });
    await page.locator('tbody tr input[type="number"]').nth(1).fill('4');

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirected to newly created order detail page
    await expect(page).toHaveURL(/.*\/orders\/[a-f0-9-]+$/, { timeout: 15000 });
    await expect(page.locator('h1')).toContainText(/ORD-/i, { timeout: 10000 });
    await expect(page.locator('text=Auditorium Server Room A-10')).toBeVisible();
    await expect(page.locator('text=Priority installation for UPSA accounting computing lab')).toBeVisible();
  });

  test('Step 4: Service Technician logs a warranty repair ticket with complete contact and fault data', async ({ page }) => {
    // 1. Authenticate as Finance & Service Technician
    await page.goto('/api/test-login?role=finance_service&redirect=/service/new');
    await expect(page.getByRole('heading', { level: 1, name: /Log Service Ticket/i })).toBeVisible();

    // 2. Fill Service Ticket - 100% of fields filled
    await page.selectOption('select[name="kind"]', 'warranty_claim');
    await page.selectOption('select[name="priority"]', 'high');
    await page.fill('input[name="contact_name"]', 'Dr. Angela Mensah');
    await page.fill('input[name="contact_phone"]', '+233 20 889 1234');
    await page.fill('input[name="contact_email"]', 'angela.mensah@upsa.edu.gh');

    const deviceSerial = `UPSA-STU-88992-${Date.now().toString().slice(-4)}`;
    await page.fill('input[name="device_serial"]', deviceSerial);
    await page.fill('input[name="device_description"]', 'UPSA Student Laptop 14-inch Core i5');
    await page.fill('textarea[name="fault_description"]', 'Battery failing to charge past 12% after power surge in faculty lab.');

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirected to /service tickets list and ticket is visible
    await expect(page).toHaveURL(/.*\/service$/, { timeout: 15000 });
    await expect(page.locator(`text=${deviceSerial}`)).toBeVisible({ timeout: 10000 });
  });
});
