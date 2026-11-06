import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkTransferLinesCols() {
  const res = await pool.query(`
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'inv' and table_name = 'transfer_lines'
    order by ordinal_position
  `);
  console.log('inv.transfer_lines columns:\n', res.rows);

  const existing = await pool.query(`select * from inv.transfer_lines limit 5`);
  console.log('Existing rows:\n', existing.rows);

  await pool.end();
}

checkTransferLinesCols().catch(e => console.error(e));

