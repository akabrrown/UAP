-- STAGING ONLY. Run after Phase 1 (needs items, locations and one profile). Adds volume for P13-05 without changing balances.
insert into inv.stock_ledger(posted_at, item_id, location_id, movement_type, qty, unit_cost_minor, ref_type)
select now() - (g || ' minutes')::interval,
       (select id from catalog.items order by sku limit 1),
       (select id from core.locations where code = 'WH-MAIN'),
       'adjustment', 0, 100, 'uat_volume'
from generate_series(1, 500000) g;
insert into core.notifications(user_id, channel, template_key, title, status)
select (select id from core.profiles order by created_at limit 1), 'in_app', 'uat_volume', 'Volume row ' || g, 'read'
from generate_series(1, 20000) g;
analyze;
