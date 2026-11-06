# Phase 9 — After-sales: warranty and repairs

**Goal:** Run covered, billable and goodwill repairs, supplier recovery and warranty administration.

**Opens when:** Delivered units with active warranties (P7).

**Checkpoint assertions:** A-10 A-14 A-28

## P9-01 (smoke) — FS
**Does:** Scan a delivered unit’s serial in the warranty register; read status, genealogy and supplier coverage; press Open ticket; assign to AT1.

**Expected:** Warranty active with correct dates; coverage shown per component; ticket received with SLA; AT1 notified.

**Refs:** FR-WR-01 FR-WR-02 FR-WR-03

## P9-02 — AT1
**Does:** Open the ticket: Start diagnosis, save diagnosis (faulty SSD, covered), Add part by scan, Consume parts, Start repair, Retest and record tests.

**Expected:** Ledger service-consume row; genealogy closes the old SSD and links the new one to the ticket; tests recorded.

**Refs:** FR-WR-03 FR-PD-09 A-28

## P9-03 — QI
**Does:** Retest the repaired unit where required and record a pass.

**Expected:** Ticket allows Mark ready for collection after pass.

**Refs:** FR-WR-03

## P9-04 (smoke) — FS
**Does:** Mark ready for collection, then Record collection.

**Expected:** Email to the account contact; ticket closed; covered repair posts at zero charge with cost captured; journals post.

**Refs:** FR-WR-03 FR-WR-04 A-10

## P9-05 — FS PI
**Does:** Open supplier RMA from the repaired ticket (faulty SSD within supplier warranty) and take it through to credit.

**Expected:** RMA linked to ticket; credit recorded.

**Refs:** FR-WR-05 FR-PR-05

## P9-06 — FS AT1
**Does:** Orchestrator backdates another unit’s warranty so it is expired. FS opens a ticket; the system shows expired; FS sets not covered, creates a quote, sends it, records approval; AT1 repairs; FS collects and invoices.

**Expected:** Billable path: quote PDF and email; approval recorded; repair; invoice created from the ticket.

**Refs:** FR-WR-03 FR-WR-04

## P9-07 — FS MG
**Does:** FS requests goodwill cover on a third expired unit; MG approves from the inbox.

**Expected:** Approval recorded; coverage goodwill; repair proceeds at zero charge.

**Refs:** FR-WR-04 FR-ID-05

## P9-08 — FS
**Does:** Open a ticket for a non-UPSA device (description and serial typed in) and run it as a paid repair.

**Expected:** Ticket works without genealogy; invoice produced.

**Refs:** FR-WR-03

## P9-09 — MG
**Does:** Extend one warranty with a reason; void another.

**Expected:** End date moves or status void; both audited; lookup reflects the change.

**Refs:** FR-WR-01

## P9-10 — FS MG
**Does:** Orchestrator advances the clock past an open ticket’s SLA.

**Expected:** SLA at-risk then breached notifications reach FS and MG once each.

**Refs:** FR-WR-03 FR-NT-01 A-18
