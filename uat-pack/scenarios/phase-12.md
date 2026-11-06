# Phase 12 — Security, permissions and concurrency

**Goal:** Try to break the rules the way users, mistakes and attackers would.

**Opens when:** Run complete (or at any time on a reset copy).

**Checkpoint assertions:** A-08 A-13 A-25 A-26 A-27

## P12-01 — ALL
**Does:** Each role agent attempts its list of forbidden actions (section 9 matrix) through the interface and by typing addresses.

**Expected:** Controls hidden or disabled; addresses show 403; nothing changes in the database.

**Refs:** FR-ID-02 A-25

## P12-02 — INTRUDER
**Does:** Using each role’s token, call forbidden API endpoints and attempt direct table reads as the browser role.

**Expected:** Every forbidden call returns 403; encrypted columns are not readable; no cross-role data in responses.

**Refs:** FR-ID-02 A-25 A-26

## P12-03 — IS
**Does:** Two IS sessions try to reserve the last available unit at the same moment; double-click Post receipt; press Approve in two tabs.

**Expected:** One wins; the other gets a clear refusal; no duplicate rows.

**Refs:** FR-IN-06 A-13 A-27

## P12-04 — PI
**Does:** Two sessions edit the same PO; the second saves after the first.

**Expected:** Second sees “Updated by [name]” with Reload and Compare; nothing silently overwritten.

**Refs:** FR-ID-04

## P12-05 — QI
**Does:** Enter a wrong password five times; then a wrong authenticator code five times.

**Expected:** Account locks for 15 minutes with a generic message; Super Admin is alerted; a second QI agent session cannot bypass.

**Refs:** FR-ID-01

## P12-06 — SA
**Does:** Suspend an active user while that user is mid-session; revoke sessions; reset the authenticator.

**Expected:** The user is signed out within a minute and cannot sign in; reset forces re-enrolment; Management notified.

**Refs:** FR-ID-03

## P12-07 — IS PI FS
**Does:** Enter hostile and awkward data in text fields: script tags, SQL fragments, very long strings, Twi and accented characters, zero and negative quantities, huge amounts, extra decimals.

**Expected:** No script runs; validation messages are clear; Unicode stored and printed correctly; numeric limits enforced.

**Refs:** FR-ID-04

## P12-08 — PI IS
**Does:** Upload files of the wrong type, oversize files and the EICAR test file to documents, receipts and tickets.

**Expected:** Wrong or infected files blocked; oversize refused with message; no file served without a signed link.

**Refs:** FR-IM-07

## P12-09 — IS
**Does:** Start a receipt post, switch the browser offline mid-click, restore the connection, and refresh.

**Expected:** No duplicate ledger rows; the page shows the true state after reload.

**Refs:** FR-IN-02 A-27

## P12-10 — AT1
**Does:** Open the address of a unit assigned to AT2, and the cost fields of a unit.

**Expected:** Access denied for AT2’s unit; costs hidden for technicians.

**Refs:** FR-ID-02 A-25

## P12-11 — QI FS
**Does:** Try to view a licence key as QI and FS; open a software licence through the API.

**Expected:** No key shown to roles without licence.view; the API response omits it.

**Refs:** FR-PD-07 A-26
