# Phase 0 — Foundation: accounts, access and rules

**Goal:** Prove invitation, sign-in, MFA, role templates and the configuration the rest of the run depends on.

**Opens when:** Environment reset to seed state; only the Super Admin account exists with a known password and TOTP secret.

**Checkpoint assertions:** A-24 A-25 A-26

## P0-01 (smoke) — SA
**Does:** Sign in with the seeded account and TOTP code. Look at the home screen and the sidebar.

**Expected:** Lands on /home with Super Admin widgets (pending invitations, failed jobs, backup status). Sidebar shows Admin and Reports only; no Procurement, Inventory, Production, Sales, Finance or Service modules.

**Refs:** FR-ID-01 A-24

## P0-02 — SA
**Does:** Open /admin/users and invite the seven staff accounts (MG, PI, IS, FS, AT1, AT2, QI), each with the matching role template.

**Expected:** Seven rows with status invited; seven invitation emails arrive in the mail sink within 60 seconds; each contains a link and no password.

**Refs:** FR-ID-02 FR-NT-01

## P0-03 (smoke) — MG PI IS FS AT1 AT2 QI
**Does:** Each agent opens its own invitation email, follows the link, sets a password, enrols the authenticator, saves recovery codes and lands on home (agents work in parallel, each in its own browser session).

**Expected:** Each lands on its own role home (technicians on /production/queue). Sidebar matches the role map in the workflow document section 2. Profile status becomes active.

**Refs:** FR-ID-01

## P0-04 — SA
**Does:** Open /admin/approval-rules and set the test limits: requisition 20,000; PO 50,000; stock write-off 1,000; discount over 5%; expense 500; supplier payment 30,000; supplier bank change always; period close always. Use Test rule with 49,999 and 50,000 for PO.

**Expected:** Test rule names Management as approver only for 50,000 and above. Rules saved and audited.

**Refs:** FR-ID-05 FR-ID-07

## P0-05 — SA
**Does:** In /admin/settings add exchange rate USD to GHS (test value 12.00, source “UAT”), tax rates (test values) and three cost centres; confirm locations, defect codes and chart of accounts exist.

**Expected:** Entries saved; a duplicate rate for the same source and date is refused; the six seeded locations are present.

**Refs:** FR-ID-07 FR-FN-06

## P0-06 — SA
**Does:** Open AT2 in /admin/users, press Edit scopes, add qc.inspect as an extra scope, review the before/after diff and save.

**Expected:** Diff lists only qc.inspect as added; Management receives an email about the change; AT2’s new scope appears after Revoke sessions and a fresh sign-in.

**Refs:** FR-ID-02 FR-ID-04

## P0-07 — SA
**Does:** Type the addresses /procurement/orders/new, /finance/invoices and /sales/orders.

**Expected:** Each shows the 403 page naming the missing capability; none shows data. Request access emails the Super Admin.

**Refs:** FR-ID-02 A-25
