-- UAP Phase 2 - 8 Missing Planned Functions from Section 7.1
-- Migration: 003_functions.sql

-- 1. inv.post_goods_receipt
create or replace function inv.post_goods_receipt(p_grn_id uuid, p_user_id uuid)
returns void language plpgsql as $$
declare
  v_grn record;
  v_line record;
  v_po_status text;
begin
  select * into v_grn from proc.goods_receipts where id = p_grn_id for update;
  if not found then raise exception 'GRN not found'; end if;
  if v_grn.status <> 'draft' then return; end if; -- idempotent

  -- Set status to posted
  update proc.goods_receipts set status = 'posted', posted_at = now() where id = p_grn_id;

  for v_line in select * from proc.goods_receipt_lines where grn_id = p_grn_id loop
    if v_line.qty_accepted > 0 then
      insert into inv.stock_ledger (
        posted_at, item_id, location_id, movement_type, qty, ref_type, ref_id, created_by
      ) values (
        now(), v_line.item_id, v_grn.location_id, 'receipt', v_line.qty_accepted, 'goods_receipt', p_grn_id, p_user_id
      );
    end if;
  end loop;

  if v_grn.po_id is not null then
    select case when count(*) = 0 then 'received' else 'partly_received' end into v_po_status
    from proc.purchase_order_lines pol
    left join (
      select po_line_id, sum(qty_accepted) as total_accepted 
      from proc.goods_receipt_lines grl
      join proc.goods_receipts g on g.id = grl.grn_id
      where g.status = 'posted'
      group by po_line_id
    ) rec on rec.po_line_id = pol.id
    where pol.po_id = v_grn.po_id and (rec.total_accepted is null or rec.total_accepted < pol.qty);

    update proc.purchase_orders set status = v_po_status where id = v_grn.po_id;
  end if;
end $$;

-- 2. inv.reserve_units
create or replace function inv.reserve_units(p_order_line_id uuid, p_qty numeric)
returns void language plpgsql as $$
declare
  v_line record;
  v_unit record;
  v_reserved numeric := 0;
begin
  select * into v_line from sales.internal_order_lines where id = p_order_line_id;
  if not found then raise exception 'Order line not found'; end if;

  for v_unit in 
    select id from prod.units 
    where item_id = v_line.item_id and status = 'in_stock' 
    for update skip locked 
    limit p_qty
  loop
    insert into inv.reservations (item_id, unit_id, qty, ref_type, ref_id)
    values (v_line.item_id, v_unit.id, 1, 'internal_order', p_order_line_id);
    
    update prod.units set status = 'reserved' where id = v_unit.id;
    v_reserved := v_reserved + 1;
  end loop;

  if v_reserved < p_qty then
    raise exception 'UNIT_UNAVAILABLE';
  end if;
end $$;

-- 3. prod.release_assembly_order
create or replace function prod.release_assembly_order(p_ao_id uuid)
returns void language plpgsql as $$
declare
  v_ao record;
  v_line record;
  i integer;
begin
  select * into v_ao from prod.assembly_orders where id = p_ao_id for update;
  if not found then raise exception 'AO not found'; end if;
  if v_ao.status <> 'draft' and v_ao.status <> 'planned' then return; end if;
  
  for v_line in select * from catalog.bom_lines where bom_id = v_ao.bom_id loop
    insert into prod.assembly_order_materials (ao_id, item_id, qty_required, alt_group, notes)
    values (p_ao_id, v_line.component_item_id, v_line.qty * v_ao.qty_planned, v_line.alt_group, v_line.notes);
  end loop;

  for i in 1..v_ao.qty_planned loop
    insert into prod.units (internal_ref, item_id, ao_id, status)
    values ('AO-' || p_ao_id || '-' || i, v_ao.item_id, p_ao_id, 'planned');
  end loop;

  update prod.assembly_orders set status = 'released' where id = p_ao_id;
end $$;

-- 4. prod.issue_materials
create or replace function prod.issue_materials(p_issue_id uuid)
returns void language plpgsql as $$
declare
  v_issue record;
  v_line record;
begin
  select * into v_issue from prod.material_issues where id = p_issue_id for update;
  if not found then raise exception 'Issue not found'; end if;
  if v_issue.status <> 'draft' then return; end if;

  update prod.material_issues set status = 'posted' where id = p_issue_id;

  for v_line in select * from prod.material_issue_lines where issue_id = p_issue_id loop
    insert into inv.stock_ledger (posted_at, item_id, location_id, lot_id, component_serial_id, movement_type, qty, ref_type, ref_id, created_by)
    values (now(), v_line.item_id, v_issue.from_location_id, v_line.lot_id, v_line.component_serial_id, 'issue_production', -v_line.qty, 'material_issue', p_issue_id, v_issue.issued_by);
    
    if v_issue.to_location_id is not null then
      insert into inv.stock_ledger (posted_at, item_id, location_id, lot_id, component_serial_id, movement_type, qty, ref_type, ref_id, created_by)
      values (now(), v_line.item_id, v_issue.to_location_id, v_line.lot_id, v_line.component_serial_id, 'receipt', v_line.qty, 'material_issue', p_issue_id, v_issue.issued_by);
    end if;

    if v_line.component_serial_id is not null then
      update inv.component_serials set status = 'issued', location_id = v_issue.to_location_id where id = v_line.component_serial_id;
    end if;
  end loop;
end $$;

-- 5. sales.dispatch_order
create or replace function sales.dispatch_order(p_dispatch_id uuid, p_user_id uuid)
returns void language plpgsql as $$
declare
  v_dispatch record;
  v_line record;
begin
  select * into v_dispatch from sales.dispatches where id = p_dispatch_id for update;
  if not found then raise exception 'Dispatch not found'; end if;
  if v_dispatch.status <> 'draft' then return; end if;

  update sales.dispatches set status = 'dispatched', dispatched_at = now(), dispatched_by = p_user_id where id = p_dispatch_id;

  for v_line in select * from sales.dispatch_lines where dispatch_id = p_dispatch_id loop
    insert into inv.stock_ledger (posted_at, item_id, location_id, lot_id, unit_id, movement_type, qty, ref_type, ref_id, created_by)
    values (now(), v_line.item_id, v_dispatch.from_location_id, v_line.lot_id, v_line.unit_id, 'dispatch', -v_line.qty, 'dispatch', p_dispatch_id, p_user_id);

    if v_line.unit_id is not null then
      update prod.units set status = 'dispatched' where id = v_line.unit_id;
    end if;
  end loop;
  
  insert into core.outbox_events (topic, payload) values ('sales.dispatched', jsonb_build_object('dispatch_id', p_dispatch_id));
end $$;

-- 6. sales.confirm_handover
create or replace function sales.confirm_handover(
  p_dispatch_id uuid, 
  p_recipient text, 
  p_signature_id uuid
)
returns void language plpgsql as $$
declare
  v_dispatch record;
  v_line record;
  v_unit prod.units%ROWTYPE;
begin
  select * into v_dispatch from sales.dispatches where id = p_dispatch_id for update;
  if not found then raise exception 'Dispatch not found'; end if;
  if v_dispatch.status = 'delivered' then return; end if;

  update sales.dispatches 
  set status = 'delivered', 
      received_by_name = p_recipient, 
      signature_attachment_id = p_signature_id,
      received_at = now()
  where id = p_dispatch_id;

  for v_line in select * from sales.dispatch_lines where dispatch_id = p_dispatch_id and unit_id is not null loop
    select * into v_unit from prod.units where id = v_line.unit_id;
    
    insert into svc.warranties (unit_id, account_id, order_id, dispatch_id, starts_on, ends_on, months, status)
    values (
      v_line.unit_id, 
      (select account_id from sales.internal_orders where id = v_dispatch.order_id), 
      v_dispatch.order_id, 
      p_dispatch_id, 
      now()::date, 
      (now() + (coalesce(v_unit.warranty_months, 12) || ' months')::interval)::date, 
      coalesce(v_unit.warranty_months, 12), 
      'active'
    );
    
    update prod.units set status = 'in_service' where id = v_line.unit_id;
  end loop;
end $$;

-- 7. svc.consume_part
create or replace function svc.consume_part(
  p_ticket_id uuid, 
  p_item_id uuid, 
  p_serial_id uuid, 
  p_lot_id uuid, 
  p_qty numeric,
  p_replaced_component_id uuid,
  p_user_id uuid
)
returns void language plpgsql as $$
declare
  v_ticket record;
begin
  select * into v_ticket from svc.service_tickets where id = p_ticket_id;
  if not found then raise exception 'Ticket not found'; end if;

  insert into svc.service_parts (ticket_id, item_id, component_serial_id, lot_id, qty, unit_cost_minor, covered_by, replaced_component_id)
  values (p_ticket_id, p_item_id, p_serial_id, p_lot_id, p_qty, 0, 'warranty', p_replaced_component_id);
  
  if p_replaced_component_id is not null then
    update prod.unit_components set removed_at = now(), removed_reason = 'service_replacement' where id = p_replaced_component_id;
    
    insert into prod.unit_components (unit_id, item_id, component_serial_id, lot_id, qty, unit_cost_minor, installed_by, ticket_id)
    values (v_ticket.unit_id, p_item_id, p_serial_id, p_lot_id, p_qty, 0, p_user_id, p_ticket_id);
  end if;
  
  if p_serial_id is not null then
    update inv.component_serials set status = 'installed' where id = p_serial_id;
  end if;
end $$;

-- 8. fin.post_event
create or replace function fin.post_event(p_topic text, p_payload jsonb)
returns void language plpgsql as $$
declare
  v_entry_id uuid;
  v_period_id uuid;
begin
  select id into v_period_id from fin.fiscal_periods where status = 'open' and starts_on <= now()::date and ends_on >= now()::date limit 1;
  
  if v_period_id is null then
    return;
  end if;

  insert into fin.journal_entries (entry_date, period_id, source_type, source_event, memo)
  values (now()::date, v_period_id, 'outbox_event', p_topic, 'Auto-posted from ' || p_topic)
  returning id into v_entry_id;
end $$;
