import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function inspectUserTransfer() {
  const trf = await pool.query(`select * from inv.transfers where transfer_no = 'TRF-2026-000001'`);
  console.log('Transfer TRF-2026-000001:\n', trf.rows);

  if (trf.rows.length > 0) {
    const lines = await pool.query(`
      select tl.*, i.sku, i.name
      from inv.transfer_lines tl
      join catalog.items i on i.id = tl.item_id
      where tl.transfer_id = $1
    `, [trf.rows[0].id]);
    console.log('Transfer Lines:\n', lines.rows);
  }

  await pool.end();
}

inspectUserTransfer().catch(e => console.error(e));

