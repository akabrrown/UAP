# Phase 8 — Returns, transfers and adjustments

**Goal:** Handle returns, movements between locations and write-offs under approval rules.

**Opens when:** Dispatched units and stock exist.

**Checkpoint assertions:** A-02 A-10 A-20 A-29

## P8-01 — IS MG FS
**Does:** IS creates a return for one dispatched unit and submits; MG approves; IS receives it by scan and records the condition as damaged; FS creates the credit note.

**Expected:** Return requested, approved, received into quarantine; credit note linked to the invoice; journals post.

**Refs:** FR-SL-05 FR-FN-01

## P8-02 — IS
**Does:** Transfer 2 components from the main warehouse to the repair bench; ship; receive with one missing.

**Expected:** Transfer in_transit then received; shortfall asks for a reason and offers Create adjustment.

**Refs:** FR-IN-07

## P8-03 — IS MG
**Does:** IS submits a write-off above 1,000 (MG approves) and one below 1,000.

**Expected:** Above limit: pending_approval then posted after MG; below limit: posted immediately; ledger and journals correct.

**Refs:** FR-IN-08 FR-ID-05

## P8-04 — IS QI
**Does:** Run a cycle count of the finished-goods location with QI as witness.

**Expected:** Count matches system; accuracy figure recorded; no adjustment needed.

**Refs:** FR-IN-09
