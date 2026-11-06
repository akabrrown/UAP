import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const cols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'core' AND table_name = 'approvals';
  `);
  console.log('core.approvals columns:', cols.rows);

  const cons = await pool.query(`
    SELECT conname, pg_get_constraintdef(c.oid)
    FROM pg_constraint c
    JOIN pg_class cl ON c.conrelid = cl.oid
    JOIN pg_namespace n ON cl.relnamespace = n.oid
    WHERE n.nspname = 'core' AND cl.relname = 'approvals';
  `);
  console.log('core.approvals constraints:', cons.rows.map(r => r.pg_get_constraintdef));

  await pool.end();
}

main();
