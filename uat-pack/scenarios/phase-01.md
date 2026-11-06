# Phase 1 — Master data and opening stock

**Goal:** Load catalogue, suppliers, accounts, BOM and opening stock through the import wizard and the BOM approval path.

**Opens when:** All seven accounts active; approval rules and rates configured (P0).

**Checkpoint assertions:** A-02 A-06 A-26 A-28

## P1-01 — IS
**Does:** Open /admin/imports, download the Items template, upload items_with_errors.csv and press Validate.

**Expected:** Row-level errors with reasons (invalid kind, duplicate SKU, missing name, negative weight). Nothing is written; Commit is disabled.

**Refs:** FR-IN-12

## P1-02 (smoke) — IS
**Does:** Upload items.csv, Validate, Commit.

**Expected:** 13 items created (12 components plus the finished laptop) with tracking modes as in the file; batch status committed.

**Refs:** FR-IN-12 FR-CT-01

## P1-03 — PI
**Does:** Import suppliers.csv (three suppliers) through the wizard.

**Expected:** Three suppliers in status pending_verification.

**Refs:** FR-IN-12 FR-PR-01

## P1-04 — IS
**Does:** Import accounts.csv (departments and one staff account).

**Expected:** Four accounts active with credit limits.

**Refs:** FR-IN-12 FR-CT-07

## P1-05 — PI
**Does:** Open the first two suppliers, complete the checklist, press Mark active, and add warranty terms (12 months from receipt).

**Expected:** Suppliers 1 and 2 active; supplier 3 left pending on purpose for P2-09. Warranty terms saved.

**Refs:** FR-PR-01 FR-PR-07

## P1-06 — IS
**Does:** Open the finished laptop and create BOM version 1 in the editor: add the 12 components (RAM quantity 2). Press Save draft, then Submit for approval.

**Expected:** BOM status pending_approval; Management notified; IS cannot approve its own submission.

**Refs:** FR-CT-03

## P1-07 (smoke) — MG
**Does:** Open the Approvals inbox from the bell, open the BOM request, check lines and cost, press Approve.

**Expected:** BOM becomes active; IS notified. Exactly one active version exists.

**Refs:** FR-CT-03 FR-ID-06

## P1-08 — IS
**Does:** In /inventory/reorder set policies for all components (minimum equals two laptop sets). Import opening_stock.csv (four laptop sets with serial numbers) through the wizard.

**Expected:** Opening ledger rows at WH-MAIN; serial-tracked items have component serials; stock on hand equals the file totals.

**Refs:** FR-IN-12 FR-IN-09 FR-IN-04 A-02 A-28

## P1-09 — IS QI
**Does:** IS plans a full count for WH-MAIN and starts it. IS and QI count by scanning; QI deliberately counts one RAM module fewer. IS submits for review, accepts variances and posts.

**Expected:** One variance of −1 RAM shown with value; adjustment (below the 1,000 limit) posted; ledger shows the adjustment row; count status posted.

**Refs:** FR-IN-08 FR-IN-09

## P1-10 — MG
**Does:** Open the stock valuation report and compare with the opening values.

**Expected:** Valuation equals opening stock cost less the adjustment.

**Refs:** FR-RP-02
