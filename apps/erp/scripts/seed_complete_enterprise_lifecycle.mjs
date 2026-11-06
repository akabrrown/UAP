import pg from 'pg';
import crypto from 'crypto';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function getClientWithRetry(retries = 5, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.connect();
    } catch (e) {
      console.log(`Connection attempt ${i + 1} failed: ${e.message}. Retrying in ${delay}ms...`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

async function main() {
  const client = await getClientWithRetry();
  try {
    await client.query("BEGIN");
    console.log("=== POPULATING COMPLETE ENTERPRISE OPERATIONAL LIFECYCLE DATA ===");

    // 1. Staff Profiles in auth.users and core.profiles
    console.log("\n1. Ensuring standard role profiles in auth.users and core.profiles...");
    const staff = [
      { id: "00000000-0000-0000-0000-000000000002", name: "Kofi Mensah", email: "kofi.mensah@upsa.edu.gh", staffNo: "UPSA-PI-014", dept: "Procurement", title: "Procurement Officer" },
      { id: "00000000-0000-0000-0000-000000000003", name: "Ama Serwaa", email: "ama.serwaa@upsa.edu.gh", staffNo: "UPSA-IS-008", dept: "Inventory & Stores", title: "Stores & Sales Lead" },
      { id: "00000000-0000-0000-0000-000000000004", name: "Kwame Asante", email: "kwame.asante@upsa.edu.gh", staffNo: "UPSA-AT-023", dept: "Assembly Plant", title: "Senior Assembly Technician" },
      { id: "00000000-0000-0000-0000-000000000005", name: "Esi Darko", email: "esi.darko@upsa.edu.gh", staffNo: "UPSA-QI-005", dept: "Quality Assurance", title: "Lead QC Inspector" },
      { id: "00000000-0000-0000-0000-000000000006", name: "Yaw Boateng", email: "yaw.boateng@upsa.edu.gh", staffNo: "UPSA-FS-019", dept: "Service & Finance", title: "Service Bench Engineer" },
      { id: "00000000-0000-0000-0000-000000000007", name: "Dr. Abena Osei", email: "abena.osei@upsa.edu.gh", staffNo: "UPSA-MGT-002", dept: "Operations", title: "Director of Technical Operations" }
    ];

    for (const s of staff) {
      // Create auth user first
      await client.query(`
        INSERT INTO auth.users (id, aud, role, email)
        VALUES ($1, 'authenticated', 'authenticated', $2)
        ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
      `, [s.id, s.email]);

      // Create profile
      await client.query(`
        INSERT INTO core.profiles (id, full_name, email, staff_no, department, job_title, is_admin, status, version, extra_scopes, revoked_scopes, mfa_enrolled)
        VALUES ($1, $2, $3, $4, $5, $6, false, 'active', 1, '{}', '{}', false)
        ON CONFLICT (id) DO UPDATE SET 
          full_name = EXCLUDED.full_name,
          department = EXCLUDED.department,
          job_title = EXCLUDED.job_title,
          status = 'active';
      `, [s.id, s.name, s.email, s.staffNo, s.dept, s.title]);
    }
    console.log("✓ Staff profiles populated.");

    // 2. Customs Tariffs
    console.log("\n2. Seeding customs tariffs (catalog.customs_tariffs)...");
    const tariffs = [
      { hs: "8471.30.00", desc: "Laptops & Portable Computers (under 10kg)", duty: 0, vat: 15, levies: { nhil: 2.5, getfund: 2.5, covid19: 1 } },
      { hs: "8471.41.00", desc: "Desktop Workstation Processing Units", duty: 0, vat: 15, levies: { nhil: 2.5, getfund: 2.5, covid19: 1 } },
      { hs: "8528.52.00", desc: "LCD/IPS Computer Monitors & Screen Panels", duty: 5, vat: 15, levies: { nhil: 2.5, getfund: 2.5, covid19: 1 } },
      { hs: "8471.70.00", desc: "NVMe PCIe Solid State Storage Drives", duty: 0, vat: 15, levies: { nhil: 2.5, getfund: 2.5, covid19: 1 } },
      { hs: "8473.30.00", desc: "Parts and Accessories for Computing Machines", duty: 5, vat: 15, levies: { nhil: 2.5, getfund: 2.5, covid19: 1 } }
    ];

    for (const t of tariffs) {
      await client.query(`DELETE FROM catalog.customs_tariffs WHERE hs_code = $1`, [t.hs]);
      await client.query(`
        INSERT INTO catalog.customs_tariffs (hs_code, description, duty_pct, vat_pct, levies, effective_from, version)
        VALUES ($1, $2, $3, $4, $5, '2026-01-01', 1)
      `, [t.hs, t.desc, t.duty, t.vat, JSON.stringify(t.levies)]);
    }
    console.log("✓ Customs tariffs populated.");

    // 3. Bill of Materials (catalog.boms & catalog.bom_lines)
    console.log("\n3. Seeding Bill of Materials (catalog.boms)...");
    const laptopRes = await client.query(`SELECT id FROM catalog.items WHERE sku = 'UPSA-LAP-GEN13-I7' LIMIT 1`);
    const desktopRes = await client.query(`SELECT id FROM catalog.items WHERE sku = 'UPSA-DESK-GEN12-I5' LIMIT 1`);
    const displayRes = await client.query(`SELECT id FROM catalog.items WHERE sku LIKE 'DSP-FHD%' LIMIT 1`);
    const nvmeRes = await client.query(`SELECT id FROM catalog.items WHERE sku LIKE 'NVME%' LIMIT 1`);

    let laptopBomId, desktopBomId;
    if (laptopRes.rows[0]) {
      const bRes = await client.query(`
        INSERT INTO catalog.boms (item_id, version, status, effective_from, labour_minutes, notes)
        VALUES ($1, 1, 'active', '2026-01-01', 45, 'Standard UPSA Executive Laptop Generation 13 BOM')
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [laptopRes.rows[0].id]);
      laptopBomId = bRes.rows[0]?.id || (await client.query(`SELECT id FROM catalog.boms WHERE item_id = $1`, [laptopRes.rows[0].id])).rows[0]?.id;

      if (displayRes.rows[0] && laptopBomId) {
        await client.query(`
          INSERT INTO catalog.bom_lines (bom_id, component_item_id, qty, scrap_pct, is_optional, version)
          VALUES ($1, $2, 1, 0, false, 1) ON CONFLICT DO NOTHING;
        `, [laptopBomId, displayRes.rows[0].id]);
      }
      if (nvmeRes.rows[0] && laptopBomId) {
        await client.query(`
          INSERT INTO catalog.bom_lines (bom_id, component_item_id, qty, scrap_pct, is_optional, version)
          VALUES ($1, $2, 1, 0, false, 1) ON CONFLICT DO NOTHING;
        `, [laptopBomId, nvmeRes.rows[0].id]);
      }
    }

    if (desktopRes.rows[0]) {
      const bRes = await client.query(`
        INSERT INTO catalog.boms (item_id, version, status, effective_from, labour_minutes, notes)
        VALUES ($1, 1, 'active', '2026-01-01', 60, 'UPSA Standard Desktop Core i5 Workstation BOM')
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [desktopRes.rows[0].id]);
      desktopBomId = bRes.rows[0]?.id || (await client.query(`SELECT id FROM catalog.boms WHERE item_id = $1`, [desktopRes.rows[0].id])).rows[0]?.id;

      if (nvmeRes.rows[0] && desktopBomId) {
        await client.query(`
          INSERT INTO catalog.bom_lines (bom_id, component_item_id, qty, scrap_pct, is_optional, version)
          VALUES ($1, $2, 1, 0, false, 1) ON CONFLICT DO NOTHING;
        `, [desktopBomId, nvmeRes.rows[0].id]);
      }
    }
    console.log("✓ BOMs and BOM lines populated.");

    // 4. Shipments (proc.shipments, proc.shipment_lines, proc.shipment_charges)
    console.log("\n4. Seeding International Shipments (proc.shipments)...");
    const supTokyo = (await client.query(`SELECT id FROM proc.suppliers WHERE country = 'JP' LIMIT 1`)).rows[0]?.id;
    const supShenzhen = (await client.query(`SELECT id FROM proc.suppliers WHERE country = 'CN' LIMIT 1`)).rows[0]?.id;

    let shp1Id, shp2Id;
    if (supTokyo) {
      const s1 = await client.query(`
        INSERT INTO proc.shipments (
          shipment_no, supplier_id, mode, status, incoterm, bl_awb_no, container_nos,
          vessel_or_flight, port_of_loading, port_of_discharge, etd, eta, original_eta, ata,
          packages, gross_weight_kg, volume_cbm, declared_value_minor, currency, free_days, free_days_start, notes, version
        ) VALUES (
          'SHP-2026-0001', $1, 'sea', 'cleared', 'CIF', 'MEDU-90283411', ARRAY['MSKU-882910-4'],
          'Maersk Tema Express V.204', 'Yokohama, Japan (JPYOK)', 'Tema Port, Ghana (GHTEM)',
          '2026-09-10', '2026-10-14', '2026-10-12', '2026-10-14',
          120, 2450.50, 18.20, 4500000, 'USD', 14, '2026-10-15',
          'Container with high-density M.2 PCIe Gen4 NVMe components and workstation modules.', 1
        ) ON CONFLICT (shipment_no) DO UPDATE SET status = 'cleared' RETURNING id;
      `, [supTokyo]);
      shp1Id = s1.rows[0]?.id;
    }

    if (supShenzhen) {
      const s2 = await client.query(`
        INSERT INTO proc.shipments (
          shipment_no, supplier_id, mode, status, incoterm, bl_awb_no,
          vessel_or_flight, port_of_loading, port_of_discharge, etd, eta, original_eta, ata,
          packages, gross_weight_kg, volume_cbm, declared_value_minor, currency, notes, version
        ) VALUES (
          'SHP-2026-0002', $1, 'air', 'delivered', 'CIF', '074-98234150',
          'Ethiopian Cargo ET3522', 'Shenzhen Baoan (SZX)', 'Kotoka International Airport (ACC)',
          '2026-10-01', '2026-10-05', '2026-10-05', '2026-10-05',
          40, 520.00, 3.80, 2250000, 'USD',
          'Air freight emergency batch of 15.6 IPS 144Hz FHD replacement display panels.', 1
        ) ON CONFLICT (shipment_no) DO UPDATE SET status = 'delivered' RETURNING id;
      `, [supShenzhen]);
      shp2Id = s2.rows[0]?.id;
    }
    console.log("✓ International shipments populated.");

    // 5. Landed Cost Run (proc.landed_cost_runs)
    console.log("\n5. Seeding Landed Cost Runs (proc.landed_cost_runs)...");
    if (shp1Id) {
      await client.query(`
        INSERT INTO proc.landed_cost_runs (
          run_no, shipment_id, status, total_allocated_minor, posted_by, posted_at, version
        ) VALUES (
          'LCR-2026-0001', $1, 'posted', 1250000, '00000000-0000-0000-0000-000000000002', '2026-10-18T10:00:00Z', 1
        ) ON CONFLICT (run_no) DO NOTHING;
      `, [shp1Id]);
    }
    console.log("✓ Landed cost run populated.");

    // 6. Goods Receipts & Inventory Inflow (proc.goods_receipts, inv.stock_ledger, inv.component_serials, inv.lots)
    console.log("\n6. Seeding Goods Receipts and Stock Ledger...");
    const whMainId = (await client.query(`SELECT id FROM core.locations WHERE code = 'WH-MAIN' LIMIT 1`)).rows[0]?.id;
    const asmWipId = (await client.query(`SELECT id FROM core.locations WHERE code = 'ASM-WIP' LIMIT 1`)).rows[0]?.id;
    const poId = (await client.query(`SELECT id FROM proc.purchase_orders ORDER BY created_at DESC LIMIT 1`)).rows[0]?.id;

    let grnId;
    if (whMainId && poId && supTokyo) {
      const grnRes = await client.query(`
        INSERT INTO proc.goods_receipts (
          grn_no, po_id, shipment_id, supplier_id, location_id, received_by, received_at,
          delivery_note_no, status, posted_at, notes, version
        ) VALUES (
          'GRN-2026-0001', $1, $2, $3, $4, '00000000-0000-0000-0000-000000000003', '2026-10-16T14:30:00Z',
          'DN-TYO-990812', 'posted', '2026-10-16T15:00:00Z',
          'Warehouse receiving inspected and count verified at Main Warehouse Bay 1.', 1
        ) ON CONFLICT (grn_no) DO NOTHING RETURNING id;
      `, [poId, shp1Id, supTokyo, whMainId]);
      grnId = grnRes.rows[0]?.id || (await client.query(`SELECT id FROM proc.goods_receipts WHERE grn_no = 'GRN-2026-0001'`)).rows[0]?.id;
    }

    // Post stock ledger movements into WH-MAIN
    if (whMainId && displayRes.rows[0] && nvmeRes.rows[0]) {
      // Stock Ledger for Displays
      await client.query(`
        INSERT INTO inv.stock_ledger (
          item_id, location_id, movement_type, qty, unit_cost_minor, ref_type, ref_id, posted_at
        ) VALUES 
        ($1, $2, 'receipt', 150, 4500, 'proc.goods_receipts', $3, '2026-10-16T15:00:00Z'),
        ($4, $2, 'receipt', 200, 3200, 'proc.goods_receipts', $3, '2026-10-16T15:00:00Z');
      `, [displayRes.rows[0].id, whMainId, grnId || crypto.randomUUID(), nvmeRes.rows[0].id]);

      // Seed component serials
      for (let i = 1; i <= 5; i++) {
        await client.query(`
          INSERT INTO inv.component_serials (
            item_id, serial_no, status, location_id, version
          ) VALUES 
          ($1, 'DSP-SN-2026-' || lpad($3::text, 4, '0'), 'in_stock', $2, 1),
          ($4, 'NVME-SN-2026-' || lpad($3::text, 4, '0'), 'in_stock', $2, 1)
          ON CONFLICT (item_id, serial_no) DO NOTHING;
        `, [displayRes.rows[0].id, whMainId, i, nvmeRes.rows[0].id]);
      }
    }
    console.log("✓ Goods receipts and Stock Ledger populated.");

    // 7. Inventory Transfers & Adjustments (inv.transfers, inv.adjustments)
    console.log("\n7. Seeding Stock Transfers & Adjustments...");
    if (whMainId && asmWipId) {
      const trnRes = await client.query(`
        INSERT INTO inv.transfers (
          transfer_no, from_location_id, to_location_id, status, shipped_at, received_at, notes, version
        ) VALUES (
          'TRN-2026-0001', $1, $2, 'received', '2026-10-19T09:00:00Z', '2026-10-19T09:45:00Z',
          'Internal transfer of components from Central Warehouse to Assembly WIP Floor.', 1
        ) ON CONFLICT (transfer_no) DO NOTHING RETURNING id;
      `, [whMainId, asmWipId]);
      const trnId = trnRes.rows[0]?.id || (await client.query(`SELECT id FROM inv.transfers WHERE transfer_no = 'TRN-2026-0001'`)).rows[0]?.id;

      if (trnId && displayRes.rows[0]) {
        await client.query(`
          INSERT INTO inv.transfer_lines (transfer_id, item_id, qty_sent, qty_received, version)
          VALUES ($1, $2, 30, 30, 1) ON CONFLICT DO NOTHING;
        `, [trnId, displayRes.rows[0].id]);
      }

      const adjRes = await client.query(`
        INSERT INTO inv.adjustments (
          adj_no, location_id, reason, status, total_value_minor, posted_at, notes, version
        ) VALUES (
          'ADJ-2026-0001', $1, 'count_variance', 'posted', 0, '2026-10-20T16:00:00Z',
          'Audited component physical inventory vs book count. Zero variance recorded.', 1
        ) ON CONFLICT (adj_no) DO NOTHING RETURNING id;
      `, [whMainId]);
      const adjId = adjRes.rows[0]?.id || (await client.query(`SELECT id FROM inv.adjustments WHERE adj_no = 'ADJ-2026-0001'`)).rows[0]?.id;

      if (adjId && displayRes.rows[0]) {
        await client.query(`
          INSERT INTO inv.adjustment_lines (adjustment_id, item_id, qty_delta, unit_cost_minor, note, version)
          VALUES ($1, $2, 0, 4500, 'Count verified identical to system ledger.', 1)
          ON CONFLICT DO NOTHING;
        `, [adjId, displayRes.rows[0].id]);
      }
    }
    console.log("✓ Transfers and Adjustments populated.");

    // 8. Production Assembly Orders & Units (prod.assembly_orders, prod.units)
    console.log("\n8. Seeding Production Assembly Orders and Units...");
    let ao1Id, ao2Id;
    if (laptopRes.rows[0] && laptopBomId) {
      const ao1 = await client.query(`
        INSERT INTO prod.assembly_orders (
          ao_no, item_id, bom_id, qty_planned, status, priority, purpose, planned_start, planned_end, actual_start, version
        ) VALUES (
          'AO-2026-0001', $1, $2, 15, 'in_progress', 1, 'stock', '2026-10-21', '2026-10-28', '2026-10-21T08:00:00Z', 1
        ) ON CONFLICT (ao_no) DO UPDATE SET status = 'in_progress' RETURNING id;
      `, [laptopRes.rows[0].id, laptopBomId]);
      ao1Id = ao1.rows[0]?.id || (await client.query(`SELECT id FROM prod.assembly_orders WHERE ao_no = 'AO-2026-0001'`)).rows[0]?.id;
    }

    if (desktopRes.rows[0] && desktopBomId) {
      const ao2 = await client.query(`
        INSERT INTO prod.assembly_orders (
          ao_no, item_id, bom_id, qty_planned, status, priority, purpose, planned_start, planned_end, actual_start, actual_end, version
        ) VALUES (
          'AO-2026-0002', $1, $2, 20, 'completed', 2, 'internal_order', '2026-10-15', '2026-10-20', '2026-10-15T08:00:00Z', '2026-10-20T17:00:00Z', 1
        ) ON CONFLICT (ao_no) DO UPDATE SET status = 'completed' RETURNING id;
      `, [desktopRes.rows[0].id, desktopBomId]);
      ao2Id = ao2.rows[0]?.id || (await client.query(`SELECT id FROM prod.assembly_orders WHERE ao_no = 'AO-2026-0002'`)).rows[0]?.id;
    }

    // Seed production units in various states: qc_hold, testing, passed
    let unitHoldId, unitPassedId;
    if (laptopRes.rows[0] && ao1Id) {
      const u1 = await client.query(`
        INSERT INTO prod.units (
          internal_ref, serial_no, item_id, ao_id, status, built_by, built_at,
          labour_minutes_total, cost_materials_minor, cost_labour_minor, cost_total_minor,
          mac_address, bios_version, warranty_months, version
        ) VALUES (
          'UNIT-LAP-2026-001', 'UPSA-LAP-90812-01', $1, $2, 'qc_hold',
          '00000000-0000-0000-0000-000000000004', '2026-10-22T11:00:00Z',
          45, 780000, 45000, 825000, '00:1A:2B:3C:4D:5E', 'v2.10-UPSA', 24, 1
        ) ON CONFLICT (internal_ref) DO UPDATE SET status = 'qc_hold' RETURNING id;
      `, [laptopRes.rows[0].id, ao1Id]);
      unitHoldId = u1.rows[0]?.id || (await client.query(`SELECT id FROM prod.units WHERE internal_ref = 'UNIT-LAP-2026-001'`)).rows[0]?.id;

      const u2 = await client.query(`
        INSERT INTO prod.units (
          internal_ref, serial_no, item_id, ao_id, status, built_by, built_at,
          labour_minutes_total, cost_materials_minor, cost_labour_minor, cost_total_minor,
          mac_address, bios_version, warranty_months, qc_passed_at, version
        ) VALUES (
          'UNIT-LAP-2026-002', 'UPSA-LAP-90812-02', $1, $2, 'in_stock',
          '00000000-0000-0000-0000-000000000004', '2026-10-22T14:00:00Z',
          42, 780000, 45000, 825000, '00:1A:2B:3C:4D:5F', 'v2.10-UPSA', 24, '2026-10-22T16:00:00Z', 1
        ) ON CONFLICT (internal_ref) DO UPDATE SET status = 'in_stock' RETURNING id;
      `, [laptopRes.rows[0].id, ao1Id]);
      unitPassedId = u2.rows[0]?.id || (await client.query(`SELECT id FROM prod.units WHERE internal_ref = 'UNIT-LAP-2026-002'`)).rows[0]?.id;
    }

    if (desktopRes.rows[0] && ao2Id) {
      await client.query(`
        INSERT INTO prod.units (
          internal_ref, serial_no, item_id, ao_id, status, built_by, built_at,
          labour_minutes_total, cost_materials_minor, cost_labour_minor, cost_total_minor,
          mac_address, bios_version, warranty_months, version
        ) VALUES (
          'UNIT-DESK-2026-001', 'UPSA-DESK-77123-01', $1, $2, 'testing',
          '00000000-0000-0000-0000-000000000004', '2026-10-23T08:30:00Z',
          55, 450000, 35000, 485000, '00:1A:2B:3C:4D:60', 'v1.44-UPSA', 24, 1
        ) ON CONFLICT (internal_ref) DO UPDATE SET status = 'testing';
      `, [desktopRes.rows[0].id, ao2Id]);
    }
    console.log("✓ Assembly orders and Units populated.");

    // 9. Quality Defects, Codes, Inspections & Rework (prod.defect_codes, prod.qc_inspections, prod.qc_defects, prod.rework_orders)
    console.log("\n9. Seeding Quality Defect Analytics & Rework Orders...");
    const defectCodes = [
      { code: "DSP-BLEED", name: "Display Backlight Bleed", cat: "component", sev: "major" },
      { code: "RAM-SEAT", name: "Memory SODIMM Seating Failure", cat: "process", sev: "critical" },
      { code: "HNG-ALIGN", name: "Chassis Hinge Torque Misalignment", cat: "cosmetic", sev: "minor" },
      { code: "BAT-SURGE", name: "Power Controller Charging Cutoff", cat: "functional", sev: "major" }
    ];

    const codeMap = {};
    for (const dc of defectCodes) {
      const cRes = await client.query(`
        INSERT INTO prod.defect_codes (code, name, category, default_severity, active, version)
        VALUES ($1, $2, $3, $4, true, 1)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
        RETURNING id, code;
      `, [dc.code, dc.name, dc.cat, dc.sev]);
      codeMap[dc.code] = cRes.rows[0].id;
    }

    if (unitHoldId) {
      // Inspection record
      const inspRes = await client.query(`
        INSERT INTO prod.qc_inspections (
          inspection_no, unit_id, inspector_id, result, checklist, notes, inspected_at, version
        ) VALUES (
          'INSP-2026-0001', $1, '00000000-0000-0000-0000-000000000005', 'fail',
          '{"power_on": true, "display_uniformity": false, "keyboard": true, "ports": true}'::jsonb,
          'Slight display backlight bleed observed along lower right bezel.', '2026-10-22T15:30:00Z', 1
        ) ON CONFLICT (inspection_no) DO NOTHING RETURNING id;
      `, [unitHoldId]);

      const inspId = inspRes.rows[0]?.id || (await client.query(`SELECT id FROM prod.qc_inspections WHERE inspection_no = 'INSP-2026-0001'`)).rows[0]?.id;
      if (inspId && codeMap["DSP-BLEED"]) {
        await client.query(`
          INSERT INTO prod.qc_defects (
            inspection_id, defect_code_id, severity, notes, version
          ) VALUES (
            $1, $2, 'major', 'Display backlight bleed requires bezel alignment.', 1
          ) ON CONFLICT DO NOTHING;
        `, [inspId, codeMap["DSP-BLEED"]]);

        await client.query(`
          INSERT INTO prod.rework_orders (
            rework_no, unit_id, qc_inspection_id, status, assigned_to, description, version
          ) VALUES (
            'RWK-2026-0001', $1, $2, 'in_progress', '00000000-0000-0000-0000-000000000004',
            'Unclip front bezel, inspect panel seating, re-torque display bracket to 0.4Nm.', 1
          ) ON CONFLICT (rework_no) DO NOTHING;
        `, [unitHoldId, inspId]);
      }
    }
    console.log("✓ Quality defect analytics and Rework orders populated.");

    // 10. Service Warranties (svc.warranties)
    console.log("\n10. Seeding Service Warranties (svc.warranties)...");
    const acctRes = (await client.query(`SELECT id FROM core.customer_accounts LIMIT 1`)).rows[0]?.id;
    if (unitPassedId && acctRes) {
      await client.query(`
        INSERT INTO svc.warranties (
          unit_id, account_id, starts_on, ends_on, months, status, terms_version, version
        ) VALUES (
          $1, $2, '2026-10-22', '2028-10-22', 24, 'active', 'v1.0-UPSA-STD', 1
        ) ON CONFLICT DO NOTHING;
      `, [unitPassedId, acctRes]);
    }
    console.log("✓ Service warranties populated.");

    // 11. Finance: Invoices, Payments, Expenses (fin.invoices, fin.payments, fin.expense_categories, fin.expenses)
    console.log("\n11. Seeding Finance Invoices, Payments, and Expenses...");
    const orderRes = (await client.query(`SELECT id, order_no FROM sales.internal_orders ORDER BY created_at DESC LIMIT 1`)).rows[0];
    
    if (acctRes && orderRes) {
      await client.query(`
        INSERT INTO fin.invoices (
          invoice_no, kind, order_id, account_id, status, issue_date, due_date, currency,
          subtotal_minor, discount_minor, tax_minor, total_minor, notes, version
        ) VALUES (
          'INV-2026-0001', 'tax_invoice', $1, $2, 'issued', '2026-10-23', '2026-11-23', 'GHS',
          852400, 0, 0, 852400, 'Invoice issued against internal faculty order ' || $3, 1
        ) ON CONFLICT (invoice_no) DO NOTHING;
      `, [orderRes.id, acctRes, orderRes.order_no]);

      // Seed customer payment
      await client.query(`
        INSERT INTO fin.payments (
          payment_no, direction, party_type, party_id, method, amount_minor, currency, fx_rate,
          amount_base_minor, status, reference, paid_on, notes, version
        ) VALUES (
          'PAY-2026-0001', 'in', 'account', $1, 'bank_transfer', 852400, 'GHS', 1.0,
          852400, 'cleared', 'TRF-GCB-9023412', '2026-10-23', 'Payment from Faculty of Accounting & Finance allocation.', 1
        ) ON CONFLICT (payment_no) DO NOTHING;
      `, [acctRes]);
    }

    // Expense Categories & Expenses
    const expCats = [
      { name: "Port Clearance & Customs Handling" },
      { name: "Assembly Tooling & Calibration" },
      { name: "Logistics Freight & Delivery" }
    ];

    let firstCatId;
    for (const ec of expCats) {
      const ecRes = await client.query(`
        INSERT INTO fin.expense_categories (name, active, version)
        VALUES ($1, true, 1)
        ON CONFLICT DO NOTHING
        RETURNING id;
      `, [ec.name]);
      if (!firstCatId && ecRes.rows[0]) firstCatId = ecRes.rows[0].id;
    }

    if (!firstCatId) {
      firstCatId = (await client.query(`SELECT id FROM fin.expense_categories LIMIT 1`)).rows[0]?.id;
    }

    if (firstCatId) {
      await client.query(`
        INSERT INTO fin.expenses (
          expense_no, category_id, amount_minor, currency, paid_to, expense_date, status, notes, version
        ) VALUES 
        ('EXP-2026-0001', $1, 350000, 'GHS', 'Ghana Ports and Harbours Authority (GPHA)', '2026-10-17', 'approved', 'Port clearance charges for container MSKU-882910-4.', 1),
        ('EXP-2026-0002', $1, 120000, 'GHS', 'Tema Bonded Warehouse Services Ltd', '2026-10-18', 'approved', 'Demurrage and container terminal handling fee.', 1)
        ON CONFLICT (expense_no) DO NOTHING;
      `, [firstCatId]);
    }
    console.log("✓ Finance invoices, payments, and expenses populated.");

    await client.query("COMMIT");
    console.log("\n==========================================================================================");
    console.log("   ✓ ALL PREVIOUSLY EMPTY MODULES AND PAGES HAVE BEEN FULLY POPULATED & PROCESSED!       ");
    console.log("==========================================================================================\n");

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed execution failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
