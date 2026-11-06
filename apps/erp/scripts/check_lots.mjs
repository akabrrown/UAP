import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkLots() {
  const res = await pool.query(`
    select column_name, data_type 
    from information_schema.columns 
    where table_schema = 'inv' and table_name = 'lots'
    order by ordinal_position
  `);
  console.log('inv.lots columns:\n', res.rows);

  const existingLots = await pool.query(`select * from inv.lots limit 5`);
  console.log('Existing lots:\n', existingLots.rows);

  await pool.end();
}

checkLots().catch(e => console.error(e));

