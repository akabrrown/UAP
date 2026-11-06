# Phase 7 — Internal sales, dispatch, invoicing and payment

**Goal:** Sell to departments with approval rules, serial reservation, handover, invoice, partial payments and a build-to-order shortfall.

**Opens when:** At least 8 finished units in stock (P6); accounts active; list price set.

**Checkpoint assertions:** A-10 A-13 A-14 A-15 A-21 A-23 A-29

## P7-01 (smoke) — IS
**Does:** Create an order for Dept of IT: 4 laptops with a 12% discount (above the 5% rule). Save draft and Submit.

**Expected:** Status pending_approval; Management notified; stock check shows 4 available.

**Refs:** FR-SL-01 FR-SL-02 FR-ID-05

## P7-02 — MG IS
**Does:** MG presses Reject with a comment. IS reads the comment, lowers the discount to 4%, resubmits; MG sees it no longer needs approval (or approves).

**Expected:** Rejected order returns to draft with the comment; resubmission below the limit becomes approved without Management.

**Refs:** FR-SL-02 FR-ID-06

## P7-03 — IS
**Does:** Press Reserve units and pick four serials. In a second tab create another order and try to reserve one of the same serials.

**Expected:** First order holds the units; second attempt is refused with “already reserved”; only one active reservation per unit.

**Refs:** FR-SL-03 FR-IN-06 A-13

## P7-04 (smoke) — IS
**Does:** Create a dispatch. Scan a serial not reserved for this order, then the correct four; Mark picked; Dispatch.

**Expected:** Wrong serial refused; ledger dispatch rows; units dispatched; order dispatched; Finance notified “ready to invoice”.

**Refs:** FR-SL-04 FR-IN-01 A-29

## P7-05 (smoke) — IS
**Does:** Press Record handover with recipient name, phone and a signature.

**Expected:** Dispatch delivered; warranty created per unit starting today (12 months); delivery email to the account contact.

**Refs:** FR-SL-04 FR-WR-01 A-14 A-15

## P7-06 (smoke) — FS
**Does:** Open invoices to issue, create a tax invoice from the dispatch and press Issue with Email to contact ticked.

**Expected:** Invoice numbered; PDF totals add up; prices equal the order snapshot; email sent; journals for receivable, revenue, VAT and cost of sales exist.

**Refs:** FR-FN-01 FR-FN-07 A-10 A-23

## P7-07 — FS
**Does:** Record a part payment by bank transfer and allocate; then try to allocate more than the balance; then record the remainder.

**Expected:** Invoice part_paid then paid; over-allocation blocked; journals post.

**Refs:** FR-FN-02 A-21

## P7-08 — IS
**Does:** Create an order for Dept of Finance for 8 laptops (more than in stock). Submit, Reserve what exists, press Request build for the shortfall.

**Expected:** Reservations for available units; assembly order created for the shortfall; order awaiting_build; later (after build) the remaining units auto-reserve and the order becomes ready.

**Refs:** FR-SL-03 FR-PD-01

## P7-09 — MG IS
**Does:** MG changes the list price of the laptop. IS opens the earlier order and creates a new order.

**Expected:** Earlier order and its invoice keep the old price; the new order uses the new price.

**Refs:** FR-SL-02 FR-CT-05 A-23

## P7-10 — FS IS
**Does:** FS puts the Registry account on hold; IS tries to create an order for it; FS reactivates.

**Expected:** Order creation blocked with the hold message; works again after reactivation.

**Refs:** FR-CT-07

## P7-11 — IS
**Does:** Cancel an approved order that has reservations.

**Expected:** Reason required; reservations released; units back in stock; cancellation audited.

**Refs:** FR-SL-01 FR-IN-06
