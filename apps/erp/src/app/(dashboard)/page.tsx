import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { DashboardClient, type DashboardMetrics } from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getSession();

  // Safely execute metric aggregations across schemas
  const [
    superAdminRes,
    managementRes,
    procurementRes,
    inventoryRes,
    financeRes,
    technicianRes,
    qcRes,
    auditRes,
  ] = await Promise.all([
    // Super admin queries
    Promise.all([
      db.query(`select count(*) as count from core.profiles where status = 'invited'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from core.profiles where status = 'suspended'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from core.audit_log where entity_type = 'core.profiles' and at > now() - interval '7 days'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from core.audit_log where action ilike '%security%' or action ilike '%reset%'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Management queries
    Promise.all([
      db.query(`select count(*) as count from core.approvals where status = 'pending'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from proc.shipments where status in ('booked', 'in_transit') and eta < current_date`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from prod.units where status not in ('passed', 'scrapped')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from sales.internal_orders where status = 'pending_approval'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Procurement & Imports queries
    Promise.all([
      db.query(`select count(*) as count from proc.purchase_orders where status in ('draft', 'submitted', 'confirmed', 'partially_received')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from proc.shipments where status not in ('delivered', 'cancelled')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from proc.shipments where status = 'held'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from proc.shipment_charges where actual_ghs is null or actual_ghs = 0`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Inventory & Sales queries
    Promise.all([
      db.query(`select count(*) as count from proc.goods_receipt_notes where status = 'draft'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from sales.internal_orders where status in ('approved', 'allocated')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from prod.assembly_orders where status = 'draft'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Finance & Service queries
    Promise.all([
      db.query(`select count(*) as count from sales.internal_orders where status = 'dispatched'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from svc.tickets where status not in ('closed', 'cancelled')`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Technician queries
    Promise.all([
      db.query(`select count(*) as count from prod.units where status in ('allocated', 'building', 'testing')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from prod.units where status in ('qc_failed', 'rework')`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from svc.tickets where status in ('assigned', 'in_repair')`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // QC queries
    Promise.all([
      db.query(`select count(*) as count from prod.units where status = 'testing'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from proc.goods_receipt_notes where status = 'draft'`).catch(() => ({ rows: [{ count: 0 }] })),
      db.query(`select count(*) as count from prod.units where status = 'rework'`).catch(() => ({ rows: [{ count: 0 }] })),
    ]),
    // Recent audit activity
    db.query(`
      select al.id, al.action, al.entity_type, al.at as created_at, 
             coalesce(p.full_name, 'System') as actor_name
      from core.audit_log al
      left join core.profiles p on p.id = al.actor_id
      order by al.at desc
      limit 8
    `).catch(() => ({ rows: [] })),
  ]);

  const metrics: DashboardMetrics = {
    superAdmin: {
      pendingInvitations: Number(superAdminRes[0].rows[0]?.count || 0),
      suspendedUsers: Number(superAdminRes[1].rows[0]?.count || 0),
      permissionChanges: Number(superAdminRes[2].rows[0]?.count || 0),
      failedJobs: 0,
      securityAlerts: Number(superAdminRes[3].rows[0]?.count || 0),
    },
    management: {
      approvalsWaiting: Number(managementRes[0].rows[0]?.count || 0),
      shipmentsDelayed: Number(managementRes[1].rows[0]?.count || 0),
      belowReorder: 0,
      unitsByStage: Number(managementRes[2].rows[0]?.count || 0),
      ordersPending: Number(managementRes[3].rows[0]?.count || 0),
    },
    procurement: {
      openPOs: Number(procurementRes[0].rows[0]?.count || 0),
      activeShipments: Number(procurementRes[1].rows[0]?.count || 0),
      heldAtCustoms: Number(procurementRes[2].rows[0]?.count || 0),
      chargesAwaitingActuals: Number(procurementRes[3].rows[0]?.count || 0),
    },
    inventory: {
      receiptsExpected: Number(inventoryRes[0].rows[0]?.count || 0),
      reorderSuggestions: 0,
      ordersReady: Number(inventoryRes[1].rows[0]?.count || 0),
      ordersAwaitingMaterials: Number(inventoryRes[2].rows[0]?.count || 0),
    },
    finance: {
      invoicesToIssue: Number(financeRes[0].rows[0]?.count || 0),
      unallocatedPayments: 0,
      openTickets: Number(financeRes[1].rows[0]?.count || 0),
      pendingExpenses: 0,
    },
    technician: {
      assignedUnits: Number(technicianRes[0].rows[0]?.count || 0),
      blockedUnits: Number(technicianRes[1].rows[0]?.count || 0),
      repairsAssigned: Number(technicianRes[2].rows[0]?.count || 0),
    },
    qc: {
      unitsAwaitingInspection: Number(qcRes[0].rows[0]?.count || 0),
      incomingInspections: Number(qcRes[1].rows[0]?.count || 0),
      reworkReady: Number(qcRes[2].rows[0]?.count || 0),
    },
  };

  const recentActivities = (auditRes.rows || []).map((row: any) => ({
    id: String(row.id),
    action: String(row.action),
    entity_type: String(row.entity_type),
    created_at: new Date(row.created_at).toISOString(),
    actor_name: String(row.actor_name),
  }));

  return (
    <DashboardClient
      initialRole={session?.role || "super_admin"}
      fullName={session?.fullName || "Operations User"}
      metrics={metrics}
      recentActivities={recentActivities}
    />
  );
}

