import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkFn() {
  const res = await pool.query(`
    select pg_get_functiondef(oid) as def
    from pg_proc
    where proname = 'post_goods_receipt'
  `);
  console.log('Function inv.post_goods_receipt:\n', res.rows[0]?.def);
  await pool.end();
}

checkFn().catch(e => console.error(e));

