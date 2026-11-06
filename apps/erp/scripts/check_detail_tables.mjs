import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const tables = [
    ['fin', 'invoice_lines'],
    ['proc', 'goods_receipt_lines'],
    ['proc', 'shipment_lines'],
    ['proc', 'shipment_charges'],
    ['prod', 'unit_components']
  ];
  for (const [s, t] of tables) {
    const cols = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2;
    `, [s, t]);
    console.log(s + '.' + t + ' columns:', cols.rows.map(r => r.column_name));
    
    const cons = await pool.query(`
      SELECT conname, pg_get_constraintdef(c.oid)
      FROM pg_constraint c
      JOIN pg_class cl ON c.conrelid = cl.oid
      JOIN pg_namespace n ON cl.relnamespace = n.oid
      WHERE n.nspname = $1 AND cl.relname = $2;
    `, [s, t]);
    console.log(s + '.' + t + ' constraints:', cons.rows.map(r => r.pg_get_constraintdef));
  }
  await pool.end();
}

main();
