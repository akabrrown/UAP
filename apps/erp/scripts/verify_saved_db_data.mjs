import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("\n==========================================================================================");
    console.log("       UAP ERP 100% COMPLETE ROLE SCENARIO: LIVE DATABASE PERSISTENCE AUDIT               ");
    console.log("==========================================================================================\n");

    console.log(">>> [1. PROCUREMENT OFFICER] Recently Registered Suppliers (proc.suppliers):");
    const suppliers = await client.query(`
      select supplier_no, name, country, kind, currency, payment_terms, contact_name, tin, email, phone, status, created_at 
      from proc.suppliers 
      order by created_at desc 
      limit 2
    `);
    console.table(suppliers.rows);

    console.log("\n>>> [1b. PROCUREMENT OFFICER] Issued Purchase Orders (proc.purchase_orders):");
    const pos = await client.query(`
      select po.po_no, s.name as supplier_name, po.currency, po.incoterm, po.shipping_mode, 
             po.expected_arrival_date, po.status, po.notes, po.created_at
      from proc.purchase_orders po
      join proc.suppliers s on s.id = po.supplier_id
      order by po.created_at desc 
      limit 2
    `);
    console.table(pos.rows);

    if (pos.rows.length > 0) {
      const latestPo = await client.query(`select id, po_no from proc.purchase_orders order by created_at desc limit 1`);
      const poLines = await client.query(`
        select pol.line_no, ci.name as item_name, ci.sku, pol.qty, pol.unit_price_minor, pol.line_total_minor
        from proc.purchase_order_lines pol
        join catalog.items ci on ci.id = pol.item_id
        where pol.po_id = $1
      `, [latestPo.rows[0].id]);
      console.log(`\n    Lines for Purchase Order [${latestPo.rows[0].po_no}]:`);
      console.table(poLines.rows);
    }

    console.log("\n>>> [2. STORES OFFICER] Recently Created Categories (catalog.categories):");
    const categories = await client.query(`
      select name, slug, default_tracking, created_at
      from catalog.categories 
      order by created_at desc 
      limit 3
    `);
    console.table(categories.rows);

    console.log("\n>>> [2b. STORES OFFICER] Recently Created Catalogue Items with Category (catalog.items):");
    const items = await client.query(`
      select i.sku, i.name, c.name as category_name, i.kind, i.tracking, i.uom, i.is_active, i.created_at 
      from catalog.items i
      left join catalog.categories c on c.id = i.category_id
      order by i.created_at desc 
      limit 4
    `);
    console.table(items.rows);

    console.log("\n>>> [3. SALES OFFICER] Internal Orders with Delivery Point & Notes (sales.internal_orders):");
    const orders = await client.query(`
      select io.order_no, ca.name as requesting_faculty, io.status, io.delivery_point, io.required_by, io.notes, io.created_at
      from sales.internal_orders io
      left join core.customer_accounts ca on ca.id = io.account_id
      order by io.created_at desc 
      limit 2
    `);
    console.table(orders.rows);

    if (orders.rows.length > 0) {
      const latestOrder = await client.query(`select id, order_no from sales.internal_orders order by created_at desc limit 1`);
      const orderLines = await client.query(`
        select iol.line_no, ci.name as item_name, ci.sku, iol.qty, iol.unit_price_minor, iol.line_total_minor
        from sales.internal_order_lines iol
        left join catalog.items ci on ci.id = iol.item_id
        where iol.order_id = $1
      `, [latestOrder.rows[0].id]);
      console.log(`\n    Lines for Internal Order [${latestOrder.rows[0].order_no}]:`);
      console.table(orderLines.rows);
    }

    console.log("\n>>> [4. SERVICE TECHNICIAN] Service & Warranty Repair Tickets (svc.service_tickets):");
    const tickets = await client.query(`
      select ticket_no, kind, priority, status, contact_name, contact_phone, contact_email, 
             device_serial, device_description, fault_description, created_at
      from svc.service_tickets
      order by created_at desc 
      limit 2
    `);
    console.table(tickets.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error("DB Query error:", err);
  process.exit(1);
});
