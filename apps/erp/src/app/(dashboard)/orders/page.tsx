import { db } from "@/lib/db";
import { requireAnyScope } from "@/lib/session";
import { OrdersClient, OrderRow } from "./OrdersClient";

export default async function OrdersPage() {
  await requireAnyScope(["orders.read", "orders.write"]);

  const result = await db.query<OrderRow>(`
    select 
      io.id, 
      io.order_no, 
      io.status, 
      io.currency, 
      io.total_minor, 
      ca.name as customer_name,
      io.required_by::text as required_by,
      io.delivery_point,
      io.created_at::text as created_at
    from sales.internal_orders io
    join core.customer_accounts ca on ca.id = io.account_id
    order by io.created_at desc, io.order_no desc
  `);

  return <OrdersClient initialOrders={result.rows} />;
}
