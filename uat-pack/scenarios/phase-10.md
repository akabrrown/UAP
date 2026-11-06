# Phase 10 — Finance and month-end close

**Goal:** Expenses, budgets, manual journals, reconciliation, period close, closed-period enforcement and export.

**Opens when:** Invoices, payments and receipts posted.

**Checkpoint assertions:** A-09 A-10 A-17 A-21

## P10-01 — AT1 IS MG FS
**Does:** AT1 submits a small expense (below 500); IS submits one above 500; MG approves the second; FS marks both paid.

**Expected:** Below limit approves immediately; above limit pending then approved; paid links a payment; AT1 sees only own expenses.

**Refs:** FR-FN-03 FR-ID-05

## P10-02 — MG FS
**Does:** Set a budget for a cost centre; open budget versus actual and drill into the lines behind a figure.

**Expected:** Actual equals the ledger lines; drill-down lists the entries.

**Refs:** FR-FN-04

## P10-03 — FS
**Does:** Create a manual journal that does not balance, then a balanced one; reverse it.

**Expected:** Save is disabled while unbalanced; balanced entry posts; reversal posts in the current period.

**Refs:** FR-FN-05 A-09

## P10-04 — FS
**Does:** Record a receipt without allocating; confirm it appears under Unallocated; allocate it.

**Expected:** Unallocated list shows it, then clears after allocation.

**Refs:** FR-FN-02

## P10-05 (smoke) — FS MG
**Does:** Leave one supplier invoice in draft. Open the close checklist, see it fail, fix the item, Request close; MG approves.

**Expected:** Checklist names the failing check with owner and link; after fix it passes; period closes after MG approval; all stock and finance users notified.

**Refs:** FR-FN-05 FR-ID-05

## P10-06 — FS
**Does:** Try to issue an invoice dated inside the closed period.

**Expected:** Blocked with “accounting period is closed”; no entry created.

**Refs:** FR-FN-05 A-17

## P10-07 — FS
**Does:** Export journals, invoices and payments for the period.

**Expected:** Files download; Verifier’s totals match the database exactly.

**Refs:** FR-FN-07

## P10-08 — FS MG
**Does:** Request reopen with a reason; MG approves; make a correction; close again.

**Expected:** Period open then closed; the whole sequence is audited.

**Refs:** FR-FN-05 FR-ID-04
