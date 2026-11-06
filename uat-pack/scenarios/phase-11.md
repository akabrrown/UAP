# Phase 11 — Management oversight and audit

**Goal:** Confirm what Management sees equals what happened, and that every action is traceable.

**Opens when:** Phases 1 to 10 complete.

**Checkpoint assertions:** A-12 A-19

## P11-01 — MG
**Does:** Open the home dashboard and read every widget; click each to its destination.

**Expected:** Counts equal the Verifier’s queries; every link opens the right filtered page.

**Refs:** FR-RP-01

## P11-02 — MG
**Does:** Run margin per model, supplier performance, warranty exposure, receivables ageing and VAT summary; export each.

**Expected:** Totals reconcile to the database; exports open correctly and use the same filters.

**Refs:** FR-RP-02 FR-RP-03 FR-FN-08

## P11-03 — MG SA
**Does:** Pick ten random actions from the run log and find each in /admin/audit.

**Expected:** Each exists with actor, time and before/after values; encrypted fields never appear.

**Refs:** FR-ID-04 A-12

## P11-04 — SA
**Does:** Open /admin/jobs and review failed jobs and outbox backlog; export the audit log.

**Expected:** No failed or stuck jobs; export contains the run’s entries; the export itself is logged.

**Refs:** FR-ID-04 A-19
