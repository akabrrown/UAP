import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const tablesToCheck = [
  ['catalog', 'customs_tariffs'],
  ['proc', 'shipments'],
  ['proc', 'shipment_lines'],
  ['proc', 'shipment_charges'],
  ['proc', 'goods_receipts'],
  ['proc', 'goods_receipt_lines'],
  ['proc', 'landed_cost_runs'],
  ['inv', 'stock_ledger'],
  ['inv', 'component_serials'],
  ['inv', 'lots'],
  ['inv', 'transfers'],
  ['inv', 'transfer_lines'],
  ['inv', 'adjustments'],
  ['inv', 'adjustment_lines'],
  ['prod', 'assembly_orders'],
  ['prod', 'assembly_order_lines'],
  ['prod', 'units'],
  ['prod', 'unit_components'],
  ['prod', 'defect_codes'],
  ['prod', 'qc_inspections'],
  ['prod', 'qc_defects'],
  ['prod', 'rework_orders'],
  ['svc', 'warranties'],
  ['fin', 'invoices'],
  ['fin', 'payments'],
  ['fin', 'expense_categories'],
  ['fin', 'expenses']
];

async function main() {
  const client = await pool.connect();
  try {
    const report = {};
    for (const [schema, table] of tablesToCheck) {
      const res = await client.query(`
        select column_name, data_type, is_nullable, column_default
        from information_schema.columns 
        where table_schema = $1 and table_name = $2
        order by ordinal_position
      `, [schema, table]);
      report[`${schema}.${table}`] = res.rows.map(r => `${r.column_name} (${r.data_type}${r.is_nullable === 'NO' ? ', NOT NULL' : ''})`);
    }
    console.log(JSON.stringify(report, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Column check error:", err);
  process.exit(1);
});
