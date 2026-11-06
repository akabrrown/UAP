import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query(`
      UPDATE catalog.items 
      SET category_id = (SELECT id FROM catalog.categories WHERE slug = 'laptops-portables') 
      WHERE sku = 'UPSA-LAP-GEN13-I7'
    `);
    await client.query(`
      UPDATE catalog.items 
      SET category_id = (SELECT id FROM catalog.categories WHERE slug = 'desktop-workstations') 
      WHERE sku = 'UPSA-DESK-GEN12-I5'
    `);
    const res = await client.query(`
      SELECT i.sku, i.name, c.name as category 
      FROM catalog.items i 
      JOIN catalog.categories c ON c.id = i.category_id 
      ORDER BY c.name, i.sku
    `);
    console.table(res.rows);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
