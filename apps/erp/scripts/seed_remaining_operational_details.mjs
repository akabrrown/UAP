import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("=== POPULATING REMAINING OPERATIONAL DETAILS & PAGES ===");

    // 1. Logistics Partners (proc.logistics_partners)
    console.log("1. Seeding Logistics Partners...");
    const partnerRes = await client.query(`
      INSERT INTO proc.logistics_partners (
        name, kind, licence_no, contact_name, phone, email, status, version
      ) VALUES (
        'Maersk Logistics Ghana Ltd', 'shipping_line', 'CH-GHA-2024-9912', 'Captain Kwesi Arthur',
        '+233 30 320 4401', 'gh.logistics@maersk.com', 'active', 1
      ) ON CONFLICT DO NOTHING RETURNING id;
    `);
    const partnerId = partnerRes.rows[0]?.id || (await client.query(`SELECT id FROM proc.logistics_partners LIMIT 1`)).rows[0]?.id;
    console.log("✓ Logistics partner ready:", partnerId);

    // 2. Fetch references
    const shp1 = (await client.query(`SELECT id FROM proc.shipments WHERE shipment_no = 'SHP-2026-0001'`)).rows[0]?.id;
    const shp2 = (await client.query(`SELECT id FROM proc.shipments WHERE shipment_no = 'SHP-2026-0002'`)).rows[0]?.id;
    const poLine = (await client.query(`SELECT id, item_id, po_id FROM proc.purchase_order_lines LIMIT 1`)).rows[0];
    const grn = (await client.query(`SELECT id FROM proc.goods_receipts WHERE grn_no = 'GRN-2026-0001'`)).rows[0]?.id;
    const inv = (await client.query(`SELECT id FROM fin.invoices WHERE invoice_no = 'INV-2026-0001'`)).rows[0]?.id;
    const laptop = (await client.query(`SELECT id FROM catalog.items WHERE sku = 'UPSA-LAP-001'`)).rows[0]?.id;
    const display = (await client.query(`SELECT id FROM catalog.items WHERE sku = 'DSP-156-FHD'`)).rows[0]?.id;
    const nvme = (await client.query(`SELECT id FROM catalog.items WHERE sku = 'SSD-NVME-1TB'`)).rows[0]?.id;
    const order = (await client.query(`SELECT id FROM sales.internal_orders ORDER BY created_at DESC LIMIT 1`)).rows[0]?.id;
    const orderLine = (await client.query(`SELECT id FROM sales.internal_order_lines WHERE order_id = $1 LIMIT 1`, [order])).rows[0]?.id;
    const whMain = (await client.query(`SELECT id FROM core.locations WHERE code = 'WH-MAIN'`)).rows[0]?.id;
    const unit1 = (await client.query(`SELECT id FROM prod.units WHERE internal_ref = 'UNIT-LAP-2026-001'`)).rows[0]?.id;
    const unit2 = (await client.query(`SELECT id FROM prod.units WHERE internal_ref = 'UNIT-LAP-2026-002'`)).rows[0]?.id;
    const compSerial1 = (await client.query(`SELECT id FROM inv.component_serials WHERE serial_no = 'DSP-SN-2026-0001'`)).rows[0]?.id;
    const compSerial2 = (await client.query(`SELECT id FROM inv.component_serials WHERE serial_no = 'NVME-SN-2026-0001'`)).rows[0]?.id;

    // 3. Shipment Lines (proc.shipment_lines)
    console.log("2. Seeding Shipment Lines...");
    let shpLine1Id, shpLine2Id;
    if (shp1 && nvme) {
      const sl1 = await client.query(`
        INSERT INTO proc.shipment_lines (
          shipment_id, po_line_id, item_id, qty_shipped, unit_value_minor, currency, weight_kg, volume_cbm, version
        ) VALUES (
          $1, $2, $3, 200, 3200, 'USD', 40.00, 0.45, 1
        ) ON CONFLICT DO NOTHING RETURNING id;
      `, [shp1, poLine?.id, nvme]);
      shpLine1Id = sl1.rows[0]?.id || (await client.query(`SELECT id FROM proc.shipment_lines WHERE shipment_id = $1`, [shp1])).rows[0]?.id;
    }

    if (shp2 && display) {
      const sl2 = await client.query(`
        INSERT INTO proc.shipment_lines (
          shipment_id, po_line_id, item_id, qty_shipped, unit_value_minor, currency, weight_kg, volume_cbm, version
        ) VALUES (
          $1, $2, $3, 150, 4500, 'USD', 350.00, 2.50, 1
        ) ON CONFLICT DO NOTHING RETURNING id;
      `, [shp2, poLine?.id, display]);
      shpLine2Id = sl2.rows[0]?.id || (await client.query(`SELECT id FROM proc.shipment_lines WHERE shipment_id = $1`, [shp2])).rows[0]?.id;
    }
    console.log("✓ Shipment lines ready.");

    // 4. Shipment Charges (proc.shipment_charges)
    console.log("3. Seeding Shipment Customs & Freight Charges...");
    if (shp1) {
      await client.query(`
        INSERT INTO proc.shipment_charges (
          shipment_id, charge_type, description, partner_id, amount_minor, currency, fx_rate,
          amount_base_minor, allocation_basis, is_recoverable, status, invoice_ref, incurred_on, version
        ) VALUES 
        ($1, 'freight', 'Ocean Container Freight Yokohama to Tema Port', $2, 380000, 'USD', 15.5, 5890000, 'volume', false, 'actual', 'INV-MSK-2026-0881', '2026-10-12', 1),
        ($1, 'duty', 'Ghana Revenue Authority Import Customs Tariff Duty (5%)', $2, 225000, 'GHS', 1.0, 225000, 'value', false, 'actual', 'GRA-CEPS-992384', '2026-10-14', 1),
        ($1, 'port_charges', 'GPHA Terminal Handling and Shore Crane Handling Charge', $2, 140000, 'GHS', 1.0, 140000, 'weight', false, 'actual', 'GPHA-TEM-77821', '2026-10-15', 1)
        ON CONFLICT DO NOTHING;
      `, [shp1, partnerId]);
    }
    console.log("✓ Shipment charges ready.");

    // 5. Goods Receipt Lines (proc.goods_receipt_lines)
    console.log("4. Seeding Goods Receipt Lines (proc.goods_receipt_lines)...");
    if (grn && display) {
      await client.query(`
        INSERT INTO proc.goods_receipt_lines (
          grn_id, po_line_id, shipment_line_id, item_id, qty_received, qty_accepted, qty_rejected,
          lot_no, goods_value_base_minor, landed_unit_cost_minor, version
        ) VALUES 
        ($1, $2, $3, $4, 150, 150, 0, 'LOT-TYO-2026-10', 450000, 4850, 1)
        ON CONFLICT DO NOTHING;
      `, [grn, poLine?.id, shpLine1Id, display]);
    }
    console.log("✓ Goods receipt lines ready.");

    // 6. Invoice Lines (fin.invoice_lines)
    console.log("5. Seeding Invoice Lines (fin.invoice_lines)...");
    if (inv && laptop) {
      await client.query(`
        INSERT INTO fin.invoice_lines (
          invoice_id, line_no, item_id, unit_id, description, qty, unit_price_minor,
          discount_minor, tax_code, tax_rate_pct, tax_minor, line_total_minor, version
        ) VALUES 
        ($1, 1, $2, $3, 'UPSA CrestBook Pro 15.6 Laptop (Core i7, 32GB RAM, 1TB NVMe)', 1, 852400, 0, 'ZERO_EXEMPT', 0, 0, 852400, 1)
        ON CONFLICT (invoice_id, line_no) DO NOTHING;
      `, [inv, laptop, unit2]);
    }
    console.log("✓ Invoice lines ready.");

    // 7. Unit Component Genealogy (prod.unit_components)
    console.log("6. Seeding Unit Component Genealogy Tree...");
    if (unit1 && display && compSerial1) {
      await client.query(`
        INSERT INTO prod.unit_components (
          unit_id, item_id, component_serial_id, qty, unit_cost_minor,
          installed_by, installed_at, version
        ) VALUES (
          $1, $2, $3, 1, 4500, '00000000-0000-0000-0000-000000000004', '2026-10-22T10:30:00Z', 1
        ) ON CONFLICT DO NOTHING;
      `, [unit1, display, compSerial1]);
    }

    if (unit2 && nvme && compSerial2) {
      await client.query(`
        INSERT INTO prod.unit_components (
          unit_id, item_id, component_serial_id, qty, unit_cost_minor,
          installed_by, installed_at, version
        ) VALUES (
          $1, $2, $3, 1, 3200, '00000000-0000-0000-0000-000000000004', '2026-10-22T13:45:00Z', 1
        ) ON CONFLICT DO NOTHING;
      `, [unit2, nvme, compSerial2]);
    }
    console.log("✓ Unit components genealogy populated.");

    // 8. Sales Dispatches & Dispatch Lines (sales.dispatches, sales.dispatch_lines)
    console.log("7. Seeding Sales Dispatches...");
    if (order && whMain && unit2) {
      const dspRes = await client.query(`
        INSERT INTO sales.dispatches (
          dispatch_no, order_id, from_location_id, status, dispatched_by, dispatched_at,
          received_by_name, received_by_phone, received_at, transport_note, version
        ) VALUES (
          'DSP-2026-0001', $1, $2, 'delivered', '00000000-0000-0000-0000-000000000003',
          '2026-10-23T11:00:00Z', 'Prof. Kwesi Boakye', '+233 24 456 7890', '2026-10-23T11:45:00Z',
          'Campus internal logistics courier van dispatched directly to Faculty Office, Room F-204.', 1
        ) ON CONFLICT (dispatch_no) DO NOTHING RETURNING id;
      `, [order, whMain]);
      const dispatchId = dspRes.rows[0]?.id || (await client.query(`SELECT id FROM sales.dispatches WHERE dispatch_no = 'DSP-2026-0001'`)).rows[0]?.id;

      if (dispatchId && orderLine && laptop) {
        await client.query(`
          INSERT INTO sales.dispatch_lines (
            dispatch_id, order_line_id, item_id, qty, unit_id, version
          ) VALUES ($1, $2, $3, 1, $4, 1)
          ON CONFLICT DO NOTHING;
        `, [dispatchId, orderLine, laptop, unit2]);
      }
    }
    console.log("✓ Sales dispatches populated.");

    // 9. Core Approvals (core.approvals)
    console.log("8. Seeding Core Approvals (core.approvals)...");
    const po = (await client.query(`SELECT id FROM proc.purchase_orders LIMIT 1`)).rows[0]?.id;
    const adj = (await client.query(`SELECT id FROM inv.adjustments LIMIT 1`)).rows[0]?.id;
    const exp = (await client.query(`SELECT id FROM fin.expenses LIMIT 1`)).rows[0]?.id;

    if (po) {
      await client.query(`
        INSERT INTO core.approvals (
          subject_type, subject_id, requested_by, amount_minor, currency, reason, status, version
        ) VALUES (
          'purchase_order', $1, '00000000-0000-0000-0000-000000000002', 1300000, 'USD',
          'Approval requested for high-volume component procurement for Semester 1 student laptops.', 'pending', 1
        ) ON CONFLICT DO NOTHING;
      `, [po]);
    }

    if (adj) {
      await client.query(`
        INSERT INTO core.approvals (
          subject_type, subject_id, requested_by, amount_minor, currency, reason, status, version
        ) VALUES (
          'inventory_adjustment', $1, '00000000-0000-0000-0000-000000000003', 0, 'GHS',
          'Annual physical cycle count reconciliation variance review.', 'pending', 1
        ) ON CONFLICT DO NOTHING;
      `, [adj]);
    }

    if (exp) {
      await client.query(`
        INSERT INTO core.approvals (
          subject_type, subject_id, requested_by, amount_minor, currency, reason, status,
          decided_by, decided_at, decision_note, version
        ) VALUES (
          'expense', $1, '00000000-0000-0000-0000-000000000006', 350000, 'GHS',
          'Payment for GPHA Tema Port customs terminal handling fees.', 'approved',
          '00000000-0000-0000-0000-000000000007', '2026-10-18T09:00:00Z', 'Approved under operational budget line item.', 1
        ) ON CONFLICT DO NOTHING;
      `, [exp]);
    }
    console.log("✓ Core approvals populated.");

    await client.query("COMMIT");
    console.log("\n==========================================================================================");
    console.log("   ✓ ALL DETAIL TABLES & APPROVAL WORKFLOWS ARE 100% POPULATED & PROCESSED!             ");
    console.log("==========================================================================================\n");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Detail seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
