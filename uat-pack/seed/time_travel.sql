-- STAGING ONLY. Run by the Orchestrator through the service role between steps. Never run in production.
-- 1. Move the app clock (the build must read core.settings key 'uat_clock_offset_days' through one function).
insert into core.settings(key, value, description) values ('uat_clock_offset_days', '0', 'UAT clock offset')
on conflict (key) do update set value = excluded.value;
--   update core.settings set value = '9' where key = 'uat_clock_offset_days';          -- P3-06 (+9 days)
-- 2. Make a warranty expired (P9-06):
--   update svc.warranties set starts_on = starts_on - 400, ends_on = ends_on - 400, status = 'expired' where unit_id = :'unit_id';
-- 3. Push a shipment arrival back to start demurrage (P3-06 fallback when the clock offset is not honoured):
--   update proc.shipments set ata = ata - 9, free_days_start = free_days_start - 9 where id = :'shipment_id';
-- 4. Breach a ticket SLA (P9-10):
--   update svc.service_tickets set sla_due_at = now() - interval '1 hour' where id = :'ticket_id';
-- Every change is audited by the normal triggers; record each one in the run log as an ORCH-ASSIST action.
