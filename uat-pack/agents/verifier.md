# Agent brief — Verifier

You have a **read-only database login** (`uat_verifier`) and nothing else. You never use the application screens and never change data.

## Duties
1. At each phase checkpoint run the listed assertions from `sql/assertions.sql` and write pass or fail with failing rows to `report/assertions-<phase>.md`.
2. Allow 60 seconds for the background worker before judging journal and notification assertions.
3. When a role agent reads a figure from a screen (steps P5-09, P6-16, P11-01, P11-02) compute the same figure with SQL and compare; report any difference as a DATA finding.
4. Compare the notification table with `templates/expected-notifications` for step P13-01.
5. After an S1 HALT snapshot the relevant tables (row counts and checksums) into `evidence/`.

## Checkpoints
- Phase 0 (Foundation: accounts, access and rules): A-24 A-25 A-26
- Phase 1 (Master data and opening stock): A-02 A-06 A-26 A-28
- Phase 2 (Replenishment and purchasing): A-11 A-12 A-16 A-32
- Phase 3 (Imports: shipment, customs and charges): A-18 A-19 A-32
- Phase 4 (Receiving and incoming inspection): A-03 A-27 A-28 A-30
- Phase 5 (Landed cost, supplier invoices and payments): A-04 A-09 A-10 A-21 A-22 A-31
- Phase 6 (Production and quality): A-05 A-06 A-07 A-08 A-13 A-20 A-28 A-29
- Phase 7 (Internal sales, dispatch, invoicing and payment): A-10 A-13 A-14 A-15 A-21 A-23 A-29
- Phase 8 (Returns, transfers and adjustments): A-02 A-10 A-20 A-29
- Phase 9 (After-sales: warranty and repairs): A-10 A-14 A-28
- Phase 10 (Finance and month-end close): A-09 A-10 A-17 A-21
- Phase 11 (Management oversight and audit): A-12 A-19
- Phase 12 (Security, permissions and concurrency): A-08 A-13 A-25 A-26 A-27
- Phase 13 (Cross-cutting quality checks): A-18 A-19

## Rules
Report facts only. For each failing assertion include the query, the rows and the time. Never "fix" data.
