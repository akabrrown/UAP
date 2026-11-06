-- UAP verifier assertions. Run read-only as uat_verifier. Expect 0 rows unless stated.
-- Conventions that may differ in the build are noted per assertion.

-- A-01 Ledger cannot be edited
-- expect: Update raises APPEND_ONLY (the block below errors with XX001 if the update was allowed)
do $$ begin
  if not exists (select 1 from inv.stock_ledger) then raise notice 'SKIP: ledger empty'; return; end if;
  update inv.stock_ledger set qty = qty where id = (select min(id) from inv.stock_ledger);
  raise exception 'FAIL: ledger update succeeded' using errcode = 'XX001';
exception when sqlstate 'P0001' then null; end $$;

-- A-02 Stock on hand equals the ledger
-- expect: 0 rows
select coalesce(l.item_id, v.item_id) item_id, coalesce(l.location_id, v.location_id) location_id, l.q ledger_qty, v.qty view_qty
from (select item_id, location_id, sum(qty) q from inv.stock_ledger group by 1,2) l
full join inv.v_stock_on_hand v on v.item_id = l.item_id and v.location_id = l.location_id
where coalesce(l.q,0) <> coalesce(v.qty,0);

-- A-03 Posted receipts equal ledger receipts (accepted stock)
-- expect: 0 rows
-- note: Assumes rejected quantities are written as receipt rows into the quarantine location. Opening stock uses movement type opening and is excluded.
select coalesce(l.item_id, g.item_id) item_id, l.q ledger_qty, g.a accepted_qty
from (select item_id, sum(qty) q from inv.stock_ledger
      where movement_type = 'receipt' and location_id not in (select id from core.locations where kind = 'quarantine') group by 1) l
full join (select gl.item_id, sum(gl.qty_accepted) a from proc.goods_receipt_lines gl
           join proc.goods_receipts g on g.id = gl.grn_id where g.status = 'posted' group by 1) g on g.item_id = l.item_id
where coalesce(l.q,0) <> coalesce(g.a,0);

-- A-04 Landed cost allocations equal each charge
-- expect: 0 rows
select c.id charge_id, c.charge_type, c.amount_base_minor, x.s allocated
from proc.shipment_charges c
join (select a.charge_id, sum(a.amount_minor) s from proc.landed_cost_allocations a
      join proc.landed_cost_runs r on r.id = a.run_id where r.status = 'posted' group by 1) x on x.charge_id = c.id
where x.s <> c.amount_base_minor;

-- A-05 Frozen unit cost equals live component cost (no replacements)
-- expect: 0 rows
select u.id, u.serial_no, u.cost_materials_minor, v.live_components_minor
from prod.units u join prod.v_unit_cost v on v.unit_id = u.id
where u.cost_materials_minor is not null
  and not exists (select 1 from prod.unit_components uc where uc.unit_id = u.id and uc.removed_at is not null)
  and u.cost_materials_minor <> v.live_components_minor;

-- A-06 Finished units have every mandatory BOM component in their genealogy
-- expect: 0 rows
-- note: Alternative-group substitutes are not considered; review any rows manually.
select u.id unit_id, u.serial_no, l.component_item_id
from prod.units u
join prod.assembly_orders ao on ao.id = u.ao_id
join catalog.bom_lines l on l.bom_id = ao.bom_id and not l.is_optional
left join prod.unit_components uc on uc.unit_id = u.id and uc.item_id = l.component_item_id and uc.removed_at is null
where u.status in ('in_stock','reserved','dispatched','in_service')
group by u.id, u.serial_no, l.component_item_id, l.qty
having coalesce(sum(uc.qty),0) < l.qty;

-- A-07 A final serial exists only after passed tests and an inspection
-- expect: 0 rows
select u.id, u.serial_no from prod.units u
where u.serial_no is not null
  and (not exists (select 1 from prod.qc_inspections i where i.unit_id = u.id and i.result in ('pass','conditional'))
       or exists (select 1 from unnest(array['post','burn_in']) t(tt)
                  where not exists (select 1 from prod.test_runs r where r.unit_id = u.id and r.test_type = t.tt and r.result = 'pass')));

-- A-08 Inspector never built or worked on the unit
-- expect: 0 rows
select i.id, i.unit_id, i.inspector_id from prod.qc_inspections i
where exists (select 1 from prod.units u where u.id = i.unit_id and u.built_by = i.inspector_id)
   or exists (select 1 from prod.unit_steps s where s.unit_id = i.unit_id and s.technician_id = i.inspector_id);

-- A-09 Every journal entry balances
-- expect: 0 rows
select entry_id, sum(debit_minor) d, sum(credit_minor) c from fin.journal_lines group by entry_id having sum(debit_minor) <> sum(credit_minor);

-- A-10 Posted documents have journal entries (allow 60 seconds for the worker)
-- expect: 0 rows
-- note: Assumes source_type values goods_receipt, landed_cost_run, invoice, payment; adjust to the implementation.
select 'goods_receipt' src, g.id from proc.goods_receipts g where g.status = 'posted'
  and not exists (select 1 from fin.journal_entries j where j.source_type = 'goods_receipt' and j.source_id = g.id)
union all select 'landed_cost_run', r.id from proc.landed_cost_runs r where r.status = 'posted'
  and not exists (select 1 from fin.journal_entries j where j.source_type = 'landed_cost_run' and j.source_id = r.id)
union all select 'invoice', i.id from fin.invoices i where i.status in ('issued','part_paid','paid') and i.kind <> 'proforma'
  and not exists (select 1 from fin.journal_entries j where j.source_type = 'invoice' and j.source_id = i.id)
union all select 'payment', p.id from fin.payments p where p.status = 'cleared'
  and not exists (select 1 from fin.journal_entries j where j.source_type = 'payment' and j.source_id = p.id);

-- A-11 Approvals are never self-decided and approved POs reached an approved state
-- expect: 0 rows
select id, 'self-decided' issue from core.approvals where decided_by = requested_by
union all select a.id, 'po not advanced' from core.approvals a
 where a.status = 'approved' and a.subject_type = 'purchase_order'
   and not exists (select 1 from proc.purchase_orders p where p.id = a.subject_id and p.status in ('approved','sent','confirmed','partly_received','received','closed'));

-- A-12 Every business document created has an audit insert entry
-- expect: 0 rows
select 'purchase_orders' t, count(*) missing from proc.purchase_orders p where not exists (select 1 from core.audit_log a where a.entity_type = 'proc.purchase_orders' and a.entity_id = p.id and a.action = 'insert') having count(*) > 0
union all select 'goods_receipts', count(*) from proc.goods_receipts p where not exists (select 1 from core.audit_log a where a.entity_type = 'proc.goods_receipts' and a.entity_id = p.id and a.action = 'insert') having count(*) > 0
union all select 'units', count(*) from prod.units p where not exists (select 1 from core.audit_log a where a.entity_type = 'prod.units' and a.entity_id = p.id and a.action = 'insert') having count(*) > 0
union all select 'invoices', count(*) from fin.invoices p where not exists (select 1 from core.audit_log a where a.entity_type = 'fin.invoices' and a.entity_id = p.id and a.action = 'insert') having count(*) > 0
union all select 'payments', count(*) from fin.payments p where not exists (select 1 from core.audit_log a where a.entity_type = 'fin.payments' and a.entity_id = p.id and a.action = 'insert') having count(*) > 0;

-- A-13 At most one active reservation per unit
-- expect: 0 rows
select unit_id, count(*) from inv.reservations where status = 'active' and unit_id is not null group by 1 having count(*) > 1;

-- A-14 Warranty starts at handover and has the right length
-- expect: 0 rows
-- note: Confirm the end-date convention (same day or one day earlier) before treating differences as defects.
select w.id, w.unit_id, w.starts_on, d.received_at::date handover_on, w.ends_on
from svc.warranties w join sales.dispatches d on d.id = w.dispatch_id
where w.starts_on <> d.received_at::date or w.ends_on <> (w.starts_on + make_interval(months => w.months))::date;

-- A-15 Every delivered unit has a warranty
-- expect: 0 rows
select u.id, u.serial_no from prod.units u
where u.status in ('dispatched','in_service')
  and exists (select 1 from sales.dispatch_lines dl join sales.dispatches d on d.id = dl.dispatch_id where dl.unit_id = u.id and d.status = 'delivered')
  and not exists (select 1 from svc.warranties w where w.unit_id = u.id);

-- A-16 Document numbers have no gaps
-- expect: 0 rows
-- note: A cancelled document keeps its number, so counts should still equal the maximum.
select s, yr, n, mx from (
  select 'PO' s, split_part(po_no,'-',2) yr, count(*) n, max(split_part(po_no,'-',3)::int) mx from proc.purchase_orders where po_no ~ '^PO-[0-9]{4}-[0-9]{6}$' group by 2
  union all select 'GRN', split_part(grn_no,'-',2), count(*), max(split_part(grn_no,'-',3)::int) from proc.goods_receipts where grn_no ~ '^GRN-[0-9]{4}-[0-9]{6}$' group by 2
  union all select 'INV', split_part(invoice_no,'-',2), count(*), max(split_part(invoice_no,'-',3)::int) from fin.invoices where invoice_no ~ '^INV-[0-9]{4}-[0-9]{6}$' group by 2
  union all select 'PAY', split_part(payment_no,'-',2), count(*), max(split_part(payment_no,'-',3)::int) from fin.payments where payment_no ~ '^PAY-[0-9]{4}-[0-9]{6}$' group by 2
  union all select 'AO', split_part(ao_no,'-',2), count(*), max(split_part(ao_no,'-',3)::int) from prod.assembly_orders where ao_no ~ '^AO-[0-9]{4}-[0-9]{6}$' group by 2
) t where n <> mx;

-- A-17 Closed periods reject postings
-- expect: Block completes without FAIL
do $$ declare p uuid; begin
  select id into p from fin.fiscal_periods where status = 'closed' limit 1;
  if p is null then raise notice 'SKIP: no closed period yet'; return; end if;
  insert into fin.journal_entries(entry_date, period_id, source_type) select starts_on, p, 'uat' from fin.fiscal_periods where id = p;
  raise exception 'FAIL: posting into a closed period succeeded' using errcode = 'XX001';
exception when sqlstate 'P0001' then null; end $$;

-- A-18 Notifications received by a user since a time (compare with the expected list)
-- expect: Matches the expected notification table for the step
-- note: psql variables: -v uid=... -v since=...
select template_key, title, status, created_at from core.notifications
where user_id = :'uid' and created_at >= :'since'::timestamptz order by created_at;

-- A-19 No stuck outbox events
-- expect: 0 rows
select id, topic, attempts, last_error from core.outbox_events where processed_at is null and created_at < now() - interval '5 minutes';

-- A-20 Finished-goods ledger equals units in stock or reserved
-- expect: 0 rows
select i.id item_id, l.q ledger_qty, c.n units_count from catalog.items i
left join (select item_id, sum(qty) q from inv.stock_ledger group by 1) l on l.item_id = i.id
left join (select item_id, count(*) n from prod.units where status in ('in_stock','reserved') group by 1) c on c.item_id = i.id
where i.kind = 'finished_good' and coalesce(l.q,0) <> coalesce(c.n,0);

-- A-21 Payments never exceed invoices and statuses agree
-- expect: 0 rows
select i.id, i.invoice_no, i.total_minor, coalesce(sum(pa.amount_minor),0) paid, i.status
from fin.invoices i left join fin.payment_allocations pa on pa.invoice_id = i.id
where i.kind <> 'proforma' group by i.id
having coalesce(sum(pa.amount_minor),0) > i.total_minor
    or (i.status = 'paid' and coalesce(sum(pa.amount_minor),0) < i.total_minor)
    or (i.status = 'issued' and coalesce(sum(pa.amount_minor),0) > 0);

-- A-22 No supplier payments while a bank change was pending
-- expect: 0 rows
select p.id payment_id, p.party_id supplier_id, b.id bank_change_id
from fin.payments p join proc.supplier_bank_changes b on b.supplier_id = p.party_id
where p.party_type = 'supplier' and p.direction = 'out' and p.created_at >= b.created_at and (b.applied_at is null or p.created_at < b.applied_at);

-- A-23 Invoice prices equal order snapshots
-- expect: 0 rows
select il.id, il.unit_price_minor invoice_price, ol.unit_price_minor order_price
from fin.invoice_lines il join fin.invoices i on i.id = il.invoice_id and i.kind in ('proforma','tax_invoice')
join sales.internal_order_lines ol on ol.order_id = i.order_id and ol.item_id = il.item_id
where il.unit_price_minor <> ol.unit_price_minor;

-- A-24 Role templates carry exactly the expected scopes
-- expect: Matches scopes_expected.json
-- note: Compare output with uat-pack/seed/scopes_expected.json.
select code, (select array_agg(s order by s) from unnest(default_scopes) s) scopes from core.roles order by code;

-- A-25 Row-level security hides data from the wrong role
-- expect: 0 rows for forbidden tables
-- note: Change the claims to each role’s scopes and the forbidden tables accordingly.
begin;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","staff_status":"active","scopes":["production.work","tests.record","service.work"]}', true);
select 'journal visible to technician' issue where exists (select 1 from fin.journal_entries)
union all select 'invoices visible to technician' where exists (select 1 from fin.invoices)
union all select 'suppliers visible to technician' where exists (select 1 from proc.suppliers);
rollback;

-- A-26 Encrypted columns are unreadable by browser roles
-- expect: Block completes without FAIL
do $$ begin
  set local role authenticated;
  perform bank_details_enc from proc.suppliers limit 1;
  reset role;
  raise exception 'FAIL: encrypted column readable' using errcode = 'XX001';
exception when insufficient_privilege then null; end $$;

-- A-27 No duplicate ledger rows from retries
-- expect: 0 rows
-- note: Review hits: two identical lines for the same item and lot on one document can be legitimate.
select ref_type, ref_id, item_id, movement_type, location_id, coalesce(lot_id::text,'') lot, coalesce(component_serial_id::text,'') serial, count(*)
from inv.stock_ledger where ref_id is not null group by 1,2,3,4,5,6,7 having count(*) > 1;

-- A-28 A component serial is installed in at most one unit
-- expect: 0 rows
select component_serial_id, count(*) from prod.unit_components where component_serial_id is not null and removed_at is null group by 1 having count(*) > 1;

-- A-29 Unit status agrees with reservations and dispatches
-- expect: 0 rows
select u.id, u.status, 'reserved without reservation' issue from prod.units u
where u.status = 'reserved' and not exists (select 1 from inv.reservations r where r.unit_id = u.id and r.status = 'active')
union all select u.id, u.status, 'dispatched without dispatch line' from prod.units u
where u.status = 'dispatched' and not exists (select 1 from sales.dispatch_lines dl where dl.unit_id = u.id);

-- A-30 No PO line received more than 5% over order
-- expect: 0 rows
select po_line_id, qty_ordered, qty_received from proc.v_po_line_status where qty_received > qty_ordered * 1.05;

-- A-31 Lot cost equals receipt line landed cost
-- expect: 0 rows
select lo.id lot_id, lo.unit_landed_cost_minor, gl.landed_unit_cost_minor
from inv.lots lo join proc.goods_receipt_lines gl on gl.id = lo.grn_line_id
where gl.landed_unit_cost_minor is not null and lo.unit_landed_cost_minor is distinct from gl.landed_unit_cost_minor;

-- A-32 Foreign-currency documents carry an exchange rate
-- expect: 0 rows
select 'po' t, id from proc.purchase_orders where currency <> 'GHS' and (fx_rate is null or fx_rate <= 0)
union all select 'payment', id from fin.payments where currency <> 'GHS' and (fx_rate is null or fx_rate <= 0)
union all select 'charge', id from proc.shipment_charges where currency <> 'GHS' and (fx_rate is null or fx_rate <= 0);
