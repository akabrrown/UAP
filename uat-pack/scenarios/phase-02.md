# Phase 2 — Replenishment and purchasing

**Goal:** Run reorder to requisition to approved and sent purchase orders, including edge cases.

**Opens when:** Opening stock posted; suppliers 1 and 2 active; reorder policies set.

**Checkpoint assertions:** A-11 A-12 A-16 A-32

## P2-01 (smoke) — IS
**Does:** From the home widget open Reorder suggestions, select the below-minimum rows and press Create requisition from selected.

**Expected:** Requisition draft with source reorder and lines prefilled.

**Refs:** FR-IN-10 FR-PR-02

## P2-02 — IS
**Does:** Open the requisition and press Submit (value above 20,000).

**Expected:** Status submitted; Management notified in-app.

**Refs:** FR-PR-02 FR-ID-05

## P2-03 (smoke) — MG
**Does:** Approvals inbox › open › Approve.

**Expected:** Requisition approved; Procurement notified; Convert to PO becomes available to PI.

**Refs:** FR-ID-06

## P2-04 (smoke) — PI
**Does:** Open the requisition and press Convert to PO. Choose supplier 1 (USD). First change currency to EUR to test the missing-rate prompt, then return to USD. Save draft and Submit for approval.

**Expected:** EUR shows “No rate for EUR on [date]”; USD fills the rate automatically; PO status pending_approval (above 50,000); Management notified.

**Refs:** FR-PR-03 FR-FN-06

## P2-05 — MG
**Does:** Approve the PO from the inbox.

**Expected:** PO approved; PI notified.

**Refs:** FR-PR-03

## P2-06 (smoke) — PI
**Does:** Press Send to supplier, then Record confirmation with supplier reference and dates.

**Expected:** PDF generated and emailed to the supplier in the mail sink; status sent then confirmed; PDF shows PO number, supplier, lines, totals, incoterm.

**Refs:** FR-PR-03 FR-NT-01

## P2-07 — PI MG
**Does:** PI presses Amend on the PO (increase one line) and submits; MG approves; PI resends.

**Expected:** New version created; approval requested again; resend emails the new PDF; version history visible.

**Refs:** FR-PR-03 FR-ID-05

## P2-08 — PI
**Does:** Create a small PO to supplier 2 (local, GHS, below limit) for packaging boxes; Submit; Send; Confirm.

**Expected:** Submit approves immediately (no Management step); sent and confirmed.

**Refs:** FR-PR-03 FR-ID-05

## P2-09 — PI
**Does:** Try to create a PO for supplier 3 (still pending verification).

**Expected:** Blocked with a message that the supplier must be active; no PO created.

**Refs:** FR-PR-01

## P2-10 — PI FS MG
**Does:** PI requests a bank detail change on supplier 1; FS presses Verify (call-back ticked); MG approves in the inbox.

**Expected:** Request moves requested, verified, approved; new details applied; PI and FS notified. While not yet approved, payments to this supplier are blocked (checked again in P5-05).

**Refs:** FR-PR-01 A-22
