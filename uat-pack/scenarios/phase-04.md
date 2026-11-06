# Phase 4 — Receiving and incoming inspection

**Goal:** Receive goods with serials and lots, reject a defective item, inspect, post, and recover value from the supplier.

**Opens when:** Goods receipt drafts exist from P3-09 and P3-10; local PO from P2-08 confirmed.

**Checkpoint assertions:** A-03 A-27 A-28 A-30

## P4-01 — IS
**Does:** From the home widget open the expected receipt. Scan items and enter quantities; short-ship one line by one unit.

**Expected:** Scan adds or increments lines; unknown barcode shows Not found; item not on PO shows Not on this PO with confirm.

**Refs:** FR-IN-02

## P4-02 (smoke) — IS
**Does:** Capture serials for CPU, motherboard, RAM and SSD lines. Try a duplicate serial, then a wrong count.

**Expected:** Duplicate refused with link to the existing record; Post receipt stays disabled until counts match.

**Refs:** FR-IN-04 FR-IN-02 A-28

## P4-03 — IS
**Does:** Mark one SSD as rejected (dead on arrival) with reason and photo. Press Request inspection for lines whose items require it.

**Expected:** Reject quantity recorded; receipt status inspecting; Quality Inspector notified.

**Refs:** FR-IN-02 FR-IN-03

## P4-04 — QI
**Does:** Open Incoming inspections, inspect the CPU line (Accept) and the SSD line (Reject with defect code).

**Expected:** Accept releases the line; Reject keeps the quantity as rejected; Inventory notified.

**Refs:** FR-IN-03 FR-QC-05

## P4-05 (smoke) — IS
**Does:** Press Post receipt and read the confirmation.

**Expected:** Confirmation lists rows to be written. After posting: accepted goods in warehouse, rejected SSD in quarantine, lots and serials created, PO and shipment quantities updated, variance banner shown, Procurement and Finance notified.

**Refs:** FR-IN-01 FR-IN-02 A-03 A-27

## P4-06 — IS
**Does:** In a second browser tab press Post receipt again on the same receipt (and double-click once).

**Expected:** Second attempt shows “Already posted”; ledger rows are not duplicated.

**Refs:** FR-IN-02 A-27

## P4-07 — PI
**Does:** On the posted receipt press Open supplier RMA for the rejected SSD; submit to supplier, record authorisation, mark shipped, record credit note.

**Expected:** RMA moves through states; stock leaves quarantine on Mark shipped; credit recorded.

**Refs:** FR-PR-05

## P4-08 — IS
**Does:** Receive the local PO from supplier 2 (no shipment) and post it.

**Expected:** Receipt posts without a shipment; lots recorded; PO received.

**Refs:** FR-IN-02

## P4-09 — PI
**Does:** Check PO status for the short-shipped line; use Close short with a reason.

**Expected:** PO status partly_received then closed short; remaining quantity cancelled; audit entry present.

**Refs:** FR-PR-03 A-30
