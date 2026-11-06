import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    const res = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_schema IN ('proc', 'catalog', 'inv', 'mfg', 'qc', 'sales', 'svc', 'fin', 'core', 'customs')
        AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name;
    `);

    console.log(`Auditing ${res.rows.length} tables for empty records...\n`);
    const results = [];

    for (const r of res.rows) {
      try {
        const countRes = await client.query(`SELECT count(*) FROM "${r.table_schema}"."${r.table_name}"`);
        const count = parseInt(countRes.rows[0].count, 10);
        results.push({
          schema: r.table_schema,
          table: r.table_name,
          count,
          status: count === 0 ? "EMPTY" : "POPULATED"
        });
      } catch (e) {
        results.push({
          schema: r.table_schema,
          table: r.table_name,
          count: -1,
          status: "ERROR: " + e.message
        });
      }
    }

    console.log("=== EMPTY TABLES (NO RECORDS INPUTTED OR PROCESSED) ===");
    console.table(results.filter(r => r.count === 0));

    console.log("\n=== POPULATED TABLES ===");
    console.table(results.filter(r => r.count > 0));

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("Audit error:", err);
  process.exit(1);
});
