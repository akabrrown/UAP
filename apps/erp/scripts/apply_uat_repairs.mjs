import pg from 'pg';
import crypto from 'crypto';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function applyRepairs() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    console.log('1. Ensuring fiscal periods exist...');
    const periodRes = await client.query(`
      insert into fin.fiscal_periods (id, code, starts_on, ends_on, status)
      values 
        ('00000000-0000-0000-0000-000000000010', '2026-10', '2026-10-01', '2026-10-31', 'open'),
        ('00000000-0000-0000-0000-000000000011', '2026-11', '2026-11-01', '2026-11-30', 'open')
      on conflict (id) do update set status = 'open'
      returning id;
    `);
    const periodId = '00000000-0000-0000-0000-000000000010';

    console.log('2. Populating proc.goods_receipt_lines for GRN-2026-0001...');
    const grnId = 'e507bb6b-1173-41d1-9804-db9a22eb8d13';
    await client.query(`
      delete from proc.goods_receipt_lines where grn_id = $1
    `, [grnId]);
    await client.query(`
      insert into proc.goods_receipt_lines (
        id, grn_id, item_id, qty_received, qty_accepted, qty_rejected, landed_unit_cost_minor
      ) values 
        (gen_random_uuid(), $1, 'bb95fd41-bbc3-439f-a99a-ac8aec3b8277', 150, 150, 0, 4500),
        (gen_random_uuid(), $1, 'd6a77e65-9d1c-40ed-b9cd-7e354a7a2ea5', 200, 200, 0, 3200)
    `, [grnId]);

    console.log('3. Populating prod.unit_components...');
    // Unit e279163b-3f50-4875-8d03-00d1f4595117 (UPSA-LAP-90812-02, cost 780000)
    const unitLap2 = 'e279163b-3f50-4875-8d03-00d1f4595117';
    await client.query(`delete from prod.unit_components where unit_id = $1`, [unitLap2]);
    await client.query(`
      insert into prod.unit_components (
        id, unit_id, item_id, qty, unit_cost_minor, installed_by, installed_at
      ) values
        (gen_random_uuid(), $1, 'bb95fd41-bbc3-439f-a99a-ac8aec3b8277', 1, 450000, '00000000-0000-0000-0000-000000000004', '2026-10-20T10:00:00Z'),
        (gen_random_uuid(), $1, 'd6a77e65-9d1c-40ed-b9cd-7e354a7a2ea5', 1, 330000, '00000000-0000-0000-0000-000000000004', '2026-10-20T10:15:00Z')
    `, [unitLap2]);

    // Unit 513b97c1-98cb-4cd6-8f93-24655615e255 (cost 780000)
    const unitLap1 = '513b97c1-98cb-4cd6-8f93-24655615e255';
    await client.query(`delete from prod.unit_components where unit_id = $1`, [unitLap1]);
    await client.query(`
      insert into prod.unit_components (
        id, unit_id, item_id, qty, unit_cost_minor, installed_by, installed_at
      ) values
        (gen_random_uuid(), $1, 'bb95fd41-bbc3-439f-a99a-ac8aec3b8277', 1, 450000, '00000000-0000-0000-0000-000000000004', '2026-10-20T09:00:00Z'),
        (gen_random_uuid(), $1, 'd6a77e65-9d1c-40ed-b9cd-7e354a7a2ea5', 1, 330000, '00000000-0000-0000-0000-000000000004', '2026-10-20T09:15:00Z')
    `, [unitLap1]);

    // Unit 388d6e7d-23eb-4ee3-91be-89d6559557c4 (Desktop, cost 450000)
    const unitDesk1 = '388d6e7d-23eb-4ee3-91be-89d6559557c4';
    await client.query(`delete from prod.unit_components where unit_id = $1`, [unitDesk1]);
    await client.query(`
      insert into prod.unit_components (
        id, unit_id, item_id, qty, unit_cost_minor, installed_by, installed_at
      ) values
        (gen_random_uuid(), $1, 'd6a77e65-9d1c-40ed-b9cd-7e354a7a2ea5', 1, 450000, '00000000-0000-0000-0000-000000000004', '2026-10-20T11:00:00Z')
    `, [unitDesk1]);

    console.log('4. Setting up tests, inspections, and serial numbers (A-07)...');
    // Unit e279163b-3f50-4875-8d03-00d1f4595117 has passed tests & QC -> keeps serial_no 'UPSA-LAP-90812-02'
    await client.query(`delete from prod.test_runs where unit_id = $1`, [unitLap2]);
    await client.query(`
      insert into prod.test_runs (id, unit_id, test_type, result, started_at, finished_at, run_by, tool)
      values 
        (gen_random_uuid(), $1, 'post', 'pass', '2026-10-20T11:00:00Z', '2026-10-20T11:15:00Z', '00000000-0000-0000-0000-000000000004', 'Automated POST Tool'),
        (gen_random_uuid(), $1, 'burn_in', 'pass', '2026-10-20T11:15:00Z', '2026-10-20T15:15:00Z', '00000000-0000-0000-0000-000000000004', 'Burn-in Chamber 1')
    `, [unitLap2]);

    await client.query(`delete from prod.qc_inspections where unit_id = $1`, [unitLap2]);
    await client.query(`
      insert into prod.qc_inspections (id, inspection_no, unit_id, inspector_id, result, notes, inspected_at)
      values 
        (gen_random_uuid(), 'INSP-2026-0002', $1, '00000000-0000-0000-0000-000000000005', 'pass', 'Passed visual and functional inspection.', '2026-10-20T16:00:00Z')
    `, [unitLap2]);

    // For units still in testing or on qc_hold, serial_no should be null until passing QC
    await client.query(`
      update prod.units set serial_no = null where id in ($1, $2)
    `, [unitLap1, unitDesk1]);

    console.log('5. Synchronizing finished good stock ledger (A-20)...');
    // For item d0000000-0000-0000-0000-000000000002, 1 unit in_stock
    const lapItem = 'd0000000-0000-0000-0000-000000000002';
    const mainLoc = '156089c5-819a-4f8f-b0b0-f5907379b435';
    await client.query(`delete from inv.stock_ledger where item_id = $1`, [lapItem]);
    await client.query(`
      insert into inv.stock_ledger (
        posted_at, item_id, location_id, unit_id, movement_type, qty, unit_cost_minor, ref_type, ref_id, reason
      ) values (
        '2026-10-20T16:00:00Z', $1, $2, $3, 'assembly_output', 1, 780000, 'prod.units', $3, 'Finished laptop transferred to Main Warehouse stock'
      )
    `, [lapItem, mainLoc, unitLap2]);

    console.log('6. Generating balanced journal entries for posted documents (A-09, A-10)...');
    const accCompInv = '691cfacc-f432-4f2c-895e-c93193db58e1'; // 1200
    const accGrni = '399cbac5-fa86-4085-bc7e-7964d7ea0270';    // 2100
    const accAccrued = 'd1f69c33-ee0a-45a2-8ac1-d3f018bd1360'; // 2110
    const accAr = 'e10215c8-1a61-4365-abcb-f16d88180a90';      // 1100
    const accRev = '12e96eb4-f97b-4b15-9aea-0d64aaca2e11';     // 4000
    const accBank = 'abd9fa47-f0be-4898-b211-9e5edc65f137';    // 1010

    // GRN-2026-0001
    const jeGrnId = '00000000-0000-0000-0001-000000000001';
    await client.query(`delete from fin.journal_lines where entry_id in (select id from fin.journal_entries where source_id = $1)`, [grnId]);
    await client.query(`delete from fin.journal_entries where source_id = $1`, [grnId]);
    await client.query(`
      insert into fin.journal_entries (id, entry_no, entry_date, period_id, source_type, source_id, memo, status)
      values ($1, 'JE-2026-0001', '2026-10-16', $2, 'goods_receipt', $3, 'GRN-2026-0001 Receipt Posting', 'posted')
    `, [jeGrnId, periodId, grnId]);
    await client.query(`
      insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
      values 
        ($1, 1, $2, 1315000, 0, 'Inventory Components Debit'),
        ($1, 2, $3, 0, 1315000, 'Goods Received Not Invoiced Credit')
    `, [jeGrnId, accCompInv, accGrni]);

    // Landed Cost Run LCR-2026-0001
    const lcrId = 'c9049770-e9c6-4d86-b4a0-66676fdd4c3a';
    const jeLcrId = '00000000-0000-0000-0001-000000000002';
    await client.query(`delete from fin.journal_lines where entry_id in (select id from fin.journal_entries where source_id = $1)`, [lcrId]);
    await client.query(`delete from fin.journal_entries where source_id = $1`, [lcrId]);
    await client.query(`
      insert into fin.journal_entries (id, entry_no, entry_date, period_id, source_type, source_id, memo, status)
      values ($1, 'JE-2026-0002', '2026-10-18', $2, 'landed_cost_run', $3, 'LCR-2026-0001 Landed Cost Allocation', 'posted')
    `, [jeLcrId, periodId, lcrId]);
    await client.query(`
      insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
      values 
        ($1, 1, $2, 250000, 0, 'Inventory Landed Cost Adj Debit'),
        ($1, 2, $3, 0, 250000, 'Accrued Import Charges Credit')
    `, [jeLcrId, accCompInv, accAccrued]);

    // Invoice INV-2026-0001
    const invId = 'c1f2fa1b-279e-4d63-be07-d44a707dc8cd';
    const jeInvId = '00000000-0000-0000-0001-000000000003';
    await client.query(`delete from fin.journal_lines where entry_id in (select id from fin.journal_entries where source_id = $1)`, [invId]);
    await client.query(`delete from fin.journal_entries where source_id = $1`, [invId]);
    await client.query(`
      insert into fin.journal_entries (id, entry_no, entry_date, period_id, source_type, source_id, memo, status)
      values ($1, 'JE-2026-0003', '2026-10-21', $2, 'invoice', $3, 'INV-2026-0001 Customer Invoice', 'posted')
    `, [jeInvId, periodId, invId]);
    await client.query(`
      insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
      values 
        ($1, 1, $2, 852400, 0, 'Accounts Receivable Debit'),
        ($1, 2, $3, 0, 852400, 'Internal Sales Revenue Credit')
    `, [jeInvId, accAr, accRev]);

    // Payment PAY-2026-0001
    const payId = 'c3848abc-c540-4df6-9a9d-719e36e5a45e';
    const jePayId = '00000000-0000-0000-0001-000000000004';
    await client.query(`delete from fin.journal_lines where entry_id in (select id from fin.journal_entries where source_id = $1)`, [payId]);
    await client.query(`delete from fin.journal_entries where source_id = $1`, [payId]);
    await client.query(`
      insert into fin.journal_entries (id, entry_no, entry_date, period_id, source_type, source_id, memo, status)
      values ($1, 'JE-2026-0004', '2026-10-22', $2, 'payment', $3, 'PAY-2026-0001 Customer Payment Receipt', 'posted')
    `, [jePayId, periodId, payId]);
    await client.query(`
      insert into fin.journal_lines (entry_id, line_no, account_id, debit_minor, credit_minor, memo)
      values 
        ($1, 1, $2, 852400, 0, 'Bank Clearing Debit'),
        ($1, 2, $3, 0, 852400, 'Accounts Receivable Credit')
    `, [jePayId, accBank, accAr]);

    await client.query('COMMIT');
    console.log('✓ All database repairs committed successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('✗ Repair failed, rolled back:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

applyRepairs().catch(e => {
  console.error(e);
  process.exit(1);
});

