import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function checkFinFuncs() {
  const funcs = await pool.query(`
    select proname, prosrc from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'fin'
  `);
  console.log('FIN functions:', funcs.rows.map(r => r.proname));

  const triggers = await pool.query(`
    select trigger_name, event_manipulation, event_object_table
    from information_schema.triggers
    where trigger_schema in ('proc', 'fin', 'inv', 'prod')
  `);
  console.log('Triggers:', triggers.rows);

  await pool.end();
}

checkFinFuncs().catch(e => console.error(e));

