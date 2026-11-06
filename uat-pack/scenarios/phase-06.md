# Phase 6 — Production and quality

**Goal:** Build ten laptops with two technicians, one shortage, a faulty part, a failed inspection with rework, a blocked self-inspection and a conditional pass.

**Opens when:** Components costed in stock; BOM active; local replenishment received when needed.

**Checkpoint assertions:** A-05 A-06 A-07 A-08 A-13 A-20 A-28 A-29

## P6-01 (smoke) — IS
**Does:** Create an assembly order for 10 laptops: Save draft, Plan, Check materials.

**Expected:** Status awaiting_materials with a shortage table (RAM short by 4).

**Refs:** FR-PD-01 FR-PD-02

## P6-02 — IS PI
**Does:** IS presses Create requisition for shortage and Submit (below limit, auto-approved). PI converts to a local PO to supplier 2, sends and confirms. Orchestrator advances one day. IS receives and posts.

**Expected:** Requisition linked to the assembly order; local PO; receipt posts; stock rises by 4 RAM.

**Refs:** FR-PD-02 FR-PR-02 FR-IN-02

## P6-03 (smoke) — IS
**Does:** Open the assembly order, press Check materials again, then Release.

**Expected:** Status ready then released; 10 unit records with build references; materials reserved; technicians notified.

**Refs:** FR-PD-04 FR-IN-06 A-13

## P6-04 (smoke) — IS
**Does:** Press Issue materials, scan the component serials for all ten sets, press Post issue.

**Expected:** Ledger issue rows move parts to assembly WIP; serial statuses issued; order in_progress.

**Refs:** FR-PD-04 FR-IN-01

## P6-05 — AT1 AT2
**Does:** Both technicians open their queue at the same moment and press Claim next unit.

**Expected:** Each receives a different unit; no unit is assigned twice.

**Refs:** FR-PD-08 A-13

## P6-06 — AT1
**Does:** Work unit 1 step by step: Start step, checklist, Scan component installed (first scan a serial that was not issued), Complete step, Record imaging, Record test for POST and burn-in, Submit for QC.

**Expected:** Unissued serial refused; each step records time; genealogy rows created with serial, lot and cost; Submit for QC enabled only after tests pass; unit qc_hold; Quality notified.

**Refs:** FR-PD-05 FR-PD-06 FR-PD-09

## P6-07 — AT2
**Does:** Work unit 2 the same way in parallel with AT1.

**Expected:** No interference; both units progress; board updates live.

**Refs:** FR-PD-05 FR-PD-08

## P6-08 — AT1
**Does:** On unit 3 press Report problem (faulty display) and replace it by scanning a spare from stock.

**Expected:** Unit shows blocked then resumes; genealogy replaces the display (old row closed with reason); Inventory notified.

**Refs:** FR-PD-05 FR-PD-09

## P6-09 — AT1
**Does:** On unit 4 record a failed burn-in test and try Submit for QC; then repair, retest passed, submit.

**Expected:** Submit disabled with reason after the fail; enabled after a pass.

**Refs:** FR-PD-06

## P6-10 (smoke) — QI
**Does:** Inspect unit 1: review spec versus actual, add no defects, press Pass and read the confirmation; print the label.

**Expected:** Final serial UPSA-LAP-year-number assigned; cost snapshot; finished-goods ledger row; unit in_stock; label PDF correct; Inventory notified.

**Refs:** FR-QC-01 FR-QC-04 A-05 A-07

## P6-11 — QI
**Does:** Inspect unit 4: add a defect (cosmetic scratch) and press Fail.

**Expected:** Rework order created; unit rework; technician notified; defect analytics updated.

**Refs:** FR-QC-03 FR-QC-05

## P6-12 — AT1 QI
**Does:** AT1 opens Rework, Start rework, Mark fixed, retests, Submit for QC; QI passes it.

**Expected:** Unit returns to testing then qc_hold then in_stock; history shows both inspections.

**Refs:** FR-QC-03

## P6-13 — AT2
**Does:** AT2 opens the inspection page for unit 2 (which AT2 built) and tries Pass.

**Expected:** Blocked: “You worked on this unit and cannot inspect it”; no inspection row created.

**Refs:** FR-QC-02 A-08

## P6-14 — QI MG
**Does:** QI records a Conditional result on unit 5 (minor cosmetic). Management opens it and presses Override and accept.

**Expected:** Unit stays qc_hold after QI; Management notified; after override the unit proceeds with the defect noted; audit shows who overrode.

**Refs:** FR-QC-01 FR-QC-04

## P6-15 — AT1 AT2 QI
**Does:** Finish units 6 to 10: build, test, inspect. Leave unit 9 failing twice; IS and MG decide to scrap it.

**Expected:** Eight units pass; unit 9 scrapped with approval and e-waste record (if enabled); order completes automatically when all units are finalised or scrapped.

**Refs:** FR-PD-01 FR-SU-01

## P6-16 — IS MG
**Does:** Read yields on the assembly order, the defects analytics and the buildable view.

**Expected:** Yield equals passed over built; defects by code and supplier correct; buildable reflects remaining stock.

**Refs:** FR-PD-03 FR-QC-05 FR-RP-01 A-20 A-29
