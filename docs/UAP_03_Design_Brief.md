**UPSA ASSEMBLY PLATFORM**  
**Design Brief**  
A design direction for an institutional internal tool: dense and fast for the bench and stores, calm and precise for finance and management, and unmistakably UPSA.

<table><tbody><tr><td><strong>Project</strong></td><td>UPSA Assembly Platform (UAP) — internal operations ERP</td></tr><tr><td><strong>Document</strong></td><td>Design Brief</td></tr><tr><td><strong>Version</strong></td><td>2.0 — Draft for UPSA review (internal-use scope)</td></tr><tr><td><strong>Date</strong></td><td>3 October 2026</td></tr><tr><td><strong>Prepared by</strong></td><td>Codey Dev (Aka Brown), software &amp; security</td></tr><tr><td><strong>Prepared for</strong></td><td>University of Professional Studies, Accra — Computer Assembly Unit</td></tr></tbody></table>

_Colours follow UPSA’s published Navy Blue (Pantone 281C) and Gold (Pantone 1245C); hex values are screen approximations to confirm against UPSA’s brand guide._  
**Contents**  
01 Design intent and principles  
02 Users and contexts  
03 Brand direction: UPSA navy and gold  
04 Colour system  
05 Typography  
06 Spacing, shape and elevation  
07 Layout systems  
08 Component specifications  
09 Screen inventory  
10 Status language  
11 Motion  
12 Accessibility  
13 Responsive and device targets  
14 Imagery, iconography and voice  
15 Print and document design  
16 Rules to avoid generic output  
17 Figma handoff conventions  
18 Open items

1\. Design intent and principles
================================

UAP is used all day by seven kinds of staff who care about correctness more than novelty. The interface should feel like a **well-run workshop with a university’s discipline**: everything labelled, every object showing its state, every number traceable, and nothing decorative that does not help a decision.

| **Principle** | **Meaning for design decisions** |
| --- | --- |
| State is always visible | Every object (shipment, PO, unit, order, ticket) shows its status in words and one consistent chip. Colour supports the word and never replaces it. |
| Serials and numbers are first-class | Serials, lots, document numbers and quantities are set in a monospace face with tabular figures, copyable in one tap, and scannable. |
| Role-shaped home screens | Each role lands on what needs its action today, not a generic dashboard. |
| Evidence beside every decision | Approvals, QC and adjustments show the history, amounts and attachments needed to decide on the same screen. |
| Keyboard and scanner first | Expert paths are fast (shortcuts, command palette, scan fields); beginner paths are guided. |
| Density with order | Compact tables (36 px rows) separated by space and hairlines, not boxes inside boxes. |
| Honest about time | Shipments show ETA, slippage and customs status; orders show real ready dates; nothing pretends to be instant. |
| Built to extend | Tokens and components first; new modules and future clients reuse the system. |

2\. Users and contexts
======================

| **Role** | **Context** | **Design consequence** |
| --- | --- | --- |
| Super Admin | Desk, careful, infrequent | Clear permission views, change summaries before saving, audit-first screens |
| Management | Desk and tablet, short sessions | Approvals inbox, KPI home, fast drill-down, readable on a phone for approvals |
| Procurement & Imports Officer | Desk, many documents and emails, multiple currencies | Shipment timeline, document vault, charge entry in any currency, landed-cost preview |
| Inventory & Sales Officer | Store floor, scanner, trolley tablet; also desk | Scan-focused receiving, large quantity entry, serial picker, dispatch handover with signature |
| Finance & Service Officer | Desk; counter for repairs | Allocation views, aged balances, ticket board with SLA clock |
| Assembly Technician | Bench, tablet propped up, anti-static gloves, constant interruption | Task cards, big checkboxes, one clear next step, timers that survive interruption |
| QC Inspector | Test rack, spec sheet in hand | Spec versus actual side by side, defect picker with codes, photo capture |

3\. Brand direction: UPSA navy and gold
=======================================

UPSA publishes its brand colours as **UPSA Navy Blue** (CMYK 100/93/33/51, Pantone 281C) and **UPSA Gold** (CMYK 10/28/100/23, Pantone 1245C). The screen values below are approximations of those references and must be confirmed against UPSA’s brand guide and logo files.

| **Colour** | **Reference** | **Screen value** | **Role in the system** |
| --- | --- | --- | --- |
| UPSA Navy | Pantone 281C | #00205B | Primary action, navigation chrome, headings, table headers |
| UPSA Gold | Pantone 1245C | #C69214 | Accent only: active-navigation marker, highlights, rules, badges on dark; never text on white and never a status colour |

*   **Proportion:** neutrals about 70%, navy about 25%, gold about 5%. The product should read as navy and white with a thread of gold.
*   **Logo:** official UPSA logo in the sidebar header and on documents once supplied; the unit’s own name “UPSA Assembly Unit” is set in text beside it.
*   **Gold discipline:** gold appears as a 3–4 px marker, a hairline, or a fill with navy text. Warnings use a separate deep orange so gold never signals caution.
*   **Dark surfaces:** the sidebar is Navy 900 with white text and a gold active marker.

4\. Colour system
=================

4.1 Primitives
--------------

| **Family** | **Steps (hex)** | **Used for** |
| --- | --- | --- |
| Navy | 950 #00112E · 900 #00205B · 800 #0B3380 · 700 #1F4C9C · 100 #E3EAF6 · 50 #F1F4FA | Actions, chrome, links, info state |
| Gold | 700 #7A5800 · 600 #A67A0A · 500 #C69214 · 100 #FBF1D6 | Accent; 700 only when gold-family text is unavoidable |
| Neutral | ink #0F1A2E · 700 #34435C · 500 #5F6B7D · 300 #C9CFD9 · 200 #E1E5EC · 100 #F0F2F6 · bg #F4F5F8 · white #FFFFFF | Text, surfaces, hairlines |
| Green | 700 #1B6E4F · 100 #E2F2EA | Pass, available, completed, healthy |
| Red | 600 #B3261E · 100 #F8E3E1 | Fail, error, overdue, destructive |
| Orange | 700 #8A4B08 · 100 #FCEBD6 | Warning, awaiting approval, low stock |

4.2 Semantic tokens and contrast
--------------------------------

| **Token** | **Foreground on background** | **Contrast** |
| --- | --- | --- |
| text.primary | #0F1A2E on #FFFFFF | 17.4:1 |
| text.secondary | #34435C on #F4F5F8 | 9.2:1 |
| text.muted | #5F6B7D on #FFFFFF | 5.4:1 |
| action.primary (label on fill) | #FFFFFF on #00205B | 15.5:1 |
| action.accent (label on gold fill) | #00205B on #C69214 | 5.5:1 |
| text.link | #0B3380 on #FFFFFF | 11.7:1 |
| nav.text on sidebar | #FFFFFF on #00205B | 15.5:1 |
| status.pass | #1B6E4F on #E2F2EA | 5.3:1 |
| status.fail | #B3261E on #F8E3E1 | 5.3:1 |
| status.warn | #8A4B08 on #FCEBD6 | 5.8:1 |
| status.info | #0B3380 on #E3EAF6 | 9.7:1 |
| gold as text on white (not allowed) | #C69214 on #FFFFFF | 2.8:1 |

Normal text must reach 4.5:1 and large UI elements and icons 3:1; the last row shows why gold is never used for text on white. Recheck in Figma when the official files arrive.

4.3 Theming
-----------

*   Light theme is default. A dark theme for the ERP is Phase 2 and reuses semantic tokens.
*   Colour is never the only signal: chip text, icon and position carry the same meaning.

5\. Typography
==============

**IBM Plex Sans** for the interface and **IBM Plex Mono** for serials, lots, document numbers and quantities. Plex has an engineered character suited to hardware, clear numerals and wide language coverage, and is open source and self-hosted (subset, font-display: swap). Fallback: system-ui, Segoe UI, Roboto, Arial.

| **Style** | **Size / line** | **Weight** | **Use** |
| --- | --- | --- | --- |
| H1 | 28 / 34 | 600 | Page titles |
| H2 | 20 / 26 | 600 | Sections |
| H3 | 16 / 22 | 600 | Cards, drawers |
| Body | 14 / 20 | 400 | Forms and text |
| Table | 13 / 18 | 400 / 500 | Dense data, tabular figures |
| Caption | 12 / 16 | 400 | Helper text, metadata |
| Mono data | 13 / 18 | 500 | Serials, lots, numbers |
| KPI figure | 32 / 36 | 600 | Dashboard values |
| Table header | 11 / 14 | 600, uppercase, +4% tracking | Column labels |

*   Numeric columns right-aligned with tabular figures. Currency as GH₵ 5,200.00; foreign amounts show currency code first, for example USD 4,000.00, with the converted GH₵ value beneath in muted text.
*   Sentence case in the interface. Maximum measure 70 characters for text blocks.

6\. Spacing, shape and elevation
================================

| **Aspect** | **Specification** |
| --- | --- |
| Spacing scale | 4 px base: 4, 8, 12, 16, 24, 32, 48, 64 |
| Radius | 2 px chips; 4 px inputs, buttons, table containers; 6 px dialogs and cards. No fully rounded pill buttons except filter tokens. |
| Borders | 1 px hairline neutral.200 for structure; focus ring 2 px Navy 800 with 2 px white offset |
| Elevation | Flat by default; one overlay shadow for menus, popovers and dialogs |
| Grid | Fluid layout with a 240 px collapsible sidebar; 8 px rhythm; 12-column page grid in document views |
| Touch targets | ≥ 40 px in desktop views, ≥ 48 px in bench and store modes |

7\. Layout systems
==================

7.1 ERP shell
-------------

*   Navy sidebar grouped by domain (Overview, Procurement and imports, Inventory, Production and quality, Sales and dispatch, Finance, Service, Reports, Admin); shows only what the user’s scopes allow; collapses to icons; gold marker on the active item.
*   Top bar: global search (serials, POs, shipments, orders), command palette (Ctrl/Cmd+K), approvals count, notifications, user menu.
*   Page pattern: title row with primary action → filter bar with saved views → data table → right-hand quick-look drawer → full detail page for editing.
*   Document pages (PO, shipment, order, assembly order) have a sticky header with number, status chip and next valid action; an event timeline sits on the right.

7.2 Role home screens
---------------------

| **Role** | **Home shows** |
| --- | --- |
| Super Admin | Pending invitations, suspended users, recent permission changes, failed jobs, backup status |
| Management | Approvals waiting, shipments delayed, stock health, units by stage, margin trend, budget position, exceptions |
| Procurement & Imports | Open POs, shipments by stage with ETA slippage, customs queries, free days left on demurrage, charges awaiting actuals |
| Inventory & Sales | Receipts expected today, low-stock items, buildable quantities, orders awaiting dispatch, counts due |
| Finance & Service | Invoices to issue, unallocated payments, aged receivables, tickets by SLA, period close checklist |
| Assembly Technician | My queue: assigned units with stage, due time and blockers |
| QC Inspector | Units awaiting inspection, incoming inspections, rework returned for retest |

7.3 Key screens in detail
-------------------------

*   **Shipment tracker:** header with BL/AWB, mode, parties and ETA versus original; stage bar (Booked → In transit → Arrived → Customs → Cleared → Delivered) with slippage in days; tabs for lines, customs entries, charges, documents, timeline; landed-cost preview panel.
*   **Landed-cost run:** left list of charges with basis selector, centre allocation table per line (value, share, added cost, new unit cost), right summary of before and after average cost; confirm with dry-run first.
*   **Goods receipt:** scan field always focused; expected versus received lines; per-line lot and serial capture; reject with reason and photo; running discrepancy summary.
*   **Bench workspace (tablet):** step list left, current step centre (instructions, checklist, scan inputs), parts right; one large “Complete step” button.
*   **QC screen:** spec versus measured, defect picker with codes and severity, photo capture, pass and fail buttons with confirmation.
*   **Genealogy view:** unit at root; components as nodes with serial, lot, supplier, shipment and landed cost; replaced parts struck through with date and ticket.
*   **Approval view:** requester, amount, reason, history, attachments, comparable past requests; approve or reject with required comment.

8\. Component specifications
============================

| **Component** | **Specification** | **States / notes** |
| --- | --- | --- |
| Button | Primary Navy 900 fill; secondary outline; tertiary text; 4 px radius; 36–40 px | Hover darkens, pressed, focus ring, disabled with reason tooltip, loading keeps width |
| Data table | Sticky header, resizable and reorderable columns, column picker, saved views, row selection, inline edit where safe, virtualised | Empty, skeleton rows, error with retry, bulk-action bar; keyboard navigation and / to filter |
| Status chip | 2 px radius, icon plus word | One component for every domain object |
| Serial chip | Mono, copy on click, barcode preview on hover | Valid, voided, dispatched, in service |
| Scan input | Large focused field that keeps focus after a scan; success tick and optional beep | Scanning, found, not found, ambiguous |
| Money field | Currency selector, amount, rate, converted GH₵ preview | Rate source shown; manual override flagged |
| Quantity stepper | Direct typing, long-press accelerate, limits shown | Over-available warning |
| Stage bar | Horizontal stages; current emphasised; slippage badge | Blocked shows reason and owner |
| Timeline | Vertical events with actor, time, source and note | Append-only; system and manual events distinguished |
| Approval card | Amount, reason, history, comment box | Pending, approved, rejected, expired, escalated |
| Document vault | Checklist of required documents with upload slots and preview | Missing, uploaded, verified |
| Genealogy tree | Expandable nodes with serial, lot, shipment, cost | Replaced parts struck through |
| Form field | Label above, helper below, inline validation on blur | Required marked with the word “Required” |
| Dialog and drawer | Dialog for confirmation; drawer for quick look and edit | Escape closes; focus returns to trigger |
| Filter bar | Tokens with operators; saved views | Active filter count |
| Toast | Bottom-left, 6 s, undo where reversible | Errors needing action use inline messages |

9\. Screen inventory
====================

| **Module** | **Screens** |
| --- | --- |
| Overview | Role home · Approvals inbox · Notifications · Global search results · Saved views |
| Procurement and imports | Suppliers · Supplier detail (bank change flow) · Requisitions · Purchase orders · Shipments list and tracker · Customs entries · Charges · Landed-cost runs · Supplier invoices and match · Supplier RMAs · Tariff table |
| Inventory | Stock on hand · Ledger · Goods receipts · Incoming inspections · Transfers · Adjustments · Stock counts · Reorder policies and suggestions · Lots and serials · Labels |
| Production and quality | Assembly orders · Buildable view · Production board · Unit workspace · Test runs · QC inspection · Rework · Imaging and licences · Genealogy · Defect analytics |
| Sales and dispatch | Accounts · Internal orders · Reservations · Dispatch notes and handover · Returns |
| Finance | Invoices · Payments and allocation · Reconciliation · Expenses · Budgets · Journal · Trial balance · Periods and close |
| Service | Ticket board · Ticket detail with timeline · Warranty register · Serial lookup |
| Reports | Reports hub · Report viewer with export · Scheduled reports |
| Admin | Users · Roles and scopes · Approval rules · Settings, tax, exchange rates · Cost centres and locations · Import wizard · Audit log · API clients |

10\. Status language
====================

One vocabulary across screens, API and email. Chip colour is secondary to the label.

| **Domain** | **Statuses (tone)** |
| --- | --- |
| Shipment | Booked · In transit (info) · Arrived · Customs processing (warn) · Held (fail) · Cleared (pass) · Delivered (pass) · Closed |
| Purchase order | Draft · Pending approval (warn) · Approved · Sent · Confirmed · Partly received (info) · Received (pass) · Closed · Cancelled |
| Unit | Planned · Building (info) · Testing (info) · QC hold (warn) · Rework (fail) · In stock (pass) · Reserved (warn) · Dispatched · In service (info) · Scrapped |
| Assembly order | Draft · Planned · Awaiting materials (warn) · Released · In progress (info) · In QC (warn) · Completed (pass) · On hold (warn) · Cancelled |
| Internal order | Draft · Pending approval (warn) · Approved · Awaiting build (info) · Ready (pass) · Dispatched · Completed · Cancelled |
| Invoice / payment | Draft · Issued · Part paid (warn) · Paid (pass) · Overdue (fail) · Void · Unallocated (warn) |
| Ticket | Received · Diagnosing · Awaiting approval (warn) · Awaiting parts (warn) · In repair (info) · Ready for collection (pass) · Closed · Declined |

11\. Motion
===========

*   Motion explains change only: a row updating, a drawer opening, a stage advancing; 120–200 ms ease-out.
*   No scroll-triggered fade-ins, parallax or cursor effects; hover feedback combines border, background and cursor.
*   Respect prefers-reduced-motion. Skeletons for lists; spinners only inside buttons and blocking operations over one second.

12\. Accessibility
==================

*   Target WCAG 2.2 AA throughout; full keyboard operation including scanning and posting flows.
*   Visible focus ring on every interactive element; logical tab order; skip links; semantic landmarks and tables.
*   aria-live for scan results, background job completion and notifications.
*   Text at least 12 px; support 200% zoom; colour never the sole signal; errors state the remedy.
*   Automated axe checks in CI plus a manual keyboard and screen-reader pass before each release.

13\. Responsive and device targets
==================================

| **Context** | **Devices** | **Behaviour** |
| --- | --- | --- |
| Desk work | 1366×768 and 1920×1080 laptops/desktops | Full layout from 1024 px |
| Store and bench | 10–13" tablets, landscape and portrait, touch plus scanner | Large targets, simplified task flows, no hover dependencies |
| Approvals on the go | Phones | Approvals inbox, notifications and read-only detail are fully usable; dense tables degrade to cards |

14\. Imagery, iconography and voice
===================================

*   **Photography:** real images of the UPSA assembly unit, parts and finished machines for the login screen, empty states and documents; no generic stock images.
*   **Icons:** one outline set (lucide), 1.5 px stroke, 16/20/24 px; custom hardware glyphs (CPU, RAM, SSD, board) drawn to match.
*   **Voice:** plain, specific, respectful. “Shipment arrived 2 days later than planned” rather than “Delay detected”. Errors state what happened and what to do.
*   **Formats:** dates 3 Oct 2026, 24-hour time, currency GH₵ 1,250.00, phone 024 123 4567.

15\. Print and document design
==============================

All documents carry the UPSA logo and unit name in a navy letterhead with a gold rule, Plex type, and a QR code linking to the record (login required).

| **Document** | **Format** | **Contents** |
| --- | --- | --- |
| Purchase order | A4 | Supplier, currency, incoterm, lines, delivery terms, approver names |
| Goods receipt note | A4 | Items, lots, serials, accepted and rejected quantities, signatures |
| Shipment summary | A4 | Parties, BL/AWB, dates, documents checklist, charges and landed cost |
| Dispatch note | A4 / A5 | Units with serials, recipient, signature box |
| Invoice, proforma, credit note | A4 | Series number, account, lines, tax breakdown, payment details |
| Warranty certificate | A5 | Serial, build date, account, term, claim route |
| Labels | 50×30 mm, 25×15 mm | Code128 or QR with serial; model and build date |

16\. Rules to avoid generic output
==================================

*   No gradient blobs, no glassmorphism as the default card treatment, no uniform pill buttons, no scroll-fade-in on every section, no cursor-following gradient beams, no grain used to dress up a gradient, no fade-only hover states, no decorative italic serif accents on sans-serif UI, and no Space Grotesk plus Instrument Serif pairing.
*   No identical rows of KPI cards with sparklines as a substitute for thought; dashboards answer specific questions (what is delayed, what is short, what needs approval).
*   No stock photography and no AI-sparkle iconography.
*   References are studied for mechanics, not layouts: command palette and list navigation, filter tokens with operators, document timeline patterns, scanner-focused inputs, approval comparison views.

17\. Figma handoff conventions
==============================

*   Create the **Primitives** collection first with scopes set to none, then a semantic **Color** collection aliasing primitives; components bind only to semantic variables. Typography, spacing and radius follow the same two-step pattern.
*   Use three pages (Foundations, Components, Screens) with Sections for domains.
*   Batch writes into fewer, larger scripts per session.
*   Components are built with state and size variants, each with a usage and accessibility note; Code Connect mapping is added once packages/ui exists.
*   The Tailwind preset in packages/config is generated from the same token names.

18\. Open items
===============

1.  Official UPSA logo files, brand guide and any rules for the unit’s name.
2.  Confirmation of the screen values for UPSA Navy and Gold.
3.  Permission to photograph the assembly unit, staff and finished products.
4.  Label printer and paper sizes.
5.  Whether the unit uses a sub-brand or the main university identity.