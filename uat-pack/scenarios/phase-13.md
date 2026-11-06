# Phase 13 — Cross-cutting quality checks

**Goal:** Documents, emails, notifications, accessibility and performance judged against the spec.

**Opens when:** Phases 1 to 11 complete.

**Checkpoint assertions:** A-18 A-19

## P13-01 — ORCH
**Does:** Compare every expected notification in section 11 against the notification table and the mail sink.

**Expected:** Each expected notification exists exactly once per recipient within 60 seconds; no unexpected recipients.

**Refs:** FR-NT-01 A-18

## P13-02 — ORCH
**Does:** Open every generated PDF (PO, GRN, shipment summary, dispatch note, invoice, credit note, warranty certificate, labels, quote).

**Expected:** Letterhead and numbers correct; totals add up; serials readable and scannable; no placeholder text; QR opens the record only after sign-in.

**Refs:** FR-FN-01 FR-IN-11

## P13-03 — ORCH
**Does:** Open every email in the sink.

**Expected:** No login or token links except invitations and resets; correct names, numbers and amounts; no personal data beyond need.

**Refs:** FR-NT-01

## P13-04 — ORCH
**Does:** Run an automated accessibility scan and a keyboard-only pass on twelve key pages.

**Expected:** No serious or critical violations; every primary flow completable by keyboard; focus visible.

**Refs:** FR-ID-01

## P13-05 — ORCH
**Does:** Load the volume seed and time list pages, dashboards, a 100,000-row export and a landed-cost run.

**Expected:** Lists ≤ 2 s; dashboards ≤ 2 s; export job ≤ 30 s; no timeouts.

**Refs:** FR-RP-03

## P13-06 — ORCH
**Does:** Restore the previous night’s backup into a scratch project and run assertions A-02, A-09 and A-20.

**Expected:** Restore completes within the recovery objective and assertions pass.

**Refs:** FR-ID-04
