import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const tables = ['test_runs', 'unit_components', 'unit_steps'];
  for (const t of tables) {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'prod' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);
    console.log(`prod.${t}:`, res.rows.map(r => r.column_name));
  }
  await pool.end();
}

main();
