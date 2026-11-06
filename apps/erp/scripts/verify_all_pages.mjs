import fs from 'fs';
import path from 'path';
import { chromium } from '@playwright/test';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

function findPages(dir, baseDir = dir) {
  let pages = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      pages = pages.concat(findPages(fullPath, baseDir));
    } else if (entry.name === 'page.tsx') {
      const rel = path.relative(baseDir, dir).replace(/\\/g, '/');
      pages.push(rel === '' ? '/' : `/${rel}`);
    }
  }
  return pages;
}

async function main() {
  const baseDir = 'c:/Users/Dell/Desktop/PROjects/UAP/apps/erp/src/app/(dashboard)';
  const routes = findPages(baseDir);

  // Get sample IDs for parameterized routes
  const client = await pool.connect();
  const sampleUnit = (await client.query('select id from prod.units limit 1')).rows[0]?.id;
  const sampleOrder = (await client.query('select id from sales.internal_orders limit 1')).rows[0]?.id;
  const samplePo = (await client.query('select id from proc.purchase_orders limit 1')).rows[0]?.id;
  const sampleGrn = (await client.query('select id from proc.goods_receipts limit 1')).rows[0]?.id;
  const sampleShipment = (await client.query('select id from proc.shipments limit 1')).rows[0]?.id;
  const sampleInspection = (await client.query('select id from prod.qc_inspections limit 1')).rows[0]?.id;
  const sampleInvoice = (await client.query('select id from fin.invoices limit 1')).rows[0]?.id;
  client.release();
  await pool.end();

  const idMap = {
    '[id]': sampleUnit,
  };

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('http://localhost:3001/api/test-login?role=super_admin');

  console.log(`Auditing ${routes.length} dashboard routes...\n`);
  const results = [];

  for (const r of routes) {
    let resolvedRoute = r;
    if (r.includes('/production/units/[id]')) resolvedRoute = `/production/units/${sampleUnit}`;
    else if (r.includes('/quality/inspections/[id]')) resolvedRoute = `/quality/inspections/${sampleInspection}`;
    else if (r.includes('/orders/[id]')) resolvedRoute = `/orders/${sampleOrder}`;
    else if (r.includes('/procurement/orders/[id]')) resolvedRoute = `/procurement/orders/${samplePo}`;
    else if (r.includes('/procurement/grn/[id]')) resolvedRoute = `/procurement/grn/${sampleGrn}`;
    else if (r.includes('/imports/shipments/[id]')) resolvedRoute = `/imports/shipments/${sampleShipment}`;
    else if (r.includes('/finance/invoices/[id]')) resolvedRoute = `/finance/invoices/${sampleInvoice}`;
    else if (r.includes('[id]') || r.includes('[slug]')) {
      // generic param route
      continue;
    }

    try {
      const res = await page.goto(`http://localhost:3001${resolvedRoute}`, { waitUntil: 'domcontentloaded', timeout: 8000 });
      const status = res.status();
      const body = await page.innerText('body');
      const has500 = body.includes('Something Went Wrong') || body.includes('Application error');
      if (status >= 400 || has500) {
        results.push({ route: resolvedRoute, status, error: has500 ? 'Something Went Wrong' : `HTTP ${status}` });
        console.log(`✗ ${resolvedRoute} -> ${has500 ? '500 Something Went Wrong' : status}`);
      } else {
        results.push({ route: resolvedRoute, status: 200, error: null });
        console.log(`✓ ${resolvedRoute} -> 200 OK`);
      }
    } catch (e) {
      results.push({ route: resolvedRoute, status: 'TIMEOUT/ERR', error: e.message });
      console.log(`! ${resolvedRoute} -> ${e.message}`);
    }
  }

  await browser.close();

  const failed = results.filter(x => x.error);
  console.log(`\nAudit complete: ${results.length - failed.length}/${results.length} pages clean.`);
  if (failed.length > 0) {
    console.log('Failed pages:', JSON.stringify(failed, null, 2));
  }
}

main().catch(e => console.error(e));
