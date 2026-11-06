-- STAGING ONLY. Test approval limits (minor units; GHS pesewas). Applied by the Super Admin in P0-04 through the UI;
-- this script is the Verifier's reference to check what the UI saved.
select action_type, min_amount_minor, approver_role_code, sla_hours from core.approval_rules order by action_type;
-- Expected after P0-04:
--   po 5000000 | requisition 2000000 | stock_writeoff 100000 | discount (5 percent rule) | expense 50000 |
--   supplier payment 3000000 | supplier_bank 0 | period_close 0
