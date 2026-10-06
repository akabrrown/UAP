export const SCOPES = [
  'catalog.read', 'catalog.write', 'bom.write', 'bom.approve', 'pricing.write',
  'suppliers.write', 'supplier.bank.write', 'supplier.bank.approve',
  'procurement.write', 'procurement.approve', 'imports.write', 'landedcost.post', 'rma.write',
  'inventory.read', 'inventory.receive', 'inventory.issue', 'inventory.adjust', 'inventory.adjust.approve', 'count.run',
  'production.plan', 'production.work', 'tests.record', 'licence.view', 'qc.inspect', 'qc.override',
  'orders.read', 'orders.write', 'orders.approve', 'dispatch.write', 'returns.approve',
  'invoices.write', 'payments.write', 'payments.approve', 'expenses.submit', 'expenses.approve', 'budgets.write',
  'gl.read', 'gl.post_manual', 'gl.close_period',
  'warranty.read', 'warranty.override', 'service.write', 'service.work', 'service.approve',
  'reports.read', 'audit.read', 'data.import',
  'users.manage', 'roles.manage', 'settings.write', 'api_clients.manage',
] as const;

export type Scope = (typeof SCOPES)[number];

export const ROLE_CODES = ['super_admin', 'management', 'procurement_imports', 'inventory_sales', 'finance_service', 'assembly_technician', 'qc_inspector'] as const;
export type RoleCode = (typeof ROLE_CODES)[number];

export function isScope(value: string): value is Scope {
  return (SCOPES as readonly string[]).includes(value);
}
