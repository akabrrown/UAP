import pg from 'pg';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const res = await pool.query(`SELECT id, unit_id, item_id, component_serial_id FROM prod.unit_components;`);
  console.log('prod.unit_components:', res.rows);
  await pool.end();
}

main();
