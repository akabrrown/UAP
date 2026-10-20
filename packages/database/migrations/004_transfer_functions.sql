-- UAP Phase 2 - Stock Transfer Processing Functions
-- Migration: 004_transfer_functions.sql

create or replace function inv.post_transfer_shipment(p_transfer_id uuid, p_user_id uuid)
returns void language plpgsql as $$
declare
  v_transfer record;
  v_line record;
  v_count integer;
begin
  select * into v_transfer from inv.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer not found'; end if;
  if v_transfer.status <> 'draft' then return; end if; -- idempotent

  select count(*) into v_count from inv.transfer_lines where transfer_id = p_transfer_id;
  if v_count = 0 then raise exception 'Cannot ship transfer with no lines'; end if;

  update inv.transfers
  set status = 'in_transit', shipped_at = now()
  where id = p_transfer_id;

  for v_line in select * from inv.transfer_lines where transfer_id = p_transfer_id loop
    insert into inv.stock_ledger (
      posted_at, item_id, location_id, lot_id, movement_type, qty, ref_type, ref_id, created_by
    ) values (
      now(), v_line.item_id, v_transfer.from_location_id, v_line.lot_id, 'transfer_out', -v_line.qty_sent, 'transfer', p_transfer_id, p_user_id
    );
  end loop;

  insert into core.outbox_events (topic, payload)
  values ('inventory.transfer_shipped', jsonb_build_object('transfer_id', p_transfer_id, 'shipped_by', p_user_id));
end $$;

create or replace function inv.post_transfer_receipt(p_transfer_id uuid, p_user_id uuid)
returns void language plpgsql as $$
declare
  v_transfer record;
  v_line record;
begin
  select * into v_transfer from inv.transfers where id = p_transfer_id for update;
  if not found then raise exception 'Transfer not found'; end if;
  if v_transfer.status <> 'in_transit' then return; end if; -- idempotent

  update inv.transfers
  set status = 'received', received_at = now()
  where id = p_transfer_id;

  for v_line in select * from inv.transfer_lines where transfer_id = p_transfer_id loop
    insert into inv.stock_ledger (
      posted_at, item_id, location_id, lot_id, movement_type, qty, ref_type, ref_id, created_by
    ) values (
      now(), v_line.item_id, v_transfer.to_location_id, v_line.lot_id, 'transfer_in', coalesce(v_line.qty_received, v_line.qty_sent), 'transfer', p_transfer_id, p_user_id
    );
  end loop;

  insert into core.outbox_events (topic, payload)
  values ('inventory.transfer_received', jsonb_build_object('transfer_id', p_transfer_id, 'received_by', p_user_id));
end $$;
