import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'prod' AND table_type = 'BASE TABLE';
  `);
  for (const r of res.rows) {
    const cnt = await pool.query(`SELECT count(*) FROM "prod"."${r.table_name}"`);
    console.log(`prod.${r.table_name}: ${cnt.rows[0].count}`);
  }
  await pool.end();
}

main();
