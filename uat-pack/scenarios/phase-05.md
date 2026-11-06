# Phase 5 — Landed cost, supplier invoices and payments

**Goal:** Allocate import costs to stock, pay the supplier under the approval and bank-change rules, and close the shipment.

**Opens when:** Receipts for the shipment posted (P4-05); charges are actual.

**Checkpoint assertions:** A-04 A-09 A-10 A-21 A-22 A-31

## P5-01 — PI
**Does:** On the shipment press Run landed cost. In the draft change the local transport basis to weight (no weights recorded) and press Recalculate; then change it to value.

**Expected:** Weight basis without weights shows an error naming the charge; value basis allocates; table shows share, added cost, new unit cost and effect on average cost.

**Refs:** FR-IM-06

## P5-02 (smoke) — PI
**Does:** Press Post landed cost and read the confirmation.

**Expected:** Lot and unit costs update; cost history appended; run status posted; FS and MG notified; allocations equal each charge exactly.

**Refs:** FR-IM-06 A-04 A-31

## P5-03 — FS
**Does:** Open the item stock detail for the SSD and its cost history tab; later open the journal.

**Expected:** Cost history shows the landed-cost event; within 60 seconds journal entries for the receipt and the landed cost exist and balance.

**Refs:** FR-IN-05 FR-FN-05 A-09 A-10

## P5-04 — FS
**Does:** Create a supplier invoice (supplier 1) from the shipment, Run match with a deliberate price difference on one line, then Approve for payment.

**Expected:** Variance flagged; approval for payment goes to Management; after MG approves, status approved.

**Refs:** FR-PR-04 FR-ID-05

## P5-05 — FS MG
**Does:** FS tries Record payment before the bank change from P2-10 is approved (if still pending), then after approval records the payment above the 30,000 limit; MG approves.

**Expected:** Before approval: blocked with the bank-change message. After: payment goes to Management, then clears; journals post; supplier invoice paid.

**Refs:** FR-FN-02 A-21 A-22

## P5-06 — FS
**Does:** Record a cash payment to supplier 2 below the limit.

**Expected:** Payment clears immediately; journal entry exists.

**Refs:** FR-FN-02 A-10

## P5-07 — PI
**Does:** Press Close shipment. Expect it to be refused first (a required document or an estimated charge remains); fix and close.

**Expected:** First attempt disabled or refused with the reason; after fixing, the shipment closes.

**Refs:** FR-IM-07

## P5-08 — PI FS
**Does:** Reverse the landed-cost run (reason), check costs restore, run and post again.

**Expected:** Reversal restores prior costs; second run posts; cost history shows three events; journals balance.

**Refs:** FR-IM-06 A-04 A-09

## P5-09 — MG
**Does:** Open the landed cost versus estimate report and the shipment status report.

**Expected:** Figures match recorded charges and allocations (Verifier checks).

**Refs:** FR-RP-02 FR-IM-08
