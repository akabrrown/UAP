# Phase 3 — Imports: shipment, customs and charges

**Goal:** Track a sea shipment from booking to delivery with a delay, a customs query and charges in two currencies, plus a small air shipment.

**Opens when:** PO to supplier 1 confirmed.

**Checkpoint assertions:** A-18 A-19 A-32

## P3-01 (smoke) — PI
**Does:** On the PO press Create shipment. Enter mode sea, BL number, two containers, carrier, forwarder, agent, ports, ETD, ETA, free days 14. Press Create shipment.

**Expected:** Shipment booked with number; lines carry PO quantities; ETA stored as original ETA.

**Refs:** FR-IM-01 FR-IM-02

## P3-02 — PI
**Does:** Press Mark departed, add a transhipment event, then Update ETA to five days later.

**Expected:** Status in_transit; events on timeline; ETA slip of 5 days notifies Management and Inventory (threshold 3).

**Refs:** FR-IM-03

## P3-03 — MG IS
**Does:** Each agent checks the bell, opens the notification, and opens /imports/shipments?filter=delayed.

**Expected:** Notification present once per recipient; list shows slippage in days; board column correct.

**Refs:** FR-IM-03 FR-RP-01 A-18

## P3-04 — PI
**Does:** Add charges as estimates: freight USD, insurance USD, clearing fee GHS (basis quantity), local transport GHS (basis weight). Leave shipment weights empty.

**Expected:** Charges saved with currency, rate, basis, estimated status; GHS equivalents computed at the stored rate.

**Refs:** FR-IM-05

## P3-05 — PI
**Does:** Upload bill of lading, invoice and packing list; also try a renamed executable and the EICAR test file.

**Expected:** Valid files show Scanning then Clean and tick the checklist; executable and EICAR are blocked with a clear message.

**Refs:** FR-IM-07

## P3-06 — PI
**Does:** Add the event Arrived. (Orchestrator then advances the clock 9 days.)

**Expected:** Status arrived; free-days clock starts; after the clock shift a demurrage alert (3 days or fewer left) reaches PI and Management.

**Refs:** FR-IM-03 FR-IM-09

## P3-07 (smoke) — PI
**Does:** Start customs entry; press Mark lodged, Mark queried with a reason, Release hold, Mark assessed (duty, VAT, levies), Mark paid, Mark released, then Mark cleared on the shipment.

**Expected:** Queried sets shipment held and notifies MG and IS; assessed creates duty and levy charges as actual; released then cleared moves status to cleared.

**Refs:** FR-IM-04

## P3-08 — PI
**Does:** Replace freight and clearing estimates with invoiced amounts using Mark actual.

**Expected:** Estimates become actual; a change after a posted landed-cost run would require a new run.

**Refs:** FR-IM-05

## P3-09 (smoke) — PI
**Does:** Press Mark delivered.

**Expected:** Status delivered; a goods receipt draft with expected lines is created; Inventory notified.

**Refs:** FR-IM-01 FR-NT-01

## P3-10 — PI
**Does:** Create a second, small air shipment (supplier 1) for fans and Wi-Fi cards, record weights, add charges with basis weight, run it to delivered.

**Expected:** Air shipment follows the same flow; weight-based charge allocates once weights exist.

**Refs:** FR-IM-01 FR-IM-05
