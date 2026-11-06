import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkPostEvent() {
  const res = await pool.query(`select pg_get_functiondef(oid) as def from pg_proc where proname = 'post_event'`);
  console.log('fin.post_event definition:\n', res.rows[0]?.def);
  await pool.end();
}

checkPostEvent().catch(e => console.error(e));

