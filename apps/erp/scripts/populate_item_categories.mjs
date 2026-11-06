import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("1. Upserting standard enterprise product categories...");
    const categories = [
      { name: "Laptops & Portables", slug: "laptops-portables", default_tracking: "serial" },
      { name: "Desktop Workstations", slug: "desktop-workstations", default_tracking: "serial" },
      { name: "Displays & Screen Panels", slug: "displays-panels", default_tracking: "serial" },
      { name: "Solid State Storage (NVMe)", slug: "solid-state-storage", default_tracking: "serial" },
      { name: "Hardware Components", slug: "hardware-components", default_tracking: "serial" },
    ];

    const catMap = {};
    for (const cat of categories) {
      const res = await client.query(
        `INSERT INTO catalog.categories (name, slug, default_tracking)
         VALUES ($1, $2, $3)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
         RETURNING id, slug, name`,
        [cat.name, cat.slug, cat.default_tracking]
      );
      catMap[cat.slug] = res.rows[0].id;
      console.log(`- Category [${cat.name}] -> ID: ${res.rows[0].id}`);
    }

    console.log("\n2. Linking all catalogue items with NULL categories to their correct category...");

    // Laptops
    await client.query(
      `UPDATE catalog.items 
       SET category_id = $1 
       WHERE sku ILIKE '%LAP%' OR name ILIKE '%Laptop%'`,
      [catMap["laptops-portables"]]
    );

    // Desktops
    await client.query(
      `UPDATE catalog.items 
       SET category_id = $1 
       WHERE sku ILIKE '%DESK%' OR name ILIKE '%Desktop%'`,
      [catMap["desktop-workstations"]]
    );

    // Displays
    await client.query(
      `UPDATE catalog.items 
       SET category_id = $1 
       WHERE sku ILIKE '%DSP%' OR name ILIKE '%Display%' OR name ILIKE '%Panel%'`,
      [catMap["displays-panels"]]
    );

    // NVMe Storage
    await client.query(
      `UPDATE catalog.items 
       SET category_id = $1 
       WHERE sku ILIKE '%NVME%' OR sku ILIKE '%SSD%' OR name ILIKE '%SSD%' OR name ILIKE '%NVMe%'`,
      [catMap["solid-state-storage"]]
    );

    // Generic / test components
    await client.query(
      `UPDATE catalog.items 
       SET category_id = $1 
       WHERE category_id IS NULL`,
      [catMap["hardware-components"]]
    );

    await client.query("COMMIT");

    console.log("\n3. Verifying updated catalogue items:");
    const items = await client.query(`
      SELECT i.sku, i.name, i.kind, c.name as category_name
      FROM catalog.items i
      LEFT JOIN catalog.categories c ON c.id = i.category_id
      ORDER BY c.name ASC, i.sku ASC
    `);
    console.table(items.rows);

    const nullCount = await client.query(`SELECT count(*) FROM catalog.items WHERE category_id IS NULL`);
    console.log(`\nRemaining items with NULL category: ${nullCount.rows[0].count}`);

  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Migration error:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
